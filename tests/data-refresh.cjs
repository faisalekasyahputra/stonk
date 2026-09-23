const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const nodes = new Map();
const node = id => {
  if (!nodes.has(id)) nodes.set(id, { textContent: '', innerHTML: '', style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, querySelector: () => null });
  return nodes.get(id);
};
let listener;
const requests = [];
let now = 0;
class FakeDate extends Date { static now() { return now; } }
const context = vm.createContext({
  AbortController, AbortSignal, Date: FakeDate,
  window: {
    __APP_CONFIG__: { tokenAddress: 'old' },
    addEventListener: (_, fn) => { listener = fn; },
  },
  document: {
    getElementById: node,
    querySelector: () => null,
  },
  console: { log() {}, warn() {}, error() {} },
  setInterval() {},
  fetch: () => new Promise(resolve => requests.push(resolve)),
});
const source = fs.readFileSync(require.resolve('../public/js/data.js'), 'utf8')
  .replace(/^export \{[^}]+\};?$/gm, '').replace(/^export /gm, '');
vm.runInContext(source, context);
const tick = () => new Promise(resolve => setImmediate(resolve));
const payload = (address, configUpdatedAt) => ({ address, configUpdatedAt, status: 'ready', name: 'Token', priceUsd: 1, marketCapUsd: null, fdvUsd: 1000,
  volume24hUsd: 0, change24hPercent: 0, checkedAt: new Date().toISOString(), fieldSources: { fdvUsd: 'LaunchLab on-chain' } });

(async () => {
  context.startDataUpdates(() => {});
  listener({ detail: { address: '', updatedAt: '2026-09-23T00:00:02Z' } });
  requests[0]({ ok: true, json: async () => payload('old', '2026-09-23T00:00:01Z') });
  await tick();
  assert.equal(node('taskbar-ca').textContent, 'CA: Coming soon');
  assert.equal(node('market-cap-only-value').textContent, '--');
  now = 25000;
  requests[1]({ ok: true, json: async () => payload('old', '2026-09-23T00:00:01Z') });
  await tick();
  assert.equal(node('taskbar-ca').textContent, 'CA: Coming soon', 'cached old CA must not replace a cleared Supabase CA');
  assert.equal(node('market-cap-only-value').textContent, '--');
  const refreshed = vm.runInContext('updateMarketCap(() => {})', context);
  requests[2]({ ok: true, json: async () => payload('new', '2026-09-23T00:00:03Z') });
  await refreshed;
  await tick();
  assert.equal(node('taskbar-ca').textContent, 'CA: new...new', 'server CA must become authoritative after the cache window');
  assert.equal(node('valuation-label').textContent, 'FDV');
  assert.equal(node('token-volume').textContent, '$0');
  assert.equal(node('token-change').textContent, '0.00%');
  assert.equal(node('stats-source').textContent, 'LaunchLab on-chain');
  const request = vm.runInContext('updateMarketCap(() => {})', context);
  requests[3]({ ok: false });
  await request;
  assert.equal(node('market-cap-only-value').textContent, '--');
  assert.equal(node('connection-label').textContent, 'Statistics temporarily unavailable');
  console.log('PASS: stale responses, FDV, zero values, and outages');
})().catch((error) => { console.error(error); process.exitCode = 1; });
