use odra::casper_types::U256;

pub const WAD_U128: u128 = 1_000_000_000_000_000_000;

fn wad_u256() -> U256 {
    U256::from(WAD_U128)
}

pub fn wad_mul(a: U256, b: U256) -> U256 {
    let wad = wad_u256();
    let half = wad / U256::from(2u8);
    a.checked_mul(b)
        .and_then(|v| v.checked_add(half))
        .and_then(|v| v.checked_div(wad))
        .unwrap_or_else(|| panic!("wad_mul overflow"))
}

pub fn wad_div(a: U256, b: U256) -> U256 {
    let wad = wad_u256();
    let half = b / U256::from(2u8);
    a.checked_mul(wad)
        .and_then(|v| v.checked_add(half))
        .and_then(|v| v.checked_div(b))
        .unwrap_or_else(|| panic!("wad_div overflow"))
}

pub fn utilization_rate(cash: U256, borrows: U256, reserves: U256) -> U256 {
    if borrows.is_zero() {
        return U256::zero();
    }
    let denom = cash
        .checked_add(borrows)
        .and_then(|v| v.checked_sub(reserves))
        .unwrap_or_else(|| panic!("utilization denom"));
    if denom.is_zero() {
        return U256::zero();
    }
    wad_div(borrows, denom)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wad_mul_rounds_half_up() {
        let a = U256::from(WAD_U128);
        let b = U256::from(WAD_U128) / U256::from(2u8);
        assert_eq!(wad_mul(a, b), U256::from(WAD_U128 / 2));
    }

    #[test]
    fn wad_div_rounds_half_up() {
        let a = U256::from(WAD_U128);
        let b = U256::from(WAD_U128) * U256::from(2u8);
        assert_eq!(wad_div(a, b), U256::from(WAD_U128 / 2));
    }

    #[test]
    fn utilization_zero_borrows() {
        let cash = U256::from(100u64);
        let borrows = U256::zero();
        let reserves = U256::zero();
        assert_eq!(utilization_rate(cash, borrows, reserves), U256::zero());
    }

    #[test]
    fn utilization_basic() {
        let cash = U256::from(100u64);
        let borrows = U256::from(100u64);
        let reserves = U256::zero();
        let util = utilization_rate(cash, borrows, reserves);
        assert_eq!(util, U256::from(WAD_U128 / 2));
    }
}
