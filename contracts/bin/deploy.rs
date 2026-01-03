//! Deploys Anchor Protocol contracts to livenet/testnet using Odra CLI.

use anchor_protocol::a_token::{AToken, ATokenInitArgs};
use anchor_protocol::lending_market::{LendingMarket, LendingMarketHostRef, LendingMarketInitArgs};
use anchor_protocol::market_registry::{MarketRegistry, MarketRegistryInitArgs};
use anchor_protocol::math::WAD_U128;
use anchor_protocol::price_oracle::{PriceOracle, PriceOracleHostRef, PriceOracleInitArgs};
use anchor_protocol::types::{RateModel, RiskParams};
use odra::casper_types::U256;
use odra::host::{Deployer, HostEnv, HostRefLoader};
use odra::prelude::*;
use odra::schema::casper_contract_schema::NamedCLType;
use odra_cli::{
    deploy::DeployScript,
    scenario::{Args, Error, Scenario, ScenarioMetadata},
    CommandArg, ContractProvider, DeployedContractsContainer, DeployerExt, OdraCli,
};
use std::env;
use std::str::FromStr;

const GAS: u64 = 700_000_000_000;

pub struct AnchorDeployScript;

impl DeployScript for AnchorDeployScript {
    fn deploy(
        &self,
        env: &HostEnv,
        container: &mut DeployedContractsContainer,
    ) -> Result<(), odra_cli::deploy::Error> {
        let admin = env.get_account(0);
        let oracle_admin = admin;
        let asset = parse_address("ANCHOR_ASSET_ADDRESS", admin);

        let max_stale_millis = parse_u64("ANCHOR_ORACLE_MAX_STALE_MILLIS", 60_000u64);
        let asset_price = parse_u256("ANCHOR_ASSET_PRICE_WAD", U256::from(WAD_U128));
        let core_only = env_bool("ANCHOR_DEPLOY_CORE_ONLY");

        let rate_model = RateModel {
            base_rate_per_sec: parse_u256("ANCHOR_BASE_RATE_PER_SEC", U256::zero()),
            slope_rate_per_sec: parse_u256("ANCHOR_SLOPE_RATE_PER_SEC", U256::zero()),
        };
        let risk_params = RiskParams {
            collateral_factor: parse_u256("ANCHOR_COLLATERAL_FACTOR", U256::from(WAD_U128 * 75 / 100)),
            liquidation_threshold: parse_u256(
                "ANCHOR_LIQ_THRESHOLD",
                U256::from(WAD_U128 * 80 / 100),
            ),
            close_factor: parse_u256("ANCHOR_CLOSE_FACTOR", U256::from(WAD_U128 / 2)),
            liquidation_bonus: parse_u256("ANCHOR_LIQ_BONUS", U256::from(WAD_U128 * 5 / 100)),
            reserve_factor: parse_u256("ANCHOR_RESERVE_FACTOR", U256::from(WAD_U128 / 10)),
            borrow_cap: parse_u256("ANCHOR_BORROW_CAP", U256::zero()),
            supply_cap: parse_u256("ANCHOR_SUPPLY_CAP", U256::zero()),
        };

        env.set_gas(GAS);
        let mut registry = MarketRegistry::load_or_deploy(
            env,
            MarketRegistryInitArgs { admin },
            container,
            GAS,
        )?;

        env.set_gas(GAS);
        let mut oracle = PriceOracle::load_or_deploy(
            env,
            PriceOracleInitArgs {
                admin: oracle_admin,
                max_stale_millis,
            },
            container,
            GAS,
        )?;

        if core_only {
            return Ok(());
        }

        env.set_gas(GAS);
        let mut market = LendingMarket::load_or_deploy(
            env,
            LendingMarketInitArgs {
                admin,
                asset,
                a_token: admin,
                oracle: oracle.address(),
                registry: registry.address(),
                rate_model,
                risk_params,
            },
            container,
            GAS,
        )?;

        let name = env_var("ANCHOR_ATOKEN_NAME").unwrap_or_else(|| "Anchor Token".to_string());
        let symbol = env_var("ANCHOR_ATOKEN_SYMBOL").unwrap_or_else(|| "aTKN".to_string());
        let decimals = parse_u8("ANCHOR_ATOKEN_DECIMALS", 9);

        env.set_gas(GAS);
        let a_token = AToken::load_or_deploy(
            env,
            ATokenInitArgs {
                name,
                symbol,
                decimals,
                market: market.address(),
            },
            container,
            GAS,
        )?;

        env.set_gas(GAS);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        env.set_caller(oracle_admin);
        oracle.set_price(asset, asset_price);
        registry.register_market(asset, market.address(), a_token.address(), oracle.address());

        Ok(())
    }
}

