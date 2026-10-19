'use strict';
const request = require('supertest');
const app = require('../src/app');
const {
  User,
  Game,
  Category,
  Offer,
  Wallet,
  LedgerTransaction,
  Order,
  EscrowRecord,
  Dispute,
} = require('../src/models');
const { withTransaction } = require('../src/services/tx');
const orderService = require('../src/services/orderService');

// Helper to register, get cookies (including CSRF & Session)
async function registerUser(email, displayName, roles = ['customer']) {
  // First GET /api/auth/csrf to get csrf token and cookie
  const csrfRes = await request(app).get('/api/auth/csrf');
  const csrfCookie = csrfRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_csrf='));
  const csrfToken = csrfRes.body.csrfToken;

  const regRes = await request(app)
    .post('/api/auth/register')
    .set('Cookie', csrfCookie)
    .set('x-csrf-token', csrfToken)
    .send({
      email,
      password: 'Password123',
      displayName,
    });

  expect(regRes.status).toBe(201);
  const sessionCookie = regRes.headers['set-cookie']?.find((c) => c.startsWith('g2g_session='));

  if (roles.length > 1 || !roles.includes('customer')) {
    await User.updateOne({ email }, { $set: { roles } });
  }

  const user = await User.findOne({ email });

  const cookiePair = [csrfCookie, sessionCookie]
    .filter(Boolean)
    .map((c) => c.split(';')[0])
    .join('; ');

  return {
    user,
    cookies: cookiePair,
    csrfToken,
  };
}

