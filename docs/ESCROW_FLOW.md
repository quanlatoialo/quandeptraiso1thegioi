# Escrow Lifecycle & Dispute Arbitration Specification

## 1. Overview
The core value proposition of Gamer 2 Gamer is ensuring safe transactions between pseudonymous gamers. Neither party holds simultaneous custody of both funds and digital assets without platform verification.

---

## 2. Standard Transaction Flow (Two-Sided Confirmation)

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Customer (Buyer)
    participant Platform as Escrow Platform
    actor Seller as Merchant (Seller)
    participant Ledger as Double-Entry Ledger

    Buyer->>Platform: Top-up demo balance (€50.00)
    Platform->>Ledger: Record balanced deposit (+€50.00 wallet:available)
    Buyer->>Platform: Create Order (Quantity x UnitPrice)
    Platform->>Platform: Validate stock, minPerOrder, non-expired offer
    Buyer->>Platform: Pay Order (Confirm Escrow Lock)
    Platform->>Ledger: Escrow Hold (available -> held)
    Platform->>Platform: Order status -> funded
    Platform-->>Seller: Notify: New funded order to deliver
    Seller->>Platform: Claim & begin work (status -> in_progress)
    Seller->>Platform: Submit Delivery Handover (Credentials/Account vault)
    Platform->>Platform: Order status -> awaiting_customer_confirmation
    Platform-->>Buyer: Notify: Handover submitted, inspect & confirm
    Buyer->>Platform: Confirm Receipt & Acceptance
    Platform->>Ledger: Escrow Release (held -> seller:available + platform:fees)
    Platform->>Platform: Order status -> completed
    Platform-->>Seller: Notify: Funds released to your wallet
    Buyer->>Platform: Submit 1-5 Star Rating & Review
```

---

## 3. Dispute Arbitration Flow

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as Buyer
    actor Seller as Seller
    participant Platform as Escrow Platform
    actor Admin as Platform Admin
    participant Ledger as Double-Entry Ledger

    alt Buyer or Seller contests transaction
        Buyer->>Platform: File Dispute ("Account credentials invalid")
        Platform->>Platform: Order status -> disputed
        Platform->>Platform: Lock normal release transitions
        Platform-->>Admin: Alert: Open dispute case requiring ruling
    end

    Admin->>Platform: Open Arbitration Console (/admin/disputes/[id])
    Admin->>Platform: Review order specs, submitted evidence, and room chat
    
    alt Ruling Option A: In Favor of Buyer
        Admin->>Platform: Resolve: refund_buyer (Optional: restock item)
        Platform->>Ledger: Escrow Refund (held -> buyer:available)
        Platform->>Platform: Order status -> refunded
        Platform-->>Buyer: Notify: 100% refund credited to wallet
    else Ruling Option B: In Favor of Seller
        Admin->>Platform: Resolve: release_seller
        Platform->>Ledger: Escrow Release (held -> seller:available + platform:fees)
        Platform->>Platform: Order status -> completed
        Platform-->>Seller: Notify: Payout released to seller wallet
    end
```

---

## 4. Key Invariants & Edge Cases Handled

1. **Strictly Blocked Single-Sided Release**:
   - If only the seller marks "delivered" and the buyer has not confirmed, the escrow release function will throw `ORDER_STATE_INVALID`.
2. **Dispute Release Lock**:
   - As long as `order.status === 'disputed'`, neither party can complete or cancel the order. Only an administrator can execute a binding ruling.
3. **Double Settlement Prevention**:
   - Release and refund logic checks `EscrowRecord.status === 'held'` inside a database transaction. If already released or refunded, the transaction aborts with `ESCROW_ALREADY_SETTLED`.
4. **Race Condition Stock Depletion**:
   - If two buyers attempt to purchase the final inventory item at the exact same millisecond, MongoDB conditional updates decrement stock atomically. The first buyer succeeds; the second receives `INSUFFICIENT_STOCK`.
5. **Private Vault Isolation**:
   - Order delivery account credentials are encrypted/restricted in the database and only decrypted for the buyer and seller of that specific order room. Outsiders receiving the order ID receive a `403 Forbidden` response.
