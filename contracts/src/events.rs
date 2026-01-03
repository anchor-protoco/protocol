use odra::prelude::*;

#[odra::event]
pub struct MarketRegistered {
    pub asset: Address,
    pub market: Address,
    pub a_token: Address,
    pub oracle: Address,
}

#[odra::event]
pub struct MarketActiveUpdated {
    pub asset: Address,
    pub is_active: bool,
}

#[odra::event]
pub struct PauseFlagsUpdated {
    pub asset: Address,
    pub supply_paused: bool,
    pub borrow_paused: bool,
    pub withdraw_paused: bool,
    pub repay_paused: bool,
    pub liquidation_paused: bool,
}

#[odra::event]
pub struct PriceUpdated {
    pub asset: Address,
    pub price: odra::casper_types::U256,
    pub timestamp: u64,
}

#[odra::event]
pub struct RateModelUpdated {
    pub base_rate_per_sec: odra::casper_types::U256,
    pub slope_rate_per_sec: odra::casper_types::U256,
}

#[odra::event]
pub struct RiskParamsUpdated {
    pub collateral_factor: odra::casper_types::U256,
    pub liquidation_threshold: odra::casper_types::U256,
    pub close_factor: odra::casper_types::U256,
    pub liquidation_bonus: odra::casper_types::U256,
    pub reserve_factor: odra::casper_types::U256,
    pub borrow_cap: odra::casper_types::U256,
    pub supply_cap: odra::casper_types::U256,
}

#[odra::event]
pub struct MarketStateUpdated {
    pub cash: odra::casper_types::U256,
    pub total_borrows: odra::casper_types::U256,
    pub total_reserves: odra::casper_types::U256,
    pub supply_index: odra::casper_types::U256,
    pub borrow_index: odra::casper_types::U256,
    pub utilization: odra::casper_types::U256,
    pub supply_rate_per_sec: odra::casper_types::U256,
    pub borrow_rate_per_sec: odra::casper_types::U256,
    pub timestamp: u64,
}

#[odra::event]
pub struct Deposit {
    pub account: Address,
    pub amount: odra::casper_types::U256,
}

#[odra::event]
pub struct Withdraw {
    pub account: Address,
    pub amount: odra::casper_types::U256,
}

#[odra::event]
pub struct Borrow {
    pub account: Address,
    pub amount: odra::casper_types::U256,
}

#[odra::event]
pub struct Repay {
    pub account: Address,
    pub amount: odra::casper_types::U256,
}

#[odra::event]
pub struct Liquidate {
    pub borrower: Address,
    pub liquidator: Address,
    pub repay_amount: odra::casper_types::U256,
    pub seize_amount: odra::casper_types::U256,
}
