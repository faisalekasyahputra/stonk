const runtimeConfig = window.__APP_CONFIG__ || {};
export let TOKEN_ADDRESS = (runtimeConfig.tokenAddress || "").trim();
export const POLL_MS = 5000;

let currentScale = 0.1;
let lastSignificantChangePercent = 0;
let updateCallback = null;
let nextUpdateTime = null;
let activeRequest = null;
let revision = 0;
let configuredAddress = null;
let configuredUpdatedAt = null;

function text(id, value) {
	const element = document.getElementById(id);
	if (element) element.textContent = value;
}

function showAddress() {
	text("taskbar-ca", TOKEN_ADDRESS ? `CA: ${TOKEN_ADDRESS.slice(0, 4)}...${TOKEN_ADDRESS.slice(-4)}` : "CA: Coming soon");
	text("ca-box-address", TOKEN_ADDRESS);
	const button = document.getElementById("ca-display");
	if (button) {
		button.title = TOKEN_ADDRESS ? "Click to copy CA" : "Coming soon";
		button.setAttribute("aria-disabled", String(!TOKEN_ADDRESS));
	}
}

function status(message, online = false) {
	text("connection-label", message);
	const container = document.getElementById("connection-status");
	const dot = container?.querySelector(".status-dot");
	if (dot) dot.className = online ? "status-dot status-online" : "status-dot status-offline";
	if (container) container.title = message;
}

function clearStats() {
	for (const id of [
		"token-name", "token-volume", "token-change", "price-only-value",
		"market-cap-only-value", "penis-mc", "penis-size", "size-only-value",
		"penis-change", "update-time", "stats-source",
	]) text(id, "--");
	text("taskbar-mc", "MC: $--");
	text("taskbar-size", "Size: -- cm");
	text("valuation-label", "MC");
	text("size-valuation-label", "MC");
	currentScale = 0.1;
	lastSignificantChangePercent = 0;
	if (updateCallback) updateCallback(currentScale);
}

window.addEventListener("tokenAddressUpdated", (event) => {
	if (!event.detail || !("address" in event.detail)) return;
	const address = (event.detail.address || "").trim();
	configuredAddress = address;
	configuredUpdatedAt = event.detail.updatedAt || null;
	if (address === TOKEN_ADDRESS) return;
	TOKEN_ADDRESS = address;
	revision++;
	activeRequest?.abort();
	activeRequest = null;
	clearStats();
	showAddress();
	status(address ? "Waiting for market data" : "Coming soon");
	if (updateCallback) updateMarketCap(updateCallback);
});

function updateCountdown() {
	if (!nextUpdateTime) return;
	text("countdown", `Next update: ${Math.max(0, Math.ceil((nextUpdateTime - Date.now()) / 1000))}s`);
}

function updateAndFlashElement(elementId, newValue, oldValue, formatter = (value) => value) {
	const element = document.getElementById(elementId);
	if (!element) return;
	const formattedNew = formatter(newValue);
	const formattedOld = oldValue !== null && oldValue !== undefined ? formatter(oldValue) : null;
	element.innerHTML = formattedNew;
	if (formattedNew !== formattedOld && formattedOld !== null) {
		const numericNew = parseFloat(newValue);
		const numericOld = parseFloat(oldValue);
		element.classList.remove("flash-green", "flash-red");
		void element.offsetWidth;
		if (!Number.isNaN(numericNew) && !Number.isNaN(numericOld) && numericNew !== numericOld) {
			element.classList.add(numericNew > numericOld ? "flash-green" : "flash-red");
		}
	}
}

function updateDisplayWithData(data, callback) {
	const money = (value) => value == null ? "--" : "$" + value.toLocaleString("en-US", { maximumFractionDigits: 2 });
	text("token-name", data.name || "MEME MAN");
	text("token-volume", money(data.volume24hUsd));
	text("token-change", data.change24hPercent == null ? "--" : data.change24hPercent.toFixed(2) + "%");
	text("price-only-value", data.priceUsd == null ? "--" : "$" + data.priceUsd.toLocaleString("en-US", { maximumSignificantDigits: 8 }));
	const valuation = data.marketCapUsd ?? data.fdvUsd;
	const label = data.marketCapUsd == null && data.fdvUsd != null ? "FDV" : "MC";
	text("valuation-label", label);
	text("size-valuation-label", label);
	text("market-cap-only-value", money(valuation));
	text("penis-mc", money(valuation));
	text("taskbar-mc", `${label}: ${money(valuation)}`);
	if (valuation != null) updateSizeFromMarketCap(valuation, callback);
	else {
		currentScale = 0.1;
		callback?.(currentScale);
		text("penis-size", "--");
		text("size-only-value", "--");
		text("penis-change", "--");
		text("taskbar-size", "Size: -- cm");
	}
	const sources = [...new Set(Object.values(data.fieldSources || {}))].join(" / ");
	text("stats-source", sources || "--");
	text("update-time", new Date(data.checkedAt).toLocaleTimeString());
	status("Live", true);
}

