# GAMER 2 GAMER (G2G) — P2P Gaming Escrow Marketplace
**Graduation Capstone Project — Đồ Án**

A full-stack, production-grade Peer-to-Peer (P2P) gaming marketplace with two-sided confirmation escrow custody, balanced double-entry accounting ledger, and dispute arbitration console.

---

## 🌟 Key Features & Architectural Highlights

1. **Escrow Custody & Two-Sided Confirmation**:
   - Buyer pays $\rightarrow$ Funds are held in escrow custody (`funded`).
   - Seller delivers credentials $\rightarrow$ Order enters `awaiting_customer_confirmation`.
   - Buyer inspects and confirms receipt $\rightarrow$ Escrow funds released to seller balance minus platform commission.
   - Normal release is **strictly blocked** if only one side confirms or if a dispute is open.

2. **Strict Integer Financial Calculations**:
   - **Zero floating-point numbers**: All prices, fees, wallet balances, and ledger entries are represented exclusively as integer cents in EUR (`1.00 EUR = 100 cents`).

3. **Double-Entry Balanced Accounting Ledger**:
   - Every financial transaction (`deposit`, `escrow_hold`, `escrow_release`, `escrow_refund`) writes zero-sum entries where $\sum \text{entries.amount} = 0$.
   - Includes an administrative reconciliation engine that audits wallet balances against ledger transaction sums.

4. **Multi-Document ACID Transactions**:
   - All critical operations (orders, wallet movements, status transitions, dispute resolutions) run within MongoDB transactions with rollback guarantees.

5. **Role-Based Access Control (RBAC)**:
   - **Customer**: Browse offers, demo wallet deposit, purchase via escrow, order room chat, dispute submission, review rating.
   - **Seller & Booster**: Listing management (max 30 days duration per prompt rules), inventory adjustment, delivery fulfillment, earnings breakdown.
   - **Admin**: Executive oversight, user moderation (ban/unban, role assignment), application vetting, game catalog management, offer moderation, emergency cancellations, and dispute arbitration (ruling for buyer vs seller).

---

## 🚀 Quickstart & Setup Guide

### Prerequisites
- **Node.js**: v20 or v24
- **MongoDB**: Local MongoDB instance (or automatic fallback to embedded in-memory replica set)

---

### Step 1: Backend Setup & Seeding

```bash
cd backend
npm install
npm run seed     # Idempotent seed: users, games, categories, offers, reviews
npm run dev      # Starts Express API server on port 4000
```

> **Note**: To run the automated Jest test suite:
> ```bash
> npm test
> ```

---

### Step 2: Frontend Setup

```bash
cd frontend
npm install
npm run dev      # Starts Next.js App Router on port 3000
```

Visit **`http://localhost:3000`** in your browser. All requests to `/api/*` and `/uploads/*` are automatically proxied to `http://localhost:4000`.

---

## 🔑 Demo Accounts & Credentials

All seeded demo accounts share the password: **`Password@123`**

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@gamer2gamer.com` | `Password@123` | Full Admin Console (`/admin`): Disputes, Users, Applications, Catalog, Ledger |
| **Seller** | `seller@gamer2gamer.com` | `Password@123` | Merchant Portal (`/seller`): Create Offers, Manage Stock, Sales Queue, Earnings |
| **Booster** | `booster@gamer2gamer.com` | `Password@123` | Merchant Portal: Boosting and Rank Services |
| **Customer** | `customer@gamer2gamer.com` | `Password@123` | Customer Dashboard (`/dashboard`): Wallet Deposit, Purchases, Order Room |
| **Applicant** | `applicant@gamer2gamer.com` | `Password@123` | Pending merchant vetting (`/become-seller`) |

---

## 📂 Project Structure

```
ĐỒ_ÁN_HAQ/
├── backend/
│   ├── src/
│   │   ├── config/env.js            # Environment configuration
│   │   ├── models/                  # Mongoose models (User, Offer, Order, Ledger, Wallet, Dispute...)
│   │   ├── middleware/              # Auth, CSRF protection, Rate limiters, File upload
│   │   ├── services/                # Business logic (tx, walletService, offerService, orderService...)
│   │   ├── routes/                  # Express controllers (auth, offers, wallet, orders, admin, account...)
│   │   ├── validation/schemas.js    # Strict Zod schemas
│   │   ├── app.js & server.js       # App entry points with replica set support
│   ├── scripts/seed.js              # Idempotent database seeder
│   └── tests/                       # Automated Jest test suite
│
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router pages
│   │   │   ├── page.js              # Homepage with hero search, categories & escrow diagram
│   │   │   ├── games/               # Games catalog directory
│   │   │   ├── offers/              # Full listing search, filters, offer detail & live purchase
│   │   │   ├── orders/              # Buyer orders list & Order Room with chat & vault
│   │   │   ├── wallet/              # Wallet balances & demo top-up modal
│   │   │   ├── seller/              # Merchant console: offers, new, edit, sales, earnings
│   │   │   ├── admin/               # Admin portal: stats, disputes, users, apps, games, ledger
│   │   │   ├── profile/             # Customer profile & password change
│   │   │   ├── become-seller/       # Seller/Booster role application form
│   │   │   └── how-it-works/        # Escrow mechanics & safety policies
│   │   ├── components/              # Header, Footer, OfferCard, OfferForm, Icons, DemoBanner
│   │   ├── context/AuthContext.js   # Session, wallet & polling notification state
│   │   └── lib/api.js & utils.js    # CSRF fetch wrapper & EUR currency formatting
│
└── docs/
    ├── ARCHITECTURE.md              # Detailed architecture & accounting principles
    └── ESCROW_FLOW.md               # Escrow lifecycle & dispute state machine
```

---

## 🛡️ Security Features
- **CSRF Protection**: Double-submit cookie with cryptographically strong tokens on all mutating endpoints (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Session Security**: HTTP-only JWT cookies with token versioning for instant session revocation upon password change or ban.
- **Input Sanitization**: Strict Zod schema validation blocking unexpected fields and malicious payloads.
- **Rate Limiting**: Tiered limiters for general browsing, authentication attempts, and sensitive financial transactions.
