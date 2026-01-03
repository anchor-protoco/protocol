# Anchor Protocol
**A Credit Foundation for Digital & Real-World Assets on Casper**

Anchor Protocol is a decentralized lending protocol built on the **Casper blockchain**, designed to become the **credit layer** for both digital assets and future real-world assets (RWAs).

Anchor allows users and applications to **borrow against assets without selling long-term exposure**, while keeping risk **isolated, transparent, and conservative**.  
It is built as infrastructure — not a speculative product — with a clear focus on safety, clarity, and long-term ecosystem growth.

---

## Why Anchor Exists

Casper is positioning itself as a blockchain for **real-world assets**.

Partnerships are already in motion to bring **revenue-generating industries** on-chain.  
But tokenization alone does not create an economy.

In every mature financial system:
- assets are used as collateral  
- credit unlocks liquidity  
- capital keeps working without forcing sales  

Without a **safe credit layer**, on-chain assets remain idle.

**Anchor is built to fill that gap.**

---

## What Anchor Does (In One Sentence)

Anchor enables users and applications to **lend and borrow assets on Casper**, using **isolated markets** and **conservative risk parameters**, turning assets into **usable capital** without systemic risk.

---

## Core Design Principles

Anchor is intentionally designed around a few non-negotiable principles:

### 1. Isolated Markets by Default
Each asset lives in its **own market**.
- No shared collateral pools
- No cross-asset contagion
- Risk is contained per asset

This design makes Anchor suitable for:
- volatile crypto assets
- stablecoins
- future RWAs with unique risk profiles

---

### 2. Conservative, Transparent Risk
Anchor prioritizes **clarity over complexity**.
- Borrow limits are explicit
- Health factors are always visible
- Liquidation rules are predictable

Users are guided to stay safe — not pushed toward leverage.

---

### 3. Credit Before Scale
Anchor is not built to chase TVL.
It is built to support:
- early-stage ecosystems
- institutional expectations
- long-term asset onboarding

Growth happens **asset by asset**, not all at once.

---

## How Anchor Works

### Supplying Assets
Users can supply supported assets (e.g. USDC, wrapped CSPR) into an isolated market.
- Supplied assets earn interest over time
- Supply increases borrowing power within safe limits

---

### Borrowing Assets
Users can borrow against their supplied collateral.
- Borrow limits are enforced per market
- Positions are continuously monitored
- Users can track health in real time

Borrowing never requires selling the underlying asset.

---

### Interest Accrual
Anchor uses an **index-based interest model**:
- Interest accrues over time, not per transaction
- Early and late suppliers are treated fairly
- Borrowers pay interest proportional to utilization

This model is gas-efficient and battle-tested across lending systems.

---

### Liquidations (Safety Mechanism)
If a position becomes unhealthy:
- third parties can repay part of the debt
- collateral is liquidated with a small incentive
- positions are restored to safety

Liquidations are **partial and bounded**, preventing sudden full wipeouts.

---

## Who Anchor Is Built For

### Suppliers
Users or protocols that want to:
- earn predictable yield
- deploy idle capital safely
- avoid complex strategies

---

### Borrowers
Users or protocols that want to:
- access liquidity without selling assets
- stay within conservative risk limits
- maintain long-term exposure

---

### Applications & Protocols
Anchor is a **composable primitive**.
Other products can integrate Anchor to:
- source liquidity
- provide credit to users
- build yield strategies on top

Anchor is designed to be built **on**, not just used.

---

## Architecture Overview

Anchor follows a modular, infrastructure-grade architecture.

### Smart Contracts (Casper / Odra)
- **Market Registry**  
  Registers and manages isolated markets.

- **Lending Market Contracts**  
  One contract per asset, handling:
  - supply
  - borrow
  - interest accrual
  - liquidation logic

- **aTokens**  
  Interest-bearing tokens representing supplied positions.

- **Risk & Rate Models**  
  Configurable per market:
  - collateral factors
  - liquidation thresholds
  - utilization-based interest curves

---

### Price Oracle (MVP)
Anchor uses a **protocol-specific centralized oracle** for MVP:
- backend fetches prices from trusted sources
- prices are pushed on-chain
- staleness checks prevent outdated data

This design prioritizes reliability and simplicity for early deployment, with a clear upgrade path to decentralized oracles.

---

### Backend Services (Node.js)
The backend is intentionally minimal:
- oracle price feeder
- event indexing
- read-optimized APIs for the frontend

It does **not** custody funds or user assets.

---

### Frontend (Next.js)
The UI is designed for clarity:
- clear positions
- visible health factors
- guided actions
- real-time transaction tracking

Users always understand where they stand.

---

## Why Start With USDC & Wrapped CSPR

Anchor’s MVP demonstrates functionality using:
- **USDC** (stable, intuitive)
- **wrapped CSPR** (native alignment)

This mirrors how most major lending protocols start:
- prove the mechanism
- validate safety
- onboard new asset classes later

The protocol is already designed to support RWAs as they arrive.

---

## Roadmap (High-Level)

**MVP (Hackathon)**
- isolated markets
- supply & borrow
- interest accrual
- liquidation framework
- centralized oracle

**Next Phases**
- additional asset markets
- RWA-specific parameters
- decentralized oracle integration
- governance-driven risk management

---

## Why Anchor Matters for Casper

Anchor is not just another DeFi app.

It is:
- a **credit primitive**
- a **foundation for RWAs**
- an **enabler for future applications**

As Casper’s ecosystem grows, Anchor is designed to grow **with it** — safely and deliberately.

---

## Status

> **Current Stage:** Hackathon MVP  
> **Network:** Casper  
> **Architecture:** Isolated Markets, Overcollateralized Credit  
> **Focus:** Safety, clarity, long-term adoption

---

**Anchor Protocol**  
*Infrastructure for what comes next.*