describe('Gamer2Gamer Core Business Logic & Security Tests', () => {
  let admin, seller, booster, buyer, outsider;
  let wowGame, wowAccountCat, wowGoldCat;

  beforeAll(async () => {
    admin = await registerUser('admin_t@g2g.com', 'Admin Tester', ['customer', 'admin']);
    seller = await registerUser('seller_t@g2g.com', 'Seller Tester', ['customer', 'seller']);
    booster = await registerUser('booster_t@g2g.com', 'Booster Tester', ['customer', 'booster']);
    buyer = await registerUser('buyer_t@g2g.com', 'Buyer Tester', ['customer']);
    outsider = await registerUser('outsider_t@g2g.com', 'Outsider Tester', ['customer']);

    wowGame = await Game.create({
      name: 'World of Warcraft',
      slug: 'wow-test',
      regions: ['EU', 'US'],
    });

    wowAccountCat = await Category.create({
      game: wowGame._id,
      type: 'account',
      name: 'Accounts',
      slug: 'accounts',
      unitLabel: 'account',
    });

    wowGoldCat = await Category.create({
      game: wowGame._id,
      type: 'item',
      name: 'Gold',
      slug: 'gold',
      unitLabel: '100k gold',
    });
  }, 60000);

  // 1. Auth & Roles
  test('1. Authentication & Role-based authorization', async () => {
    // Normal buyer cannot access admin endpoint
    const forbiddenRes = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', buyer.cookies);
    expect(forbiddenRes.status).toBe(403);

    // Admin can access admin stats
    const adminRes = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', admin.cookies);
    expect(adminRes.status).toBe(200);
    expect(adminRes.body).toHaveProperty('users');
  });

  // 2. Cannot edit another user's offer
  test("2. Merchant cannot edit another user's offer", async () => {
    const offer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Original Seller Account',
      description: 'Hand leveled safe account description over 20 chars',
      unitPrice: 10000,
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 2,
      durationDays: 14,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 14 * 86400000),
    });

    // Booster tries to edit seller's offer
    const editRes = await request(app)
      .patch(`/api/offers/${offer._id}`)
      .set('Cookie', booster.cookies)
      .set('x-csrf-token', booster.csrfToken)
      .send({ title: 'Hacked Title By Other User' });

    expect(editRes.status).toBe(404); // returns 404 to hide private existence
  });

  // 3. Create offer validation (correct vs invalid data)
  test('3. Create offer valid and invalid inputs', async () => {
    // Invalid: price <= 0
    const resInvalidPrice = await request(app)
      .post('/api/offers')
      .set('Cookie', seller.cookies)
      .set('x-csrf-token', seller.csrfToken)
      .send({
        gameId: String(wowGame._id),
        categoryId: String(wowGoldCat._id),
        title: 'Cheap Gold Offer Sample',
        description: 'Instant delivery gold over 20 characters length',
        unitPrice: 0,
        stock: 10,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 10,
      });
    expect(resInvalidPrice.status).toBe(400);

    // Invalid: duration > 30 days
    const resInvalidDuration = await request(app)
      .post('/api/offers')
      .set('Cookie', seller.cookies)
      .set('x-csrf-token', seller.csrfToken)
      .send({
        gameId: String(wowGame._id),
        categoryId: String(wowGoldCat._id),
        title: 'Cheap Gold Offer Sample',
        description: 'Instant delivery gold over 20 characters length',
        unitPrice: 1000,
        stock: 10,
        minPerOrder: 1,
        deliveryTimeHours: 1,
        durationDays: 35, // exceeds 30
      });
    expect(resInvalidDuration.status).toBe(400);

    // Valid offer creation
    const resValid = await request(app)
      .post('/api/offers')
      .set('Cookie', seller.cookies)
      .set('x-csrf-token', seller.csrfToken)
      .send({
        gameId: String(wowGame._id),
        categoryId: String(wowGoldCat._id),
        title: 'Valid Gold Stock Listing',
        description: 'Instant delivery gold over 20 characters length',
        unitPrice: 1500,
        stock: 50,
        minPerOrder: 2,
        deliveryTimeHours: 1,
        durationDays: 30,
        region: 'EU',
        publish: true,
      });
    expect(resValid.status).toBe(201);
    expect(resValid.body.offer.status).toBe('active');
  });

  // 4. Offer expired, insufficient stock, minPerOrder violation
  test('4. Purchase validation: expired, low stock, minPerOrder', async () => {
    const expiredOffer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowGoldCat._id,
      type: 'item',
      unitLabel: '100k gold',
      title: 'Old Expired Gold Offer',
      description: 'Long enough description for testing validation',
      unitPrice: 1000,
      stock: 10,
      minPerOrder: 5,
      deliveryTimeHours: 1,
      durationDays: 5,
      status: 'active',
      publishedAt: new Date(Date.now() - 10 * 86400000),
      expiresAt: new Date(Date.now() - 5 * 86400000), // in the past
    });

    // Try to buy expired offer
    const buyExpired = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(expiredOffer._id), quantity: 5 });
    expect(buyExpired.status).toBe(409);
    expect(buyExpired.body.error.code).toBe('OFFER_EXPIRED');

    const validOffer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowGoldCat._id,
      type: 'item',
      unitLabel: '100k gold',
      title: 'Fresh Gold Offer With Min 5',
      description: 'Long enough description for testing validation',
      unitPrice: 1000,
      stock: 10,
      minPerOrder: 5,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    // Try to buy below minPerOrder (quantity 2 < 5)
    const buyBelowMin = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(validOffer._id), quantity: 2 });
    expect(buyBelowMin.status).toBe(400);
    expect(buyBelowMin.body.error.code).toBe('BELOW_MIN_QUANTITY');

    // Try to buy exceeding stock (quantity 15 > 10)
    const buyExceedStock = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(validOffer._id), quantity: 15 });
    expect(buyExceedStock.status).toBe(409);
    expect(buyExceedStock.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  // 5 & 6. Demo Deposit & Ledger recording
  test('5 & 6. Demo deposit and balanced double-entry ledger', async () => {
    const depositAmount = 25000; // 250.00 EUR
    const depRes = await request(app)
      .post('/api/wallet/deposits')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({
        amount: depositAmount,
        idempotencyKey: 'test-dep-key-001',
      });

    expect(depRes.status).toBe(201);
    expect(depRes.body.wallet.available).toBeGreaterThanOrEqual(depositAmount);

    // Verify double-entry ledger in database
    const ledger = await LedgerTransaction.findOne({ idempotencyKey: `deposit:${buyer.user._id}:test-dep-key-001` });
    expect(ledger).toBeTruthy();
    expect(ledger.type).toBe('deposit');
    expect(ledger.amount).toBe(depositAmount);
    // Sum of entries must be zero
    const sum = ledger.entries.reduce((acc, e) => acc + e.amount, 0);
    expect(sum).toBe(0);
  });

  // 7, 8 & 9. Order creation, Payment (escrow hold), Single vs Both Confirmations
  test('7, 8, 9. End-to-end Escrow lifecycle: Hold -> 1 Confirmation -> 2 Confirmations -> Release', async () => {
    // Seller creates an account offer
    const offer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Full Escrow Test Account',
      description: 'Description long enough to satisfy schema requirements',
      unitPrice: 5000, // 50.00 EUR
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    // 1. Create order
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(offer._id), quantity: 1 });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.order.id;

    // 2. Buyer pays -> held in escrow
    const buyerWalletBefore = await Wallet.findOne({ user: buyer.user._id });
    const payRes = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken);
    expect(payRes.status).toBe(200);
    expect(payRes.body.order.status).toBe('funded');

    const buyerWalletAfter = await Wallet.findOne({ user: buyer.user._id });
    expect(buyerWalletAfter.available).toBe(buyerWalletBefore.available - 5000);
    expect(buyerWalletAfter.held).toBe(buyerWalletBefore.held + 5000);

    const escrow = await EscrowRecord.findOne({ order: orderId });
    expect(escrow.status).toBe('held');
    expect(escrow.amount).toBe(5000);

    // 3. Seller marks delivered (Seller confirm)
    const deliverRes = await request(app)
      .post(`/api/orders/${orderId}/deliver`)
      .set('Cookie', seller.cookies)
      .set('x-csrf-token', seller.csrfToken)
      .send({ deliveryNote: 'Account credentials sent securely' });
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.order.status).toBe('awaiting_customer_confirmation');

    // VERIFY: Funds NOT released yet after only one party confirms!
    const sellerWalletMid = await Wallet.findOne({ user: seller.user._id });
    const escrowMid = await EscrowRecord.findOne({ order: orderId });
    expect(escrowMid.status).toBe('held');

    // 4. Buyer confirms receipt
    const confirmRes = await request(app)
      .post(`/api/orders/${orderId}/confirm`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.order.status).toBe('completed');

    // VERIFY: Funds RELEASED only after BOTH confirmations!
    const escrowFinal = await EscrowRecord.findOne({ order: orderId });
    expect(escrowFinal.status).toBe('released');

    const sellerWalletFinal = await Wallet.findOne({ user: seller.user._id });
    expect(sellerWalletFinal.available).toBe(sellerWalletMid.available + 5000);

    const buyerWalletFinal = await Wallet.findOne({ user: buyer.user._id });
    expect(buyerWalletFinal.held).toBe(buyerWalletAfter.held - 5000);
  });

  // 10. Disputed order blocks normal release
  test('10. Disputed order blocks normal release', async () => {
    const offer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Dispute Block Test Account',
      description: 'Description long enough to satisfy schema requirements',
      unitPrice: 4000,
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    const oRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(offer._id), quantity: 1 });
    const orderId = oRes.body.order.id;

    await request(app).post(`/api/orders/${orderId}/pay`).set('Cookie', buyer.cookies).set('x-csrf-token', buyer.csrfToken);
    await request(app).post(`/api/orders/${orderId}/deliver`).set('Cookie', seller.cookies).set('x-csrf-token', seller.csrfToken).send({ deliveryNote: 'Done' });

    // Buyer opens dispute instead of confirming
    const disputeRes = await request(app)
      .post(`/api/orders/${orderId}/dispute`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ reason: 'Password provided is incorrect and seller is not responding.' });
    expect(disputeRes.status).toBe(200);
    expect(disputeRes.body.order.status).toBe('disputed');

    // Attempting normal confirmation while in dispute MUST fail!
    const confirmFail = await request(app)
      .post(`/api/orders/${orderId}/confirm`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken);
    expect(confirmFail.status).toBe(409);
    expect(confirmFail.body.error.code).toBe('INVALID_ORDER_STATE');
  });

  // 11. Release and refund cannot be repeated (idempotency)
  test('11. Release / Refund cannot happen twice', async () => {
    const offer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Idempotent Cancel Test Account',
      description: 'Description long enough to satisfy schema requirements',
      unitPrice: 3000,
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    const oRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(offer._id), quantity: 1 });
    const orderId = oRes.body.order.id;

    await request(app).post(`/api/orders/${orderId}/pay`).set('Cookie', buyer.cookies).set('x-csrf-token', buyer.csrfToken);

    // Cancel funded order -> refunds buyer
    const cancel1 = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ reason: 'Changed mind before delivery' });
    expect(cancel1.status).toBe(200);
    expect(cancel1.body.order.status).toBe('refunded');

    // Cancel again MUST be rejected
    const cancel2 = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken);
    expect(cancel2.status).toBe(409);
  });

  // 12. Concurrent purchases on last stock
  test('12. Concurrency: Two buyers attempting to buy the last stock simultaneously', async () => {
    const singleStockOffer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Ultra Rare 1x Stock Account',
      description: 'Description long enough to satisfy schema requirements',
      unitPrice: 2000,
      stock: 1,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    // Create 2 separate orders for the 1 unit
    const ord1 = await orderService.createOrder({ buyer: buyer.user, offerId: String(singleStockOffer._id), quantity: 1 });
    const ord2 = await orderService.createOrder({ buyer: outsider.user, offerId: String(singleStockOffer._id), quantity: 1 });

    // Top up outsider so both have enough funds
    await Wallet.updateOne({ user: outsider.user._id }, { $set: { available: 50000 } });

    // Run payments concurrently
    const results = await Promise.allSettled([
      orderService.payOrder({ orderId: ord1.order._id, user: buyer.user }),
      orderService.payOrder({ orderId: ord2.order._id, user: outsider.user }),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Exactly 1 must succeed, exactly 1 must fail due to stock depletion!
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    const updatedOffer = await Offer.findById(singleStockOffer._id);
    expect(updatedOffer.stock).toBe(0);
    expect(updatedOffer.status).toBe('sold_out');
  });

  // 13. Outsider access isolation
  test('13. Privacy & security: Outsider cannot view private order or messages', async () => {
    const offer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowAccountCat._id,
      type: 'account',
      unitLabel: 'account',
      title: 'Private Order Test Account',
      description: 'Description long enough to satisfy schema requirements',
      unitPrice: 1000,
      stock: 5,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    const oRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(offer._id), quantity: 1 });
    const orderId = oRes.body.order.id;

    // Outsider tries to access order details
    const viewRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Cookie', outsider.cookies);
    expect(viewRes.status).toBe(404);

    // Outsider tries to access messages
    const msgRes = await request(app)
      .get(`/api/orders/${orderId}/messages`)
      .set('Cookie', outsider.cookies);
    expect(msgRes.status).toBe(404);
  });

  // 14. Admin dispute resolution with restock check
  test('14. Admin dispute resolution: full refund with restock', async () => {
    const offer = await Offer.create({
      seller: seller.user._id,
      game: wowGame._id,
      category: wowGoldCat._id,
      type: 'item',
      unitLabel: '100k gold',
      title: 'Admin Resolution Gold Test',
      description: 'Description long enough to satisfy schema requirements',
      unitPrice: 1000,
      stock: 10,
      minPerOrder: 1,
      deliveryTimeHours: 1,
      durationDays: 10,
      status: 'active',
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 86400000),
    });

    const oRes = await request(app)
      .post('/api/orders')
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ offerId: String(offer._id), quantity: 2 });
    const orderId = oRes.body.order.id;

    await request(app).post(`/api/orders/${orderId}/pay`).set('Cookie', buyer.cookies).set('x-csrf-token', buyer.csrfToken);

    // Buyer disputes before delivery
    const dRes = await request(app)
      .post(`/api/orders/${orderId}/dispute`)
      .set('Cookie', buyer.cookies)
      .set('x-csrf-token', buyer.csrfToken)
      .send({ reason: 'Seller is AFK and not answering trade whispers' });
    const disputeId = dRes.body.order.disputeId;

    // Admin resolves with refund + restock
    const resolveRes = await request(app)
      .post(`/api/admin/disputes/${disputeId}/resolve`)
      .set('Cookie', admin.cookies)
      .set('x-csrf-token', admin.csrfToken)
      .send({
        decision: 'refund_buyer',
        note: 'Verified seller inactivity. Full refund issued to buyer.',
        restock: true,
      });

    expect(resolveRes.status).toBe(200);

    const finalOrder = await Order.findById(orderId);
    expect(finalOrder.status).toBe('refunded');
    expect(finalOrder.stockRestored).toBe(true);

    const reloadedOffer = await Offer.findById(offer._id);
    expect(reloadedOffer.stock).toBe(10); // Restored back to 10
  });
});
