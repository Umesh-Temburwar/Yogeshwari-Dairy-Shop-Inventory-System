import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../index.js';

describe('E-Commerce Backend Integration Tests', () => {
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
    });

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
      // 1. Fetch available product
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
    });

    it('Rejects cart validation with empty items array', async () => {
      const res = await request(app)
        .post('/api/v1/ecommerce/cart/validate')
        .send({ items: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Order Placement & Idempotency', () => {
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
  });
});
