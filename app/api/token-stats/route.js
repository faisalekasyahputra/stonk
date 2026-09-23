import { createClient } from "@supabase/supabase-js";
import { loadStats, mergeStats, validMint } from "../../../lib/token-stats.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

let cached;
let expiresAt = 0;
let pending;

async function readStats() {
	let address = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "").trim();
	let configUpdatedAt = null;
	const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key, NEXT_PUBLIC_PROJECT_SLUG: slug } = process.env;
	if (url && key && slug) {
		const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
		const { data, error } = await db.from("project_configs")
			.select("contract_address, updated_at, melly_projects!inner(slug)")
			.eq("melly_projects.slug", slug)
			.order("updated_at", { ascending: false })
			.limit(1)
			.abortSignal(AbortSignal.timeout(3500));
		if (error) throw new Error("Project config unavailable");
		if (data?.length) {
			address = (data[0].contract_address || "").trim();
			configUpdatedAt = data[0].updated_at;
		}
	}
	if (!address) return { ...mergeStats("", []), configUpdatedAt };
	if (!validMint(address)) return { ...mergeStats(address, []), configUpdatedAt, status: "invalid-address" };
	if ((process.env.NEXT_PUBLIC_CHAIN_ID || "solana") !== "solana") {
		return { ...mergeStats(address, []), configUpdatedAt, status: "unsupported-chain" };
	}
	return { ...await loadStats(address), configUpdatedAt };
}

export async function GET() {
	try {
		// ponytail: per-instance cache; use shared storage only if multi-instance traffic warrants it.
		if (!cached || Date.now() >= expiresAt) {
			pending ||= readStats()
				.then((value) => { cached = value; expiresAt = Date.now() + 5000; })
				.finally(() => { pending = null; });
			await pending;
		}
		return Response.json(cached, { headers: { "Cache-Control": "public, max-age=0, s-maxage=5" } });
	} catch {
		return Response.json(
			{ status: "unavailable", message: "Statistics temporarily unavailable" },
			{ status: 503, headers: { "Cache-Control": "no-store" } },
		);
	}
}
