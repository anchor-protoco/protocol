
## RE-DEPLOY FULL PROTOCOL
ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- deploy


## Deploy core:  registry + oracle
ANCHOR_DEPLOY_CORE_ONLY=1 ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- deploy

## REgister new market 
ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- scenario add-market --asset "hash-b2a04010466d5dff85802a46f8f24a38507c673598fd8c5279deb0c829c3cbe7"

## To force envs when deployng new market with Atoken i should pass it explicit

ANCHOR_ATOKEN_DECIMALS=9 ANCHOR_ATOKEN_NAME="Anchor CSPR" ANCHOR_ATOKEN_SYMBOL="aCSPR" ODRA_CASPER_LIVENET_ENV=casper-test \
cargo run --bin anchor_protocol_deploy --features livenet -- \
scenario add-market --asset "hash-b2a04010466d5dff85802a46f8f24a38507c673598fd8c5279deb0c829c3cbe7"

## Deposit scenario 
ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- scenario supply --asset "hash-71ac1a199ad8a5d33bbba9c0fb8357e26db8282c15addfa92db9f36c04b16dc4" --amount "10000000"

## Next scenario: Borrow.
Command (same asset, using 10.0 deposit = 10000000, borrow 2.0 = 2000000 for 6 decimals):

ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- scenario borrow --asset "hash-71ac1a199ad8a5d33bbba9c0fb8357e26db8282c15addfa92db9f36c04b16dc4" --deposit "10000000" --amount "2000000"

## Next scenario: Repay.
Assuming you want to deposit 10.0, borrow 2.0, and repay 1.0 (6 decimals):

ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- scenario repay --asset "hash-71ac1a199ad8a5d33bbba9c0fb8357e26db8282c15addfa92db9f36c04b16dc4" --deposit "10000000" --borrow "2000000" --repay "1000000"

## Next step: run withdraw to confirm WithdrawEvent and another MarketStateUpdatedEvent.

Command:
ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- scenario withdraw --asset "hash-71ac1a199ad8a5d33bbba9c0fb8357e26db8282c15addfa92db9f36c04b16dc4" --deposit "10000000" --amount "1000000"

## Liquidate:

ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- scenario liquidate --asset "hash-71ac1a199ad8a5d33bbba9c0fb8357e26db8282c15addfa92db9f36c04b16dc4" --deposit "10000000" --borrow "9000000" --repay "1000000"

## Update Risk params 1

ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- \
  scenario update-risk-env \
  --asset "hash-b2a04010466d5dff85802a46f8f24a38507c673598fd8c5279deb0c829c3cbe7"


## Update Risk params
ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- \
  scenario update-params \
  --asset "hash-<ASSET_HASH>" \
  --base_rate "<U256>" \
  --slope_rate "<U256>" \
  --collateral "<U256>" \
  --liq_threshold "<U256>" \
  --close_factor "<U256>" \
  --liq_bonus "<U256>" \
  --reserve "<U256>" \
  --borrow_cap "<U256>" \
  --supply_cap "<U256>"


## 2
ODRA_CASPER_LIVENET_ENV=casper-test cargo run --bin anchor_protocol_deploy --features livenet -- \
  scenario update-risk \
  --asset "hash-<ASSET_HASH>" \
  --collateral "<U256>" \
  --liq_threshold "<U256>" \
  --close_factor "<U256>" \
  --liq_bonus "<U256>" \
  --reserve "<U256>" \
  --borrow_cap "<U256>" \
  --supply_cap "<U256>"

## eg params 

--collateral 750000000000000000 \
--liq_threshold 800000000000000000 \
--close_factor 500000000000000000 \
--liq_bonus 50000000000000000 \
--reserve 100000000000000000 \
--borrow_cap 0 \
--supply_cap 0
