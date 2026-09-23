import { isAddress, getAddressEncoder, getAddressDecoder, getProgramDerivedAddress } from "@solana/addresses";

const PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const SOL = "So11111111111111111111111111111111111111112";
const LAUNCHLAB = "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj";
const TOKEN_PROGRAMS = new Set([
	"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
	"TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
]);
const FIELDS = ["priceUsd", "marketCapUsd", "fdvUsd", "volume24hUsd", "change24hPercent"];

function number(value, signed = false) {
	if (value == null || value === "" || typeof value === "boolean") return null;
	const n = Number(value);
	return Number.isFinite(n) && (signed || n >= 0) ? n : null;
}

export function validMint(value) {
	return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value) && isAddress(value);
}

export function normalizeDex(body, mint) {
	const pair = body?.pairs
		?.filter((item) => item.chainId === "solana" && item.baseToken?.address === mint)
		.sort((a, b) => (number(b.liquidity?.usd) || 0) - (number(a.liquidity?.usd) || 0))[0];
	if (!pair) return null;
	return {
		source: "Dexscreener",
		name: pair.baseToken.name,
		priceUsd: number(pair.priceUsd),
		marketCapUsd: number(pair.marketCap),
		fdvUsd: number(pair.fdv),
		volume24hUsd: number(pair.volume?.h24),
		change24hPercent: number(pair.priceChange?.h24, true),
	};
}

export function normalizeStonk(body, mint) {
	const token = body?.data?.token;
	if (token?.mint !== mint) return null;
	const market = token.market || {};
	return {
		source: "Stonkfun",
		name: token.name,
		priceUsd: number(market.priceUsd),
		marketCapUsd: number(market.marketCapUsd),
		fdvUsd: number(market.fdvUsd),
		volume24hUsd: number(market.volume24hUsd),
		change24hPercent: number(market.priceChange24h, true),
	};
}

export function normalizeBirdeye(body, mint) {
	const data = body?.data;
	if (body?.success !== true || data?.address !== mint) return null;
	return {
		source: "Birdeye",
		name: data.name,
		priceUsd: number(data.price),
		marketCapUsd: number(data.marketCap ?? data.mc),
		fdvUsd: number(data.fdv),
		volume24hUsd: number(data.v24hUSD),
		change24hPercent: number(data.priceChange24hPercent, true),
	};
}

export function normalizeHelius(body, mint) {
	const asset = body?.result;
	if (asset?.id !== mint) return null;
	const rawSupply = number(asset.token_info?.supply);
	const decimals = number(asset.token_info?.decimals);
	return {
		source: "Helius",
		name: asset.content?.metadata?.name,
		supply: rawSupply != null && decimals != null ? rawSupply / 10 ** decimals : null,
	};
}

export function mergeStats(address, providers) {
	const result = { address, name: null, supply: null, fieldSources: {}, checkedAt: new Date().toISOString() };
	for (const field of FIELDS) result[field] = null;
	for (const data of providers.filter(Boolean)) {
		if (!result.name && typeof data.name === "string") result.name = data.name;
		if (result.supply == null && number(data.supply) != null) {
			result.supply = number(data.supply);
			result.fieldSources.supply = data.source;
		}
		for (const field of FIELDS) {
			const value = number(data[field], field === "change24hPercent");
			if (field === "priceUsd" && !(value > 0)) continue;
			if (result[field] == null && value != null) {
				result[field] = value;
				result.fieldSources[field] = data.source;
			}
		}
	}
	result.status = !address ? "coming-soon" : FIELDS.some((field) => result[field] != null) ? "ready" : "waiting";
	return result;
}

async function json(url, options = {}) {
	const response = await fetch(url, { ...options, signal: AbortSignal.timeout(3500), cache: "no-store" });
	if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
	return response.json();
}

const dex = async (mint) => normalizeDex(await json(`https://api.dexscreener.com/latest/dex/tokens/${mint}`), mint);
const stonk = async (mint) => normalizeStonk(await json(`https://www.stonkfun.xyz/api/public/v1/tokens/${mint}`), mint);
const birdeye = async (mint) => {
	if (!process.env.BIRDEYE_API_KEY) return null;
	return normalizeBirdeye(await json(`https://public-api.birdeye.so/defi/token_overview?address=${mint}&frames=24h`, {
		headers: { "X-API-KEY": process.env.BIRDEYE_API_KEY, "x-chain": "solana" },
	}), mint);
};
const helius = async (mint) => {
	if (!process.env.HELIUS_RPC_URL) return null;
	return normalizeHelius(await json(process.env.HELIUS_RPC_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAsset", params: { id: mint, displayOptions: { showFungible: true } } }),
	}), mint);
};

export function decodeCurve(bytes) {
	if (bytes.length < 49 || !bytes.subarray(0, 8).equals(Buffer.from([23, 183, 248, 55, 96, 216, 172, 96])) || bytes[48] !== 0) return null;
	const virtualToken = bytes.readBigUInt64LE(8);
	const virtualQuote = bytes.readBigUInt64LE(16);
	if (!virtualToken || !virtualQuote) return null;
	const quoteBytes = bytes.length >= 115 ? bytes.subarray(83, 115) : Buffer.alloc(32);
	return { virtualToken, virtualQuote, quoteMint: quoteBytes.every((byte) => byte === 0) ? SOL : getAddressDecoder().decode(quoteBytes) };
}

