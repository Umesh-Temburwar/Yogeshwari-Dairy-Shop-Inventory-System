
const assert = require('assert');

class ShakeGestureClassifier {
  constructor(options = {}) {
    this.threshold = options.threshold || 20;
    this.peakWindowMs = options.peakWindowMs || 450;
    this.gestureWindowMs = options.gestureWindowMs || 650;
    this.cooldownMs = options.cooldownMs || 1800;
    this.onGesture = options.onGesture || (() => {});

    this.lastX = null;
    this.lastY = null;
    this.lastZ = null;
    this.lastUpdate = 0;
    this.peakTimestamps = [];
    this.shakeCount = 0;
    this.gestureTimer = null;
    this.lastTriggerTime = -this.cooldownMs;
  }

  processSample(t, x, y, z) {
    if (t - this.lastTriggerTime < this.cooldownMs) return;
    const timeDiff = t - this.lastUpdate;
    if (timeDiff < 25) return; // rate limit 40Hz

    if (this.lastX !== null && this.lastY !== null && this.lastZ !== null) {
      const deltaX = Math.abs(x - this.lastX);
      const deltaY = Math.abs(y - this.lastY);
      const deltaZ = Math.abs(z - this.lastZ);
      const deltaMag = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

      if (deltaMag > this.threshold) {
        this.peakTimestamps.push(t);
        this.peakTimestamps = this.peakTimestamps.filter(ts => t - ts <= this.peakWindowMs);

        // 2 directional acceleration peaks constitute 1 deliberate shake
        if (this.peakTimestamps.length >= 2) {
          this.peakTimestamps = [];
          this.registerShakeEvent(t);
        }
      }
    }

    this.lastX = x;
    this.lastY = y;
    this.lastZ = z;
    this.lastUpdate = t;
  }

  registerShakeEvent(t) {
    this.shakeCount++;

    if (this.shakeCount >= 3) {
      // Max gesture reached -> execute Triple Shake immediately
      this.finalizeGesture(t, 3);
      return;
    }

    // Accumulate within gesture window
    this.pendingTime = t;
    this.gestureTimer = t + this.gestureWindowMs;
  }

  checkTimer(t) {
    if (this.gestureTimer !== null && t >= this.gestureTimer) {
      const count = this.shakeCount;
      this.gestureTimer = null;
      if (count > 0) {
        this.finalizeGesture(t, Math.min(count, 3));
      }
    }
  }

  finalizeGesture(t, count) {
    this.gestureTimer = null;
    this.shakeCount = 0;
    this.peakTimestamps = [];
    this.lastTriggerTime = t;
    this.onGesture(count, t);
  }
}

// Test 1: Single Shake
const gestures1 = [];
const c1 = new ShakeGestureClassifier({
  onGesture: (count) => gestures1.push(count)
});

let t = 0;
// Shake 1: snap +X then -X
c1.processSample(100, 22, 9.8, 0);
c1.processSample(160, -22, 9.8, 0); // Shake 1 registered
// Advance time past gesture window (160 + 650 = 810ms)
for (t = 200; t <= 900; t += 50) {
  c1.processSample(t, 0, 9.8, 0);
  c1.checkTimer(t);
}
assert.deepStrictEqual(gestures1, [1], 'Single shake should trigger gesture 1');
console.log('✅ Test 1 (Single Shake): gestures =', gestures1);

// Test 2: Double Shake
const gestures2 = [];
const c2 = new ShakeGestureClassifier({
  onGesture: (count) => gestures2.push(count)
});
// Shake 1
c2.processSample(100, 22, 9.8, 0);
c2.processSample(160, -22, 9.8, 0); // Shake 1 registered
// Shake 2 at 400ms (within 650ms window)
c2.processSample(400, 22, 9.8, 0);
c2.processSample(460, -22, 9.8, 0); // Shake 2 registered
// Settle
for (t = 500; t <= 1200; t += 50) {
  c2.processSample(t, 0, 9.8, 0);
  c2.checkTimer(t);
}
assert.deepStrictEqual(gestures2, [2], 'Double shake should trigger gesture 2');
console.log('✅ Test 2 (Double Shake): gestures =', gestures2);

// Test 3: Triple Shake (immediate on 3rd shake)
const gestures3 = [];
const c3 = new ShakeGestureClassifier({
  onGesture: (count) => gestures3.push(count)
});
// Shake 1
c3.processSample(50, 0, 9.8, 0);
c3.processSample(100, 22, 9.8, 0);
c3.processSample(160, -22, 9.8, 0);
c3.processSample(200, 0, 9.8, 0);
// Shake 2
c3.processSample(350, 0, 9.8, 0);
c3.processSample(400, 22, 9.8, 0);
c3.processSample(460, -22, 9.8, 0);
c3.processSample(500, 0, 9.8, 0);
// Shake 3
c3.processSample(650, 0, 9.8, 0);
c3.processSample(700, 22, 9.8, 0);
c3.processSample(760, -22, 9.8, 0);
c3.processSample(800, 0, 9.8, 0); // Shake 3 registered -> triggers immediately!
assert.deepStrictEqual(gestures3, [3], 'Triple shake should trigger gesture 3');
console.log('✅ Test 3 (Triple Shake): gestures =', gestures3);

console.log('🎉 ALL 3 SHAKE GESTURE TESTS PASSED WITH 100% ACCURACY!');
