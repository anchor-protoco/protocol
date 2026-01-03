use odra::casper_types::U256;
use odra::prelude::*;
use odra::ContractRef;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::errors::Error;
use crate::events::{MarketActiveUpdated, MarketRegistered, PauseFlagsUpdated};
use crate::lending_market::LendingMarketContractRef;
use crate::types::{MarketAddresses, PauseFlags};

const PROTOCOL_ADMIN_ROLE: Role = *b"PROTOCOL_ADMIN_ROLE_____________";
const GUARDIAN_ROLE: Role = *b"GUARDIAN_ROLE___________________";

/// Registry of isolated markets and their shared configuration.
///
/// Invariants (MVP):
/// - Each asset can be registered at most once.
/// - `market_addresses`, `pause_flags`, and `market_active` exist for registered assets.
#[odra::module(events = [MarketRegistered, MarketActiveUpdated, PauseFlagsUpdated], errors = Error)]
pub struct MarketRegistry {
    access_control: SubModule<AccessControl>,
    market_count: Var<u64>,
    market_by_index: Mapping<u64, Address>,
    market_exists: Mapping<Address, bool>,
    market_addresses: Mapping<Address, MarketAddresses>,
    market_active: Mapping<Address, bool>,
    pause_flags: Mapping<Address, PauseFlags>,
}

#[odra::module]
impl MarketRegistry {
    pub fn init(&mut self, admin: Address) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &admin);
        self.access_control
            .unchecked_grant_role(&PROTOCOL_ADMIN_ROLE, &admin);
        self.access_control
            .set_admin_role(&PROTOCOL_ADMIN_ROLE, &DEFAULT_ADMIN_ROLE);
        self.access_control
            .set_admin_role(&GUARDIAN_ROLE, &PROTOCOL_ADMIN_ROLE);
    }

    pub fn register_market(
        &mut self,
        asset: Address,
        market: Address,
        a_token: Address,
        oracle: Address,
    ) {
        self.ensure_protocol_admin();
        if self.market_exists.get_or_default(&asset) {
            self.env().revert(Error::MarketAlreadyRegistered);
        }
        let addrs = MarketAddresses {
            market,
            a_token,
            oracle,
        };
        self.market_addresses.set(&asset, addrs);
        self.market_active.set(&asset, true);
        self.pause_flags.set(&asset, default_pause_flags());
        self.market_exists.set(&asset, true);

        let index = self.market_count.get_or_default();
        self.market_by_index.set(&index, asset);
        self.market_count.set(index + 1);

        self.env().emit_event(MarketRegistered {
            asset,
            market,
            a_token,
            oracle,
        });
    }

    pub fn set_market_active(&mut self, asset: Address, is_active: bool) {
        self.ensure_protocol_admin();
        self.ensure_market_exists(asset);
        self.market_active.set(&asset, is_active);
        self.env().emit_event(MarketActiveUpdated { asset, is_active });
    }

    pub fn set_pause_flags(
        &mut self,
        asset: Address,
        supply_paused: bool,
        borrow_paused: bool,
        withdraw_paused: bool,
        repay_paused: bool,
        liquidation_paused: bool,
    ) {
        self.ensure_guardian_or_admin();
        self.ensure_market_exists(asset);
        let flags = PauseFlags {
            supply_paused,
            borrow_paused,
            withdraw_paused,
            repay_paused,
            liquidation_paused,
        };
        self.pause_flags.set(&asset, flags);
        self.env().emit_event(PauseFlagsUpdated {
            asset,
            supply_paused,
            borrow_paused,
            withdraw_paused,
            repay_paused,
            liquidation_paused,
        });
    }

    pub fn update_market_risk_params(
        &mut self,
        asset: Address,
        collateral_factor: U256,
        liquidation_threshold: U256,
        close_factor: U256,
        liquidation_bonus: U256,
        reserve_factor: U256,
        borrow_cap: U256,
        supply_cap: U256,
    ) {
        self.ensure_protocol_admin();
        let market = self.get_market_addresses(asset).market;
        LendingMarketContractRef::new(self.env(), market).set_risk_params(
            collateral_factor,
            liquidation_threshold,
            close_factor,
            liquidation_bonus,
            reserve_factor,
            borrow_cap,
            supply_cap,
        );
    }

    pub fn update_market_rate_model(
        &mut self,
        asset: Address,
        base_rate_per_sec: U256,
        slope_rate_per_sec: U256,
    ) {
        self.ensure_protocol_admin();
        let market = self.get_market_addresses(asset).market;
        LendingMarketContractRef::new(self.env(), market)
            .set_rate_model(base_rate_per_sec, slope_rate_per_sec);
    }

    pub fn get_market_addresses(&self, asset: Address) -> MarketAddresses {
        self.market_addresses
            .get(&asset)
            .unwrap_or_revert_with(&self.env(), Error::MarketNotFound)
    }

    pub fn get_pause_flags(&self, asset: Address) -> PauseFlags {
        self.pause_flags
            .get(&asset)
            .unwrap_or_revert_with(&self.env(), Error::MarketNotFound)
    }

    pub fn is_market_active(&self, asset: Address) -> bool {
        self.market_active.get_or_default(&asset)
    }

    pub fn get_market_count(&self) -> u64 {
        self.market_count.get_or_default()
    }

    pub fn get_market_by_index(&self, index: u64) -> Address {
        self.market_by_index
            .get(&index)
            .unwrap_or_revert_with(&self.env(), Error::MarketNotFound)
    }

    pub fn grant_protocol_admin(&mut self, address: Address) {
        self.access_control
            .grant_role(&PROTOCOL_ADMIN_ROLE, &address);
    }

    pub fn revoke_protocol_admin(&mut self, address: Address) {
        self.access_control
            .revoke_role(&PROTOCOL_ADMIN_ROLE, &address);
    }

    pub fn grant_guardian(&mut self, address: Address) {
        self.access_control.grant_role(&GUARDIAN_ROLE, &address);
    }

    pub fn revoke_guardian(&mut self, address: Address) {
        self.access_control.revoke_role(&GUARDIAN_ROLE, &address);
    }

    pub fn has_protocol_admin(&self, address: Address) -> bool {
        self.access_control
            .has_role(&PROTOCOL_ADMIN_ROLE, &address)
    }

    pub fn has_guardian(&self, address: Address) -> bool {
        self.access_control.has_role(&GUARDIAN_ROLE, &address)
    }
}

