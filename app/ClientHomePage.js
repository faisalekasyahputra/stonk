"use client";
import Script from "next/script";
import { useProjectConfig } from "../lib/useProjectConfig";
import { useEffect, useState } from "react";

const LOAD_ARROW_POINTS = [
	[-80, 980], [230, 730], [480, 800], [720, 600], [980, 680], [1680, -80],
];

// The board behind the arrow: a grid of prices that flicker, same look as the sky.
const BOARD = { cols: 14, rows: 18, cells: null };
function drawBoard(g, frame) {
	const w = g.canvas.width, h = g.canvas.height;
	const cw = w / BOARD.cols, ch = h / BOARD.rows;
	if (!BOARD.cells) {
		BOARD.cells = [];
		for (let r = 0; r < BOARD.rows; r++)
			for (let c = 0; c < BOARD.cols; c++)
				BOARD.cells.push({ x: c * cw, y: r * ch, v: 0.2 + Math.random() * 9.7, dir: Math.random() < 0.5 ? 1 : -1, boxed: Math.random() < 0.3, tri: Math.random() < 0.12 });
	}
	if (frame % 6 === 0) for (let i = 0; i < 25; i++) { const k = BOARD.cells[(Math.random() * BOARD.cells.length) | 0]; k.v = Math.max(0.05, k.v + (Math.random() - 0.5) * 0.5); k.dir = Math.random() < 0.5 ? 1 : -1; }
	g.textBaseline = 'middle';
	g.font = 'bold 26px "Arial Narrow",Arial,sans-serif';
	for (const k of BOARD.cells) {
		g.strokeStyle = 'rgba(30,62,0,0.32)';
		g.lineWidth = 2;
		g.strokeRect(k.x, k.y, cw, ch);
		if (k.boxed) { g.fillStyle = 'rgba(160,214,0,0.85)'; g.fillRect(k.x + 1, k.y + 1, cw - 2, ch - 2); }
		if (k.tri) {
			const cx = k.x + cw / 2, cy = k.y + ch / 2, t = 10;
			g.fillStyle = 'rgba(22,46,0,0.85)';
			g.beginPath(); g.moveTo(cx - t, cy + t * k.dir * 0.6); g.lineTo(cx + t, cy + t * k.dir * 0.6); g.lineTo(cx, cy - t * k.dir * 0.6); g.fill();
		} else {
			g.fillStyle = k.boxed ? '#0f2000' : 'rgba(26,54,0,0.75)';
			g.fillText(k.v.toFixed(2), k.x + 10, k.y + ch / 2);
		}
	}
}

function drawLoadArrow(g, progress, frame) {
	g.clearRect(0, 0, g.canvas.width, g.canvas.height);
	drawBoard(g, frame);
	// Body swells as it climbs, then balloons to swallow the screen (progress>1).
	const swell = progress <= 1 ? 40 + 120 * progress : 160 + (progress - 1) * 4200;
	const drawProgress = Math.min(1, progress);
	const segments = LOAD_ARROW_POINTS.slice(1).map((point, i) =>
		Math.hypot(point[0] - LOAD_ARROW_POINTS[i][0], point[1] - LOAD_ARROW_POINTS[i][1]),
	);
	let remaining = drawProgress * segments.reduce((sum, length) => sum + length, 0);
	const path = [LOAD_ARROW_POINTS[0]];
	let direction = [1, 0];

	for (let i = 0; i < segments.length; i++) {
		const start = LOAD_ARROW_POINTS[i];
		const end = LOAD_ARROW_POINTS[i + 1];
		direction = [(end[0] - start[0]) / segments[i], (end[1] - start[1]) / segments[i]];
		if (remaining >= segments[i]) {
			path.push(end);
			remaining -= segments[i];
		} else {
			path.push([start[0] + direction[0] * remaining, start[1] + direction[1] * remaining]);
			break;
		}
	}

	const tip = path.at(-1);
	const pulse = 1 + 0.18 * Math.sin(frame * 0.2);
	const gradient = g.createLinearGradient(LOAD_ARROW_POINTS[0][0], LOAD_ARROW_POINTS[0][1], tip[0], tip[1]);
	gradient.addColorStop(0, "#ff6a00");
	gradient.addColorStop(1, "#ffd23a");
	g.save();
	g.lineCap = "round";
	g.lineJoin = "round";
	const trace = () => {
		g.beginPath();
		path.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y));
	};

	// Glow: additive halo passes, widest and faintest first. One shadowBlur alone
	// disappears once the body swells past it, so the neon is built up instead.
	// Skipped during the balloon, where the body already floods the screen.
	if (progress <= 1) {
		g.globalCompositeOperation = "lighter";
		g.shadowColor = "#ff9a1a";
		g.shadowBlur = 60 * pulse;
		for (const [scale, alpha] of [[3, 0.1], [2.1, 0.16], [1.45, 0.24]]) {
			trace();
			g.strokeStyle = `rgba(255,150,30,${alpha * pulse})`;
			g.lineWidth = swell * scale;
			g.stroke();
		}
		g.globalCompositeOperation = "source-over";
	}

	// Solid body over the halo, then a hot white core down the middle.
	trace();
	g.strokeStyle = gradient;
	g.lineWidth = swell;
	g.shadowColor = "#ff9a1a";
	g.shadowBlur = Math.min(80, swell * 0.6) * pulse;
	g.stroke();
	g.shadowBlur = 0;
	trace();
	g.strokeStyle = "rgba(255,255,255,0.85)";
	g.lineWidth = swell * 0.3;
	g.stroke();

	const size = swell * 3.2;
	g.translate(tip[0], tip[1]);
	g.rotate(Math.atan2(direction[1], direction[0]));
	const head = () => {
		g.beginPath();
		g.moveTo(size, 0);
		g.lineTo(-size * 0.7, -size * 0.8);
		g.lineTo(-size * 0.25, 0);
		g.lineTo(-size * 0.7, size * 0.8);
		g.closePath();
	};
	if (progress <= 1) {
		g.globalCompositeOperation = "lighter";
		g.shadowColor = "#ffb028";
		g.shadowBlur = 90 * pulse;
		g.fillStyle = `rgba(255,170,40,${0.3 * pulse})`;
		head();
		g.fill();
		g.fill();
		g.globalCompositeOperation = "source-over";
	}
	head();
	g.fillStyle = "#ffd23a";
	g.shadowColor = "#ff9a1a";
	g.shadowBlur = Math.min(100, size * 0.4) * pulse;
	g.fill();
	g.restore();
}

