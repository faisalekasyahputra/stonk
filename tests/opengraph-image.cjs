const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");

const target = require.resolve("../public/assets/og-stonk-market.jpg");
const hash = (path) => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");

assert.equal(hash(target), "d99323230d5abe6ce472f816fc59251efdb85e384638fe6c73708eb1fc115442");
const layout = fs.readFileSync(require.resolve("../app/layout.js"), "utf8");
assert.match(layout, /url:\s*["']\/assets\/og-stonk-market\.jpg["']/);
assert.match(layout, /process\.env\.VERCEL_PROJECT_PRODUCTION_URL/);
assert.ok(
	layout.indexOf("VERCEL_PROJECT_PRODUCTION_URL") < layout.indexOf("VERCEL_URL"),
	"stable production domain must take priority over protected deployment URLs",
);

console.log("PASS: supplied Open Graph photo uses a domain-relative URL");
