const runtimeConfig = window.__APP_CONFIG__ || {};
export let TOKEN_ADDRESS =
	runtimeConfig.tokenAddress || "";
// Not a const: the chain arrives with the Supabase config, after this module
// has already been evaluated.
let CHAIN_ID = runtimeConfig.chainId || "solana";

let lastUpdate = null;
let nextUpdateTime = null;
let currentScale = 0.1; // Default scale for 10cm
let prevTokenData = null; // Store previous data for comparison
let foundPairAddress = runtimeConfig.pairAddress || null; // Allow forcing pair via runtime config
let lastSignificantChangePercent = 0; // Store the last signed, non-zero change percent
let updateCallback = null;

function selectBestPairAddress(pairs, contractAddress, chainId) {
	if (!pairs || pairs.length === 0) return null;

	const normalizedAddress = contractAddress.toLowerCase();
	const sortedPairs = [...pairs].sort(
		(a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
	);

	console.log(
		`[PAIR_FINDER_DETAIL] Found ${sortedPairs.length} pairs. Checking each for valid FDV...`,
	);
	sortedPairs.forEach((pair, index) => {
		console.log(
			`[PAIR_FINDER_DETAIL] Pair #${index + 1}: Address=${
				pair.pairAddress
			}, Liquidity=$${pair.liquidity?.usd ?? 0}, FDV=${pair.fdv ?? "N/A"}`,
		);
	});

	// Best case: correct chain, token involved (base/quote), and FDV present.
	const bestPair = sortedPairs.find((pair) => {
		const baseAddress = pair.baseToken?.address?.toLowerCase();
		const quoteAddress = pair.quoteToken?.address?.toLowerCase();
		const tokenInPair =
			baseAddress === normalizedAddress || quoteAddress === normalizedAddress;
		return (
			pair.chainId === chainId &&
			tokenInPair &&
			typeof pair.fdv === "number" &&
			pair.fdv > 0
		);
	});

	if (bestPair) {
		console.log(
			`[PAIR_FINDER] SUCCESS: Found best-case pair with valid FDV > 0. Address: ${bestPair.pairAddress}`,
		);
		return bestPair.pairAddress;
	}

	// Fallback 1: any pair on chain with FDV.
	const fallbackPairWithFDV = sortedPairs.find(
		(pair) =>
			pair.chainId === chainId && typeof pair.fdv === "number" && pair.fdv > 0,
	);
	if (fallbackPairWithFDV) {
		console.log(
			`[PAIR_FINDER] WARNING: Using fallback pair with valid FDV. Address: ${fallbackPairWithFDV.pairAddress}`,
		);
		return fallbackPairWithFDV.pairAddress;
	}

	// Fallback 2: most liquid pair on chain even without FDV.
	const mostLiquidPair = sortedPairs.find((pair) => pair.chainId === chainId);
	if (mostLiquidPair) {
		console.log(
			`[PAIR_FINDER] WARNING: No pair with FDV found. Using most liquid pair on chain. Address: ${mostLiquidPair.pairAddress}`,
		);
		return mostLiquidPair.pairAddress;
	}

	return null;
}

/**
 * Searches for the most relevant pair address for a given token contract.
 * This logic is adapted from data2.js for more robust data fetching.
 */
async function findPairAddress(contractAddress, chainId) {
	console.log(
		`[DEBUG] Step 2: Searching for pair address for CA: ${contractAddress}`,
	);

	// Check if contract address is empty
	if (!contractAddress || contractAddress.trim() === "") {
		console.log("[DEBUG] Contract address is empty. Cannot search for pairs.");
		return null;
	}

	try {
		const tokenSearchUrl = `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`;
		const response = await fetch(tokenSearchUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}
		const data = await response.json();
		console.log(
			"[DEBUG] Step 3: Received pair search response from API.",
			data,
		);
		const tokenEndpointPair = selectBestPairAddress(
			data.pairs,
			contractAddress,
			chainId,
		);
		if (tokenEndpointPair) return tokenEndpointPair;

		// Fallback search when token endpoint has null/empty pairs.
		const genericSearchUrl = `https://api.dexscreener.com/latest/dex/search?q=${contractAddress}`;
		const genericResponse = await fetch(genericSearchUrl);
		if (!genericResponse.ok) {
			throw new Error(
				`Search API HTTP error! Status: ${genericResponse.status}`,
			);
		}
		const genericData = await genericResponse.json();
		console.log(
			"[DEBUG] Step 4: Received generic search response from API.",
			genericData,
		);

		const genericPair = selectBestPairAddress(
			genericData.pairs,
			contractAddress,
			chainId,
		);
		if (genericPair) return genericPair;

		console.warn(
			"[PAIR_FINDER] No suitable pair found from token/search APIs.",
		);
		return null;
	} catch (error) {
		console.error(
			"[DEBUG] Step 3.1 (ERROR): Error searching for pair address:",
			error,
		);
		return null;
	}
}

// Add event listener to dynamically update TOKEN_ADDRESS from React
window.addEventListener("tokenAddressUpdated", (e) => {
	if (e.detail && e.detail.chainId && CHAIN_ID !== e.detail.chainId) {
		console.log(`[DEBUG] Chain switched to: ${e.detail.chainId}`);
		CHAIN_ID = e.detail.chainId;
		foundPairAddress = null; // pairs are per-chain, so the old one is void
	}
	if (e.detail && e.detail.address && TOKEN_ADDRESS !== e.detail.address) {
		console.log(
			`[DEBUG] Received new token address from React: ${e.detail.address}`,
		);
		TOKEN_ADDRESS = e.detail.address;
		foundPairAddress = null; // Reset pair address so it searches anew
		if (updateCallback) {
			updateMarketCap(updateCallback);
		}
	}
});

function updateCountdown() {
	if (!nextUpdateTime) return;
	const now = Date.now();
	const remaining = Math.max(0, Math.ceil((nextUpdateTime - now) / 1000));
	const countdownElement = document.querySelector("#countdown");
	if (countdownElement)
		countdownElement.textContent = `Next update: ${remaining}s`;
}

function updateAndFlashElement(
	elementId,
	newValue,
	oldValue,
	formatter = (val) => val,
) {
	const element = document.getElementById(elementId);
	if (!element) return;

	const formattedNew = formatter(newValue);
	const formattedOld =
		oldValue !== null && oldValue !== undefined ? formatter(oldValue) : null;

	element.innerHTML = formattedNew; // Use innerHTML to render the span tags

	if (formattedNew !== formattedOld && formattedOld !== null) {
		const numericNew = parseFloat(newValue);
		const numericOld = parseFloat(oldValue);

		element.classList.remove("flash-green", "flash-red");
		void element.offsetWidth; // Force reflow to restart animation

		if (!isNaN(numericNew) && !isNaN(numericOld)) {
			if (numericNew > numericOld) {
				element.classList.add("flash-green");
			} else if (numericNew < numericOld) {
				element.classList.add("flash-red");
			}
		}
	}
}

function updateDisplayWithData(tokenData, updateArbreCallback) {
	if (!tokenData) return;
	console.log("[DEBUG] Step 7: updateDisplayWithData function executed.");

	const prevData = prevTokenData || {};

	// === UPDATE ALL UI ELEMENTS ===

	// 1. CA Box - ALWAYS show the main token address
	const caBoxAddress = document.getElementById("ca-box-address");
	if (caBoxAddress) caBoxAddress.textContent = TOKEN_ADDRESS;

	// 2. Token Info Panel (Top Right)
	const tokenName = document.getElementById("token-name");
	if (tokenName) tokenName.textContent = tokenData.baseToken.name;
	updateAndFlashElement(
		"token-volume",
		tokenData.volume.h24,
		prevData.volume ? prevData.volume.h24 : 0,
		(v) => `$${v ? v.toLocaleString("en-US") : "--"}`,
	);
	const changeEl = document.getElementById("token-change");
	if (changeEl) {
		const change = tokenData.priceChange.h24;
		changeEl.textContent = `${change ? change.toFixed(2) : "--"}%`;
		changeEl.style.color = change >= 0 ? "#A45A2A" : "#ff0000";
	}

	// 3. Top Info Bar (Price)
	updateAndFlashElement(
		"price-only-value",
		tokenData.priceUsd,
		prevData.priceUsd,
		(p) =>
			`$ <span class="custom-font">${
				p ? parseFloat(p).toFixed(8) : "--"
			}</span>`,
	);

	// 4. Handle Market Cap for Display AND Scaling
	const marketCap = tokenData.fdv;
	const liquidity = tokenData.liquidity?.usd;
	const prevMc = prevTokenData ? prevTokenData.fdv : null;

	// --- ROBUSTNESS FIX V3 ---
	// For scaling, prioritize FDV. If unavailable, use Liquidity * 50 as a proxy.
	const valueForScaling =
		typeof marketCap === "number" && marketCap > 0
			? marketCap
			: typeof liquidity === "number" && liquidity > 0
				? liquidity * 50
				: 0;

	console.log(
		`[METRIC_LOGIC] FDV: ${marketCap}, Liquidity: ${liquidity}. Using derived value: ${valueForScaling} for scaling.`,
	);

	// Update the on-screen display for Market Cap using the REAL market cap value
	updateAndFlashElement("penis-mc", marketCap, prevMc, (val) =>
		val != null ? val.toLocaleString("de-DE") : "--",
	);
	updateAndFlashElement(
		"market-cap-only-value",
		marketCap,
		prevMc,
		(val) =>
			`$ <span class="custom-font">${
				val != null ? val.toLocaleString("de-DE") : "--"
			}</span>`,
	);

	// CRITICAL: Check if the derived valueForScaling is valid before updating size.
	if (valueForScaling > 0) {
		console.log(
			`[DATA] Valid scaling value received: ${valueForScaling}. Proceeding with size update.`,
		);
		updateSizeFromMarketCap(valueForScaling, updateArbreCallback);
	} else {
		console.warn(
			`[ERROR_HANDLER] No valid FDV or Liquidity found. Skipping size update.`,
		);
		// If there's no value for scaling, ensure the size display is also reset/updated to a base value.
		updateSizeFromMarketCap(0, updateArbreCallback);
	}

	// Update taskbar MC
	const taskbarMc = document.getElementById("taskbar-mc");
	if (taskbarMc) {
		taskbarMc.textContent = `MC: $${marketCap ? marketCap.toLocaleString("en-US") : "--"}`;
	}

	// 5. Connection Status
	lastUpdate = new Date();
	nextUpdateTime = Date.now() + 5000;
	const updateTimeEl = document.getElementById("update-time");
	if (updateTimeEl) updateTimeEl.textContent = lastUpdate.toLocaleTimeString();

	const statusContainer = document.getElementById("connection-status");
	if (statusContainer) {
		const statusDot = statusContainer.querySelector(".status-dot");
		if (statusDot) statusDot.className = "status-dot status-online";
	}

	const connectionLabel = document.getElementById("connection-label");
	if (connectionLabel) {
		connectionLabel.textContent = "Live";
		connectionLabel.style.color = "#A45A2A";
	}
}

async function updateMarketCap(updateArbreCallback) {
	console.log("[DEBUG] Step 1: updateMarketCap function called.");

	// Update Taskbar CA if exists
	const taskbarCa = document.getElementById("taskbar-ca");
	const caBoxId = document.getElementById("ca-box-address");
	if (TOKEN_ADDRESS) {
		const shortCa = `CA: ${TOKEN_ADDRESS.slice(0, 4)}...${TOKEN_ADDRESS.slice(-4)}`;
		if (taskbarCa) taskbarCa.textContent = shortCa;
		if (caBoxId) caBoxId.textContent = TOKEN_ADDRESS;
	}

	// Check if TOKEN_ADDRESS is empty
	if (!TOKEN_ADDRESS || TOKEN_ADDRESS.trim() === "") {
		console.log(
			"[DEBUG] TOKEN_ADDRESS is empty. Clearing all data and stopping updates.",
		);

		// Clear all displays
		updateAndFlashElement("penis-size", 0, null, () => "--");
		updateAndFlashElement("penis-mc", 0, null, () => "--");
		updateAndFlashElement("penis-price", 0, null, () => "--");
		updateAndFlashElement("size-only-value", 0, null, () => "--");
		updateAndFlashElement("market-cap-only-value", 0, null, () => "--");
		updateAndFlashElement("price-only-value", 0, null, () => "--");

		// No contract address configured yet -> say so instead of showing a dash.
		const caBox = document.getElementById("ca-box-address");
		if (caBox) {
			caBox.textContent = "Coming Soon";
		}
		if (taskbarCa) taskbarCa.textContent = "CA: Coming Soon";

		// Set connection status to offline
		const statusContainer = document.getElementById("connection-status");
		if (statusContainer) {
			statusContainer.style.color = "#ff0000";
			const statusDot = statusContainer.querySelector(".status-dot");
			if (statusDot) statusDot.className = "status-dot status-offline";
		}

		const connectionLabel = document.getElementById("connection-label");
		if (connectionLabel) {
			connectionLabel.textContent = "No Token Address";
			connectionLabel.style.color = "red";
		}

		// Reset scale to default
		currentScale = 0.1;
		if (updateArbreCallback) {
			updateArbreCallback(currentScale);
		}

		return;
	}

	if (!foundPairAddress) {
		foundPairAddress = await findPairAddress(TOKEN_ADDRESS, CHAIN_ID);
		if (!foundPairAddress) {
			console.warn(
				"[DEBUG] Pair address not found yet. Updates paused until a valid pair is detected.",
			);
			const statusContainer = document.getElementById("connection-status");
			if (statusContainer) {
				statusContainer.style.color = "#ff0000";
				const statusDot = statusContainer.querySelector(".status-dot");
				if (statusDot) statusDot.className = "status-dot status-offline";
			}
			const connectionLabel = document.getElementById("connection-label");
			if (connectionLabel) {
				connectionLabel.textContent = "Pair Not Found";
				connectionLabel.style.color = "red"; // Set text to red for errors
			}
			nextUpdateTime = Date.now() + 5000;
			return;
		}
	}

	const apiUrl = `https://api.dexscreener.com/latest/dex/pairs/${CHAIN_ID}/${foundPairAddress}`;
	console.log(`[DEBUG] Step 5: Fetching pair data from API: ${apiUrl}`);

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

		const apiData = await response.json();
		console.log("[DEBUG] Step 6: Received pair data response.", apiData);

		if (apiData.pair) {
			updateDisplayWithData(apiData.pair, updateArbreCallback);
			prevTokenData = apiData.pair;
		} else {
			throw new Error("API response did not contain a 'pair' object.");
		}
	} catch (error) {
		console.error(
			"[DEBUG] Step 6.1 (ERROR): Failed to fetch or process pair data:",
			error,
		);
		const statusContainer = document.getElementById("connection-status");
		if (statusContainer) {
			statusContainer.style.color = "#ff0000";
			const statusDot = statusContainer.querySelector(".status-dot");
			if (statusDot) statusDot.className = "status-dot status-offline";
		}
		const connectionLabel = document.getElementById("connection-label");
		if (connectionLabel) {
			connectionLabel.textContent = "Error";
			connectionLabel.style.color = "red"; // Set text to red for errors
		}
		nextUpdateTime = Date.now() + 5000;
	}
}

