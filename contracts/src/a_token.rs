use odra::casper_types::U256;
use odra::prelude::*;
use odra_modules::cep18_token::Cep18;

use crate::errors::Error;

#[odra::module(errors = Error)]
pub struct AToken {
    token: SubModule<Cep18>,
    market: Var<Address>,
}

#[odra::module]
impl AToken {
    pub fn init(&mut self, name: String, symbol: String, decimals: u8, market: Address) {
        self.market.set(market);
        self.token.init(symbol, name, decimals, U256::zero());
    }

    delegate! {
        to self.token {
            fn name(&self) -> String;
            fn symbol(&self) -> String;
            fn decimals(&self) -> u8;
            fn total_supply(&self) -> U256;
            fn balance_of(&self, address: &Address) -> U256;
            fn allowance(&self, owner: &Address, spender: &Address) -> U256;
            fn approve(&mut self, spender: &Address, amount: &U256);
            fn decrease_allowance(&mut self, spender: &Address, decr_by: &U256);
            fn increase_allowance(&mut self, spender: &Address, inc_by: &U256);
            fn transfer(&mut self, recipient: &Address, amount: &U256);
            fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256);
        }
    }

    pub fn mint(&mut self, to: Address, amount: U256) {
        self.ensure_market();
        self.token.raw_mint(&to, &amount);
    }

    pub fn burn(&mut self, from: Address, amount: U256) {
        self.ensure_market();
        self.token.raw_burn(&from, &amount);
    }

    pub fn get_market(&self) -> Address {
        self.market
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam)
    }
}

impl AToken {
    fn ensure_market(&self) {
        let market = self
            .market
            .get()
            .unwrap_or_revert_with(&self.env(), Error::InvalidParam);
        if self.env().caller() != market {
            self.env().revert(Error::Unauthorized);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::errors::Error;
    use odra::host::Deployer;

    #[test]
    fn market_can_mint_and_transfer() {
        let env = odra_test::env();
        let market = env.get_account(0);
        let user = env.get_account(1);
        let init_args = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market,
        };
        let mut token = AToken::deploy(&env, init_args);

        env.set_caller(market);
        token.mint(user, U256::from(100u64));

        let balance = token.balance_of(&user);
        assert_eq!(balance, U256::from(100u64));
        assert_eq!(token.total_supply(), U256::from(100u64));

        env.set_caller(user);
        token.transfer(&market, &U256::from(40u64));
        assert_eq!(token.balance_of(&user), U256::from(60u64));
    }

    #[test]
    fn non_market_cannot_mint() {
        let env = odra_test::env();
        let market = env.get_account(0);
        let user = env.get_account(1);
        let init_args = ATokenInitArgs {
            name: "Anchor Token".to_string(),
            symbol: "aTKN".to_string(),
            decimals: 9,
            market,
        };
        let mut token = AToken::deploy(&env, init_args);

        env.set_caller(user);
        let result = token.try_mint(user, U256::from(1u64));
        assert_eq!(result, Err(Error::Unauthorized.into()));
    }
}
