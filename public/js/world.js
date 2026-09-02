import * as THREE from "three";

// A Mario 64 style backdrop for Jemo to stand on: flat-shaded hills, a sand
// shore, water and blobby low-poly trees.
//
// Shading is baked into vertex colours and drawn with MeshBasicMaterial, the
// same rule the character follows. The world therefore ignores the scene's
// light rig entirely, which keeps it from being washed out and keeps the
// genital lights on layer 2 from leaking into the scenery.

const SUN = new THREE.Vector3(0.45, 0.82, 0.35).normalize();
const GRASS = new THREE.Color(0x3fa22b);
const GRASS_DARK = new THREE.Color(0x2c7a1f);
const SAND = new THREE.Color(0xe4cf92);
const WATER = new THREE.Color(0x2f7fd4);
const TRUNK = new THREE.Color(0x8a5a2b);
const LEAF = new THREE.Color(0x2f9b28);

const SKY = 0x0b2fc9; // trading-floor blue, matches the board sky
const ISLAND = 46; // grass reaches this far, then falls to the shore
const SHORE = 62; // past here the ground is under water

// Deterministic rolling hills. Flat inside RADIUS_FLAT so Jemo always has level
// ground under his feet no matter where the camera swings.
const RADIUS_FLAT = 13;
export function heightAt(x, z) {
	const r = Math.hypot(x, z);
	const rolling =
		1.7 * Math.sin(x * 0.105) * Math.cos(z * 0.125) +
		1.0 * Math.sin((x + z) * 0.062) +
		0.6 * Math.cos(x * 0.21 - z * 0.17);
	const rise = smoothstep(RADIUS_FLAT, RADIUS_FLAT + 14, r);
	const drop = smoothstep(ISLAND, SHORE, r);
	return rolling * rise - drop * 9;
}

function smoothstep(a, b, x) {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}

/** Bake a fixed sun into per-face colours and return a light-proof material. */
function flatShaded(geometry, colourAt) {
	const geo = geometry.index ? geometry.toNonIndexed() : geometry;
	const pos = geo.attributes.position;
	const colours = new Float32Array(pos.count * 3);
	const a = new THREE.Vector3();
	const b = new THREE.Vector3();
	const c = new THREE.Vector3();
	const normal = new THREE.Vector3();
	const centroid = new THREE.Vector3();
	const colour = new THREE.Color();

	for (let i = 0; i < pos.count; i += 3) {
		a.fromBufferAttribute(pos, i);
		b.fromBufferAttribute(pos, i + 1);
		c.fromBufferAttribute(pos, i + 2);
		normal.copy(c).sub(b).cross(a.clone().sub(b)).normalize();
		centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);

		colour.copy(colourAt(centroid, normal));
		const lambert = 0.62 + 0.38 * Math.max(0, normal.dot(SUN));
		colour.multiplyScalar(lambert);

		for (let k = 0; k < 3; k++) {
			colours[(i + k) * 3] = colour.r;
			colours[(i + k) * 3 + 1] = colour.g;
			colours[(i + k) * 3 + 2] = colour.b;
		}
	}

	geo.setAttribute("color", new THREE.BufferAttribute(colours, 3));
	return {
		geometry: geo,
		material: new THREE.MeshBasicMaterial({ vertexColors: true }),
	};
}

/**
 * A 64px tiling ground texture, built in code so there is no asset to ship.
 * It is deliberately greyscale: the terrain already carries its colour in
 * per-face vertex colours, and three multiplies the two, so the same texture
 * reads as blades on the grass and as grain on the sand.
 * NearestFilter is what gives it the chunky, unfiltered N64 look.
 */
function groundTexture() {
	if (typeof document === "undefined") return null; // node-side geometry checks
	const size = 64;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#ffffff";
	ctx.fillRect(0, 0, size, size);

	let seed = 91;
	const rand = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};

	// Mottling first, so the tile never reads as a flat colour from far away.
	for (let i = 0; i < 220; i++) {
		const v = 226 + Math.floor(rand() * 30);
		ctx.fillStyle = `rgb(${v},${v},${v})`;
		ctx.fillRect(Math.floor(rand() * size), Math.floor(rand() * size), 2, 2);
	}
	// Then short upright blades in a darker grey.
	for (let i = 0; i < 260; i++) {
		const v = 176 + Math.floor(rand() * 40);
		ctx.fillStyle = `rgb(${v},${v},${v})`;
		const x = Math.floor(rand() * size);
		const y = Math.floor(rand() * size);
		ctx.fillRect(x, y, 1, 1 + Math.floor(rand() * 2));
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.magFilter = THREE.NearestFilter;
	tex.minFilter = THREE.NearestMipmapLinearFilter;
	tex.repeat.set(46, 46); // about 4 units per tile across the 190 unit terrain
	return tex;
}

