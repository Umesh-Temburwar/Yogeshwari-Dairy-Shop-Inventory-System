
const assert = require('assert');

function simulateShakeAlgorithm(samples, threshold = 18, minPeaks = 2, timeWindowMs = 750, cooldownMs = 1800) {
  let lastX = null, lastY = null, lastZ = null;
  let lastUpdate = 0;
  let peakTimestamps = [];
  let lastTriggerTime = -cooldownMs;
  let triggerCount = 0;

  for (const sample of samples) {
    const { t, x, y, z } = sample;
    // Always update tracking, only skip peak evaluation if in cooldown
    const inCooldown = (t - lastTriggerTime < cooldownMs);
    const timeDiff = t - lastUpdate;
    if (timeDiff < 25) continue; // Rate limiter (max 40Hz)

    if (lastX !== null && lastY !== null && lastZ !== null && !inCooldown) {
      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      const deltaMag = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);

      if (deltaMag > threshold) {
        peakTimestamps.push(t);
        peakTimestamps = peakTimestamps.filter(ts => t - ts <= timeWindowMs);
        if (peakTimestamps.length >= minPeaks) {
          peakTimestamps = [];
          lastTriggerTime = t;
          triggerCount++;
        }
      }
    }
    lastX = x;
    lastY = y;
    lastZ = z;
    lastUpdate = t;
  }

  return triggerCount;
}

// Test 1: Normal gentle walking / hand jitter (should NOT trigger)
const gentleSamples = [];
for (let t = 0; t <= 3000; t += 40) {
  gentleSamples.push({ t, x: 0.8 * Math.sin(t / 200), y: 9.8 + 1.2 * Math.cos(t / 200), z: 0.5 });
}
const gentleTriggers = simulateShakeAlgorithm(gentleSamples);
console.log('Test 1 (Gentle handling): triggers =', gentleTriggers, '(Expected: 0)');
assert.strictEqual(gentleTriggers, 0, 'Gentle movement should not trigger shake');

// Test 2: Deliberate shake (2 rapid acceleration reversals) (MUST trigger exactly once)
const shakeSamples = [];
let t = 0;
// 1 second idle
for (; t < 1000; t += 40) shakeSamples.push({ t, x: 0, y: 9.8, z: 0 });
// Peak 1: rapid snap +X (deltaMag = 20)
shakeSamples.push({ t: 1040, x: 20.0, y: 9.8, z: 0.0 });
// Peak 2: rapid snap -X (deltaMag = 40)
shakeSamples.push({ t: 1100, x: -20.0, y: 9.8, z: 0.0 });
// Settle
for (t = 1140; t < 2500; t += 40) shakeSamples.push({ t, x: 0, y: 9.8, z: 0 });

const shakeTriggers = simulateShakeAlgorithm(shakeSamples);
console.log('Test 2 (Deliberate shake): triggers =', shakeTriggers, '(Expected: 1)');
assert.strictEqual(shakeTriggers, 1, 'Deliberate shake should trigger once');

// Test 3: Multiple shakes within cooldown (should only trigger once due to 1800ms cooldown)
shakeSamples.push({ t: 2600, x: 20.0, y: 9.8, z: 0.0 });
shakeSamples.push({ t: 2660, x: -20.0, y: 9.8, z: 0.0 });
const cooldownTriggers = simulateShakeAlgorithm(shakeSamples);
console.log('Test 3 (Cooldown check): triggers =', cooldownTriggers, '(Expected: 1)');
assert.strictEqual(cooldownTriggers, 1, 'Shake during cooldown should be ignored');

// Test 4: Shake AFTER cooldown expires (t = 1100 + 1900 = 3000ms -> MUST trigger second time)
for (t = 2700; t < 3100; t += 40) shakeSamples.push({ t, x: 0, y: 9.8, z: 0 });
shakeSamples.push({ t: 3140, x: 20.0, y: 9.8, z: 0.0 });
shakeSamples.push({ t: 3200, x: -20.0, y: 9.8, z: 0.0 });
const afterCooldownTriggers = simulateShakeAlgorithm(shakeSamples);
console.log('Test 4 (After cooldown expires): triggers =', afterCooldownTriggers, '(Expected: 2)');
assert.strictEqual(afterCooldownTriggers, 2, 'Shake after cooldown should trigger second time');

console.log('✅ ALL 4 SHAKE ALGORITHM TESTS PASSED PERFECTLY!');
