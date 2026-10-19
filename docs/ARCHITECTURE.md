# Gamer 2 Gamer (G2G) Platform Architecture

## 1. System Overview
**Gamer 2 Gamer** is a production-grade Peer-to-Peer (P2P) gaming marketplace for digital assets, game accounts, items, and boosting services. The platform is built with an escrow-first custody model to guarantee safety between buyers and sellers.

### Tech Stack
- **Backend**: Node.js (v24), Express.js
- **Database**: MongoDB (Mongoose ODM) with Multi-Document ACID Transactions (Replica Set compatible)
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Security & Integrity**: CSRF double-submit token protection, HTTP-only JWT cookies, rate limiting, Zod schema validation, strictly integer-cent EUR financial accounting

---

## 2. Core Architectural Pillars

### A. Strict Integer Money (Zero Floats)
- All monetary amounts across the database, APIs, and business services are stored strictly as **integer cents (EUR)**.
- `1.00 EUR = 100 cents`.
- Prevents IEEE 754 floating point rounding drift in financial ledgers.

### B. Double-Entry Balanced Ledger (`LedgerTransaction`)
Every financial movement across the marketplace is recorded as an immutable double-entry journal entry.
For every transaction:
$$\sum \text{entries.amount} = 0$$

#### Transaction Types:
1. **Deposit (`deposit`)**:
   - `platform:clearing`: $-amount$
   - `wallet:<user_id>:available`: $+amount$
2. **Escrow Hold (`escrow_hold`)**:
   - `wallet:<buyer_id>:available`: $-amount$
   - `wallet:<buyer_id>:held`: $+amount$
3. **Escrow Release (`escrow_release`)**:
   - `wallet:<buyer_id>:held`: $-total$
   - `wallet:<seller_id>:available`: $+(total - fee)$
   - `platform:fees`: $+fee$
4. **Escrow Refund (`escrow_refund`)**:
   - `wallet:<buyer_id>:held`: $-amount$
   - `wallet:<buyer_id>:available`: $+amount$

### C. Multi-Document ACID Transactions
All balance modifications, order status transitions, and dispute settlements are executed inside `withTransaction(async (session) => { ... })`. If any single check fails or is concurrent with another action, the transaction is cleanly rolled back.

### D. Escrow Custody State Machine
```
[pending_payment]
       │
       ▼ (Buyer pays via wallet)
   [funded]  <── (Funds held in custody)
       │
       ▼ (Seller starts work)
 [in_progress]
       │
       ▼ (Seller submits credentials handover)
[awaiting_customer_confirmation]
       │
       ├──► (Buyer confirms receipt) ────────────► [completed] (Funds released to seller)
       │
       └──► (Dispute filed by either party) ────► [disputed]
                                                     │
                                                     ▼ (Admin arbitration)
                                              [refunded] OR [completed]
```

### E. Role-Based Access Control (RBAC)
- **Customer**: Default registered role. Can top-up demo wallet, purchase offers, chat in order room, submit 2-sided confirmation, file disputes, and leave reviews.
- **Seller**: Verified merchant role. Can create and manage account and item listings (up to 30 days active duration), manage inventory, and fulfill deliveries.
- **Booster**: Verified service role. Can create boosting and coaching offers.
- **Admin**: Administrative oversight. Can moderate offers, arbitrate disputes, manage user bans/roles, review seller applications, manage game catalog, and run ledger reconciliations.
