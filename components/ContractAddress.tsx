"use client";

import { useProjectConfig } from "../lib/useProjectConfig";

export default function ContractAddress() {
	const { config, loading } = useProjectConfig();

	if (loading) return null;
	if (!config) return null;

	const ca = config.contract_address || "Coming Soon";

	const copyToClipboard = () => {
		if (config.contract_address) {
			navigator.clipboard.writeText(config.contract_address);
			alert("Contract Address copied to clipboard!");
		}
	};

	return (
		<div id="ca-box">
			<span>
				<i className="fas fa-copy"></i> CA:{" "}
				<span id="ca-box-address">{ca}</span>
			</span>
			<div
				id="copy-ca-button"
				className="neo-button"
				onClick={copyToClipboard}
				style={{ cursor: "pointer" }}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="white"
					viewBox="0 0 16 16">
					<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"></path>
					<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"></path>
				</svg>
			</div>
		</div>
	);
}