function calculateScaleFromMarketCap(marketCap) {
	// This function now assumes it receives a valid, non-negative marketCap from the check above.
	console.log(`[SCALE] Calculating scale for input value: ${marketCap}`);

	if (marketCap <= 0) return 0.1;

	const minScale = 0.1;
	const maxScale = 5.0; // Increased max scale for higher potential growth

	// New, simpler, and more aggressive square root scaling.
	// Calibrated so that MC=$100k -> scale=1.0
	const k = 0.00316;
	let scale = k * Math.sqrt(marketCap);

	const finalScale = Math.max(minScale, Math.min(maxScale, scale));

	console.log(
		`[SCALE] Input: ${marketCap}, Calculated (sqrt) Scale: ${scale.toFixed(
			4,
		)}, Final Clamped Scale: ${finalScale.toFixed(4)}`,
	);
	return finalScale;
}

function updateSizeFromMarketCap(valueForScaling, updateArbreCallback) {
	console.log(
		`[UPDATE_SIZE] Starting direct update with value: ${valueForScaling}`,
	);

	const newScale = calculateScaleFromMarketCap(valueForScaling);
	const previousScale = currentScale;

	// Prevent unnecessary DOM updates if scale hasn't changed significantly
	if (Math.abs(newScale - previousScale) < 0.001) {
		return;
	}

	currentScale = newScale;

	// 1. Update 3D Model Immediately
	if (updateArbreCallback) {
		updateArbreCallback(currentScale);
	}

	// 2. Update Size Displays (cm/inch)
	const length_cm = 5.0 * currentScale * 20;
	const prev_length_cm = 5.0 * previousScale * 20;

	updateAndFlashElement(
		"penis-size",
		length_cm,
		prev_length_cm, // Pass previous value for flashing
		(val) => `${val.toFixed(1)} cm (${(val / 2.54).toFixed(1)} inch)`,
	);
	updateAndFlashElement(
		"size-only-value",
		length_cm,
		prev_length_cm,
		(val) => `<span class="custom-font">${val.toFixed(1)}</span> cm`,
	);

	const taskbarSize = document.getElementById("taskbar-size");
	if (taskbarSize) {
		taskbarSize.textContent = `Size: ${length_cm.toFixed(1)} cm`;
	}

	// 3. Update Change % Display in Side Panel
	const changePercent =
		previousScale > 0 ? ((newScale - previousScale) / previousScale) * 100 : 0;

	if (parseFloat(changePercent.toFixed(1)) !== 0) {
		lastSignificantChangePercent = changePercent;
	}

	const displayPercent = lastSignificantChangePercent;
	const displayDirection =
		displayPercent > 5
			? `<span class="material-icons">rocket_launch</span>`
			: displayPercent > 0
				? `<span class="material-icons">trending_up</span>`
				: displayPercent < -5
					? `<span class="material-icons">bolt</span>`
					: displayPercent < 0
						? `<span class="material-icons">trending_down</span>`
						: `<span class="material-icons">arrow_forward</span>`;

	const changeEl = document.getElementById("penis-change");
	if (changeEl) {
		let changeColor = "#BC8F8F";
		if (Math.abs(displayPercent) > 20)
			changeColor = displayPercent > 0 ? "#A45A2A" : "#ff0000";
		else if (Math.abs(displayPercent) > 10)
			changeColor = displayPercent > 0 ? "#CD853F" : "#ff8888";
		else if (Math.abs(displayPercent) > 5)
			changeColor = displayPercent > 0 ? "#DEB887" : "#ffbbbb";

		changeEl.innerHTML = `${displayDirection} ${Math.abs(
			displayPercent,
		).toFixed(1)}%`;
		changeEl.style.color = changeColor;
	}
}

function startDataUpdates(updateArbreCallback) {
	console.log(
		"[DEBUG] INITIALIZING: startDataUpdates has been called. Starting the process.",
	);
	updateCallback = updateArbreCallback;
	updateMarketCap(updateArbreCallback);
	setInterval(() => updateMarketCap(updateArbreCallback), 5000); // Update every 5 seconds
	updateCountdown();
	setInterval(() => updateCountdown(), 1000);
}

export { startDataUpdates };
