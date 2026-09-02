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

const SKY = 0x63b8f0;
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
function skyTexture() {
	if (typeof document === "undefined") return null;
	const w = 1024;
	const h = 512;
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d");

	const sky = ctx.createLinearGradient(0, 0, 0, h);
	sky.addColorStop(0, "#1f6fd0"); // zenith
	sky.addColorStop(0.55, "#63b8f0");
	sky.addColorStop(1, "#cdeaff"); // horizon haze
	ctx.fillStyle = sky;
	ctx.fillRect(0, 0, w, h);

	let seed = 1337;
	const rand = () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};

	const puff = (x, y, r, alpha) => {
		const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
		g.addColorStop(0, `rgba(255,255,255,${alpha})`);
		g.addColorStop(0.6, `rgba(255,255,255,${alpha * 0.75})`);
		g.addColorStop(1, "rgba(255,255,255,0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, Math.PI * 2);
		ctx.fill();
	};

	for (let i = 0; i < 26; i++) {
		const cx = rand() * w;
		const cy = h * (0.18 + rand() * 0.5);
		const scale = 26 + rand() * 46;
		const alpha = 0.65 + rand() * 0.3;
		for (let k = 0; k < 6; k++) {
			const dx = (k - 2.5) * scale * 0.52 + (rand() - 0.5) * scale * 0.4;
			const dy = (rand() - 0.5) * scale * 0.45;
			const r = scale * (0.6 + rand() * 0.6);
			puff(cx + dx, cy + dy, r, alpha);
			if (cx + dx < r) puff(cx + dx + w, cy + dy, r, alpha);
			if (cx + dx > w - r) puff(cx + dx - w, cy + dy, r, alpha);
		}
	}

	const tex = new THREE.CanvasTexture(canvas);
	tex.wrapS = THREE.RepeatWrapping;
	tex.wrapT = THREE.ClampToEdgeWrapping;
	tex.repeat.set(3, 1); // the band reads smaller, so it wraps the dome believably
	return tex;
}

let skyMesh = null;

function buildSky() {
	// Only the upper half: below the horizon the terrain and water take over.
	const geo = new THREE.SphereGeometry(420, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58);
	const map = skyTexture();
	const mat = new THREE.MeshBasicMaterial({
		map,
		color: map ? 0xffffff : SKY,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false,
	});
	const mesh = new THREE.Mesh(geo, mat);
	mesh.renderOrder = -1; // always behind the scenery
	return mesh;
}

let clock = 0;

/** Drifts the clouds and rolls the sea. Call once per frame, delta in seconds. */
export function updateWorld(delta) {
	clock += delta;

	if (skyMesh && skyMesh.material.map) {
		skyMesh.material.map.offset.x = (skyMesh.material.map.offset.x + delta * 0.004) % 1;
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
