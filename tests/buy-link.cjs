const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync(require.resolve("../app/legacy-body.html"), "utf8");

assert.match(html, /id="stonkfun-buy-icon"/);
assert.match(
	html,
	/https:\/\/www\.stonkfun\.xyz\/token\/['"]?\s*\+\s*encodeURIComponent\(ca\)/,
);
assert.match(html, /const ca = window\.readContractAddress\?\.\(\)/);
assert.match(
	html,
	/<img src="https:\/\/www\.stonkfun\.xyz\/stonk-mark\.svg" alt="StonkFun"[^>]*>/,
);
assert.match(html, /id="otc-icon"[^>]*style="display:\s*none;?"/);

console.log("PASS: StonkFun uses the live CA and OTC is hidden");
