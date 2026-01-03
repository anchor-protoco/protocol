#![cfg_attr(not(test), no_std)]
#![cfg_attr(not(test), no_main)]
extern crate alloc;

pub mod flipper;
pub mod market_registry;
pub mod lending_market;
pub mod price_oracle;
pub mod a_token;
pub mod cep18_interface;
pub mod types;
pub mod math;
pub mod errors;
pub mod events;