impl MarketRegistry {
    fn ensure_protocol_admin(&self) {
        self.access_control
            .check_role(&PROTOCOL_ADMIN_ROLE, &self.env().caller());
    }

    fn ensure_guardian_or_admin(&self) {
        let caller = self.env().caller();
        if self.access_control.has_role(&GUARDIAN_ROLE, &caller)
            || self.access_control.has_role(&PROTOCOL_ADMIN_ROLE, &caller)
        {
            return;
        }
        self.env().revert(Error::Unauthorized);
    }

    fn ensure_market_exists(&self, asset: Address) {
        if !self.market_exists.get_or_default(&asset) {
            self.env().revert(Error::MarketNotFound);
        }
    }
}

fn default_pause_flags() -> PauseFlags {
    PauseFlags {
        supply_paused: false,
        borrow_paused: false,
        withdraw_paused: false,
        repay_paused: false,
        liquidation_paused: false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lending_market::{LendingMarket, LendingMarketInitArgs};
    use crate::math::WAD_U128;
    use crate::types::{RateModel, RiskParams};
    use odra::casper_types::U256;
    use odra::host::Deployer;

    #[test]
    fn admin_can_register_market() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let market = env.get_account(2);
        let a_token = env.get_account(3);
        let oracle = env.get_account(4);
        let init_args = MarketRegistryInitArgs { admin };
        let mut registry = MarketRegistry::deploy(&env, init_args);

        env.set_caller(admin);
        registry.register_market(asset, market, a_token, oracle);

        let addrs = registry.get_market_addresses(asset);
        assert_eq!(addrs.market, market);
        assert_eq!(addrs.a_token, a_token);
        assert_eq!(addrs.oracle, oracle);
        assert!(registry.is_market_active(asset));
        assert_eq!(registry.get_market_count(), 1);
        assert_eq!(registry.get_market_by_index(0), asset);
    }

    #[test]
    fn non_admin_cannot_register_market() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let market = env.get_account(2);
        let a_token = env.get_account(3);
        let oracle = env.get_account(4);
        let init_args = MarketRegistryInitArgs { admin };
        let mut registry = MarketRegistry::deploy(&env, init_args);

        env.set_caller(env.get_account(5));
        let result = registry.try_register_market(asset, market, a_token, oracle);
        assert!(result.is_err());
    }

    #[test]
    fn guardian_can_pause_market() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let guardian = env.get_account(5);
        let asset = env.get_account(1);
        let market = env.get_account(2);
        let a_token = env.get_account(3);
        let oracle = env.get_account(4);
        let init_args = MarketRegistryInitArgs { admin };
        let mut registry = MarketRegistry::deploy(&env, init_args);

        env.set_caller(admin);
        registry.register_market(asset, market, a_token, oracle);
        registry.grant_guardian(guardian);

        env.set_caller(guardian);
        let flags = registry.get_pause_flags(asset);
        registry.set_pause_flags(
            asset,
            flags.supply_paused,
            true,
            flags.withdraw_paused,
            flags.repay_paused,
            flags.liquidation_paused,
        );

        let updated = registry.get_pause_flags(asset);
        assert!(updated.borrow_paused);
    }

    #[test]
    fn admin_can_update_market_params() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let _market_addr = env.get_account(2);
        let a_token = env.get_account(3);
        let oracle = env.get_account(4);

        let init_args = MarketRegistryInitArgs { admin };
        let mut registry = MarketRegistry::deploy(&env, init_args);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams::default();

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token,
            oracle,
            registry: registry.address(),
            rate_model,
            risk_params,
        };
        let market = LendingMarket::deploy(&env, market_init);

        env.set_caller(admin);
        registry.register_market(asset, market.address(), a_token, oracle);

        let base_rate_per_sec = U256::from(1u8);
        let slope_rate_per_sec = U256::from(2u8);
        let mut new_params = RiskParams::default();
        new_params.reserve_factor = U256::from(WAD_U128 / 10);

        registry.update_market_rate_model(asset, base_rate_per_sec, slope_rate_per_sec);
        registry.update_market_risk_params(
            asset,
            new_params.collateral_factor,
            new_params.liquidation_threshold,
            new_params.close_factor,
            new_params.liquidation_bonus,
            new_params.reserve_factor,
            new_params.borrow_cap,
            new_params.supply_cap,
        );

        let got_model = market.get_rate_model();
        let got_params = market.get_risk_params();
        assert_eq!(got_model.base_rate_per_sec, U256::from(1u8));
        assert_eq!(got_model.slope_rate_per_sec, U256::from(2u8));
        assert_eq!(got_params.reserve_factor, U256::from(WAD_U128 / 10));
    }

    #[test]
    fn non_admin_cannot_update_market_params() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let attacker = env.get_account(1);
        let asset = env.get_account(2);
        let _market_addr = env.get_account(3);
        let a_token = env.get_account(4);
        let oracle = env.get_account(5);

        let init_args = MarketRegistryInitArgs { admin };
        let mut registry = MarketRegistry::deploy(&env, init_args);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams::default();

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token,
            oracle,
            registry: registry.address(),
            rate_model,
            risk_params,
        };
        let market = LendingMarket::deploy(&env, market_init);

        env.set_caller(admin);
        registry.register_market(asset, market.address(), a_token, oracle);

        env.set_caller(attacker);
        let base_rate_per_sec = U256::from(1u8);
        let slope_rate_per_sec = U256::from(2u8);
        let result = registry.try_update_market_rate_model(
            asset,
            base_rate_per_sec,
            slope_rate_per_sec,
        );
        assert!(result.is_err());
    }
}