async function accounts(addresses) {
	const body = await json(process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getMultipleAccounts", params: [addresses, { encoding: "base64", commitment: "confirmed" }] }),
	});
	if (body.error || !Array.isArray(body.result?.value)) throw new Error("RPC unavailable");
	return body.result.value;
}

function mintInfo(account) {
	if (!account || !TOKEN_PROGRAMS.has(account.owner)) return null;
	const bytes = Buffer.from(account.data[0], "base64");
	if (bytes.length < 82 || bytes[45] !== 1) return null;
	return { supply: bytes.readBigUInt64LE(36), decimals: bytes[44] };
}

async function quotePrice(mint) {
	const quotes = await Promise.allSettled([dex(mint), stonk(mint), birdeye(mint)]);
	return quotes.find((result) => result.status === "fulfilled" && result.value?.priceUsd > 0)?.value.priceUsd;
}

export async function pump(mint) {
	const [curveAddress] = await getProgramDerivedAddress({ programAddress: PUMP, seeds: ["bonding-curve", getAddressEncoder().encode(mint)] });
	const [account, baseAccount] = await accounts([curveAddress, mint]);
	if (!account || account.owner !== PUMP) return null;
	const curve = decodeCurve(Buffer.from(account.data[0], "base64"));
	const base = mintInfo(baseAccount);
	if (!curve || !base) return null;
	const [quoteAccount] = await accounts([curve.quoteMint]);
	const quote = mintInfo(quoteAccount);
	if (!quote) return null;
	const quoteUsd = await quotePrice(curve.quoteMint);
	if (!quoteUsd) return null;
	const priceUsd = Number(curve.virtualQuote) / Number(curve.virtualToken) * 10 ** (base.decimals - quote.decimals) * quoteUsd;
	return { source: "Pump.fun on-chain", priceUsd, fdvUsd: priceUsd * Number(base.supply) / 10 ** base.decimals };
}

export function decodeLaunchlab(bytes, mint, quoteMint) {
	if (bytes.length < 269 || bytes[17] !== 0 || !bytes.subarray(0, 8).equals(Buffer.from([247, 237, 227, 245, 215, 195, 222, 70]))) return null;
	const decode = (offset) => getAddressDecoder().decode(bytes.subarray(offset, offset + 32));
	if (decode(205) !== mint || decode(237) !== quoteMint) return null;
	const tokenReserve = bytes.readBigUInt64LE(37) - bytes.readBigUInt64LE(53);
	const quoteReserve = bytes.readBigUInt64LE(45) + bytes.readBigUInt64LE(61);
	if (tokenReserve <= 0n || quoteReserve <= 0n) return null;
	return { config: decode(141), tokenReserve, quoteReserve, decimalsA: bytes[18], decimalsB: bytes[19] };
}

export async function launchlab(mint) {
	const quotes = [...new Set([process.env.STATS_QUOTE_MINT, SOL])].filter(validMint);
	const pools = await Promise.all(quotes.map((quote) => getProgramDerivedAddress({
		programAddress: LAUNCHLAB,
		seeds: ["pool", getAddressEncoder().encode(mint), getAddressEncoder().encode(quote)],
	})));
	const result = await accounts([...pools.map((pool) => pool[0]), mint]);
	const base = mintInfo(result.at(-1));
	if (!base) return null;
	for (let index = 0; index < quotes.length; index++) {
		const account = result[index];
		if (account?.owner !== LAUNCHLAB) continue;
		const pool = decodeLaunchlab(Buffer.from(account.data[0], "base64"), mint, quotes[index]);
		if (!pool || pool.decimalsA !== base.decimals) continue;
		const [config, quoteAccount] = await accounts([pool.config, quotes[index]]);
		const quote = mintInfo(quoteAccount);
		const configBytes = config && Buffer.from(config.data[0], "base64");
		if (config?.owner !== LAUNCHLAB || configBytes.length < 17 || configBytes[16] !== 0 || quote?.decimals !== pool.decimalsB) continue;
		const usd = await quotePrice(quotes[index]);
		if (!usd) continue;
		const priceUsd = Number(pool.quoteReserve) / Number(pool.tokenReserve) * 10 ** (base.decimals - quote.decimals) * usd;
		return { source: "LaunchLab on-chain", priceUsd, fdvUsd: priceUsd * Number(base.supply) / 10 ** base.decimals };
	}
	return null;
}

export async function loadStats(mint, providers = { stonk, dex, birdeye, pump, launchlab, helius }) {
	const attempts = [];
	async function read(name) {
		try { return await providers[name](mint); }
		catch { attempts.push(name); return null; }
	}
	const values = await Promise.all([read("stonk"), read("dex")]);
	let stats = mergeStats(mint, values);
	if (FIELDS.some((field) => stats[field] == null)) {
		values.push(await read("birdeye"));
		stats = mergeStats(mint, values);
	}
	if (!(stats.priceUsd > 0) || (stats.marketCapUsd == null && stats.fdvUsd == null)) {
		values.push(...await Promise.all([read("launchlab"), read("pump")]));
		stats = mergeStats(mint, values);
	}
	if (!stats.name || stats.supply == null) {
		values.push(await read("helius"));
		stats = mergeStats(mint, values);
	}
	return { ...stats, unavailableSources: attempts };
}
