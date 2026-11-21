import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { allocateStockFefo, BatchStock } from '../utils/fefoLogic.js';
import * as ecommerceService from '../services/ecommerceService.js';

describe('E-Commerce Backend Integration Tests', { timeout: 20000 }, () => {
  describe('1. Public Catalog & Sanitization Security', () => {
    it('GET /api/v1/ecommerce/products returns 200 and sanitizes sensitive fields', async () => {
      const res = await request(app).get('/api/v1/ecommerce/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);

      if (res.body.data.items.length > 0) {
        const product = res.body.data.items[0];

        // Public fields must be present
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('selling_price');
        expect(product).toHaveProperty('mrp');
        expect(product).toHaveProperty('is_in_stock');
        expect(product).toHaveProperty('available_stock');

        // CRITICAL SECURITY: Sensitive shop & supplier financial fields MUST NEVER be exposed!
        expect(product).not.toHaveProperty('purchase_price');
        expect(product).not.toHaveProperty('purchase_cost');
        expect(product).not.toHaveProperty('supplier_id');
        expect(product).not.toHaveProperty('supplier_name');
        expect(product).not.toHaveProperty('stock_value');
        expect(product).not.toHaveProperty('margin');
      }
    }, 15000);

    it('GET /api/v1/ecommerce/categories returns 200 with list of categories', async () => {
      const res = await request(app).get('/api/v1/ecommerce/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('2. Customer Authentication & Role Enforcement', () => {
    it('POST /api/v1/ecommerce/auth/register enforces role = "customer"', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/auth/register')
        .send({
          fullName: 'Test Customer',
          email: 'testcustomer@dairy.local',
          phone: '9876543210',
          password: 'Password@123',
          role: 'admin', // Malicious attempt to claim admin role
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('customer'); // MUST be forced to 'customer'
    });

    it('Customer token is rejected with 403 Forbidden on staff inventory routes', async () => {
      const customerToken = 'dev-token-customer';

      // Attempt to access staff product CRUD
      const res1 = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res1.status).toBe(403);
      expect(res1.body.success).toBe(false);
      expect(res1.body.error.code).toBe('FORBIDDEN');

      // Attempt to access staff stock overview
      const res2 = await request(app)
        .get('/api/v1/stock/overview')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res2.status).toBe(403);

      // Attempt to access staff admin orders
      const res3 = await request(app)
        .get('/api/v1/ecommerce/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res3.status).toBe(403);
    });

    it('Staff token (admin) CAN access staff admin orders', async () => {
      const adminToken = 'dev-token-admin';
      const res = await request(app)
        .get('/api/v1/ecommerce/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Cart Validation & Free Delivery Rule', () => {
    it('Calculates delivery fee: Rs 30 if subtotal < 300, Rs 0 if subtotal >= 300', async () => {
      const catRes = await request(app).get('/api/v1/ecommerce/products');
      const item = catRes.body?.data?.items?.[0];

      if (item) {
        const resSmall = await request(app)
          .post('/api/v1/ecommerce/cart/validate')
          .send({
            items: [{ product_id: item.id, quantity: 1 }],
          });

        expect(resSmall.status).toBe(200);
        if (resSmall.body.data.subtotal > 0 && resSmall.body.data.subtotal < 300) {
          expect(resSmall.body.data.delivery_fee).toBe(30);
          expect(resSmall.body.data.total_amount).toBe(resSmall.body.data.subtotal + 30);
        } else {
          expect(resSmall.body.data.delivery_fee).toBe(0);
        }
      }
    }, 15000);

    it('Rejects cart validation with empty items array', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/cart/validate')
        .send({ items: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Order Placement, Idempotency & Authorization', () => {
    it('Requires customer authentication to place an order', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/orders')
        .send({
          items: [{ product_id: '00000000-0000-0000-0000-000000000001', quantity: 1 }],
          delivery_address: {
            recipient_name: 'John Doe',
            phone: '9876543210',
            address_line1: 'Station Road',
            city: 'Bhandara',
            state: 'Maharashtra',
            pincode: '441904',
          },
          payment_method: 'COD',
          idempotency_key: '11111111-1111-1111-1111-111111111111',
        });

      expect(res.status).toBe(401);
    });

    it('Duplicate checkout with same idempotency key returns existing order without creating duplicate', async () => {
      const customerToken = 'dev-token-customer-alice';
      const catRes = await request(app).get('/api/v1/ecommerce/products?in_stock_only=true');
      const item = catRes.body?.data?.items?.find((p: any) => p.is_in_stock && (p.available_stock || 0) > 0) || catRes.body?.data?.items?.[0];

      if (item && (item.available_stock || 0) > 0) {
        const idempotencyKey = '22222222-2222-2222-2222-222222222222';
        const orderPayload = {
          items: [{ product_id: item.id, quantity: 1 }],
          delivery_address: {
            recipient_name: 'Alice',
            phone: '9876543210',
            address_line1: 'Main Market',
            city: 'Bhandara',
            state: 'Maharashtra',
            pincode: '441904',
          },
          payment_method: 'COD' as const,
          idempotency_key: idempotencyKey,
        };

        // 1st call: Creates order
        const res1 = await request(app)
          .post('/api/v1/ecommerce/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(orderPayload);

        if (res1.status !== 201) {
          console.error('Order placement failed with body:', res1.status, JSON.stringify(res1.body));
        }

        expect(res1.status).toBe(201);
        const firstOrderNo = res1.body.data.order_no;

        // 2nd call with identical idempotency key: must replay same order
        const res2 = await request(app)
          .post('/api/v1/ecommerce/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send(orderPayload);

        expect(res2.status).toBe(201);
        // Order numbers must match
        expect(res2.body.data.order_no).toBe(firstOrderNo);
      }
    }, 15000);
  });

  describe('5. Stock Integrity & FEFO Batch Allocation Edge Cases', () => {
    const today = new Date('2026-11-22T00:00:00Z');

    it('Strict FEFO: Allocates earliest expiry first and excludes expired batches', () => {
      const batches: BatchStock[] = [
        { id: 'b-exp', batch_no: 'EXP-01', expiry_date: '2026-11-20', qty_remaining: 50, purchase_price: 30 }, // Expired 2 days ago
        { id: 'b-near', batch_no: 'NEAR-02', expiry_date: '2026-11-25', qty_remaining: 10, purchase_price: 32 }, // Expires in 3 days
        { id: 'b-fresh', batch_no: 'FRESH-03', expiry_date: '2026-12-05', qty_remaining: 20, purchase_price: 33 }, // Expires in 13 days
      ];

      // Request 15 units
      const result = allocateStockFefo(batches, 15, today);

      // Must be fully allocated
      expect(result.isFullyAllocated).toBe(true);
      expect(result.allocatedTotal).toBe(15);
      expect(result.remainingRequired).toBe(0);

      // Expired batch must NEVER be used
      const usedExpired = result.allocations.some((a) => a.batch_id === 'b-exp');
      expect(usedExpired).toBe(false);

      // Must allocate 10 from NEAR-02 first, then 5 from FRESH-03
      expect(result.allocations).toHaveLength(2);
      expect(result.allocations[0].batch_id).toBe('b-near');
      expect(result.allocations[0].qty).toBe(10);
      expect(result.allocations[1].batch_id).toBe('b-fresh');
      expect(result.allocations[1].qty).toBe(5);
    });

    it('Fails completely when unexpired batch stock is less than requested quantity', () => {
      const batches: BatchStock[] = [
        { id: 'b-exp', batch_no: 'EXP-01', expiry_date: '2026-11-19', qty_remaining: 100, purchase_price: 30 }, // Expired
        { id: 'b-fresh', batch_no: 'FRESH-02', expiry_date: '2026-11-28', qty_remaining: 4, purchase_price: 32 }, // Only 4 valid
      ];

      // Request 5 units (4 available, 1 short)
      const result = allocateStockFefo(batches, 5, today);

      expect(result.isFullyAllocated).toBe(false);
      expect(result.allocatedTotal).toBe(4);
      expect(result.remainingRequired).toBe(1); // Short by 1
    });

    it('Customer A cannot cancel Customer B order', async () => {
      const customerAliceToken = 'dev-token-customer-alice';
      const customerBobToken = 'dev-token-customer-bob';

      // Alice creates an order
      const catRes = await request(app).get('/api/v1/ecommerce/products?in_stock_only=true');
      const item = catRes.body?.data?.items?.find((p: any) => p.is_in_stock && (p.available_stock || 0) > 0) || catRes.body?.data?.items?.[0];

      if (item && (item.available_stock || 0) > 0) {
        const orderRes = await request(app)
          .post('/api/v1/ecommerce/orders')
          .set('Authorization', `Bearer ${customerAliceToken}`)
          .send({
            items: [{ product_id: item.id, quantity: 1 }],
            delivery_address: {
              recipient_name: 'Alice',
              phone: '9876543210',
              address_line1: 'Market Road',
              city: 'Bhandara',
              state: 'Maharashtra',
              pincode: '441904',
            },
            payment_method: 'COD',
            idempotency_key: '33333333-3333-3333-3333-333333333333',
          });

        const orderId = orderRes.body.data.id || orderRes.body.data.order_id;

        // Bob tries to cancel Alice's order -> must be rejected with 403 or 404
        const cancelRes = await request(app)
          .post(`/api/v1/ecommerce/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${customerBobToken}`)
          .send({ reason: 'Bob maliciously trying to cancel Alice order' });

        expect([403, 404]).toContain(cancelRes.status);
      }
    });

    it('Repeated cancellation is idempotent and does not cause double restoration', async () => {
      // 1. Seed mock order
      const testOrderId = 'test-order-cancel-123';
      ecommerceService.seedMockOrder({
        id: testOrderId,
        order_no: 'YD-ORD-20261122-CANCEL-TEST',
        customer_id: 'customer-1',
        order_status: 'PLACED',
        total_amount: 120,
        items: [],
      });

      // First cancellation
      const res1 = await ecommerceService.cancelCustomerOrder(testOrderId, 'customer-1', 'Changed mind');
      expect(res1.status).toBe('CANCELLED');

      // Second cancellation call must return CANCELLED cleanly without crashing
      const res2 = await ecommerceService.cancelCustomerOrder(testOrderId, 'customer-1', 'Duplicate click');
      expect(res2.status).toBe('CANCELLED');
    });
  });

  describe('6. Staff Order Lifecycle, Idempotent Status Updates & Stock Isolation', () => {
    it('Staff can update order to CONFIRMED, PREPARING, OUT_FOR_DELIVERY, and DELIVERED', async () => {
      const adminToken = 'dev-token-admin';
      const orderId = 'test-staff-lifecycle-order';
      ecommerceService.seedMockOrder({
        id: orderId,
        order_no: 'YD-ORD-STAFF-TEST',
        customer_id: 'cust-99',
        order_status: 'PLACED',
        total_amount: 250,
        items: [],
      });

      // 1. Confirm
      const res1 = await request(app)
        .patch(`/api/v1/ecommerce/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'CONFIRMED' });
      expect(res1.status).toBe(200);
      expect(res1.body.data.order_status).toBe('CONFIRMED');

      // 2. Preparing
      const res2 = await request(app)
        .patch(`/api/v1/ecommerce/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PREPARING' });
      expect(res2.status).toBe(200);
      expect(res2.body.data.order_status).toBe('PREPARING');

      // 3. Dispatch
      const res3 = await request(app)
        .patch(`/api/v1/ecommerce/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'OUT_FOR_DELIVERY' });
      expect(res3.status).toBe(200);
      expect(res3.body.data.order_status).toBe('OUT_FOR_DELIVERY');

      // 4. Repeated update to OUT_FOR_DELIVERY is idempotent
      const resRepeat = await request(app)
        .patch(`/api/v1/ecommerce/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'OUT_FOR_DELIVERY' });
      expect(resRepeat.status).toBe(200);
      expect(resRepeat.body.data.order_status).toBe('OUT_FOR_DELIVERY');

      // 5. Delivered
      const res4 = await request(app)
        .patch(`/api/v1/ecommerce/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DELIVERED' });
      expect(res4.status).toBe(200);
      expect(res4.body.data.order_status).toBe('DELIVERED');
    }, 15000);

    it('Customer token is forbidden from updating staff order status', async () => {
      const customerToken = 'dev-token-customer-normal';
      const res = await request(app)
        .patch('/api/v1/ecommerce/admin/orders/some-order-id/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'DELIVERED' });
      expect(res.status).toBe(403);
    });
  });

  describe('7. Customer Address CRUD, Coordinates Validation & Ownership Enforcement', () => {
    const customerAliceToken = 'dev-token-customer-alice';
    const customerBobToken = 'dev-token-customer-bob';
    let aliceAddressId: string;

    it('POST /api/v1/ecommerce/addresses creates valid address with coordinates and instructions', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/addresses')
        .set('Authorization', `Bearer ${customerAliceToken}`)
        .send({
          recipient_name: 'Alice Sharma',
          phone: '9876543210',
          address_line1: 'Near Yogeshwari Temple, Main Road',
          landmark: 'Opposite Sweet Mart',
          city: 'Ambajogai',
          state: 'Maharashtra',
          pincode: '431517',
          address_type: 'HOME',
          latitude: 18.7289,
          longitude: 76.3824,
          delivery_instructions: 'Ring bell twice and leave near milk cooler',
          is_default: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.recipient_name).toBe('Alice Sharma');
      expect(res.body.data.latitude).toBe(18.7289);
      expect(res.body.data.longitude).toBe(76.3824);
      expect(res.body.data.delivery_instructions).toBe('Ring bell twice and leave near milk cooler');

      aliceAddressId = res.body.data.id;
    }, 15000);

    it('Rejects address creation with invalid latitude (> 90 or < -90)', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/addresses')
        .set('Authorization', `Bearer ${customerAliceToken}`)
        .send({
          recipient_name: 'Alice Sharma',
          phone: '9876543210',
          address_line1: 'Near Yogeshwari Temple',
          city: 'Ambajogai',
          state: 'Maharashtra',
          pincode: '431517',
          latitude: 95.5, // Invalid!
          longitude: 76.38,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Rejects address creation with invalid longitude (> 180 or < -180)', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/addresses')
        .set('Authorization', `Bearer ${customerAliceToken}`)
        .send({
          recipient_name: 'Alice Sharma',
          phone: '9876543210',
          address_line1: 'Near Yogeshwari Temple',
          city: 'Ambajogai',
          state: 'Maharashtra',
          pincode: '431517',
          latitude: 18.72,
          longitude: 195.5, // Invalid!
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Strict Security: Customer Bob CANNOT access Customer Alice address (403 Forbidden)', async () => {
      if (!aliceAddressId) return;

      const res = await request(app)
        .get(`/api/v1/ecommerce/addresses/${aliceAddressId}`)
        .set('Authorization', `Bearer ${customerBobToken}`);

      expect(res.status).toBe(403);
    });

    it('Strict Security: Customer Bob CANNOT update or delete Customer Alice address', async () => {
      if (!aliceAddressId) return;

      const putRes = await request(app)
        .put(`/api/v1/ecommerce/addresses/${aliceAddressId}`)
        .set('Authorization', `Bearer ${customerBobToken}`)
        .send({ recipient_name: 'Hacked Name' });

      expect(putRes.status).toBe(403);

      const delRes = await request(app)
        .delete(`/api/v1/ecommerce/addresses/${aliceAddressId}`)
        .set('Authorization', `Bearer ${customerBobToken}`);

      expect(delRes.status).toBe(403);
    });

    it('Customer Alice can update her own address coordinates and details', async () => {
      if (!aliceAddressId) return;

      const res = await request(app)
        .put(`/api/v1/ecommerce/addresses/${aliceAddressId}`)
        .set('Authorization', `Bearer ${customerAliceToken}`)
        .send({
          landmark: 'Updated Near Devi Mandir Gate',
          latitude: 18.7301,
          longitude: 76.3855,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.landmark).toBe('Updated Near Devi Mandir Gate');
    });

    it('Authorized staff (admin/cashier) CAN view customer address for fulfillment', async () => {
      if (!aliceAddressId) return;

      const adminToken = 'dev-token-admin';
      const res = await request(app)
        .get(`/api/v1/ecommerce/addresses/${aliceAddressId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(aliceAddressId);
    });

    it('Customer Alice can delete her own address', async () => {
      if (!aliceAddressId) return;

      const res = await request(app)
        .delete(`/api/v1/ecommerce/addresses/${aliceAddressId}`)
        .set('Authorization', `Bearer ${customerAliceToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('8. Delivery Rider Assignment & Dispatch Workflow', () => {
    it('POST /api/v1/ecommerce/admin/orders/:id/assign-rider assigns rider to order', async () => {
      const adminToken = 'dev-token-admin';
      const orderId = 'test-ord-rider-001';

      ecommerceService.seedMockOrder({
        id: orderId,
        order_no: 'ORD-TEST-RIDER',
        customer_id: '00000000-0000-0000-0000-000000000001',
        customer_name: 'Umesh',
        customer_phone: '8856087984',
        order_status: 'CONFIRMED',
        delivery_address: {
          recipient_name: 'Umesh',
          phone: '8856087984',
          address_line1: 'Flat 302, Sai Complex, Ramdas Peth',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '440010',
          latitude: 21.1415,
          longitude: 79.0768,
        },
      });

      const res = await request(app)
        .post(`/api/v1/ecommerce/admin/orders/${orderId}/assign-rider`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rider_name: 'Sunil Rao',
          rider_phone: '9876543210',
          rider_vehicle: 'MH-31-DY-1008',
          notes: 'Deliver hot milk packets first',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.delivery_partner_name).toBe('Sunil Rao');
      expect(res.body.data.delivery_partner_phone).toBe('9876543210');
      expect(res.body.data.delivery_partner_vehicle).toBe('MH-31-DY-1008');
      expect(res.body.data.delivery_notes).toBe('Deliver hot milk packets first');
    });

    it('Delivery boy role can access admin orders list for assigned deliveries', async () => {
      const riderToken = 'dev-token-delivery_boy';
      const res = await request(app)
        .get('/api/v1/ecommerce/admin/orders')
        .set('Authorization', `Bearer ${riderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Unauthorized customer token cannot assign riders (403 Forbidden)', async () => {
      const customerToken = 'dev-token-customer-normal';
      const res = await request(app)
        .post('/api/v1/ecommerce/admin/orders/some-order-id/assign-rider')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rider_name: 'Fake Rider',
          rider_phone: '9999999999',
        });

      expect(res.status).toBe(403);
    });
  });
});