/// Scenario that deploys a new market and registers it in the existing registry.
pub struct AddMarketScenario;

impl Scenario for AddMarketScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![CommandArg::new(
            "asset",
            "Asset address (e.g. hash-... or account-hash-...)",
            NamedCLType::String,
        )]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let admin = env.get_account(0);
        let oracle_admin = admin;
        let asset_str = args.get_single::<String>("asset")?;
        let asset = Address::from_str(&asset_str).unwrap();

        let rate_model = RateModel {
            base_rate_per_sec: parse_u256("ANCHOR_BASE_RATE_PER_SEC", U256::zero()),
            slope_rate_per_sec: parse_u256("ANCHOR_SLOPE_RATE_PER_SEC", U256::zero()),
        };
        let risk_params = RiskParams {
            collateral_factor: parse_u256("ANCHOR_COLLATERAL_FACTOR", U256::from(WAD_U128 * 75 / 100)),
            liquidation_threshold: parse_u256(
                "ANCHOR_LIQ_THRESHOLD",
                U256::from(WAD_U128 * 80 / 100),
            ),
            close_factor: parse_u256("ANCHOR_CLOSE_FACTOR", U256::from(WAD_U128 / 2)),
            liquidation_bonus: parse_u256("ANCHOR_LIQ_BONUS", U256::from(WAD_U128 * 5 / 100)),
            reserve_factor: parse_u256("ANCHOR_RESERVE_FACTOR", U256::from(WAD_U128 / 10)),
            borrow_cap: parse_u256("ANCHOR_BORROW_CAP", U256::zero()),
            supply_cap: parse_u256("ANCHOR_SUPPLY_CAP", U256::zero()),
        };

        let mut registry = container.contract_ref::<MarketRegistry>(env)?;
        let mut oracle = container.contract_ref::<PriceOracle>(env)?;

        env.set_gas(GAS);
        let mut market = LendingMarket::deploy(
            env,
            LendingMarketInitArgs {
                admin,
                asset,
                a_token: admin,
                oracle: oracle.address(),
                registry: registry.address(),
                rate_model,
                risk_params,
            },
        );

        let name = env_var("ANCHOR_ATOKEN_NAME").unwrap_or_else(|| "Anchor Token".to_string());
        let symbol = env_var("ANCHOR_ATOKEN_SYMBOL").unwrap_or_else(|| "aTKN".to_string());
        let decimals = parse_u8("ANCHOR_ATOKEN_DECIMALS", 9);

        env.set_gas(GAS);
        let a_token = AToken::deploy(
            env,
            ATokenInitArgs {
                name,
                symbol,
                decimals,
                market: market.address(),
            },
        );

        env.set_gas(GAS);
        env.set_caller(admin);
        market.set_a_token(a_token.address());
        market.set_registry(registry.address());

        if let Some(price_value) = env_var("ANCHOR_ASSET_PRICE_WAD") {
            if let Ok(price) = U256::from_dec_str(&price_value) {
                env.set_caller(oracle_admin);
                oracle.set_price(asset, price);
            }
        }

        env.set_caller(admin);
        registry.register_market(asset, market.address(), a_token.address(), oracle.address());

        Ok(())
    }
}

impl ScenarioMetadata for AddMarketScenario {
    const NAME: &'static str = "add-market";
    const DESCRIPTION: &'static str =
        "Deploys a new market and registers it in the existing registry";
}

pub struct SupplyScenario;

