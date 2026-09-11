const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual polling pipeline with browser/network boundaries stubbed.
const size = { innerHTML: '-- cm', classList: { remove() {}, add() {} } };
const intervals = [];
const scales = [];
let fdv = 100000;
const context = vm.createContext({
  window: {
    __APP_CONFIG__: { tokenAddress: 'test-token', pairAddress: 'test-pair' },
    addEventListener() {},
  },
  document: {
    getElementById: (id) => id === 'penis-size' ? size : null,
    querySelector: () => null,
  },
  console: { log() {}, warn() {}, error: (...args) => { throw Error(args.join(' ')); } },
  setInterval: (fn, ms) => intervals.push({ fn, ms }),
  fetch: async () => ({ ok: true, json: async () => ({ pair: {
    baseToken: { name: 'Test' }, volume: { h24: 1 },
    priceChange: { h24: 0 }, priceUsd: '0.001', fdv,
  } }) }),
});
const source = fs.readFileSync(require.resolve('../public/js/data.js'), 'utf8')
  .replace(/^export \{[^}]+\};?$/gm, '').replace(/^export /gm, '');
vm.runInContext(source, context);

(async () => {
  context.startDataUpdates((scale) => scales.push(scale));
  await new Promise(setImmediate);
  assert.equal(size.innerHTML, '99.9 cm (39.3 inch)');

  // A React/preloader rerender wipes the display while the market stays unchanged.
  size.innerHTML = '-- cm';
  await intervals[0].fn();
  assert.equal(size.innerHTML, '99.9 cm (39.3 inch)', 'each poll must restore the size display');
  assert.equal(scales.length, 1, 'unchanged data must not rebuild geometry');
  assert.equal(intervals[0].ms, 5000, 'market polls must run every five seconds');

  fdv = 400000;
  await intervals[0].fn();
  assert.equal(size.innerHTML, '199.9 cm (78.7 inch)');
  assert.equal(scales.length, 2, 'changed market data must update the model');
  fdv = 0;
  await intervals[0].fn();
  assert.equal(size.innerHTML, '10.0 cm (3.9 inch)');
  console.log('PASS: five-second polling, unchanged display refresh, growth and reset');
})().catch((error) => { console.error(error); process.exitCode = 1; });
