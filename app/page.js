import fs from "node:fs";
import path from "node:path";
import ClientHomePage from "./ClientHomePage";

const legacyBodyPath = path.join(process.cwd(), "app", "legacy-body.html");

const importMap = JSON.stringify(
	{
		imports: {
			three: "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js",
			"three/addons/":
				"https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/",
			"lil-gui":
				"https://cdn.jsdelivr.net/npm/lil-gui@0.19/dist/lil-gui.esm.js",
		},
	},
	null,
	2,
);

const runtimeConfig = JSON.stringify(
	{
		tokenAddress:
			process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
			"",
		pairAddress: process.env.NEXT_PUBLIC_PAIR_ADDRESS || "",
		chainId: process.env.NEXT_PUBLIC_CHAIN_ID || "solana",
	},
	null,
	2,
);

export default function HomePage() {
	const legacyBodyHtml = fs
		.readFileSync(legacyBodyPath, "utf8")
		.replace(/\r\n/g, "\n");

	return (
		<ClientHomePage
			initialHtml={legacyBodyHtml}
			runtimeConfig={runtimeConfig}
			importMap={importMap}
		/>
	);
}