impl Scenario for SupplyScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("amount", "Deposit amount (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let amount = parse_u256_arg(&args, "amount");
        let (mut market, mut oracle) = load_market_and_oracle(env, container, asset)?;

        env.set_gas(GAS);
        refresh_price_if_configured(env, &mut oracle, asset);

        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        market.deposit(amount);
        Ok(())
    }
}

impl ScenarioMetadata for SupplyScenario {
    const NAME: &'static str = "supply";
    const DESCRIPTION: &'static str = "Supplies liquidity (deposit)";
}

pub struct BorrowScenario;

impl Scenario for BorrowScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("deposit", "Collateral deposit (U256)", NamedCLType::String),
            CommandArg::new("amount", "Borrow amount (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let deposit = parse_u256_arg(&args, "deposit");
        let amount = parse_u256_arg(&args, "amount");
        let (mut market, mut oracle) = load_market_and_oracle(env, container, asset)?;

        env.set_gas(GAS);
        refresh_price_if_configured(env, &mut oracle, asset);

        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        market.deposit(deposit);
        env.set_gas(GAS);
        market.borrow(amount);
        Ok(())
    }
}

impl ScenarioMetadata for BorrowScenario {
    const NAME: &'static str = "borrow";
    const DESCRIPTION: &'static str = "Deposits then borrows from the market";
}

pub struct RepayScenario;

impl Scenario for RepayScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("deposit", "Collateral deposit (U256)", NamedCLType::String),
            CommandArg::new("borrow", "Borrow amount (U256)", NamedCLType::String),
            CommandArg::new("repay", "Repay amount (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let deposit = parse_u256_arg(&args, "deposit");
        let borrow_amount = parse_u256_arg(&args, "borrow");
        let repay_amount = parse_u256_arg(&args, "repay");
        let (mut market, mut oracle) = load_market_and_oracle(env, container, asset)?;

        env.set_gas(GAS);
        refresh_price_if_configured(env, &mut oracle, asset);

        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        market.deposit(deposit);
        env.set_gas(GAS);
        market.borrow(borrow_amount);
        env.set_gas(GAS);
        market.repay(repay_amount);
        Ok(())
    }
}

impl ScenarioMetadata for RepayScenario {
    const NAME: &'static str = "repay";
    const DESCRIPTION: &'static str = "Deposits, borrows, then repays";
}

pub struct WithdrawScenario;

impl Scenario for WithdrawScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("deposit", "Deposit amount (U256)", NamedCLType::String),
            CommandArg::new("amount", "Withdraw amount (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let deposit = parse_u256_arg(&args, "deposit");
        let amount = parse_u256_arg(&args, "amount");
        let (mut market, mut oracle) = load_market_and_oracle(env, container, asset)?;

        env.set_gas(GAS);
        refresh_price_if_configured(env, &mut oracle, asset);

        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        market.deposit(deposit);
        env.set_gas(GAS);
        market.withdraw(amount);
        Ok(())
    }
}

impl ScenarioMetadata for WithdrawScenario {
    const NAME: &'static str = "withdraw";
    const DESCRIPTION: &'static str = "Deposits then withdraws";
}

pub struct LiquidateScenario;

