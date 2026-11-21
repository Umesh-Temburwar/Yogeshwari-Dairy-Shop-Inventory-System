# ADDRESS API & DATABASE MIGRATION PLAN

**Project:** Yogeshwari Dairy Online Orders System  
**Feature:** Secure Address Management, Spatial Coordinates & Rider Dispatch  
**Environment:** Staging / Local Stored (Production Deployment Gated)  
**Safety Status:** **DO NOT EXECUTE ON PRODUCTION DATABASE WITHOUT APPROVAL**

---

## 1. Secure Address REST API Specification

All address operations strictly enforce user ownership checks or administrative role verification.

### Endpoints Overview

| Method | Endpoint | Auth Required | Permitted Roles / Ownership | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/ecommerce/addresses` | Yes (JWT) | Customer (self) | List active saved addresses for current user |
| `POST` | `/api/v1/ecommerce/addresses` | Yes (JWT) | Customer (self) | Create a new address with latitude/longitude |
| `GET` | `/api/v1/ecommerce/addresses/:id` | Yes (JWT) | Owner or Staff (`admin`, `cashier`, `rider`) | Retrieve a specific address by ID |
| `PUT` | `/api/v1/ecommerce/addresses/:id` | Yes (JWT) | Owner only (`address.user_id === auth.uid`) | Update an address (coordinates, notes, default) |
| `DELETE` | `/api/v1/ecommerce/addresses/:id` | Yes (JWT) | Owner only (`address.user_id === auth.uid`) | Soft-delete an address (`is_active = false`) |
| `POST` | `/api/v1/ecommerce/admin/orders/:id/assign-rider` | Yes (Staff JWT) | `owner`, `admin`, `manager`, `cashier` | Assign delivery rider, phone, vehicle & notes |

---

## 2. Validation & Coordinate Bounds Enforcement

Input validation is performed at the Express gateway level via Zod schemas (`server/src/schemas/ecommerceSchemas.ts`):

```typescript
export const customerAddressSchema = z.object({
  recipient_name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian 10-digit mobile number'),
  address_line1: z.string().min(5).max(255),
  address_line2: z.string().max(255).optional(),
  landmark: z.string().max(100).optional(),
  city: z.string().min(2).max(100).default('Ambajogai'),
  state: z.string().min(2).max(100).default('Maharashtra'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid Indian 6-digit PIN code'),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  delivery_instructions: z.string().max(500).optional(),
  is_default: z.boolean().optional(),
});
```

Database constraints in Postgres ensure that corrupted or invalid values can never bypass application logic:
- `chk_customer_address_lat`: `latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)`
- `chk_customer_address_lng`: `longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)`

---

## 3. Immutable Order Address Snapshots

To prevent changes to saved profile addresses from retroactively modifying historical or active in-flight orders:

1. **Snapshotting on Order Placement:**  
   When `fn_create_ecommerce_order_atomic` or `fn_place_ecommerce_order` is executed, the entire address record (recipient name, phone, line1, line2, landmark, city, state, pincode, latitude, longitude, instructions) is serialized as an immutable JSONB snapshot inside `ecommerce_orders.delivery_address`.
2. **Read Isolation:**  
   The Inventory dashboard, delivery slip printing, and delivery navigation modals read exclusively from `ecommerce_orders.delivery_address`.
3. **Audit Trail:**  
   Even if the customer updates or deletes their saved address in `customer_addresses`, the order snapshot remains unchanged.

---

## 4. Idempotent Migration Script: Phase 79

The migration is stored locally at [`supabase/79_phase79_customer_addresses_and_delivery_dispatch.sql`](file:///d:/Projects/Yogeshwari%20Dairy%20Shop%20Inventory%20System/supabase/79_phase79_customer_addresses_and_delivery_dispatch.sql).

```sql
-- ============================================================================
-- YOGESHWARI DAIRY PRODUCTS - PHASE 79
-- Customer Addresses Coordinates, Spatial Indexes & Rider Dispatch
-- SAFETY NOTICE: DO NOT EXECUTE ON PRODUCTION WITHOUT EXPLICIT APPROVAL
-- ============================================================================

-- 1. Ensure Columns in customer_addresses
ALTER TABLE IF EXISTS public.customer_addresses 
  ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT NULL;

-- 2. Coordinate Check Constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_address_lat'
  ) THEN
    ALTER TABLE public.customer_addresses
      ADD CONSTRAINT chk_customer_address_lat
      CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_customer_address_lng'
  ) THEN
    ALTER TABLE public.customer_addresses
      ADD CONSTRAINT chk_customer_address_lng
      CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0));
  END IF;
END $$;

-- 3. Composite Index for Quick Geographic Range Queries
CREATE INDEX IF NOT EXISTS idx_customer_addresses_coords 
  ON public.customer_addresses (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Rider Dispatch Columns in ecommerce_orders
ALTER TABLE IF EXISTS public.ecommerce_orders
  ADD COLUMN IF NOT EXISTS assigned_rider_id UUID NULL,
  ADD COLUMN IF NOT EXISTS delivery_partner_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS delivery_partner_phone TEXT NULL,
  ADD COLUMN IF NOT EXISTS delivery_partner_vehicle TEXT NULL,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS delivery_notes TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_ecommerce_orders_rider 
  ON public.ecommerce_orders (assigned_rider_id)
  WHERE assigned_rider_id IS NOT NULL;

-- 5. Row Level Security for Delivery Riders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ecommerce_orders' AND policyname = 'Riders can view assigned orders'
  ) THEN
    CREATE POLICY "Riders can view assigned orders"
      ON public.ecommerce_orders
      FOR SELECT
      TO authenticated
      USING (
        auth.uid() = assigned_rider_id OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('owner', 'admin', 'manager', 'cashier')
        )
      );
  END IF;
END $$;
```

---

## 5. Rollout & Staging Verification Plan

1. **Step 1: Staging Review**  
   Run Phase 79 SQL on the local staging environment or dedicated test Supabase branch. Verify table schema with `\d customer_addresses` and `\d ecommerce_orders`.
2. **Step 2: API Dry-Run**  
   Execute backend test suite (`npm --prefix server test`) to verify all 49 test cases pass against mock and live structures.
3. **Step 3: Staging E2E Test**  
   Create a test customer order with GPS coordinates (`18.7350, 76.3900`). Verify route polyline renders in Inventory admin dashboard.
4. **Step 4: Production Approval Gate**  
   Obtain explicit approval from the store owner before applying Phase 78 and Phase 79 to the live Supabase instance.
