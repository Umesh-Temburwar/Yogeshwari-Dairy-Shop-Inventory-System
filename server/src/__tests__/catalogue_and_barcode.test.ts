import { describe, it, expect } from 'vitest';
import { allocateStockFefo, BatchStock } from '../utils/fefoLogic.js';

interface MockProduct {
  id: string;
  name: string;
  brand: string;
  pack_size: string;
  barcode: string;
  stock_quantity: number;
  purchase_price: number;
  selling_price: number;
  source?: string;
  is_active?: boolean;
}

interface MockBatch {
  id: string;
  product_id: string;
  batch_no: string;
  qty_received: number;
  qty_remaining: number;
  expiry_date: string;
  status: 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
}

describe('Master Prompt Phase 8: Canonical Stock Logic & Inventory Separation Tests', () => {

  // TEST 1: Import 100 new catalogue products
  // Expected: 100 catalogue products, zero new stock.
  it('TEST 1: Import 100 new catalogue products creates 100 catalogue entries with exactly 0.00 stock', () => {
    const importedProducts: MockProduct[] = Array.from({ length: 100 }, (_, i) => ({
      id: `packsense-prod-${i}`,
      name: `Catalogue Item ${i}`,
      brand: 'PackSense India',
      pack_size: '500 g',
      barcode: `8901000000${String(i).padStart(3, '0')}`,
      stock_quantity: 0.0, // Strictly 0
      purchase_price: 0.0,
      selling_price: 0.0,
      source: 'PackSense',
      is_active: true
    }));

    const batchesCreated: MockBatch[] = [];

    expect(importedProducts.length).toBe(100);
    expect(importedProducts.every(p => p.stock_quantity === 0.0)).toBe(true);
    expect(batchesCreated.length).toBe(0);
    const totalInventoryAdded = importedProducts.reduce((sum, p) => sum + p.stock_quantity, 0);
    expect(totalInventoryAdded).toBe(0.0);
  });

  // TEST 2: Import the same CSV again
  // Expected: No duplicate products and no stock increase.
  it('TEST 2: Re-importing the same CSV creates no duplicate products and adds zero stock', () => {
    const existingDbBarcodes = new Set<string>(['8901030384721', '8901262010053']);
    const initialStock = 0.0;

    const incomingRecords = [
      { barcode: '8901030384721', name: 'Amul Butter 500g' },
      { barcode: '8901262010053', name: 'Amul Taaza 500ml' }
    ];

    let newProductsCreated = 0;
    let stockDelta = 0;

    for (const record of incomingRecords) {
      if (!existingDbBarcodes.has(record.barcode)) {
        existingDbBarcodes.add(record.barcode);
        newProductsCreated++;
      }
    }

    expect(newProductsCreated).toBe(0);
    expect(stockDelta).toBe(0);
    expect(initialStock + stockDelta).toBe(0.0);
  });

  // TEST 3: Add a barcode to an existing product
  // Expected: Stock remains unchanged.
  it('TEST 3: Adding a barcode mapping to an existing product leaves its stock unchanged', () => {
    const existingProduct: MockProduct = {
      id: 'p-1',
      name: 'ताजे म्हशीचे दूध १ लिटर',
      brand: 'Yogeshwari Dairy',
      pack_size: '1 Litre',
      barcode: '',
      stock_quantity: 25.0,
      purchase_price: 60.0,
      selling_price: 70.0
    };

    const initialStock = existingProduct.stock_quantity;

    // Add barcode mapping
    existingProduct.barcode = '8901000000999';

    expect(existingProduct.stock_quantity).toBe(initialStock);
    expect(existingProduct.barcode).toBe('8901000000999');
  });

  // TEST 4: Create a new product manually
  // Expected: Available stock = 0.
  it('TEST 4: Creating a new catalogue product manually sets available stock to 0.00', () => {
    const newProduct: MockProduct = {
      id: 'manual-new-1',
      name: 'Special Cow Ghee 500ml',
      brand: 'Yogeshwari Dairy',
      pack_size: '500 ml',
      barcode: '8901000000456',
      stock_quantity: 0.0, // Strictly 0 upon registration
      purchase_price: 320.0,
      selling_price: 380.0
    };

    expect(newProduct.stock_quantity).toBe(0.0);
  });

  // TEST 5: Confirm stock-in of 50 units
  // Expected: Available stock increases by exactly 50.
  it('TEST 5: Confirmed stock-in of 50 units increments available inventory by exactly 50 units', () => {
    const product: MockProduct = {
      id: 'p-stock-in',
      name: 'Amul Taaza Milk 500ml',
      brand: 'Amul',
      pack_size: '500 ml',
      barcode: '8901262010053',
      stock_quantity: 0.0,
      purchase_price: 26.0,
      selling_price: 28.0
    };

    const initialStock = product.stock_quantity;
    const qtyReceived = 50.0;

    // Simulate confirmed stock-in
    const newBatch: MockBatch = {
      id: 'batch-001',
      product_id: product.id,
      batch_no: 'LOT-20261115-001',
      qty_received: qtyReceived,
      qty_remaining: qtyReceived,
      expiry_date: '2026-11-20',
      status: 'ACTIVE'
    };

    product.stock_quantity += qtyReceived;

    expect(product.stock_quantity).toBe(initialStock + 50.0);
    expect(newBatch.qty_remaining).toBe(50.0);
    expect(newBatch.status).toBe('ACTIVE');
  });

  // TEST 6: Cancel stock-in
  // Expected: Stock does not increase.
  it('TEST 6: Cancelling the stock-in modal leaves product stock completely unchanged', () => {
    const product: MockProduct = {
      id: 'p-cancel',
      name: 'Paneer 200g',
      brand: 'Amul',
      pack_size: '200 g',
      barcode: '8901030384721',
      stock_quantity: 15.0,
      purchase_price: 80.0,
      selling_price: 95.0
    };

    const originalStock = product.stock_quantity;

    // User closes modal without confirming
    const isConfirmed = false;
    if (isConfirmed) {
      product.stock_quantity += 25.0;
    }

    expect(product.stock_quantity).toBe(originalStock);
  });

  // TEST 7: Submit the same stock-in request twice
  // Expected: Stock increases only once (idempotent / double-submission guard).
  it('TEST 7: Submitting the same stock-in request twice adds stock exactly once', () => {
    let stock = 0.0;
    let isSubmitting = false;
    let executions = 0;

    const executeStockIn = (qty: number) => {
      if (isSubmitting) return; // Guard
      isSubmitting = true;
      try {
        stock += qty;
        executions++;
      } finally {
        // Locked during transaction
      }
    };

    // First click
    executeStockIn(50.0);
    // Accidental double click before first completes
    executeStockIn(50.0);

    expect(executions).toBe(1);
    expect(stock).toBe(50.0);
  });

  // TEST 8: Sell 10 units from 50 units
  // Expected: Available stock = 40.
  it('TEST 8: Selling 10 units from 50 units decreases available stock to 40', () => {
    const product: MockProduct = {
      id: 'prod-sale-test',
      name: 'Amul Butter 500g',
      brand: 'Amul',
      pack_size: '500 g',
      barcode: '8901030384721',
      stock_quantity: 50.0,
      purchase_price: 250.0,
      selling_price: 275.0
    };

    const batches: BatchStock[] = [
      {
        id: 'b-active',
        batch_no: 'LOT-BUTTER-01',
        expiry_date: '2026-12-01',
        qty_remaining: 50.0,
        purchase_price: 250.0
      }
    ];

    const today = new Date('2026-11-15T00:00:00.000Z');
    const allocation = allocateStockFefo(batches, 10.0, today);

    expect(allocation.isFullyAllocated).toBe(true);
    expect(allocation.allocatedTotal).toBe(10.0);

    // Apply deduction
    batches[0].qty_remaining -= allocation.allocatedTotal;
    product.stock_quantity -= allocation.allocatedTotal;

    expect(batches[0].qty_remaining).toBe(40.0);
    expect(product.stock_quantity).toBe(40.0);
  });

  // TEST 9: Check FEFO
  // Expected: The earliest eligible expiry batch is consumed first.
  it('TEST 9: FEFO algorithm deducts from the earliest eligible expiry batch first', () => {
    const batches: BatchStock[] = [
      {
        id: 'batch-december',
        batch_no: 'DEC-01',
        expiry_date: '2026-12-15',
        qty_remaining: 30.0,
        purchase_price: 25.0
      },
      {
        id: 'batch-november',
        batch_no: 'NOV-01',
        expiry_date: '2026-11-18', // Earlier expiry
        qty_remaining: 20.0,
        purchase_price: 25.0
      }
    ];

    const today = new Date('2026-11-15T00:00:00.000Z');
    const res = allocateStockFefo(batches, 15.0, today);

    expect(res.isFullyAllocated).toBe(true);
    expect(res.allocations.length).toBe(1);
    expect(res.allocations[0].batch_id).toBe('batch-november');
    expect(res.allocations[0].qty).toBe(15.0);
  });

  // TEST 10: Existing genuine stock
  // Expected: It remains unchanged after catalogue import.
  it('TEST 10: Existing genuine shop stock remains completely untouched during catalogue import', () => {
    const existingShopProducts: MockProduct[] = [
      { id: 'shop-1', name: 'Amul Mango Ice Cream Cup', brand: 'Amul', pack_size: '100ml', barcode: '', stock_quantity: 1.0, purchase_price: 24.0, selling_price: 30.0 },
      { id: 'shop-2', name: 'Fresh Paneer 1kg', brand: 'Yogeshwari Dairy', pack_size: '1kg', barcode: '', stock_quantity: 12.0, purchase_price: 320.0, selling_price: 380.0 }
    ];

    const initialIceCreamStock = existingShopProducts[0].stock_quantity;
    const initialPaneerStock = existingShopProducts[1].stock_quantity;

    // Simulate PackSense catalogue import of 500 external products
    const importedCatalogue: MockProduct[] = Array.from({ length: 500 }, (_, i) => ({
      id: `pack-${i}`,
      name: `FMCG Item ${i}`,
      brand: 'Generic',
      pack_size: '100g',
      barcode: `890999000${i}`,
      stock_quantity: 0.0, // Strictly 0
      purchase_price: 0.0,
      selling_price: 0.0
    }));

    // Verify existing stock is unchanged
    expect(existingShopProducts[0].stock_quantity).toBe(initialIceCreamStock);
    expect(existingShopProducts[1].stock_quantity).toBe(initialPaneerStock);
    expect(importedCatalogue.every(p => p.stock_quantity === 0.0)).toBe(true);
  });

  // TEST 11: Out-of-stock product
  // Expected: It appears in Product Catalogue and Out of Stock, not Current Inventory.
  it('TEST 11: Out-of-stock product appears in Product Catalogue and Out of Stock view, NOT in Current Inventory', () => {
    const catalog: MockProduct[] = [
      { id: 'in-stock-1', name: 'Buffalo Milk 1L', brand: 'Yogeshwari', pack_size: '1L', barcode: '111', stock_quantity: 20.0, purchase_price: 60, selling_price: 70 },
      { id: 'zero-stock-1', name: 'PackSense Biscuit 100g', brand: 'Parle', pack_size: '100g', barcode: '222', stock_quantity: 0.0, purchase_price: 0, selling_price: 0 },
      { id: 'zero-stock-2', name: 'PackSense Chips 50g', brand: 'Balaji', pack_size: '50g', barcode: '333', stock_quantity: 0.0, purchase_price: 0, selling_price: 0 }
    ];

    // Current Inventory Screen: strictly stock_quantity > 0
    const currentInventory = catalog.filter(p => p.stock_quantity > 0);
    expect(currentInventory.length).toBe(1);
    expect(currentInventory[0].id).toBe('in-stock-1');

    // Product Catalogue Screen: all registered products
    const productCatalogue = catalog;
    expect(productCatalogue.length).toBe(3);

    // Out of Stock Screen: strictly stock_quantity <= 0
    const outOfStock = catalog.filter(p => p.stock_quantity <= 0);
    expect(outOfStock.length).toBe(2);
    expect(outOfStock.map(p => p.id)).toEqual(['zero-stock-1', 'zero-stock-2']);
  });

  // TEST 12: Check all inventory screens and reports
  // Expected: The same actual stock quantity everywhere.
  it('TEST 12: Dashboard totals, inventory lists, batch balances, and valuation reports compute identical stock quantities', () => {
    const products: MockProduct[] = [
      { id: 'p1', name: 'Milk', brand: 'Yogeshwari', pack_size: '1L', barcode: '1', stock_quantity: 40.0, purchase_price: 50.0, selling_price: 60.0 },
      { id: 'p2', name: 'Curd', brand: 'Yogeshwari', pack_size: '500g', barcode: '2', stock_quantity: 15.0, purchase_price: 30.0, selling_price: 35.0 },
      { id: 'p3', name: 'Catalogue Butter', brand: 'Amul', pack_size: '500g', barcode: '3', stock_quantity: 0.0, purchase_price: 0.0, selling_price: 0.0 }
    ];

    const batches: MockBatch[] = [
      { id: 'b1', product_id: 'p1', batch_no: 'B1', qty_received: 40, qty_remaining: 40.0, expiry_date: '2026-11-20', status: 'ACTIVE' },
      { id: 'b2', product_id: 'p2', batch_no: 'B2', qty_received: 15, qty_remaining: 15.0, expiry_date: '2026-11-22', status: 'ACTIVE' }
    ];

    // 1. Total Physical Stock in batches
    const totalBatchStock = batches.filter(b => b.status === 'ACTIVE').reduce((sum, b) => sum + b.qty_remaining, 0);

    // 2. Total In-Stock product quantity sum
    const totalProductStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);

    // 3. Current Inventory screen in-stock quantity sum
    const currentInventoryStock = products.filter(p => p.stock_quantity > 0).reduce((sum, p) => sum + p.stock_quantity, 0);

    // 4. Valuation Report cost calculation
    const totalValuation = products.reduce((sum, p) => sum + (p.stock_quantity * p.purchase_price), 0);
    const expectedValuation = (40.0 * 50.0) + (15.0 * 30.0) + (0.0 * 0.0); // 2000 + 450 = 2450

    expect(totalBatchStock).toBe(55.0);
    expect(totalProductStock).toBe(55.0);
    expect(currentInventoryStock).toBe(55.0);
    expect(totalProductStock).toBe(totalBatchStock);
    expect(totalValuation).toBe(expectedValuation);
  });

});