impl Scenario for LiquidateScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("deposit", "Borrower deposit (U256)", NamedCLType::String),
            CommandArg::new("borrow", "Borrow amount (U256)", NamedCLType::String),
            CommandArg::new("repay", "Liquidator repay amount (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let deposit = parse_u256_arg(&args, "deposit");
        let borrow_amount = parse_u256_arg(&args, "borrow");
        let repay_amount = parse_u256_arg(&args, "repay");

        let mut registry = container.contract_ref::<MarketRegistry>(env)?;
        let (mut market, mut oracle) = load_market_and_oracle(env, container, asset)?;

        env.set_gas(GAS);
        refresh_price_if_configured(env, &mut oracle, asset);

        let borrower = env.get_account(0);
        let liquidator = env.get_account(0);

        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        let normal_collateral =
            parse_u256("ANCHOR_COLLATERAL_FACTOR", U256::from(WAD_U128 * 75 / 100));
        let normal_threshold =
            parse_u256("ANCHOR_LIQ_THRESHOLD", U256::from(WAD_U128 * 80 / 100));
        let normal_close = parse_u256("ANCHOR_CLOSE_FACTOR", U256::from(WAD_U128 / 2));
        let normal_bonus = parse_u256("ANCHOR_LIQ_BONUS", U256::from(WAD_U128 * 5 / 100));
        let normal_reserve = parse_u256("ANCHOR_RESERVE_FACTOR", U256::from(WAD_U128 / 10));
        let normal_borrow_cap = parse_u256("ANCHOR_BORROW_CAP", U256::zero());
        let normal_supply_cap = parse_u256("ANCHOR_SUPPLY_CAP", U256::zero());
        registry.update_market_risk_params(
            asset,
            normal_collateral,
            normal_threshold,
            normal_close,
            normal_bonus,
            normal_reserve,
            normal_borrow_cap,
            normal_supply_cap,
        );

        env.set_caller(borrower);
        env.set_gas(GAS);
        market.deposit(deposit);
        env.set_gas(GAS);
        market.borrow(borrow_amount);

        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        let scenario_collateral =
            parse_u256("ANCHOR_LIQ_SCENARIO_COLLATERAL_FACTOR", U256::from(WAD_U128 / 10));
        let scenario_threshold =
            parse_u256("ANCHOR_LIQ_SCENARIO_THRESHOLD", U256::from(WAD_U128 / 10));
        let scenario_close = parse_u256("ANCHOR_CLOSE_FACTOR", U256::from(WAD_U128 / 2));
        let scenario_bonus = parse_u256("ANCHOR_LIQ_BONUS", U256::from(WAD_U128 * 5 / 100));
        let scenario_reserve = parse_u256("ANCHOR_RESERVE_FACTOR", U256::from(WAD_U128 / 10));
        let scenario_borrow_cap = parse_u256("ANCHOR_BORROW_CAP", U256::zero());
        let scenario_supply_cap = parse_u256("ANCHOR_SUPPLY_CAP", U256::zero());
        registry.update_market_risk_params(
            asset,
            scenario_collateral,
            scenario_threshold,
            scenario_close,
            scenario_bonus,
            scenario_reserve,
            scenario_borrow_cap,
            scenario_supply_cap,
        );

        env.set_caller(liquidator);
        env.set_gas(GAS);
        market.liquidate(borrower, repay_amount);
        Ok(())
    }
}

impl ScenarioMetadata for LiquidateScenario {
    const NAME: &'static str = "liquidate";
    const DESCRIPTION: &'static str = "Deposits, borrows, then liquidates";
}

pub struct PauseScenario;

impl Scenario for PauseScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("supply", "Pause supply", NamedCLType::Bool),
            CommandArg::new("borrow", "Pause borrow", NamedCLType::Bool),
            CommandArg::new("withdraw", "Pause withdraw", NamedCLType::Bool),
            CommandArg::new("repay", "Pause repay", NamedCLType::Bool),
            CommandArg::new("liquidate", "Pause liquidation", NamedCLType::Bool),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let supply_paused = args.get_single::<bool>("supply")?;
        let borrow_paused = args.get_single::<bool>("borrow")?;
        let withdraw_paused = args.get_single::<bool>("withdraw")?;
        let repay_paused = args.get_single::<bool>("repay")?;
        let liquidation_paused = args.get_single::<bool>("liquidate")?;

        let mut registry = container.contract_ref::<MarketRegistry>(env)?;
        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        registry.set_pause_flags(
            asset,
            supply_paused,
            borrow_paused,
            withdraw_paused,
            repay_paused,
            liquidation_paused,
        );
        Ok(())
    }
}

impl ScenarioMetadata for PauseScenario {
    const NAME: &'static str = "pause";
    const DESCRIPTION: &'static str = "Updates pause flags for a market";
}

pub struct UpdateParamsScenario;

