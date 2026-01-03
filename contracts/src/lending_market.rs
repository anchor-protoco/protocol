use odra::casper_types::U256;
use odra::prelude::*;
use odra::ContractRef;
use odra_modules::access::{AccessControl, Role, DEFAULT_ADMIN_ROLE};

use crate::a_token::ATokenContractRef;
use crate::cep18_interface::Cep18TokenContractRef;
use crate::errors::Error;
use crate::events::{
    Borrow, Deposit, Liquidate, MarketStateUpdated, RateModelUpdated, Repay, RiskParamsUpdated,
    Withdraw,
};
use crate::math::{utilization_rate, wad_mul, WAD_U128};
use crate::market_registry::MarketRegistryContractRef;
use crate::price_oracle::PriceOracleContractRef;
use crate::types::{PauseFlags, RateModel, RiskParams};

const MARKET_ADMIN_ROLE: Role = *b"MARKET_ADMIN_ROLE_______________";

/// Lending market for a single asset.
///
/// Invariants (MVP):
/// - `cash`, `total_borrows`, `total_reserves` are never negative.
/// - `total_borrows` equals the sum of all `borrow_balances` (no external debt).
/// - aToken supply tracks user deposits minus withdrawals (ownership in aToken).
#[odra::module(
    events = [
        Deposit,
        Withdraw,
        Borrow,
        Repay,
        Liquidate,
        MarketStateUpdated,
        RateModelUpdated,
        RiskParamsUpdated
    ],
    errors = Error
)]
pub struct LendingMarket {
    access_control: SubModule<AccessControl>,
    asset: Var<Address>,
    a_token: Var<Address>,
    oracle: Var<Address>,
    registry: Var<Address>,
    rate_model: Var<RateModel>,
    risk_params: Var<RiskParams>,
    cash: Var<U256>,
    total_borrows: Var<U256>,
    total_reserves: Var<U256>,
    supply_index: Var<U256>,
    borrow_index: Var<U256>,
    last_accrual: Var<u64>,
    borrow_balances: Mapping<Address, U256>,
}

#[odra::module]
impl LendingMarket {
    pub fn init(
        &mut self,
        admin: Address,
        asset: Address,
        a_token: Address,
        oracle: Address,
        registry: Address,
        rate_model: RateModel,
        risk_params: RiskParams,
    ) {
        self.access_control
            .unchecked_grant_role(&DEFAULT_ADMIN_ROLE, &admin);
        self.access_control
            .unchecked_grant_role(&MARKET_ADMIN_ROLE, &admin);
        self.access_control
            .set_admin_role(&MARKET_ADMIN_ROLE, &DEFAULT_ADMIN_ROLE);

        self.asset.set(asset);
        self.a_token.set(a_token);
        self.oracle.set(oracle);
        self.registry.set(registry);
        self.rate_model.set(rate_model);
        self.risk_params.set(risk_params);

        let one = U256::from(WAD_U128);
        self.supply_index.set(one);
        self.borrow_index.set(one);
        self.last_accrual.set(self.env().get_block_time());
        self.cash.set(U256::zero());
        self.total_borrows.set(U256::zero());
        self.total_reserves.set(U256::zero());
    }

    pub fn set_a_token(&mut self, a_token: Address) {
        self.ensure_admin();
        self.a_token.set(a_token);
    }

    pub fn set_registry(&mut self, registry: Address) {
        self.ensure_admin();
        self.registry.set(registry);
    }

    pub fn set_rate_model(&mut self, base_rate_per_sec: U256, slope_rate_per_sec: U256) {
        self.ensure_admin_or_registry();
        let rate_model = RateModel {
            base_rate_per_sec,
            slope_rate_per_sec,
        };
        self.rate_model.set(rate_model);
        self.env().emit_event(RateModelUpdated {
            base_rate_per_sec,
            slope_rate_per_sec,
        });
    }

    pub fn set_risk_params(
        &mut self,
        collateral_factor: U256,
        liquidation_threshold: U256,
        close_factor: U256,
        liquidation_bonus: U256,
        reserve_factor: U256,
        borrow_cap: U256,
        supply_cap: U256,
    ) {
        self.ensure_admin_or_registry();
        let risk_params = RiskParams {
            collateral_factor,
            liquidation_threshold,
            close_factor,
            liquidation_bonus,
            reserve_factor,
            borrow_cap,
            supply_cap,
        };
        self.risk_params.set(risk_params);
        self.env().emit_event(RiskParamsUpdated {
            collateral_factor,
            liquidation_threshold,
            close_factor,
            liquidation_bonus,
            reserve_factor,
            borrow_cap,
            supply_cap,
        });
    }

