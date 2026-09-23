import assert from "node:assert/strict";
import {
	normalizeDex,
	normalizeStonk,
	normalizeBirdeye,
	mergeStats,
	decodeCurve,
	decodeLaunchlab,
	loadStats,
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

console.log("PASS: provider identity, fallback, zero values, and curve validation");
