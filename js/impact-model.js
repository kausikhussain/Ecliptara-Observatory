/** Educational kinetic-energy estimate for a spherical body. Not an impact forecast. */
export function calculateEnergy({ diameterMeters, velocityKmS, densityKgM3 }) {
  const d = Number(diameterMeters);
  const v = Number(velocityKmS) * 1000;
  const density = Number(densityKgM3);
  if (![d, v, density].every(Number.isFinite) || d <= 0 || v <= 0 || density <= 0) {
    throw new Error('Diameter, velocity, and density must all be positive numbers.');
  }
  const radius = d / 2;
  const mass = (4 / 3) * Math.PI * radius ** 3 * density;
  const joules = 0.5 * mass * v ** 2;
  const megatonsTnt = joules / 4.184e15;
  return { massKg: mass, joules, megatonsTnt, kilotonsTnt: megatonsTnt * 1000, reference15kt: joules / (15 * 4.184e12) };
}
export function formatMass(kg) {
  if (!Number.isFinite(kg)) return '—';
  if (kg >= 1e12) return `${(kg / 1e12).toFixed(2)} trillion kg`;
  if (kg >= 1e9) return `${(kg / 1e9).toFixed(2)} billion kg`;
  if (kg >= 1e6) return `${(kg / 1e6).toFixed(2)} million kg`;
  return `${Math.round(kg).toLocaleString('en-IN')} kg`;
}
export function formatEnergy(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1) return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Mt`;
  if (value >= 0.001) return `${(value * 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kt`;
  return `${(value * 1e6).toLocaleString('en-IN', { maximumFractionDigits: 2 })} tons TNT`;
}
