# Anchor Protocol — MVP Market Parameters (Proposed)

This document defines the **initial risk and interest parameters** for the three MVP markets in Anchor Protocol.

The goal is to:
- demonstrate strong risk awareness
- align with industry standards
- remain conservative for an early-stage ecosystem
- clearly show *why isolated markets matter*

All values use **WAD (1e18)** unless otherwise noted.

---

## 1️⃣ CSPR Market (Native Asset)

### Rationale
CSPR is the **native Casper token**:
- high volatility
- core ecosystem asset
- primary on-chain collateral candidate

This market proves:
- native asset lending
- conservative risk management
- correct liquidation behavior

---

### Interest Rate Model
```env
ANCHOR_BASE_RATE_PER_SEC=0
ANCHOR_SLOPE_RATE_PER_SEC=634195839  # ~20% APR at 100% utilization

ANCHOR_COLLATERAL_FACTOR=700000000000000000   # 70%
ANCHOR_LIQ_THRESHOLD=780000000000000000       # 78%
ANCHOR_CLOSE_FACTOR=500000000000000000        # 50%
ANCHOR_LIQ_BONUS=70000000000000000             # 7%
ANCHOR_RESERVE_FACTOR=100000000000000000      # 10%
ANCHOR_BORROW_CAP=0
ANCHOR_SUPPLY_CAP=0


## STABLE COIN (USDC)

ANCHOR_BASE_RATE_PER_SEC=317097920   # ~10% APR base
ANCHOR_SLOPE_RATE_PER_SEC=317097920  # ~10% slope

ANCHOR_COLLATERAL_FACTOR=850000000000000000   # 85%
ANCHOR_LIQ_THRESHOLD=900000000000000000       # 90%
ANCHOR_CLOSE_FACTOR=500000000000000000        # 50%
ANCHOR_LIQ_BONUS=50000000000000000             # 5%
ANCHOR_RESERVE_FACTOR=100000000000000000      # 10%
ANCHOR_BORROW_CAP=0
ANCHOR_SUPPLY_CAP=0



## Mock RWA Market (Experimental / Pilot)

ANCHOR_BASE_RATE_PER_SEC=0
ANCHOR_SLOPE_RATE_PER_SEC=951293759   # ~30% APR at high utilization

ANCHOR_COLLATERAL_FACTOR=500000000000000000   # 50%
ANCHOR_LIQ_THRESHOLD=600000000000000000       # 60%
ANCHOR_CLOSE_FACTOR=300000000000000000        # 30%
ANCHOR_LIQ_BONUS=100000000000000000            # 10%
ANCHOR_RESERVE_FACTOR=150000000000000000      # 15%
ANCHOR_BORROW_CAP=0
ANCHOR_SUPPLY_CAP=0
 