const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");

const vm = require("node:vm");
const target = require.resolve("../public/assets/og-stonk-rooftop.png");
const hash = (path) => crypto.createHash("sha256").update(fs.readFileSync(path)).digest("hex");

assert.equal(hash(target), "947379156ee24979a150f73d614cc3f7e9282fa0118df21a36cab437f4bdea5a");
const layout = fs.readFileSync(require.resolve("../app/layout.js"), "utf8");
const source = layout.slice(layout.indexOf("const metadata"), layout.indexOf("export default"))
	.replace("export async function", "async function");

(async () => {
	for (const [host, protocol, expected] of [
		["stonk-gamma.vercel.app", "https", "https://stonk-gamma.vercel.app"],
		["custom.example", "https", "https://custom.example"],
		["localhost:3000", "http", "http://localhost:3000"],
		["evil.example/path", "https", "https://fallback.example"],
	]) {
		const result = await vm.runInNewContext(`${source}\ngenerateMetadata()`, {
			URL, process: { env: { NEXT_PUBLIC_SITE_URL: "https://fallback.example" } },
			headers: async () => new Headers({ host, "x-forwarded-proto": protocol }),
		});
		assert.equal(result.metadataBase.origin, expected);
		for (const image of [result.openGraph.images[0].url, result.twitter.images[0]]) {
			assert.equal(image, "/assets/og-stonk-rooftop.png");
			assert.equal(new URL(image, result.metadataBase).href, `${expected}${image}`);
		}
		const png = fs.readFileSync(target);
		assert.equal(result.openGraph.images[0].width, png.readUInt32BE(16));
		assert.equal(result.openGraph.images[0].height, png.readUInt32BE(20));
	}
	console.log("PASS: supplied OG/Twitter image follows the request domain with correct dimensions");
})().catch((error) => { console.error(error); process.exitCode = 1; });
