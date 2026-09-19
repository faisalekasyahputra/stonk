const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync(require.resolve("../app/legacy-body.html"), "utf8");

assert.match(html, /id="stonkfun-buy-icon"/);
assert.match(
	html,
	/https:\/\/www\.stonkfun\.xyz\/token\/['"]?\s*\+\s*encodeURIComponent\(ca\)/,
);
assert.match(html, /const ca = window\.readContractAddress\?\.\(\)/);

console.log("PASS: StonkFun buy button uses the live contract address");