/**
 * The Mario 64 sky: a painted cloud band wrapped on the inside of a dome that
 * scrolls slowly. That scroll is the cloud animation -- the same trick the N64
 * skyboxes used, and it costs one texture offset per frame.
 *
 * Clouds that cross the seam are drawn twice so the tile wraps without a join.
 */
// The sky is a live trading-floor board (ported from the Ticker Sky
// reference): a flickering number grid, a candlestick tape with glowing
// index lines whose volatility clusters GARCH-style, and a stonks arrow
// that draws itself, holds, fades and respawns. Three back-side shells:
// flat blue base, grid board, additive chart layer. MirroredRepeatWrapping
// keeps both canvases seamless around the dome.
const SKY_CFG = {
	cols: 24, rows: 32, cellW: 112, cellH: 48, // grid texture
	lines: [
		{ color: "#ff9a1a", width: 5, y: 0.46, vol: 0.010 }, // stonks orange
		{ color: "#dff3ff", width: 3, y: 0.58, vol: 0.008 },
		{ color: "#4de0ff", width: 3, y: 0.68, vol: 0.006 },
	],
	candles: 48, candleY: 0.25, // candlestick row (canvas y 0..1)
	arrow: { width: 22, speed: 0.008, hold: 2.5 },
	tick: 0.09, // grid cell refresh interval, seconds
	step: 0.05, // chart redraw interval, seconds
	points: 160, // chart resolution
};
const srnd = (a, b) => a + Math.random() * (b - a);

/* Layer 1: flickering number grid */
function gridLayer() {
	const c = document.createElement("canvas");
	c.width = SKY_CFG.cols * SKY_CFG.cellW;
	c.height = SKY_CFG.rows * SKY_CFG.cellH;
	const g = c.getContext("2d");
	const { cellW, cellH } = SKY_CFG;
	const cells = [];
	for (let r = 0; r < SKY_CFG.rows; r++)
		for (let col = 0; col < SKY_CFG.cols; col++) {
			const kind = Math.random();
			cells.push({
				x: col * cellW, y: r * cellH,
				boxed: kind < 0.3, pct: kind > 0.9 && col < 4,
				tri: kind > 0.3 && kind < 0.42,
				val: srnd(0.2, 9.9), dir: Math.random() < 0.5 ? 1 : -1,
			});
		}
	const draw = (k) => {
		const { x, y } = k;
		g.clearRect(x, y, cellW, cellH);
		g.strokeStyle = "rgba(140,190,255,0.35)";
		g.lineWidth = 2;
		g.strokeRect(x, y, cellW, cellH); // board grid
		if (k.boxed) {
			g.fillStyle = `rgba(40,95,235,${srnd(0.5, 0.9)})`;
			g.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
		}
		if (k.tri) { // up/down marker
			const cx = x + cellW / 2, cy = y + cellH / 2, h = 12;
			g.fillStyle = "rgba(190,225,255,0.9)";
			g.beginPath();
			g.moveTo(cx - h, cy + h * k.dir * 0.6);
			g.lineTo(cx + h, cy + h * k.dir * 0.6);
			g.lineTo(cx, cy - h * k.dir * 0.6);
			g.fill();
			return;
		}
		g.textBaseline = "middle";
		if (k.pct) {
			g.font = 'bold 30px "Arial Narrow",Arial,sans-serif';
			g.fillStyle = "#d6ecff";
			g.fillText(`${k.dir > 0 ? "" : "-"}${k.val.toFixed(2)}%`, x + 6, y + cellH / 2);
		} else {
			g.font = 'bold 26px "Arial Narrow",Arial,sans-serif';
			g.fillStyle = k.boxed ? "#ffffff" : `rgba(200,228,255,${srnd(0.55, 0.95)})`;
			g.fillText(k.val.toFixed(2), x + 10, y + cellH / 2);
		}
	};
	cells.forEach(draw);
	const tex = new THREE.CanvasTexture(c);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(-2, 2); // negative x: un-mirrors text on the BackSide dome
	const tick = () => { // flicker ~40 random cells
		for (let i = 0; i < 40; i++) {
			const k = cells[(Math.random() * cells.length) | 0];
			k.val = Math.max(0.05, k.val + srnd(-0.25, 0.25));
			k.dir = Math.random() < 0.5 ? 1 : -1;
			draw(k);
		}
		tex.needsUpdate = true;
	};
	return { tex, tick };
}

