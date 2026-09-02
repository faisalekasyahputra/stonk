// One-off: regenerate favico set from stonks head logo. Run: node make-favico.js
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = "assets/stonks-character/stonks-head-logo-transparent.png";
const OUT = "assets/favico";

const sizes = [
	["favicon-16x16.png", 16],
	["favicon-32x32.png", 32],
	["apple-touch-icon.png", 180],
	["android-chrome-192x192.png", 192],
	["android-chrome-512x512.png", 512],
];

// ponytail: ICO = PNG-in-ICO wrapper, fine for all modern browsers
function pngToIco(png) {
	const header = Buffer.alloc(6 + 16);
	header.writeUInt16LE(1, 2); // type: icon
	header.writeUInt16LE(1, 4); // 1 image
	header.writeUInt8(32, 6); // width 32
	header.writeUInt8(32, 7); // height 32
	header.writeUInt16LE(1, 10); // planes
	header.writeUInt16LE(32, 12); // bpp
	header.writeUInt32LE(png.length, 14); // size
	header.writeUInt32LE(22, 18); // offset
	return Buffer.concat([header, png]);
}

(async () => {
	const base = sharp(SRC).trim();
	const trimmed = await base.png().toBuffer();
	for (const [name, size] of sizes) {
		await sharp(trimmed)
			.resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
			.png()
			.toFile(path.join(OUT, name));
	}
	const png32 = await sharp(trimmed)
		.resize(32, 32, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
		.png()
		.toBuffer();
	fs.writeFileSync(path.join(OUT, "favicon.ico"), pngToIco(png32));
	// mirror to public/ (what Next serves)
	for (const f of fs.readdirSync(OUT)) {
		fs.copyFileSync(path.join(OUT, f), path.join("public", OUT, f));
	}
	console.log("done");
})();
