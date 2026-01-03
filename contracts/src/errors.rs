use odra::prelude::*;

#[odra::odra_error]
pub enum Error {
    Unauthorized = 1_000,
    Paused = 1_001,
    InvalidParam = 1_002,
    PriceStale = 1_003,
    PriceMissing = 1_004,
    MathOverflow = 1_005,
    InsufficientLiquidity = 1_006,
    BorrowTooLarge = 1_007,
    HealthFactorTooLow = 1_008,
    LiquidationTooLarge = 1_009,
    MarketNotFound = 1_010,
    MarketAlreadyRegistered = 1_011,
    InsufficientBalance = 1_012,
    NotLiquidatable = 1_013,
}