/* Layer 2: candles + glowing lines with clustered volatility + stonks arrow */
function chartLayer() {
	const c = document.createElement("canvas");
	c.width = 1600;
	c.height = 700;
	const g = c.getContext("2d");
	const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

	// volatility regime: spikes randomly, decays, shocks amplify themselves
	const vol = { v: 1, target: 1 };
	const volStep = () => {
		if (Math.random() < 0.015) vol.target = srnd(2.5, 6); // shock event
		vol.target += (1 - vol.target) * 0.01; // mean reversion
		vol.v += (vol.target - vol.v) * 0.08;
		return vol.v;
	};
	const shock = () => (Math.random() < 0.02 ? srnd(-1, 1) * 3 : 0); // fat tail

	const lines = SKY_CFG.lines.map((l) => ({
		...l,
		data: Array.from({ length: SKY_CFG.points }, () => l.y),
	}));
	const candles = []; // {o,h,l,c} in 0..1 canvas-y space (smaller = higher)
	const N = SKY_CFG.candles, cy = SKY_CFG.candleY;
	let price = cy;
	const nextCandle = (v) => {
		const o = price, path = [o];
		for (let i = 0; i < 4; i++) path.push(path.at(-1) + (srnd(-1, 1) + shock()) * 0.006 * v);
		price = clamp(path.at(-1) + (cy - path.at(-1)) * 0.03, cy - 0.16, cy + 0.16);
		return { o, c: price, h: Math.min(...path, price), l: Math.max(...path, price) };
	};
	for (let i = 0; i < N; i++) candles.push(nextCandle(1));

	const tex = new THREE.CanvasTexture(c);
	tex.wrapS = THREE.MirroredRepeatWrapping; // continuous across the dome seam
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.repeat.set(-2, 1); // negative x: un-mirrors the chart on the BackSide dome

	// stonks arrow: draws itself, holds, fades, respawns elsewhere
	const arrow = { pts: [], t: 0, phase: "draw" };
	const newArrow = () => {
		const x0 = srnd(0.15, 0.45) * c.width, y0 = srnd(0.55, 0.75) * c.height;
		const pts = [[x0, y0]];
		let x = x0, y = y0;
		for (let i = 0; i < 4; i++) { // the dip
			x += srnd(0.06, 0.11) * c.width;
			y += srnd(-0.06, 0.1) * c.height;
			pts.push([x, y]);
		}
		x += srnd(0.14, 0.2) * c.width; // the rip
		y -= srnd(0.32, 0.42) * c.height;
		pts.push([x, y]);
		arrow.pts = pts;
		arrow.t = 0;
		arrow.phase = "draw";
	};
	newArrow();
	let frame = 0;
	const drawArrow = () => {
		const a = arrow, A = SKY_CFG.arrow;
		a.t += A.speed;
		let alpha = 1, prog = 1;
		if (a.phase === "draw") {
			prog = Math.min(1, a.t);
			if (a.t >= 1) { a.phase = "hold"; a.t = 0; }
		} else if (a.phase === "hold") {
			if (a.t >= A.hold) { a.phase = "fade"; a.t = 0; }
		} else {
			alpha = 1 - a.t;
			if (a.t >= 1) return newArrow();
		}

		// interpolate along the polyline by length
		const seg = a.pts.slice(1).map((q, i) => Math.hypot(q[0] - a.pts[i][0], q[1] - a.pts[i][1]));
		const total = seg.reduce((s, l) => s + l, 0);
		let rem = prog * total;
		const path = [a.pts[0]];
		let dir = [1, 0];
		for (let i = 0; i < seg.length; i++) {
			const p = a.pts[i], q = a.pts[i + 1];
			dir = [(q[0] - p[0]) / seg[i], (q[1] - p[1]) / seg[i]];
			if (rem >= seg[i]) { path.push(q); rem -= seg[i]; }
			else { path.push([p[0] + dir[0] * rem, p[1] + dir[1] * rem]); break; }
		}
		const tip = path.at(-1), pulse = 1 + 0.15 * Math.sin(frame * 0.2);
		const grad = g.createLinearGradient(a.pts[0][0], a.pts[0][1], tip[0], tip[1]);
		grad.addColorStop(0, "#ff6a00");
		grad.addColorStop(1, "#ffd23a");
		g.save();
		g.globalAlpha = alpha;
		g.lineCap = "round";
		g.beginPath();
		path.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y));
		g.strokeStyle = grad;
		g.lineWidth = A.width;
		g.shadowColor = "#ff9a1a";
		g.shadowBlur = 36 * pulse;
		g.stroke();
		g.stroke();
		g.shadowBlur = 0;
		g.strokeStyle = "rgba(255,255,255,0.85)";
		g.lineWidth = A.width * 0.3;
		g.stroke();
		// arrowhead
		const h = A.width * 3.2, ang = Math.atan2(dir[1], dir[0]);
		g.translate(tip[0], tip[1]);
		g.rotate(ang);
		g.beginPath();
		g.moveTo(h, 0);
		g.lineTo(-h * 0.7, -h * 0.8);
		g.lineTo(-h * 0.25, 0);
		g.lineTo(-h * 0.7, h * 0.8);
		g.closePath();
		g.fillStyle = "#ffd23a";
		g.shadowColor = "#ff9a1a";
		g.shadowBlur = 40 * pulse;
		g.fill();
		g.fill();
		g.restore();
	};

	const step = () => {
		const v = volStep();
		g.clearRect(0, 0, c.width, c.height);
		g.lineJoin = "round";

		// candles: new bar every 6 steps, live bar mutates in between
		if (frame++ % 6 === 0) {
			candles.shift();
			candles.push(nextCandle(v));
		} else {
			const k = candles.at(-1);
			k.c = clamp(k.c + srnd(-1, 1) * 0.003 * v, cy - 0.16, cy + 0.16);
			k.h = Math.min(k.h, k.c);
			k.l = Math.max(k.l, k.c);
		}
		const bw = c.width / N;
		candles.forEach((k, i) => {
			const x = i * bw + bw / 2, up = k.c < k.o;
			const col = up ? "#3dff8a" : "#ff4a55";
			g.strokeStyle = g.fillStyle = col;
			g.shadowColor = col;
			g.shadowBlur = 14 * Math.min(v, 3);
			g.lineWidth = 1.5;
			g.beginPath();
			g.moveTo(x, k.h * c.height);
			g.lineTo(x, k.l * c.height);
			g.stroke();
			const top = Math.min(k.o, k.c) * c.height;
			const hgt = Math.max(2, Math.abs(k.c - k.o) * c.height);
			g.fillRect(x - bw * 0.3, top, bw * 0.6, hgt);
		});
		g.shadowBlur = 0;

		// index lines
		for (const s of lines) {
			s.data.shift();
			s.data.push(clamp(s.data.at(-1) + (srnd(-1, 1) + shock()) * s.vol * v, s.y - 0.12, s.y + 0.12));
			g.beginPath();
			s.data.forEach((y, i) => g[i ? "lineTo" : "moveTo"]((i / (SKY_CFG.points - 1)) * c.width, y * c.height));
			g.strokeStyle = s.color;
			g.lineWidth = s.width;
			g.shadowColor = s.color;
			g.shadowBlur = 18;
			g.stroke();
			g.shadowBlur = 0;
			g.strokeStyle = "rgba(255,255,255,0.7)"; // hot core
			g.lineWidth = 1;
			g.stroke();
		}
		drawArrow();
		tex.needsUpdate = true;
	};
	return { tex, step };
}

