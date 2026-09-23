import assert from "node:assert/strict";
import {
	normalizeDex,
	normalizeStonk,
	normalizeBirdeye,
	normalizeHelius,
	mergeStats,
	decodeCurve,
	decodeLaunchlab,
	loadStats,
	pump,
	validMint,
} from "../lib/token-stats.mjs";

const mint = "So11111111111111111111111111111111111111112";
const pair = {
	chainId: "solana",
	baseToken: { address: mint, name: "SOL" },
	priceUsd: "150",
	fdv: 1000,
	volume: { h24: 0 },
	priceChange: { h24: 0 },
};

assert.equal(normalizeDex({ pairs: [{ ...pair, baseToken: { address: "other" } }] }, mint), null);
assert.equal(normalizeDex({ pairs: [{ ...pair, baseToken: { address: mint.toLowerCase() } }] }, mint), null);
assert.equal(normalizeDex({ pairs: [{ ...pair, baseToken: { address: "other" }, quoteToken: { address: mint } }] }, mint), null);
assert.equal(normalizeDex({ pairs: [pair] }, mint).volume24hUsd, 0);
assert.equal(normalizeStonk({ data: { token: { mint: "wrong", market: { priceUsd: 1 } } } }, mint), null);
assert.equal(normalizeBirdeye({ success: false, data: { address: mint, price: 1 } }, mint), null);
const helius = normalizeHelius({
	result: {
		id: mint,
		content: { metadata: { name: "Wrapped SOL", symbol: "SOL" } },
		token_info: { supply: 1000000000, decimals: 9 },
	},
}, mint);
assert.equal(helius.name, "Wrapped SOL");
assert.equal(helius.supply, 1);
assert.equal(normalizeHelius({ result: { id: "wrong" } }, mint), null);

const bird = normalizeBirdeye({
	success: true,
	data: { address: mint, price: 2, marketCap: 42, v24hUSD: 0, priceChange24hPercent: 0 },
}, mint);
const merged = mergeStats(mint, [normalizeDex({ pairs: [pair] }, mint), bird]);
assert.equal(merged.priceUsd, 150);
assert.equal(merged.marketCapUsd, 42);
assert.equal(merged.change24hPercent, 0);
assert.equal(merged.fieldSources.marketCapUsd, "Birdeye");
assert.equal(mergeStats(mint, []).priceUsd, null);
assert.equal(normalizeDex({ pairs: [{ ...pair, priceUsd: "", fdv: null, liquidity: { usd: 100000 } }] }, mint).fdvUsd, null);

const curve = Buffer.alloc(115);
Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(curve);
curve.writeBigUInt64LE(1000000000000000n, 8);
curve.writeBigUInt64LE(30000000000n, 16);
assert.equal(decodeCurve(curve).virtualQuote, 30000000000n);
curve[48] = 1;
assert.equal(decodeCurve(curve), null);
assert.equal(validMint("https://example.com"), false);
assert.equal(validMint(mint), true);

let birdCalls = 0;
const stats = await loadStats(mint, {
	stonk: async () => { throw new Error("timeout"); },
	dex: async () => null,
	birdeye: async () => { birdCalls++; return bird; },
	launchlab: async () => null,
	pump: async () => ({ source: "Pump.fun on-chain", priceUsd: 3, fdvUsd: 300 }),
});
assert.equal(stats.priceUsd, 2);
assert.equal(stats.marketCapUsd, 42);
assert.equal(birdCalls, 1);
assert.equal(stats.volume24hUsd, 0);

const liveProviders = {
	stonk: async () => ({ source: "Stonkfun", priceUsd: 0.000015, marketCapUsd: 15000, fdvUsd: 15000, volume24hUsd: 100 }),
	dex: async () => null,
	birdeye: async () => null,
	launchlab: async () => ({ source: "LaunchLab on-chain", priceUsd: 0.000007, fdvUsd: 7000 }),
	pump: async () => null,
	helius: async () => null,
};
const liveStats = await loadStats(mint, liveProviders);
assert.equal(liveStats.priceUsd, 0.000007, "live pool price must override delayed API price");
assert.equal(liveStats.fdvUsd, 7000);
assert.equal(liveStats.marketCapUsd, null, "old MC must not hide the live FDV in the UI");
assert.equal(liveStats.volume24hUsd, 100);
const fallbackStats = await loadStats(mint, { ...liveProviders, launchlab: async () => { throw new Error("RPC timeout"); } });
assert.equal(fallbackStats.marketCapUsd, 15000);
assert.equal(fallbackStats.priceUsd, 0.000015);

const quoteMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const launch = Buffer.alloc(429);
Buffer.from([247, 237, 227, 245, 215, 195, 222, 70]).copy(launch);
const { getAddressEncoder } = await import("@solana/addresses");
Buffer.from(getAddressEncoder().encode(mint)).copy(launch, 205);
Buffer.from(getAddressEncoder().encode(quoteMint)).copy(launch, 237);
launch.writeBigUInt64LE(100n, 37);
launch.writeBigUInt64LE(200n, 45);
launch.writeBigUInt64LE(10n, 53);
launch.writeBigUInt64LE(20n, 61);
assert.equal(decodeLaunchlab(launch, mint, quoteMint).tokenReserve, 90n);
assert.equal(decodeLaunchlab(launch, mint, quoteMint).quoteReserve, 220n);
assert.equal(decodeLaunchlab(launch, quoteMint, mint), null);

const originalFetch = globalThis.fetch;
const pumpCurve = Buffer.alloc(115);
Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(pumpCurve);
Buffer.from(getAddressEncoder().encode(quoteMint)).copy(pumpCurve, 83);
pumpCurve.writeBigUInt64LE(2000000n, 8);
pumpCurve.writeBigUInt64LE(3000000000n, 16);
function mintAccount(decimals, supply) {
	const bytes = Buffer.alloc(82);
	bytes[44] = decimals;
	bytes[45] = 1;
	bytes.writeBigUInt64LE(supply, 36);
	return { owner: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", data: [bytes.toString("base64"), "base64"] };
}
let wrongOwner = false;
globalThis.fetch = async (url, options) => {
	let body;
	if (options.method === "POST") {
		const request = JSON.parse(options.body);
		body = { result: { value: request.params[0].length === 2
			? [{ owner: wrongOwner ? mint : "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P", data: [pumpCurve.toString("base64"), "base64"] }, mintAccount(6, 1000000000n)]
			: [mintAccount(9, 1000000000000n)] } };
	} else if (url.includes("dexscreener")) {
		body = { pairs: [{ ...pair, baseToken: { address: quoteMint }, priceUsd: "4" }] };
	} else body = {};
	return { ok: true, json: async () => body };
};
try {
	const result = await pump(mint);
	assert.equal(result.priceUsd, 6);
	assert.equal(result.fdvUsd, 6000);
	wrongOwner = true;
	assert.equal(await pump(mint), null);
} finally {
	globalThis.fetch = originalFetch;
}

console.log("PASS: provider identity, fallback, zero values, and curve validation");