    pub fn deposit(&mut self, amount: U256) {
        self.ensure_amount_nonzero(&amount);
        self.ensure_supply_not_paused();
        self.accrue_interest();
        self.load_oracle().get_price_checked(self.load_asset());
        let caller = self.env().caller();

        let supply_cap = self.risk_params.get_or_default().supply_cap;
        if !supply_cap.is_zero() {
            let total_supply = self.load_a_token().total_supply();
            let projected = total_supply
                .checked_add(amount)
                .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
            if projected > supply_cap {
                self.env().revert(Error::BorrowTooLarge);
            }
        }
        let market = self.env().self_address();
        let mut asset_token = self.load_asset_token();
        asset_token.transfer_from(&caller, &market, &amount);
        let new_cash = self
            .cash
            .get_or_default()
            .checked_add(amount)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        self.cash.set(new_cash);

        let mut a_token = self.load_a_token();
        a_token.mint(caller, amount);

        self.emit_market_state();
        self.env().emit_event(Deposit { account: caller, amount });
    }

    pub fn withdraw(&mut self, amount: U256) {
        self.ensure_amount_nonzero(&amount);
        self.ensure_withdraw_not_paused();
        self.accrue_interest();
        self.load_oracle().get_price_checked(self.load_asset());
        let caller = self.env().caller();
        let a_token = self.load_a_token();
        let balance = a_token.balance_of(&caller);
        if balance < amount {
            self.env().revert(Error::InsufficientBalance);
        }
        let cash = self.cash.get_or_default();
        if cash < amount {
            self.env().revert(Error::InsufficientLiquidity);
        }
        self.cash.set(cash - amount);

        let mut a_token = self.load_a_token();
        a_token.burn(caller, amount);

        if self.borrow_balances.get_or_default(&caller) > U256::zero()
            && self.is_liquidatable(caller)
        {
            self.env().revert(Error::HealthFactorTooLow);
        }
        let mut asset_token = self.load_asset_token();
        asset_token.transfer(&caller, &amount);

        self.emit_market_state();
        self.env().emit_event(Withdraw { account: caller, amount });
    }

    pub fn borrow(&mut self, amount: U256) {
        self.ensure_amount_nonzero(&amount);
        self.ensure_borrow_not_paused();
        self.accrue_interest();
        let caller = self.env().caller();

        let cash = self.cash.get_or_default();
        if cash < amount {
            self.env().revert(Error::InsufficientLiquidity);
        }

        let asset = self
            .asset
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam);
        let price = self.load_oracle().get_price_checked(asset);
        let collateral = self.load_a_token().balance_of(&caller);
        let collateral_value = wad_mul(collateral, price);

        let current_borrow = self.borrow_balances.get_or_default(&caller);
        let new_borrow = current_borrow
            .checked_add(amount)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        let borrow_value = wad_mul(new_borrow, price);

        let max_borrow = wad_mul(
            collateral_value,
            self.risk_params.get_or_default().collateral_factor,
        );
        if borrow_value > max_borrow {
            self.env().revert(Error::HealthFactorTooLow);
        }

        let borrow_cap = self.risk_params.get_or_default().borrow_cap;
        if !borrow_cap.is_zero() {
            let total = self
                .total_borrows
                .get_or_default()
                .checked_add(amount)
                .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
            if total > borrow_cap {
                self.env().revert(Error::BorrowTooLarge);
            }
        }

        let mut asset_token = self.load_asset_token();
        asset_token.transfer(&caller, &amount);

        self.borrow_balances.set(&caller, new_borrow);
        self.total_borrows
            .set(self.total_borrows.get_or_default() + amount);
        self.cash.set(cash - amount);

