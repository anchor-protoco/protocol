use odra::casper_types::U256;
use odra::prelude::*;

pub type Timestamp = u64;

#[derive(Default)]
#[odra::odra_type]
pub struct RateModel {
    pub base_rate_per_sec: U256,
    pub slope_rate_per_sec: U256,
}

#[derive(Default)]
#[odra::odra_type]
pub struct RiskParams {
    pub collateral_factor: U256,
    pub liquidation_threshold: U256,
    pub close_factor: U256,
    pub liquidation_bonus: U256,
    pub reserve_factor: U256,
    pub borrow_cap: U256,
    pub supply_cap: U256,
}

#[odra::odra_type]
pub struct PauseFlags {
    pub supply_paused: bool,
    pub borrow_paused: bool,
    pub withdraw_paused: bool,
    pub repay_paused: bool,
    pub liquidation_paused: bool,
}

#[odra::odra_type]
pub struct OraclePrice {
    pub price: U256,
    pub last_updated: Timestamp,
}

#[odra::odra_type]
pub struct MarketAddresses {
    pub market: Address,
    pub a_token: Address,
    pub oracle: Address,
}