async function updateMarketCap(callback) {
	showAddress();
	if (activeRequest) return;
	const controller = new AbortController();
	activeRequest = controller;
	const version = revision;
	try {
		const response = await fetch("/api/token-stats", {
			cache: "no-store",
			signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25000)]),
		});
		if (!response.ok) throw new Error("Statistics unavailable");
		const data = await response.json();
		if (version !== revision) return;
		if (typeof data.address !== "string") throw new Error("Invalid statistics response");
		if (configuredUpdatedAt && (
			!data.configUpdatedAt ||
			data.configUpdatedAt < configuredUpdatedAt ||
			(data.configUpdatedAt === configuredUpdatedAt && data.address !== configuredAddress)
		)) return;
		if (data.address !== TOKEN_ADDRESS) {
			TOKEN_ADDRESS = data.address;
			window.__APP_CONFIG__ = { ...window.__APP_CONFIG__, tokenAddress: TOKEN_ADDRESS };
			clearStats();
			showAddress();
		}
		if (data.configUpdatedAt) {
			configuredAddress = data.address;
			configuredUpdatedAt = data.configUpdatedAt;
		}
		if (data.status === "ready") updateDisplayWithData(data, callback);
		else {
			clearStats();
			const labels = {
				"coming-soon": "Coming soon",
				"invalid-address": "Invalid CA",
				"unsupported-chain": "Unsupported network",
				waiting: "Waiting for market data",
			};
			status(labels[data.status] || "Statistics unavailable");
		}
	} catch {
		if (version !== revision) return;
		clearStats();
		status(TOKEN_ADDRESS ? "Statistics temporarily unavailable" : "Coming soon");
	} finally {
		if (activeRequest === controller) {
			activeRequest = null;
			nextUpdateTime = Date.now() + POLL_MS;
		}
	}
}

function calculateScaleFromMarketCap(marketCap) {
	if (marketCap <= 0) return 0.1;
	return Math.max(0.1, Math.min(5, 0.00316 * Math.sqrt(marketCap)));
}

function updateSizeFromMarketCap(valueForScaling, callback) {
	const newScale = calculateScaleFromMarketCap(valueForScaling);
	const previousScale = currentScale;
	currentScale = newScale;
	if (Math.abs(newScale - previousScale) >= 0.001) callback?.(currentScale);
	const lengthCm = 5 * currentScale * 20;
	const previousLengthCm = 5 * previousScale * 20;
	updateAndFlashElement("penis-size", lengthCm, previousLengthCm, (value) => `${value.toFixed(1)} cm (${(value / 2.54).toFixed(1)} inch)`);
	updateAndFlashElement("size-only-value", lengthCm, previousLengthCm, (value) => `<span class="custom-font">${value.toFixed(1)}</span> cm`);
	text("taskbar-size", `Size: ${lengthCm.toFixed(1)} cm`);
	const changePercent = previousScale > 0 ? ((newScale - previousScale) / previousScale) * 100 : 0;
	if (parseFloat(changePercent.toFixed(1)) !== 0) lastSignificantChangePercent = changePercent;
	const displayPercent = lastSignificantChangePercent;
	const direction = displayPercent > 5
		? '<span class="material-icons">rocket_launch</span>'
		: displayPercent > 0
			? '<span class="material-icons">trending_up</span>'
			: displayPercent < -5
				? '<span class="material-icons">bolt</span>'
				: displayPercent < 0
					? '<span class="material-icons">trending_down</span>'
					: '<span class="material-icons">arrow_forward</span>';
	const change = document.getElementById("penis-change");
	if (change) change.innerHTML = `${direction} ${Math.abs(displayPercent).toFixed(1)}%`;
}

function startDataUpdates(callback) {
	updateCallback = callback;
	showAddress();
	clearStats();
	status(TOKEN_ADDRESS ? "Waiting for market data" : "Coming soon");
	updateMarketCap(callback);
	setInterval(() => {
		if (!nextUpdateTime || Date.now() >= nextUpdateTime) updateMarketCap(callback);
	}, 1000);
	setInterval(updateCountdown, 1000);
}

export { startDataUpdates };