        self.emit_market_state();
        self.env().emit_event(Borrow { account: caller, amount });
    }

    pub fn repay(&mut self, amount: U256) {
        self.ensure_amount_nonzero(&amount);
        self.accrue_interest();
        self.load_oracle().get_price_checked(self.load_asset());
        let caller = self.env().caller();
        let current = self.borrow_balances.get_or_default(&caller);
        if current.is_zero() {
            return;
        }
        let repay_amount = if amount > current { current } else { amount };
        let market = self.env().self_address();
        let mut asset_token = self.load_asset_token();
        asset_token.transfer_from(&caller, &market, &repay_amount);
        self.borrow_balances.set(&caller, current - repay_amount);
        self.total_borrows
            .set(self.total_borrows.get_or_default() - repay_amount);
        self.cash
            .set(self.cash.get_or_default() + repay_amount);

        self.emit_market_state();
        self.env().emit_event(Repay {
            account: caller,
            amount: repay_amount,
        });
    }

    pub fn liquidate(&mut self, borrower: Address, repay_amount: U256) {
        self.ensure_amount_nonzero(&repay_amount);
        self.ensure_liquidation_not_paused();
        self.accrue_interest();

        self.load_oracle().get_price_checked(self.load_asset());
        if !self.is_liquidatable(borrower) {
            self.env().revert(Error::NotLiquidatable);
        }

        let close_factor = self.risk_params.get_or_default().close_factor;
        let borrow = self.borrow_balances.get_or_default(&borrower);
        let max_repay = wad_mul(borrow, close_factor);
        let actual_repay = if repay_amount > max_repay {
            max_repay
        } else {
            repay_amount
        };
        if actual_repay.is_zero() {
            self.env().revert(Error::LiquidationTooLarge);
        }

        let bonus = self.risk_params.get_or_default().liquidation_bonus;
        let one = U256::from(WAD_U128);
        let seize = wad_mul(actual_repay, one + bonus);
        let collateral = self.load_a_token().balance_of(&borrower);
        let seize_amount = if seize > collateral { collateral } else { seize };

        self.borrow_balances
            .set(&borrower, borrow - actual_repay);
        self.total_borrows
            .set(self.total_borrows.get_or_default() - actual_repay);
        self.cash
            .set(self.cash.get_or_default() + actual_repay);

        let liquidator = self.env().caller();
        let mut a_token = self.load_a_token();
        a_token.burn(borrower, seize_amount);
        a_token.mint(liquidator, seize_amount);

        self.emit_market_state();
        self.env().emit_event(Liquidate {
            borrower,
            liquidator,
            repay_amount: actual_repay,
            seize_amount,
        });
    }

    pub fn get_cash(&self) -> U256 {
        self.cash.get_or_default()
    }

    pub fn get_borrow_index(&self) -> U256 {
        self.borrow_index.get_or_default()
    }

    pub fn get_supply_index(&self) -> U256 {
        self.supply_index.get_or_default()
    }

    pub fn get_total_borrows(&self) -> U256 {
        self.total_borrows.get_or_default()
    }

    pub fn get_total_reserves(&self) -> U256 {
        self.total_reserves.get_or_default()
    }

    pub fn get_borrow_balance(&self, owner: Address) -> U256 {
        self.borrow_balances.get_or_default(&owner)
    }

    pub fn health_factor(&self, owner: Address) -> U256 {
        let price = self.load_oracle().get_price_checked(self.load_asset());
        let collateral = self.load_a_token().balance_of(&owner);
        let collateral_value = wad_mul(collateral, price);
        let borrow = self.borrow_balances.get_or_default(&owner);
        if borrow.is_zero() {
            return U256::from(WAD_U128);
        }
        let borrow_value = wad_mul(borrow, price);
        let threshold = wad_mul(
            collateral_value,
            self.risk_params.get_or_default().liquidation_threshold,
        );
        wad_mul(threshold, U256::from(WAD_U128) / borrow_value)
    }

    pub fn get_rate_model(&self) -> RateModel {
        self.rate_model.get_or_default()
    }

    pub fn get_risk_params(&self) -> RiskParams {
        self.risk_params.get_or_default()
    }

    pub fn is_liquidatable(&self, owner: Address) -> bool {
        let price = self.load_oracle().get_price_checked(self.load_asset());
        let collateral = self.load_a_token().balance_of(&owner);
        let collateral_value = wad_mul(collateral, price);
        let borrow = self.borrow_balances.get_or_default(&owner);
        if borrow.is_zero() {
            return false;
        }
        let borrow_value = wad_mul(borrow, price);
        let threshold = wad_mul(
            collateral_value,
            self.risk_params.get_or_default().liquidation_threshold,
        );
        borrow_value > threshold
    }

    pub fn get_utilization(&self) -> U256 {
        utilization_rate(
            self.cash.get_or_default(),
            self.total_borrows.get_or_default(),
            self.total_reserves.get_or_default(),
        )
    }

    pub fn get_borrow_rate_per_sec(&self) -> U256 {
        let rate = self.rate_model.get_or_default();
        let util = self.get_utilization();
        let slope_part = wad_mul(rate.slope_rate_per_sec, util);
        rate.base_rate_per_sec
            .checked_add(slope_part)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow))
    }

    pub fn get_supply_rate_per_sec(&self) -> U256 {
        let util = self.get_utilization();
        let borrow_rate = self.get_borrow_rate_per_sec();
        let mut rate = wad_mul(borrow_rate, util);
        let reserve = self.risk_params.get_or_default().reserve_factor;
        let one = U256::from(WAD_U128);
        let keep = one
            .checked_sub(reserve)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        rate = wad_mul(rate, keep);
        rate
    }

    pub fn accrue_interest(&mut self) {
        let now = self.env().get_block_time();
        let last = self.last_accrual.get_or_default();
        if now <= last {
            return;
        }
        let delta_secs = (now - last) / 1000;
        if delta_secs == 0 {
            return;
        }
        self.last_accrual.set(now);

        let borrows = self.total_borrows.get_or_default();
        if borrows.is_zero() {
            return;
        }
        let borrow_rate = self.get_borrow_rate_per_sec();
        let interest_factor = borrow_rate
            .checked_mul(U256::from(delta_secs))
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        let interest = wad_mul(borrows, interest_factor);

        let new_borrows = borrows
            .checked_add(interest)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        self.total_borrows.set(new_borrows);

        let reserve_factor = self.risk_params.get_or_default().reserve_factor;
        let reserve_add = wad_mul(interest, reserve_factor);
        let new_reserves = self
            .total_reserves
            .get_or_default()
            .checked_add(reserve_add)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        self.total_reserves.set(new_reserves);

        let one = U256::from(WAD_U128);
        let borrow_index = self.borrow_index.get_or_default();
        let borrow_index_factor = one
            .checked_add(interest_factor)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        self.borrow_index.set(wad_mul(borrow_index, borrow_index_factor));

        let supply_rate = self.get_supply_rate_per_sec();
        let supply_factor = supply_rate
            .checked_mul(U256::from(delta_secs))
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        let supply_index = self.supply_index.get_or_default();
        let supply_index_factor = one
            .checked_add(supply_factor)
            .unwrap_or_else(|| self.env().revert(Error::MathOverflow));
        self.supply_index.set(wad_mul(supply_index, supply_index_factor));

        self.emit_market_state();
    }

}