let skyMesh = null;
let skyGrid = null;
let skyChart = null;
let skyHaze = null;
let sunGlow = null;
let gridT = 0;
let chartT = 0;

/* Dreamy layer: big soft pastel blobs on a transparent canvas, drawn additive
 * over the board and drifted slowly, so the whole sky breathes like a haze. */
function hazeTexture() {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 512;
	const g = c.getContext("2d");
	const blobs = [
		["255,120,220", 0.30], // pink
		["120,180,255", 0.26], // baby blue
		["190,120,255", 0.26], // lavender
		["120,255,230", 0.22], // mint
		["255,200,140", 0.20], // peach
	];
	for (let i = 0; i < 14; i++) {
		const [rgb, a] = blobs[i % blobs.length];
		const x = srnd(0, c.width);
		const y = srnd(0.1, 0.85) * c.height;
		const r = srnd(120, 300);
		const grad = g.createRadialGradient(x, y, 0, x, y, r);
		grad.addColorStop(0, `rgba(${rgb},${a})`);
		grad.addColorStop(1, `rgba(${rgb},0)`);
		g.fillStyle = grad;
		g.beginPath();
		g.arc(x, y, r, 0, Math.PI * 2);
		g.fill();
		// blobs near the seam are drawn again on the far side so the wrap is clean
		if (x < r) { g.beginPath(); g.arc(x + c.width, y, r, 0, Math.PI * 2); g.fill(); }
		if (x > c.width - r) { g.beginPath(); g.arc(x - c.width, y, r, 0, Math.PI * 2); g.fill(); }
	}
	const tex = new THREE.CanvasTexture(c);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	return tex;
}

