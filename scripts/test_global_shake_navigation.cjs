
const assert = require('assert');

// Simulate Global Shake State Manager
class GlobalShakeCoordinator {
  constructor() {
    this.activeView = 'dashboard';
    this.isBillingScannerRequested = false;
    this.isBarcodeScannerOpen = false;
    this.navigationCount = 0;
  }

  setActiveView(view) {
    this.activeView = view;
    this.navigationCount++;
  }

  triggerGlobalBillingScanner() {
    if (this.isBarcodeScannerOpen) {
      // Rule: Never duplicate or restart scanner if already open
      return false;
    }
    this.isBillingScannerRequested = true;
    if (this.activeView !== 'pos') {
      this.setActiveView('pos');
    }
    return true;
  }

  consumeBillingScannerRequest() {
    const wasRequested = this.isBillingScannerRequested;
    this.isBillingScannerRequested = false;
    return wasRequested;
  }

  openScanner() {
    this.isBarcodeScannerOpen = true;
  }

  closeScanner() {
    this.isBarcodeScannerOpen = false;
  }
}

// Scenario 1: User on Dashboard shakes phone -> Redirect to POS and open scanner
const coordinator = new GlobalShakeCoordinator();
assert.strictEqual(coordinator.activeView, 'dashboard');
const triggered1 = coordinator.triggerGlobalBillingScanner();
assert.strictEqual(triggered1, true, 'Should trigger from dashboard');
assert.strictEqual(coordinator.activeView, 'pos', 'Should redirect to pos');
assert.strictEqual(coordinator.isBillingScannerRequested, true, 'Scanner request flag should be true');

// Simulate BillingCounter mount & consumption
const req1 = coordinator.consumeBillingScannerRequest();
assert.strictEqual(req1, true, 'BillingCounter consumes request');
assert.strictEqual(coordinator.isBillingScannerRequested, false, 'Flag reset after consumption');
coordinator.openScanner();
assert.strictEqual(coordinator.isBarcodeScannerOpen, true);

// Scenario 2: User shakes while scanner is ALREADY open -> Ignored, no duplicate navigation/scanner
const triggeredWhileOpen = coordinator.triggerGlobalBillingScanner();
assert.strictEqual(triggeredWhileOpen, false, 'Should ignore shake when scanner already open');
assert.strictEqual(coordinator.isBillingScannerRequested, false, 'No new request created');

// Scanner closes
coordinator.closeScanner();
assert.strictEqual(coordinator.isBarcodeScannerOpen, false);

// Scenario 3: User on Inventory shakes phone -> Redirect to POS and open scanner
coordinator.setActiveView('inventory');
assert.strictEqual(coordinator.activeView, 'inventory');
const triggeredFromInventory = coordinator.triggerGlobalBillingScanner();
assert.strictEqual(triggeredFromInventory, true);
assert.strictEqual(coordinator.activeView, 'pos');
const req2 = coordinator.consumeBillingScannerRequest();
assert.strictEqual(req2, true);

// Scenario 4: User is ALREADY on POS and shakes phone -> Open scanner directly without re-navigation
coordinator.closeScanner();
const navCountBefore = coordinator.navigationCount;
const triggeredFromPos = coordinator.triggerGlobalBillingScanner();
assert.strictEqual(triggeredFromPos, true);
assert.strictEqual(coordinator.activeView, 'pos');
assert.strictEqual(coordinator.navigationCount, navCountBefore, 'No duplicate navigation when already on POS');
const req3 = coordinator.consumeBillingScannerRequest();
assert.strictEqual(req3, true);

console.log('✅ ALL CROSS-PAGE GLOBAL SHAKE SCENARIOS PASSED PERFECTLY!');