impl LendingMarket {
    fn emit_market_state(&self) {
        let cash = self.cash.get_or_default();
        let total_borrows = self.total_borrows.get_or_default();
        let total_reserves = self.total_reserves.get_or_default();
        let supply_index = self.supply_index.get_or_default();
        let borrow_index = self.borrow_index.get_or_default();
        let utilization = self.get_utilization();
        let supply_rate_per_sec = self.get_supply_rate_per_sec();
        let borrow_rate_per_sec = self.get_borrow_rate_per_sec();
        let timestamp = self.env().get_block_time();

        self.env().emit_event(MarketStateUpdated {
            cash,
            total_borrows,
            total_reserves,
            supply_index,
            borrow_index,
            utilization,
            supply_rate_per_sec,
            borrow_rate_per_sec,
            timestamp,
        });
    }

    fn ensure_admin(&self) {
        self.access_control
            .check_role(&MARKET_ADMIN_ROLE, &self.env().caller());
    }

    fn ensure_admin_or_registry(&self) {
        let caller = self.env().caller();
        let is_admin = self
            .access_control
            .has_role(&MARKET_ADMIN_ROLE, &caller);
        let registry = self
            .registry
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam);
        if !is_admin && caller != registry {
            self.env().revert(Error::Unauthorized);
        }
    }

    fn ensure_amount_nonzero(&self, amount: &U256) {
        if amount.is_zero() {
            self.env().revert(Error::InvalidParam);
        }
    }

    fn load_a_token(&self) -> ATokenContractRef {
        let address = self
            .a_token
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam);
        ATokenContractRef::new(self.env(), address)
    }

    fn load_oracle(&self) -> PriceOracleContractRef {
        let address = self
            .oracle
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam);
        PriceOracleContractRef::new(self.env(), address)
    }

    fn load_asset_token(&self) -> Cep18TokenContractRef {
        Cep18TokenContractRef::new(self.env(), self.load_asset())
    }

    fn load_registry(&self) -> MarketRegistryContractRef {
        let address = self
            .registry
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam);
        MarketRegistryContractRef::new(self.env(), address)
    }

    fn load_asset(&self) -> Address {
        self.asset
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam)
    }

    fn load_pause_flags(&self) -> PauseFlags {
        self.load_registry().get_pause_flags(self.load_asset())
    }

    fn ensure_supply_not_paused(&self) {
        if self.load_pause_flags().supply_paused {
            self.env().revert(Error::Paused);
        }
    }

    fn ensure_borrow_not_paused(&self) {
        if self.load_pause_flags().borrow_paused {
            self.env().revert(Error::Paused);
        }
    }

    fn ensure_withdraw_not_paused(&self) {
        if self.load_pause_flags().withdraw_paused {
            self.env().revert(Error::Paused);
        }
    }

    fn ensure_liquidation_not_paused(&self) {
        if self.load_pause_flags().liquidation_paused {
            self.env().revert(Error::Paused);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::a_token::{AToken, ATokenInitArgs};
    use crate::a_token::ATokenHostRef;
    use crate::market_registry::{MarketRegistry, MarketRegistryInitArgs, MarketRegistryHostRef};
    use crate::price_oracle::{PriceOracle, PriceOracleInitArgs};
    use odra::host::Deployer;

    const TEST_MINT_AMOUNT: u64 = 10_000;

    fn deploy_underlying_token(env: &odra::host::HostEnv, admin: Address) -> ATokenHostRef {
        let init_args = ATokenInitArgs {
            name: "Underlying Token".to_string(),
            symbol: "uTKN".to_string(),
            decimals: 9,
            market: admin,
        };
        AToken::deploy(env, init_args)
    }

    fn seed_allowance(
        env: &odra::host::HostEnv,
        token: &mut ATokenHostRef,
        admin: Address,
        owner: Address,
        spender: Address,
        amount: U256,
    ) {
        env.set_caller(admin);
        token.mint(owner, amount);
        env.set_caller(owner);
        token.approve(&spender, &amount);
    }

    fn setup_registry(
        env: &odra::host::HostEnv,
        admin: Address,
        asset: Address,
        market: Address,
        a_token: Address,
        oracle: Address,
    ) -> MarketRegistryHostRef {
        let init_args = MarketRegistryInitArgs { admin };
        let mut registry = MarketRegistry::deploy(env, init_args);
        env.set_caller(admin);
        registry.register_market(asset, market, a_token, oracle);
        registry
    }

    #[test]
    fn deposit_mints_a_token_and_updates_cash() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::from(0u8),
            slope_rate_per_sec: U256::from(0u8),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(0u8),
            liquidation_threshold: U256::from(0u8),
            close_factor: U256::from(0u8),
            liquidation_bonus: U256::from(0u8),
            reserve_factor: U256::from(0u8),
            borrow_cap: U256::from(0u8),
            supply_cap: U256::from(0u8),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));

        assert_eq!(market.get_cash(), U256::from(100u64));
        assert_eq!(a_token.balance_of(&user), U256::from(100u64));
    }

    #[test]
    fn accrue_interest_increases_borrows_and_reserves() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::from(WAD_U128 / 10),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::from(WAD_U128 / 10),
            borrow_cap: U256::zero(),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let init_args = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, init_args);
        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            admin,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(admin);
        market.deposit(U256::from(100u64));
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(100u64));

        env.advance_block_time(10_000u64);

        market.accrue_interest();

        assert_eq!(market.get_total_borrows(), U256::from(150u64));
        assert_eq!(market.get_total_reserves(), U256::from(5u64));
        assert!(market.get_borrow_index() > U256::from(WAD_U128));
        assert!(market.get_supply_index() > U256::from(WAD_U128));
    }

    #[test]
    fn borrow_and_repay_respects_ltv() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128 * 75 / 100),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(1_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(70u64));
        let too_much = market.try_borrow(U256::from(10u64));
        assert_eq!(too_much, Err(Error::HealthFactorTooLow.into()));

        market.repay(U256::from(30u64));
        assert_eq!(market.get_total_borrows(), U256::from(40u64));
    }

    #[test]
    fn borrow_rejected_when_paused() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(1_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let mut registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        let flags = registry.get_pause_flags(asset);
        registry.set_pause_flags(
            asset,
            flags.supply_paused,
            true,
            flags.withdraw_paused,
            flags.repay_paused,
            flags.liquidation_paused,
        );

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        let result = market.try_borrow(U256::from(10u64));
        assert_eq!(result, Err(Error::Paused.into()));
    }

    #[test]
    fn liquidation_seizes_collateral_with_bonus() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let liquidator = env.get_account(2);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(4);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::from(WAD_U128 * 80 / 100),
            close_factor: U256::from(WAD_U128 / 2),
            liquidation_bonus: U256::from(WAD_U128 * 5 / 100),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(10_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(5);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(90u64));

        env.set_caller(liquidator);
        market.liquidate(user, U256::from(50u64));

        assert_eq!(market.get_borrow_balance(user), U256::from(45u64));
        assert_eq!(a_token.balance_of(&liquidator), U256::from(47u64));
    }

    #[test]
    fn liquidation_rejected_when_healthy() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let liquidator = env.get_account(2);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(4);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::from(WAD_U128 * 90 / 100),
            close_factor: U256::from(WAD_U128 / 2),
            liquidation_bonus: U256::from(WAD_U128 * 5 / 100),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(10_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(5);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(50u64));

        env.set_caller(liquidator);
        let result = market.try_liquidate(user, U256::from(10u64));
        assert_eq!(result, Err(Error::NotLiquidatable.into()));
    }

    #[test]
    fn deposit_emits_event() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams::default();

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(10u64));

        assert!(env.emitted_event(
            &market.address(),
            Deposit {
                account: user,
                amount: U256::from(10u64),
            }
        ));
    }

    #[test]
    fn borrow_emits_event() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(1_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(10u64));

        assert!(env.emitted_event(
            &market.address(),
            Borrow {
                account: user,
                amount: U256::from(10u64),
            }
        ));
    }

    #[test]
    fn repay_emits_event() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(1_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(20u64));
        market.repay(U256::from(5u64));

        assert!(env.emitted_event(
            &market.address(),
            Repay {
                account: user,
                amount: U256::from(5u64),
            }
        ));
    }

    #[test]
    fn withdraw_emits_event() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams::default();

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(20u64));
        market.withdraw(U256::from(5u64));

        assert!(env.emitted_event(
            &market.address(),
            Withdraw {
                account: user,
                amount: U256::from(5u64),
            }
        ));
    }

    #[test]
    fn liquidate_emits_event() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let liquidator = env.get_account(2);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(4);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::from(WAD_U128 * 80 / 100),
            close_factor: U256::from(WAD_U128 / 2),
            liquidation_bonus: U256::from(WAD_U128 * 5 / 100),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(10_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(5);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(90u64));

        env.set_caller(liquidator);
        market.liquidate(user, U256::from(50u64));

        assert!(env.emitted_event(
            &market.address(),
            Liquidate {
                borrower: user,
                liquidator,
                repay_amount: U256::from(45u64),
                seize_amount: U256::from(47u64),
            }
        ));
    }

    #[test]
    fn withdraw_blocked_when_unhealthy() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128 * 75 / 100),
            liquidation_threshold: U256::from(WAD_U128 * 80 / 100),
            close_factor: U256::from(WAD_U128 / 2),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(10_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        seed_allowance(
            &env,
            &mut underlying,
            admin,
            admin,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));

        env.set_caller(admin);
        market.deposit(U256::from(100u64));

        env.set_caller(user);
        market.borrow(U256::from(70u64));
        let result = market.try_withdraw(U256::from(50u64));
        assert_eq!(result, Err(Error::HealthFactorTooLow.into()));
    }

    #[test]
    fn borrow_rejected_on_stale_oracle() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(1_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 1_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));

        env.advance_block_time(2_000u64);
        let result = market.try_borrow(U256::from(10u64));
        assert_eq!(result, Err(Error::PriceStale.into()));
    }

    #[test]
    fn liquidate_rejected_on_stale_oracle() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let liquidator = env.get_account(2);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(4);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::from(WAD_U128 * 80 / 100),
            close_factor: U256::from(WAD_U128 / 2),
            liquidation_bonus: U256::from(WAD_U128 * 5 / 100),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(10_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(5);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 1_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(90u64));

        env.advance_block_time(2_000u64);
        env.set_caller(liquidator);
        let result = market.try_liquidate(user, U256::from(50u64));
        assert_eq!(result, Err(Error::PriceStale.into()));
    }

    #[test]
    fn withdraw_rejected_on_stale_oracle() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams::default();

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 1_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(50u64));

        env.advance_block_time(2_000u64);
        let result = market.try_withdraw(U256::from(10u64));
        assert_eq!(result, Err(Error::PriceStale.into()));
    }

    #[test]
    fn repay_rejected_on_stale_oracle() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams {
            collateral_factor: U256::from(WAD_U128),
            liquidation_threshold: U256::zero(),
            close_factor: U256::zero(),
            liquidation_bonus: U256::zero(),
            reserve_factor: U256::zero(),
            borrow_cap: U256::from(1_000u64),
            supply_cap: U256::zero(),
        };

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 1_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        market.borrow(U256::from(10u64));

        env.advance_block_time(2_000u64);
        let result = market.try_repay(U256::from(5u64));
        assert_eq!(result, Err(Error::PriceStale.into()));
    }

    #[test]
    fn admin_can_update_params() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let asset = env.get_account(1);
        let oracle = env.get_account(2);
        let registry = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let risk_params = RiskParams::default();

        let init_args = LendingMarketInitArgs {
            admin,
            asset,
            a_token: env.get_account(4),
            oracle,
            registry,
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, init_args);

        env.set_caller(admin);
        let base_rate_per_sec = U256::from(1u8);
        let slope_rate_per_sec = U256::from(2u8);
        let mut new_params = RiskParams::default();
        new_params.reserve_factor = U256::from(WAD_U128 / 10);

        market.set_rate_model(base_rate_per_sec, slope_rate_per_sec);
        market.set_risk_params(
            new_params.collateral_factor,
            new_params.liquidation_threshold,
            new_params.close_factor,
            new_params.liquidation_bonus,
            new_params.reserve_factor,
            new_params.borrow_cap,
            new_params.supply_cap,
        );

        let got_rate = market.get_rate_model();
        let got_params = market.get_risk_params();
        assert_eq!(got_rate.base_rate_per_sec, U256::from(1u8));
        assert_eq!(got_rate.slope_rate_per_sec, U256::from(2u8));
        assert_eq!(got_params.reserve_factor, U256::from(WAD_U128 / 10));
    }

    #[test]
    fn supply_cap_enforced() {
        let env = odra_test::env();
        let admin = env.get_account(0);
        let user = env.get_account(1);
        let mut underlying = deploy_underlying_token(&env, admin);
        let asset = underlying.address();
        let oracle_admin = env.get_account(3);

        let rate_model = RateModel {
            base_rate_per_sec: U256::zero(),
            slope_rate_per_sec: U256::zero(),
        };
        let mut risk_params = RiskParams::default();
        risk_params.supply_cap = U256::from(150u64);

        let placeholder_token = env.get_account(4);
        let oracle_init = PriceOracleInitArgs {
            admin: oracle_admin,
            max_stale_millis: 10_000u64,
        };
        let mut oracle = PriceOracle::deploy(&env, oracle_init);
        env.set_caller(oracle_admin);
        oracle.set_price(asset, U256::from(WAD_U128));

        let market_init = LendingMarketInitArgs {
            admin,
            asset,
            a_token: placeholder_token,
            oracle: oracle.address(),
            registry: env.get_account(9),
            rate_model,
            risk_params,
        };
        let mut market = LendingMarket::deploy(&env, market_init);

        let token_init = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market: market.address(),
        };
        let a_token = AToken::deploy(&env, token_init);
        let registry = setup_registry(
            &env,
            admin,
            asset,
            market.address(),
            a_token.address(),
            oracle.address(),
        );

        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        seed_allowance(
            &env,
            &mut underlying,
            admin,
            user,
            market.address(),
            U256::from(TEST_MINT_AMOUNT),
        );
        env.set_caller(user);
        market.deposit(U256::from(100u64));
        let result = market.try_deposit(U256::from(60u64));
        assert_eq!(result, Err(Error::BorrowTooLarge.into()));
    }
}