/* The light: a warm additive glare sprite hung high in the dome. */
function sunTexture() {
	const c = document.createElement("canvas");
	c.width = c.height = 256;
	const g = c.getContext("2d");
	const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
	grad.addColorStop(0, "rgba(255,255,240,1)");
	grad.addColorStop(0.2, "rgba(255,240,190,0.8)");
	grad.addColorStop(0.5, "rgba(255,200,120,0.28)");
	grad.addColorStop(1, "rgba(255,180,80,0)");
	g.fillStyle = grad;
	g.fillRect(0, 0, 256, 256);
	return new THREE.CanvasTexture(c);
}

function buildSky() {
	// Only the upper half: below the horizon the terrain and water take over.
	// Three concentric back-side shells; smaller radius renders in front.
	const shell = (r) =>
		new THREE.SphereGeometry(r, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
	const group = new THREE.Group();

	const base = new THREE.Mesh(
		shell(424),
		new THREE.MeshBasicMaterial({ color: 0x0b2fc9, side: THREE.BackSide, depthWrite: false, fog: false }),
	);
	base.renderOrder = -3;
	group.add(base);

	if (typeof document === "undefined") return group; // node-side geometry checks

	skyGrid = gridLayer();
	const grid = new THREE.Mesh(
		shell(420),
		new THREE.MeshBasicMaterial({
			map: skyGrid.tex, transparent: true, opacity: 0.95,
			side: THREE.BackSide, depthWrite: false, fog: false,
		}),
	);
	grid.renderOrder = -2;
	group.add(grid);

	skyChart = chartLayer();
	const chart = new THREE.Mesh(
		shell(414),
		new THREE.MeshBasicMaterial({
			map: skyChart.tex, transparent: true, blending: THREE.AdditiveBlending,
			side: THREE.BackSide, depthWrite: false, fog: false,
		}),
	);
	chart.renderOrder = -1;
	group.add(chart);

	skyHaze = new THREE.Mesh(
		shell(410),
		new THREE.MeshBasicMaterial({
			map: hazeTexture(), transparent: true, opacity: 0.55,
			blending: THREE.AdditiveBlending,
			side: THREE.BackSide, depthWrite: false, fog: false,
		}),
	);
	skyHaze.renderOrder = -1;
	group.add(skyHaze);

	sunGlow = new THREE.Sprite(
		new THREE.SpriteMaterial({
			map: sunTexture(), transparent: true,
			blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
		}),
	);
	sunGlow.position.set(150, 250, -230);
	sunGlow.scale.setScalar(220);
	sunGlow.layers.mask = 1; // layer 0, with the scenery
	group.add(sunGlow);

	return group;
}

let clock = 0;

/** Drifts the clouds and rolls the sea. Call once per frame, delta in seconds. */
export function updateWorld(delta) {
	clock += delta;

	// The board drifts slowly, cells flicker, the chart trades in real time.
	if (skyGrid) {
		skyGrid.tex.offset.x = (skyGrid.tex.offset.x + delta * 0.004) % 1;
		skyGrid.tex.offset.y = (skyGrid.tex.offset.y - delta * 0.002 + 1) % 1;
		gridT += delta;
		if (gridT > SKY_CFG.tick) {
			gridT = 0;
			skyGrid.tick();
		}
	}
	if (skyChart) {
		chartT += delta;
		if (chartT > SKY_CFG.step) {
			chartT = 0;
			skyChart.step();
		}
	}
	// The haze drifts against the board and breathes; the sun pulses gently.
	if (skyHaze) {
		skyHaze.material.map.offset.x = (skyHaze.material.map.offset.x - delta * 0.006 + 1) % 1;
		skyHaze.material.opacity = 0.45 + 0.18 * Math.sin(clock * 0.35);
	}
	if (sunGlow) {
		sunGlow.scale.setScalar(220 + 18 * Math.sin(clock * 0.8));
	}

	if (waterMesh && waterRest) {
		// Two crossing swells so the surface never looks like one repeating row.
		const pos = waterMesh.geometry.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = waterRest[i * 3];
			const z = waterRest[i * 3 + 2];
			pos.array[i * 3 + 1] =
				0.42 * Math.sin(x * 0.09 + clock * 1.1) +
				0.3 * Math.cos(z * 0.13 - clock * 0.85);
		}
		pos.needsUpdate = true; // the water is unlit, so its normals are never read
		if (waterMesh.material.map) {
			waterMesh.material.map.offset.x = (clock * 0.012) % 1;
			waterMesh.material.map.offset.y = (clock * 0.008) % 1;
		}
	}

	if (foamRing) {
		// The surf breathes with the swell: it washes up the beach and pulls back,
		// fading as it goes, which is what reads as spray from a distance.
		const wash = Math.sin(clock * 1.1);
		foamRing.scale.setScalar(1 + wash * 0.012);
		foamRing.position.y = WATER_Y + 0.08 + wash * 0.18;
		foamRing.material.opacity = 0.38 + 0.3 * (0.5 + 0.5 * Math.sin(clock * 1.1 + 0.6));
	}
}

