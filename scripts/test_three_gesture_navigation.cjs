const assert = require('assert');

// Simulate StoreProvider logic for 3 Global Shake Gestures
class MockStore {
  constructor() {
    this.activeView = 'dashboard';
    this.globalScannerRequest = null;
    this.isBillingScannerRequested = false;
    this.isBarcodeScannerOpen = false;
  }

  triggerGlobalScanner(target) {
    // If scanner modal is already open anywhere, do not reopen/duplicate
    if (this.isBarcodeScannerOpen) return;

    this.globalScannerRequest = target;
    if (target === 'billing') {
      this.isBillingScannerRequested = true;
    }

    const destinationView = target === 'billing' ? 'pos' : 'inventory';
    this.activeView = destinationView;
  }

  consumeGlobalScannerRequest(target) {
    if (this.globalScannerRequest === target) {
      this.globalScannerRequest = null;
      if (target === 'billing') {
        this.isBillingScannerRequested = false;
      }
      return true;
    }
    return false;
  }
}

console.log('🧪 Running 3-Gesture Navigation & State Machine Tests...');

// Test 1: Single Shake from Dashboard -> Navigates to POS and triggers Billing Scanner
{
  const store = new MockStore();
  store.activeView = 'dashboard';
  store.triggerGlobalScanner('billing');
  assert.strictEqual(store.activeView, 'pos', 'Single Shake must redirect to pos page');
  assert.strictEqual(store.globalScannerRequest, 'billing', 'Target must be billing');
  assert.strictEqual(store.isBillingScannerRequested, true, 'isBillingScannerRequested must be true');

  // Consumer (BillingCounter.tsx) consumes request
  const consumed = store.consumeGlobalScannerRequest('billing');
  assert.strictEqual(consumed, true, 'Request should be consumed once');
  assert.strictEqual(store.globalScannerRequest, null, 'globalScannerRequest must be cleared');
  assert.strictEqual(store.isBillingScannerRequested, false, 'isBillingScannerRequested must be cleared');
  
  // Second consume attempt should return false (idempotent)
  const consumedAgain = store.consumeGlobalScannerRequest('billing');
  assert.strictEqual(consumedAgain, false, 'Second consume must return false');
  console.log('✅ Test 1 Passed: Single Shake -> Billing Counter Navigation');
}

// Test 2: Double Shake from Reports -> Navigates to Inventory and triggers Stock-In Scanner
{
  const store = new MockStore();
  store.activeView = 'reports';
  store.triggerGlobalScanner('stock_in');
  assert.strictEqual(store.activeView, 'inventory', 'Double Shake must redirect to inventory page');
  assert.strictEqual(store.globalScannerRequest, 'stock_in', 'Target must be stock_in');

  // Consumer (ProductList.tsx) consumes request
  const consumed = store.consumeGlobalScannerRequest('stock_in');
  assert.strictEqual(consumed, true, 'Stock-In request consumed successfully');
  assert.strictEqual(store.globalScannerRequest, null, 'Target cleared after consumption');
  console.log('✅ Test 2 Passed: Double Shake -> Stock-In Scanner Navigation');
}

// Test 3: Triple Shake from Settings -> Navigates to Inventory and triggers Stock Edit Scanner
{
  const store = new MockStore();
  store.activeView = 'settings';
  store.triggerGlobalScanner('stock_edit');
  assert.strictEqual(store.activeView, 'inventory', 'Triple Shake must redirect to inventory page');
  assert.strictEqual(store.globalScannerRequest, 'stock_edit', 'Target must be stock_edit');

  // Consumer (ProductList.tsx) consumes request
  const consumed = store.consumeGlobalScannerRequest('stock_edit');
  assert.strictEqual(consumed, true, 'Stock Edit request consumed successfully');
  assert.strictEqual(store.globalScannerRequest, null, 'Target cleared after consumption');
  console.log('✅ Test 3 Passed: Triple Shake -> Stock Edit Scanner Navigation');
}

// Test 4: Modal Protection (Shakes ignored when any scanner modal is already active)
{
  const store = new MockStore();
  store.activeView = 'inventory';
  store.isBarcodeScannerOpen = true; // Camera currently active

  store.triggerGlobalScanner('billing');
  assert.strictEqual(store.activeView, 'inventory', 'Active view must not change when camera is already open');
  assert.strictEqual(store.globalScannerRequest, null, 'No new request must be created');
  console.log('✅ Test 4 Passed: Active Scanner Modal Protection Verified');
}

console.log('🎉 ALL 4 GESTURE NAVIGATION TESTS PASSED SUCCESSFULLY!');
