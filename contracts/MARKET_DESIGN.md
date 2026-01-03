# Market Design Notes

This document captures the current MVP design choice (virtual accounting) and
the exact contract touch points to switch to real CEP-18 transfers later.

## Current behavior (virtual accounting)

The lending market currently does not transfer underlying tokens on-chain.
Instead, it updates internal accounting (`cash`, `total_borrows`) and mints or
burns aTokens to represent positions.

Implications:
- Users keep their underlying token balances unchanged.
- aToken balances represent "receipt" ownership only.
- All risk checks are purely based on internal state, not token balances.

## Where to add real CEP-18 transfers later

You only need to change two entrypoints in `contracts/src/lending_market.rs`:

1) `deposit(amount)`
   - Place a CEP-18 `transfer_from` from `caller` to the market contract
     before minting aTokens and updating `cash`.
   - This will require the user to `approve` the market contract.

2) `withdraw(amount)`
   - Place a CEP-18 `transfer` from the market contract to `caller`
     after burning aTokens and updating `cash`.

These are the only two places where the underlying should move in/out of
the contract vault in the MVP.

## How to call CEP-18 from an Odra contract (reference)

Odra’s CEP-18 module exposes a contract ref you can call from another module:

- Use `Cep18ContractRef::new(self.env(), asset_address)` to get a handle.
- Use `transfer_from(&owner, &recipient, &amount)` for deposits.
- Use `transfer(&recipient, &amount)` for withdrawals.

This is documented in `contracts/ODRA_LLM_DOCS.md` (CEP-18 sections) and in
the Odra modules source (`cep18_client_contract.rs` in odra-modules).

## Notes / Constraints

- `asset` must be the CEP-18 contract address (package hash) for the token.
- Native CSPR would use a different flow (no CEP-18 allowance); this MVP
  assumes CEP-18 assets for transfers.

## Future test checklist

When enabling real transfers:
- Add allowance checks in the frontend before `deposit`.
- Add tests for insufficient allowance and insufficient token balance.
- Verify the contract’s CEP-18 balance increases on deposit and decreases
  on withdraw.