function buildTerrain() {
	const size = 190;
	const seg = 72;
	const geo = new THREE.PlaneGeometry(size, size, seg, seg);
	geo.rotateX(-Math.PI / 2);
	const pos = geo.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
	}

	const shaded = flatShaded(geo, (p, n) => {
		const r = Math.hypot(p.x, p.z);
		// Sand takes over near the waterline; steep faces get the darker grass so
		// the hills read as hills without any real lighting.
		if (p.y < 0.9 && r > ISLAND - 6) return SAND;
		return n.y > 0.86 ? GRASS : GRASS_DARK;
	});
	shaded.material.map = groundTexture();
	return new THREE.Mesh(shaded.geometry, shaded.material);
}

const WATER_Y = -4.2;

/** Lighter bands that scroll across the surface, the N64 way of faking ripples. */
function waterTexture() {
	if (typeof document === "undefined") return null;
	const size = 128;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#2f7fd4";
	ctx.fillRect(0, 0, size, size);

	let seed = 4242;
	const rand = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
	for (let i = 0; i < 90; i++) {
		ctx.fillStyle = `rgba(255,255,255,${0.05 + rand() * 0.12})`;
		const y = rand() * size;
		const w = 8 + rand() * 26;
		ctx.fillRect(rand() * size, y, w, 1 + Math.floor(rand() * 2));
	}
	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(26, 26);
	return tex;
}

let waterMesh = null;
let waterRest = null; // untouched vertex heights, so the swell never drifts
let foamRing = null;

function buildWater() {
	const geo = new THREE.PlaneGeometry(600, 600, 56, 56);
	geo.rotateX(-Math.PI / 2);
	waterRest = Float32Array.from(geo.attributes.position.array);
	const map = waterTexture();
	const mesh = new THREE.Mesh(
		geo,
		new THREE.MeshBasicMaterial({
			map,
			color: map ? 0xffffff : WATER,
			transparent: true,
			opacity: 0.9,
		}),
	);
	mesh.position.y = WATER_Y;
	return mesh;
}