impl Scenario for UpdateParamsScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("base_rate", "Base rate per sec (U256)", NamedCLType::String),
            CommandArg::new("slope_rate", "Slope rate per sec (U256)", NamedCLType::String),
            CommandArg::new("collateral", "Collateral factor (U256)", NamedCLType::String),
            CommandArg::new("liq_threshold", "Liquidation threshold (U256)", NamedCLType::String),
            CommandArg::new("close_factor", "Close factor (U256)", NamedCLType::String),
            CommandArg::new("liq_bonus", "Liquidation bonus (U256)", NamedCLType::String),
            CommandArg::new("reserve", "Reserve factor (U256)", NamedCLType::String),
            CommandArg::new("borrow_cap", "Borrow cap (U256)", NamedCLType::String),
            CommandArg::new("supply_cap", "Supply cap (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let base_rate = parse_u256_arg(&args, "base_rate");
        let slope_rate = parse_u256_arg(&args, "slope_rate");
        let collateral = parse_u256_arg(&args, "collateral");
        let liq_threshold = parse_u256_arg(&args, "liq_threshold");
        let close_factor = parse_u256_arg(&args, "close_factor");
        let liq_bonus = parse_u256_arg(&args, "liq_bonus");
        let reserve = parse_u256_arg(&args, "reserve");
        let borrow_cap = parse_u256_arg(&args, "borrow_cap");
        let supply_cap = parse_u256_arg(&args, "supply_cap");

        let mut registry = container.contract_ref::<MarketRegistry>(env)?;
        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        registry.update_market_rate_model(asset, base_rate, slope_rate);
        env.set_gas(GAS);
        registry.update_market_risk_params(
            asset,
            collateral,
            liq_threshold,
            close_factor,
            liq_bonus,
            reserve,
            borrow_cap,
            supply_cap,
        );
        Ok(())
    }
}

impl ScenarioMetadata for UpdateParamsScenario {
    const NAME: &'static str = "update-params";
    const DESCRIPTION: &'static str = "Updates rate model and risk params";
}

pub struct UpdateRiskScenario;

impl Scenario for UpdateRiskScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![
            CommandArg::new("asset", "Asset address (hash-...)", NamedCLType::String),
            CommandArg::new("collateral", "Collateral factor (U256)", NamedCLType::String),
            CommandArg::new("liq_threshold", "Liquidation threshold (U256)", NamedCLType::String),
            CommandArg::new("close_factor", "Close factor (U256)", NamedCLType::String),
            CommandArg::new("liq_bonus", "Liquidation bonus (U256)", NamedCLType::String),
            CommandArg::new("reserve", "Reserve factor (U256)", NamedCLType::String),
            CommandArg::new("borrow_cap", "Borrow cap (U256)", NamedCLType::String),
            CommandArg::new("supply_cap", "Supply cap (U256)", NamedCLType::String),
        ]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let collateral = parse_u256_arg(&args, "collateral");
        let liq_threshold = parse_u256_arg(&args, "liq_threshold");
        let close_factor = parse_u256_arg(&args, "close_factor");
        let liq_bonus = parse_u256_arg(&args, "liq_bonus");
        let reserve = parse_u256_arg(&args, "reserve");
        let borrow_cap = parse_u256_arg(&args, "borrow_cap");
        let supply_cap = parse_u256_arg(&args, "supply_cap");

        let mut registry = container.contract_ref::<MarketRegistry>(env)?;
        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        registry.update_market_risk_params(
            asset,
            collateral,
            liq_threshold,
            close_factor,
            liq_bonus,
            reserve,
            borrow_cap,
            supply_cap,
        );
        Ok(())
    }
}

impl ScenarioMetadata for UpdateRiskScenario {
    const NAME: &'static str = "update-risk";
    const DESCRIPTION: &'static str = "Updates risk params only";
}

pub struct UpdateRiskEnvScenario;

impl Scenario for UpdateRiskEnvScenario {
    fn args(&self) -> Vec<CommandArg> {
        vec![CommandArg::new(
            "asset",
            "Asset address (hash-...)",
            NamedCLType::String,
        )]
    }