export default function ClientHomePage({
	initialHtml,
	runtimeConfig,
	importMap,
}) {
	const { config } = useProjectConfig();
	const [html, setHtml] = useState(initialHtml);
	const [loadScene, setLoadScene] = useState(false);
	const [showPreloader, setShowPreloader] = useState(true);

	useEffect(() => {
		const root = document.documentElement;
		const startedAt = performance.now();
		const sceneTimer = setTimeout(() => setLoadScene(true), 0); // start loading the scene right away
		const arrow = document.querySelector(".load-arrow");
		const context = arrow.getContext("2d");
		let frame = 0;
		let removeTimer;
		let balloonStart = null; // set once the climb is done AND the model is in
		const timer = setInterval(() => {
			const elapsed = performance.now() - startedAt;
			const time = Math.min(1, elapsed / 3000); // 3s climb, eased
			const progress = 1 - (1 - time) ** 3;
			if (balloonStart === null && time >= 1 && root.classList.contains("model-ready")) {
				balloonStart = elapsed;
			}
			// Then the arrow balloons for 1.2s until it swallows the screen.
			const balloon = balloonStart === null ? 0 : Math.min(1, (elapsed - balloonStart) / 1200);
			drawLoadArrow(context, progress + balloon, frame++);

			if (balloon < 1) return;

			clearInterval(timer);
			root.classList.add("scene-ready");
			removeTimer = setTimeout(() => setShowPreloader(false), 1500);
		}, 16);

		return () => {
			clearInterval(timer);
			clearTimeout(sceneTimer);
			clearTimeout(removeTimer);
		};
	}, []);

	useEffect(() => {
		if (config && typeof window !== "undefined") {
			console.log("[DEBUG] Syncing data from Supabase:", config);

			// The chart URL names the chain (dexscreener.com/<chain>/<pair>), so the
			// price lookup follows the token off Solana without another config field.
			let chainId;
			try {
				const parts = new URL(config.dexscreener_url).pathname.split("/");
				chainId = parts.filter(Boolean)[0]?.toLowerCase();
			} catch {
				// No chart URL yet, so the chain stays whatever it already was.
			}

			window.__APP_CONFIG__ = {
				...window.__APP_CONFIG__,
				tokenAddress: config.contract_address,
				...(chainId ? { chainId } : {}),
			};

			// Dispatch event for data.js to pick up
			window.dispatchEvent(
				new CustomEvent("tokenAddressUpdated", {
					detail: { address: config.contract_address, chainId },
				}),
			);

			// Update Social Links in the legacy HTML DOM manually
			const updateLinks = () => {
				// Matching by URL is ambiguous now that both X links live on x.com,
				// so the markup carries stable ids and they are addressed directly.
				const setLink = (id, url) => {
					const el = document.getElementById(id);
					if (!el || !url) return;
					if (el.tagName === "A") el.href = url;
					else el.setAttribute("onclick", `window.open('${url}', '_blank')`);
				};
				const communityUrl = config.community_url || config.telegram_url;
				setLink("x-icon", config.twitter_url);
				setLink("x-link", config.twitter_url);
				setLink("community-icon", communityUrl);
				setLink("community-link", communityUrl);

				// #ca-box-address is the single source of truth for the address: the
				// buy links read it at click time, so they stay right even when the
				// address lands later. Only push into it, never bake a URL.
				const caBox = document.getElementById("ca-box-address");
				if (caBox && config.contract_address) {
					caBox.textContent = config.contract_address;
				}
				const caText = caBox?.textContent?.trim() || "";
				const ca = caText.toLowerCase() === "coming soon" ? "" : caText;

				// Buy always goes to the Pons launchpad; the icon is only useful
				// once there is an address to send people to.
				const buyIcon = document.getElementById("buy-icon");
				if (buyIcon) buyIcon.style.display = ca ? "" : "none";

				// The chart link is whatever Supabase says (Robinhood, a DEX, anything).
				// A {CA} placeholder in that URL is filled in with the contract address,
				// so the same row keeps working when the token changes.
				const chartIcon = document.getElementById("chart-icon");
				if (chartIcon) {
					const chartUrl = (config.dexscreener_url || "").replace(/{CA}/gi, ca);
					if (chartUrl) {
						chartIcon.style.display = "";
						chartIcon.setAttribute(
							"onclick",
							`window.open('${chartUrl}', '_blank')`,
						);
					} else {
						chartIcon.style.display = "none";
					}
				}
			};

			const updateTwitterEmbed = () => {
				const panelContent = document.querySelector(
					"#twitter-panel .xp-content",
				);

				// telegram_url holds the tracking bot's X account; the main account is
				// the fallback so the panel is never empty.
				const feedUrl = config.telegram_url || config.twitter_url;
				if (feedUrl && panelContent) {
					const handleMatch = feedUrl.match(
						/(?:twitter\.com|x\.com)\/([^\/?]+)/,
					);
					const handle = handleMatch ? handleMatch[1] : "stonkpons";

					panelContent.innerHTML = `<a class="twitter-timeline" data-theme="light" data-tweet-limit="3" href="https://twitter.com/${handle}">Posts by @${handle}</a>`;

					// Better way to wait for twttr
					if (window.twttr && window.twttr.widgets) {
						window.twttr.widgets.load(panelContent);
					} else {
						// Inject the script if not present
						if (!document.getElementById("twitter-wjs")) {
							const script = document.createElement("script");
							script.id = "twitter-wjs";
							script.src = "https://platform.twitter.com/widgets.js";
							script.async = true;
							script.onload = () => {
								if (window.twttr && window.twttr.widgets) {
									window.twttr.widgets.load(panelContent);
								}
							};
							document.head.appendChild(script);
						}
					}
				}
			};

			// Run immediately and also after a short delay to ensure DOM is ready
			updateLinks();
			updateTwitterEmbed();
			setTimeout(() => {
				updateLinks();
				updateTwitterEmbed();
			}, 1000);
		}
		// showPreloader is a dependency because unmounting the curtain re-renders
		// the legacy markup, which throws away the link edits made above.
	}, [config, html, showPreloader]);

	return (
		<>
			{showPreloader ? (
				<div id="load-curtain">
					<canvas className="load-arrow" width="1600" height="900" aria-hidden="true" />
				</div>
			) : null}
			<main
				dangerouslySetInnerHTML={{ __html: html }}
				suppressHydrationWarning
			/>
			<Script
				id="legacy-runtime-config"
				strategy="beforeInteractive"
				dangerouslySetInnerHTML={{
					__html: `window.__APP_CONFIG__ = ${runtimeConfig};`,
				}}
			/>
			<Script
				id="legacy-importmap"
				type="importmap"
				strategy="beforeInteractive"
				dangerouslySetInnerHTML={{ __html: importMap }}
			/>
			{loadScene ? (
				<Script
					id="legacy-main"
					src="/js/main.js?v=20241225-01"
					type="module"
					strategy="afterInteractive"
				/>
			) : null}
			<Script
				id="twitter-widget"
				src="https://platform.twitter.com/widgets.js"
				strategy="lazyOnload"
				onLoad={() => {
					const panelContent = document.querySelector(
						"#twitter-panel .xp-content",
					);
					if (window.twttr && window.twttr.widgets && panelContent) {
						window.twttr.widgets.load(panelContent);
					}
				}}
			/>
		</>
	);
}
