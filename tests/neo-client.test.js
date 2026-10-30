import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDistance, formatVelocity, formatDiameter, formatLunarDistance, formatDateTime } from '../js/neo-client.js';

test('distance formatting preserves physical units', () => {
  assert.equal(formatDistance(384400), '3,84,400 km');
  assert.equal(formatDistance(2_500_000), '2.50 million km');
  assert.equal(formatDistance(null), 'Not reported');
});

test('relative velocity formatting uses reported km/s when available', () => {
  assert.equal(formatVelocity(36000, 10), '10.00 km/s');
  assert.equal(formatVelocity(36000, null), '36,000 km/h');
  assert.equal(formatVelocity(null, null), 'Not reported');
});

test('diameter and lunar-distance comparisons are labelled', () => {
  assert.equal(formatDiameter(1500), '1.50 km');
  assert.equal(formatDiameter(12.5), '12.5 m');
  assert.equal(formatLunarDistance(384400), '1.00 LD');
});

test('date formatting returns a deterministic UTC display', () => {
  const display = formatDateTime({ timestamp: Date.parse('2026-10-30T12:00:00Z') });
  assert.match(display, /30 Oct 2026/);
  assert.match(display, /12:00/);
});