/**
 * Walks outward along each angle to find where the terrain crosses the water
 * line. The shore is not a circle -- the hills push it in and out -- so the
 * surf has to follow the real contour or it floats over the beach.
 */
function shorelineRadii(steps) {
	const radii = new Float32Array(steps);
	for (let i = 0; i < steps; i++) {
		const a = (i / steps) * Math.PI * 2;
		const cos = Math.cos(a);
		const sin = Math.sin(a);
		let lo = ISLAND - 8;
		let hi = SHORE + 14;
		for (let k = 0; k < 22; k++) {
			const mid = (lo + hi) / 2;
			if (heightAt(cos * mid, sin * mid) > WATER_Y) lo = mid;
			else hi = mid;
		}
		radii[i] = (lo + hi) / 2;
	}
	return radii;
}

/** A band of white sitting on the water line, pulled in and out by the swell. */
function buildFoam() {
	const steps = 128;
	const radii = shorelineRadii(steps);
	const pos = [];
	const uv = [];
	for (let i = 0; i <= steps; i++) {
		const a = (i / steps) * Math.PI * 2;
		const r = radii[i % steps];
		const cos = Math.cos(a);
		const sin = Math.sin(a);
		pos.push(cos * (r - 2.2), 0, sin * (r - 2.2));
		pos.push(cos * (r + 1.4), 0, sin * (r + 1.4));
		uv.push(0, i / steps, 1, i / steps);
	}
	const index = [];
	for (let i = 0; i < steps; i++) {
		const a = i * 2;
		index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
	geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
	geo.setIndex(index);

	const mesh = new THREE.Mesh(
		geo,
		new THREE.MeshBasicMaterial({
			color: 0xffffff,
			transparent: true,
			opacity: 0.55,
			depthWrite: false,
		}),
	);
	mesh.position.y = WATER_Y + 0.08;
	return mesh;
}

/**
 * Adds the scenery under the character. groundY is where Jemo's feet sit, so the
 * flat middle of the terrain is placed exactly there.
 */
export function createWorld(scene, groundY = -3.12) {
	const world = new THREE.Group();
	world.position.y = groundY;

	world.add(buildTerrain());

	waterMesh = buildWater();
	world.add(waterMesh);
	foamRing = buildFoam();
	world.add(foamRing);

	// Ring the clearing with trees, skipping the front so the camera keeps a view.
	skyMesh = buildSky();
	world.add(skyMesh);

	tagLayer0(world);
	scene.add(world);
	scene.background = new THREE.Color(SKY); // shows through if the dome ever fails
	return world;
}

function tagLayer0(root) {
	root.traverse((child) => {
		if (child.isMesh) child.layers.mask = 1; // Layer 0, with the ground/context
	});
}

/** Everything else in this scene is unlit, so imported props are converted too. */
function makeUnlit(root) {
	root.traverse((child) => {
		if (!child.isMesh) return;
		const map = child.material && child.material.map;
		if (map) map.encoding = THREE.LinearEncoding;
		child.material = new THREE.MeshBasicMaterial({ map: map || null });
	});
}

/**
 * Drops copies of a loaded prop onto the terrain. The source model is measured
 * rather than assumed, so each copy is lifted by its own base and lands on the
 * surface instead of sinking into it.
 */
export function plantProp(world, source, { count, minRadius, maxRadius, height, vary = 0.3, seed = 5 }) {
	makeUnlit(source);
	const box = new THREE.Box3().setFromObject(source);
	const modelHeight = box.max.y - box.min.y;
	if (!(modelHeight > 0)) return;

	const rand = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};

	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2 + rand() * 0.5;
		const radius = minRadius + rand() * (maxRadius - minRadius);
		const x = Math.cos(angle) * radius;
		const z = Math.sin(angle) * radius;
		if (Math.hypot(x, z) > ISLAND - 3) continue;

		const scale = (height / modelHeight) * (1 - vary / 2 + rand() * vary);
		const prop = source.clone(true);
		prop.scale.setScalar(scale);
		prop.position.set(x, heightAt(x, z) - box.min.y * scale, z);
		prop.rotation.y = rand() * Math.PI * 2;
		world.add(prop);
	}
	tagLayer0(world);
}
