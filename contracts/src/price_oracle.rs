use odra::casper_types::U256;
use odra::prelude::*;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::errors::Error;
use crate::events::PriceUpdated;
use crate::types::OraclePrice;

const ORACLE_ADMIN_ROLE: Role = *b"ORACLE_ADMIN_ROLE_______________";

/// Centralized price oracle with staleness protection.
///
/// Invariants (MVP):
/// - Only ORACLE_ADMIN_ROLE can update prices.
/// - `get_price_checked` reverts when price is stale or missing.
#[odra::module(events = [PriceUpdated], errors = Error)]
pub struct PriceOracle {
    access_control: SubModule<AccessControl>,
    max_stale_millis: Var<u64>,
    prices: Mapping<Address, OraclePrice>,
}

#[odra::module]
impl PriceOracle {
    pub fn init(&mut self, admin: Address, max_stale_millis: u64) {
        self.max_stale_millis.set(max_stale_millis);
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &admin);
        self.access_control
            .unchecked_grant_role(&ORACLE_ADMIN_ROLE, &admin);
        self.access_control
            .set_admin_role(&ORACLE_ADMIN_ROLE, &DEFAULT_ADMIN_ROLE);
    }

    pub fn set_price(&mut self, asset: Address, price: U256) {
        self.ensure_oracle_admin();
        let ts = self.env().get_block_time();
        let data = OraclePrice {
            price,
            last_updated: ts,
        };
        self.prices.set(&asset, data);
        self.env().emit_event(PriceUpdated {
            asset,
            price,
            timestamp: ts,
        });
    }

    pub fn get_price(&self, asset: Address) -> OraclePrice {
        self.prices
            .get(&asset)
            .unwrap_or_revert_with(&self.env(), Error::PriceMissing)
    }

    pub fn get_price_checked(&self, asset: Address) -> U256 {
        let data = self.get_price(asset);
        self.ensure_fresh(&data);
        data.price
    }

    pub fn set_max_stale_millis(&mut self, max_stale_millis: u64) {
        self.ensure_oracle_admin();
        self.max_stale_millis.set(max_stale_millis);
    }

    pub fn grant_oracle_admin(&mut self, address: Address) {
        self.access_control
            .grant_role(&ORACLE_ADMIN_ROLE, &address);
    }

    pub fn revoke_oracle_admin(&mut self, address: Address) {
        self.access_control
            .revoke_role(&ORACLE_ADMIN_ROLE, &address);
    }

    pub fn has_oracle_admin(&self, address: Address) -> bool {
        self.access_control.has_role(&ORACLE_ADMIN_ROLE, &address)
    }

    pub fn get_max_stale_millis(&self) -> u64 {
        self.max_stale_millis.get_or_default()
    }
}

impl PriceOracle {
    fn ensure_oracle_admin(&self) {
        self.access_control
            .check_role(&ORACLE_ADMIN_ROLE, &self.env().caller());
    }

    fn ensure_fresh(&self, data: &OraclePrice) {
        let now = self.env().get_block_time();
        let max_stale = self.max_stale_millis.get_or_default();
        if now.saturating_sub(data.last_updated) > max_stale {
            self.env().revert(Error::PriceStale);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::errors::Error;
    use odra::host::Deployer;

    #[test]
    fn admin_can_set_and_read_price() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let init_args = PriceOracleInitArgs {
            admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, init_args);

        env.set_caller(admin);
        oracle.set_price(asset, U256::from(123u64));
        let data = oracle.get_price(asset);
        assert_eq!(data.price, U256::from(123u64));
        assert!(oracle.has_oracle_admin(admin));
    }

    #[test]
    fn non_admin_cannot_set_price() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let init_args = PriceOracleInitArgs {
            admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, init_args);

        env.set_caller(env.get_account(2));
        let result = oracle.try_set_price(asset, U256::from(1u64));
        assert!(result.is_err());
    }

    #[test]
    fn stale_price_rejected() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let init_args = PriceOracleInitArgs {
            admin,
            max_stale_millis: 1_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, init_args);

        env.set_caller(admin);
        oracle.set_price(asset, U256::from(10u64));
        env.advance_block_time(1_001u64);
        let result = oracle.try_get_price_checked(asset);
        assert_eq!(result, Err(Error::PriceStale.into()));
    }
}