    fn run(
        &self,
        env: &HostEnv,
        container: &DeployedContractsContainer,
        args: Args,
    ) -> Result<(), Error> {
        let asset = parse_asset_arg(&args);
        let collateral = parse_u256("ANCHOR_COLLATERAL_FACTOR", U256::from(WAD_U128 * 75 / 100));
        let liq_threshold = parse_u256("ANCHOR_LIQ_THRESHOLD", U256::from(WAD_U128 * 80 / 100));
        let close_factor = parse_u256("ANCHOR_CLOSE_FACTOR", U256::from(WAD_U128 / 2));
        let liq_bonus = parse_u256("ANCHOR_LIQ_BONUS", U256::from(WAD_U128 * 5 / 100));
        let reserve = parse_u256("ANCHOR_RESERVE_FACTOR", U256::from(WAD_U128 / 10));
        let borrow_cap = parse_u256("ANCHOR_BORROW_CAP", U256::zero());
        let supply_cap = parse_u256("ANCHOR_SUPPLY_CAP", U256::zero());

        let mut registry = container.contract_ref::<MarketRegistry>(env)?;
        env.set_caller(env.get_account(0));
        env.set_gas(GAS);
        registry.update_market_risk_params(
            asset,
            collateral,
            liq_threshold,
            close_factor,
            liq_bonus,
            reserve,
            borrow_cap,
            supply_cap,
        );
        Ok(())
    }
}

impl ScenarioMetadata for UpdateRiskEnvScenario {
    const NAME: &'static str = "update-risk-env";
    const DESCRIPTION: &'static str = "Updates risk params from env values";
}

fn parse_address(name: &str, fallback: Address) -> Address {
    match env_var(name) {
        Some(value) => Address::from_str(&value).unwrap_or(fallback),
        None => fallback,
    }
}

fn parse_u256(name: &str, fallback: U256) -> U256 {
    match env_var(name) {
        Some(value) => U256::from_dec_str(&value).unwrap_or(fallback),
        None => fallback,
    }
}

fn parse_u64(name: &str, fallback: u64) -> u64 {
    match env_var(name) {
        Some(value) => value.parse::<u64>().unwrap_or(fallback),
        None => fallback,
    }
}

fn parse_u8(name: &str, fallback: u8) -> u8 {
    match env_var(name) {
        Some(value) => value.parse::<u8>().unwrap_or(fallback),
        None => fallback,
    }
}

fn parse_asset_arg(args: &Args) -> Address {
    let asset_str = args.get_single::<String>("asset").unwrap();
    Address::from_str(&asset_str).unwrap()
}

fn parse_u256_arg(args: &Args, name: &str) -> U256 {
    let value = args.get_single::<String>(name).unwrap();
    U256::from_dec_str(&value).unwrap()
}

fn load_market_and_oracle(
    env: &HostEnv,
    container: &DeployedContractsContainer,
    asset: Address,
) -> Result<(LendingMarketHostRef, PriceOracleHostRef), Error> {
    let registry = container.contract_ref::<MarketRegistry>(env)?;
    let addrs = registry.get_market_addresses(asset);
    Ok((
        LendingMarket::load(env, addrs.market),
        PriceOracle::load(env, addrs.oracle),
    ))
}

fn refresh_price_if_configured(env: &HostEnv, oracle: &mut PriceOracleHostRef, asset: Address) {
    if let Some(price_value) = env_var("ANCHOR_ASSET_PRICE_WAD") {
        if let Ok(price) = U256::from_dec_str(&price_value) {
            env.set_caller(env.get_account(0));
            env.set_gas(GAS);
            oracle.set_price(asset, price);
        }
    }
}

fn env_var(name: &str) -> Option<String> {
    env::var(name).ok()
}

pub fn main() {
    OdraCli::new()
        .about("Anchor Protocol deploy tool")
        .deploy(AnchorDeployScript)
        .contract::<MarketRegistry>()
        .contract::<PriceOracle>()
        .contract::<LendingMarket>()
        .contract::<AToken>()
        .scenario(AddMarketScenario)
        .scenario(SupplyScenario)
        .scenario(BorrowScenario)
        .scenario(RepayScenario)
        .scenario(WithdrawScenario)
        .scenario(LiquidateScenario)
        .scenario(PauseScenario)
        .scenario(UpdateParamsScenario)
        .scenario(UpdateRiskScenario)
        .scenario(UpdateRiskEnvScenario)
        .build()
        .run();
}

fn env_bool(name: &str) -> bool {
    matches!(
        env::var(name)
            .ok()
            .map(|value| value.to_lowercase()),
        Some(value) if value == "1" || value == "true" || value == "yes"
    )
}
