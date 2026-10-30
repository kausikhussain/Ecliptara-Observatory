import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateEnergy, formatEnergy, formatMass } from '../js/impact-model.js';

test('energy scales quadratically with entry velocity', () => {
  const a = calculateEnergy({ diameterMeters: 20, velocityKmS: 10, densityKgM3: 3000 });
  const b = calculateEnergy({ diameterMeters: 20, velocityKmS: 20, densityKgM3: 3000 });
  assert.ok(Math.abs(b.joules / a.joules - 4) < 1e-10);
});

test('mass scales with the volume of a sphere', () => {
  const a = calculateEnergy({ diameterMeters: 10, velocityKmS: 20, densityKgM3: 3000 });
  const b = calculateEnergy({ diameterMeters: 20, velocityKmS: 20, densityKgM3: 3000 });
  assert.ok(Math.abs(b.massKg / a.massKg - 8) < 1e-10);
});

test('invalid physical inputs are rejected', () => {
  assert.throws(() => calculateEnergy({ diameterMeters: 0, velocityKmS: 20, densityKgM3: 3000 }));
  assert.throws(() => calculateEnergy({ diameterMeters: 10, velocityKmS: -1, densityKgM3: 3000 }));
  assert.throws(() => calculateEnergy({ diameterMeters: 10, velocityKmS: 20, densityKgM3: NaN }));
});

test('energy and mass formatters return readable units', () => {
  assert.match(formatEnergy(2.5), /Mt/);
  assert.match(formatEnergy(0.01), /kt/);
  assert.match(formatMass(1e9), /billion kg/);
  assert.equal(formatMass(NaN), '—');
});
