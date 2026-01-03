# Anchor Protocol

Anchor Protocol is a decentralized lending protocol built on the **Casper blockchain**, designed with **isolated lending markets** to maximize safety, clarity, and extensibility.

Anchor allows users to supply assets into isolated markets, earn interest over time, and borrow against their positions using transparent, rule-based risk parameters. Each market is fully isolated, meaning the risk of one asset does not affect others — a design choice aligned with modern, security-first DeFi principles.

The protocol is implemented using **Odra**, Casper’s Rust-based smart contract framework, and follows a modular architecture inspired by battle-tested lending systems. Anchor’s core features include an index-based interest accrual system, overcollateralized borrowing, partial liquidations with incentives, and a protocol-specific centralized price oracle designed for MVP reliability.

Anchor Protocol is being developed as a foundational DeFi primitive on Casper, with a clear upgrade path toward advanced features such as cross-asset borrowing, decentralized oracles, and governance-driven risk management.

> **Status:** Hackathon MVP  
> **Network:** Casper  
> **Architecture:** Isolated Markets, Non-Custodial, Overcollateralized Lending

## MVP invariants
- Each asset maps to a single isolated market.
- Oracle prices must be fresh to execute state-changing actions.
- aToken supply represents user deposits minus withdrawals.
- total borrows track aggregate user debt; reserves accumulate from interest.
