import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { setupScene, checkLayers } from "./scene.js?v=20260830-skin2";
import {
	genital,
	updateArbre,
	updateGlansShape,
	forceUpdateMaterials,
} from "./dynamicPart.js?v=20260830-skin2";
import { createGUI, addModelControls } from "./ui.js?v=20260830-skin2";
import { MatrixRain } from "./matrixRain.js?v=20260830-skin2";
import { createWorld, updateWorld, heightAt } from "./world.js?v=20260830-skin2";
import { startDataUpdates, TOKEN_ADDRESS } from "./data.js?v=20260830-skin2";

// --- Windows XP UI Logic ---
function updateClock() {
	const clockEl = document.getElementById("taskbar-clock");
	if (clockEl) {
		const now = new Date();
		let hours = now.getHours();
		let minutes = now.getMinutes();
		const ampm = hours >= 12 ? "PM" : "AM";
		hours = hours % 12;
		hours = hours ? hours : 12;
		minutes = minutes < 10 ? "0" + minutes : minutes;
		clockEl.textContent = `${hours}:${minutes} ${ampm}`;
	}
}
setInterval(updateClock, 1000);
updateClock();

window.toggleWindow = (id) => {
	const win = document.getElementById(id);
	if (win) win.classList.toggle("hidden");
};

// Draggable Windows Implementation
let activeWindow = null;
let offset = { x: 0, y: 0 };

document.addEventListener("mousedown", (e) => {
	const titleBar = e.target.closest(".xp-title-bar");
	if (titleBar) {
		activeWindow = titleBar.closest(".xp-window");
		if (activeWindow) {
			const rect = activeWindow.getBoundingClientRect();
			offset.x = e.clientX - rect.left;
			offset.y = e.clientY - rect.top;
			activeWindow.style.zIndex = "1000"; // Bring to front
			// Ensure transition doesn't interfere with dragging
			activeWindow.style.transition = "none";
		}
	}
});

document.addEventListener("mousemove", (e) => {
	if (activeWindow) {
		activeWindow.style.left = `${e.clientX - offset.x}px`;
		activeWindow.style.top = `${e.clientY - offset.y}px`;
		activeWindow.style.bottom = "auto";
		activeWindow.style.right = "auto";
		activeWindow.style.transform = "none";
	}
});

document.addEventListener("mouseup", () => {
	if (activeWindow) {
		activeWindow.style.transition =
			"opacity 0.2s, transform 0.2s, visibility 0.2s";
		activeWindow = null;
	}
});

document.addEventListener("click", (e) => {
	const startMenu = document.getElementById("start-menu");
	const startBtn = document.getElementById("start-btn");
	if (startMenu && startBtn) {
		if (startBtn.contains(e.target)) {
			startMenu.style.display =
				startMenu.style.display === "flex" ? "none" : "flex";
		} else if (!startMenu.contains(e.target)) {
			startMenu.style.display = "none";
		}
	}
});

const startAbout = document.getElementById("start-about");
if (startAbout) {
	startAbout.onclick = () => window.toggleWindow("info-panel");
}

const caDisplay = document.getElementById("ca-display");
if (caDisplay) {
	caDisplay.onclick = () => {
		const ca = document.getElementById("ca-box-address")
			? document.getElementById("ca-box-address").textContent
			: "2ADR43Dcecc7HQPBKPcKKHBN5BjfWvPpFo483bjzpump";
		navigator.clipboard.writeText(ca);
		alert("CA Copied: " + ca);
	};
}

// Close info panel functionality (Legacy support)
const closeInfo = document.getElementById("close-info");
if (closeInfo) {
	closeInfo.addEventListener("click", () => {
		window.toggleWindow("info-panel");
	});
}

// --- Global Variables ---
let loadedModel;
const settings = {
	autoRotate: true,
	autoZoom: true,
};

// --- Scene Initialization ---
const {
	scene,
	camera,
	renderer,
	controls,
	ambientLight,
	directionalLight,
	genitalAmbientLight,
	genitalDirectionalLight,
	ground,
	gridHelper,
	groundMaterial,
} = setupScene();

// The world sits at the character's foot height, so Jemo stands on it.
const world = createWorld(scene, -3.12);

// CRT overlay (styled in globals.css) sits above everything, clicks pass through.
if (!document.getElementById("crt-overlay")) {
	const crt = document.createElement("div");
	crt.id = "crt-overlay";
	document.body.appendChild(crt);
}

// Corner music toggle: a hidden YouTube embed does the playback, the first
// click creates it (autoplay needs that user gesture), later clicks just
// play/pause it over the iframe API postMessage channel.
if (!document.getElementById("music-toggle")) {
	const MUSIC_ID = "bn8gP5N8hqM";
	const btn = document.createElement("button");
	btn.id = "music-toggle";
	btn.innerHTML = "&#9835; OFF";
	btn.title = "Music on/off";
	document.body.appendChild(btn);
	let player = null;
	let musicOn = false;
	const buildPlayer = () => {
		const host = document.createElement("div");
		host.id = "music-player";
		host.style.cssText =
			"position:fixed;bottom:-200px;right:0;width:200px;height:113px;opacity:0.01;pointer-events:none;";
		document.body.appendChild(host);
		window.__music = player = new window.YT.Player("music-player", {
			videoId: MUSIC_ID,
			playerVars: { autoplay: 1, loop: 1, playlist: MUSIC_ID },
			events: {
				onReady: (e) => {
					e.target.setVolume(60);
					e.target.playVideo();
				},
			},
		});
	};
	btn.onclick = () => {
		musicOn = !musicOn;
		btn.innerHTML = musicOn ? "&#9835; ON" : "&#9835; OFF";
		btn.classList.toggle("on", musicOn);
		if (!player) {
			// First click: pull in the official IFrame API, it handles the
			// play handshake that a raw embed's autoplay param loses.
			if (window.YT && window.YT.Player) return buildPlayer();
			window.onYouTubeIframeAPIReady = buildPlayer;
			const s = document.createElement("script");
			s.src = "https://www.youtube.com/iframe_api";
			document.head.appendChild(s);
		} else if (player.playVideo) {
			musicOn ? player.playVideo() : player.pauseVideo();
		}
	};
}

// Set initial camera position after setup
camera.position.set(0, 2, 7);
controls.target.set(0, 1.5, 0);
controls.autoRotateSpeed = 2.6; // about one lap every 23 seconds

// --- UI Initialization ---
let mixer = null;
const clock = new THREE.Clock();
const rotationToggle = document.getElementById("rotation-toggle");
const gui = createGUI({
	settings,
	gridHelper,
	groundMaterial,
	ambientLight,
	directionalLight,
	genitalAmbientLight,
	genitalDirectionalLight,
	genital,
});

// --- Model Loading ---
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(
	"https://www.gstatic.com/draco/versioned/decoders/1.4.1/",
);
loader.setDRACOLoader(dracoLoader);

// The rigged mesh measures 1.70 units tall where the old asset measured 1.10,
// so every distance from the original contract is rescaled by this factor.
const RIG_K = 1.1 / 1.7;

// Every Meshy export in this set carries the same skinned character plus one
// clip, so the first file is the model and the rest only donate their animation.
const ANIM_FILES = [
	"walking.glb",
	"running.glb",
	"alert.glb",
	"alert_quick_turn_right.glb",
	"angry_to_tantrum_sit.glb",
	"air_squat.glb",
];
const clips = [];
let currentAction = null;
let loopCount = 0;

// --- Locomotion: Walking/Running actually travel across the island ---
const WORLD_Y = -3.12; // where the terrain group sits
const ROAM_LIMIT = 34; // grass turns to sand/lagoon past ~40, turn back before it
const SPEEDS = { Walking: 1.3, Running: 3.6 }; // units/s, eyeballed to the strides
let heading = Math.PI; // current facing (starts toward the camera)
let targetHeading = Math.PI;

// Console self-check: window.__stonkDebug() -> {clips, current, loops}
window.__stonkDebug = () => ({
	clips: clips.map((c) => c.name),
	current: currentAction && currentAction.getClip().name,
	loops: loopCount,
	pos: loadedModel && loadedModel.position.toArray().map((n) => +n.toFixed(2)),
	heading: +heading.toFixed(2),
});

function playRandomClip() {
	if (!mixer || !clips.length) return;
	const others = clips.filter((c) => !currentAction || c !== currentAction.getClip());
	const clip = others[Math.floor(Math.random() * others.length)] || clips[0];
	const next = mixer.clipAction(clip);
	next.reset();
	if (currentAction) {
		next.crossFadeFrom(currentAction, 0.4, true);
	}
	next.play();
	currentAction = next;
	loopCount = 0;
	// A fresh travel clip strikes out in a new direction.
	if (SPEEDS[clip.name]) targetHeading = Math.random() * Math.PI * 2;
}

loader.load(
	"assets/stonk/" + ANIM_FILES[0],
	function (gltf) {
		loadedModel = gltf.scene;

		// Meshy ships a stray unit sphere next to the character; it is not part of the model.
		const junk = loadedModel.getObjectByName("Icosphere");
		if (junk && junk.parent) junk.parent.remove(junk);

		// Same on-screen size and placement as before, just expressed in the rig's units
		loadedModel.scale.setScalar(7.5 * RIG_K);
		loadedModel.position.set(0, -3.12, 0);
		// Meshy exports face -Z; turn the character toward the camera.
		loadedModel.rotation.set(0, Math.PI, 0.01);

		// We keep the automatic bounding box calculation commented out to respect the default position
		// const box = new THREE.Box3().setFromObject(loadedModel);
		// loadedModel.position.y = -box.min.y;

		loadedModel.traverse(function (child) {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
				child.layers.mask = 2; // Strict Layer 1 for monkey model
				// Lit material so the three-point rig can model the face and suit.
				// The map stays LinearEncoding (renderer outputs linear) so the baked
				// colours read as authored; roughness keeps the suit matte with a
				// soft sheen on the head instead of plastic highlights.
				const map = child.material && child.material.map;
				if (map) {
					map.encoding = THREE.LinearEncoding;
					map.anisotropy = renderer.capabilities.getMaxAnisotropy();
					map.minFilter = THREE.LinearMipmapLinearFilter;
					map.magFilter = THREE.LinearFilter;
					map.generateMipmaps = true;
					map.needsUpdate = true;
				}
				child.material = new THREE.MeshStandardMaterial({
					map: map || null,
					roughness: 0.6,
					metalness: 0.05,
					skinning: true, // three r128 needs this flag on skinned meshes
				});
			}
		});

		scene.add(loadedModel);

		// Character is in: lift the blur-fade loading curtain. The flag lives on
		// <html> (CSS: .scene-ready #load-curtain) so it survives React re-rendering
		// the legacy markup underneath us.
		setTimeout(() => {
			document.documentElement.classList.add("scene-ready");
			setTimeout(() => {
				const c = document.getElementById("load-curtain");
				if (c) c.remove();
			}, 1500);
		}, 60);

		// Animation set: the base file's clip plus one clip from each sibling file.
		// The rigs are identical, so foreign clips bind by bone name without retargeting.
		mixer = new THREE.AnimationMixer(loadedModel);
		if (gltf.animations && gltf.animations.length) clips.push(gltf.animations[0]);
		for (const file of ANIM_FILES.slice(1)) {
			loader.load("assets/stonk/" + file, (g) => {
				if (g.animations && g.animations.length) {
					clips.push(g.animations[0]);
					// Warm the action now: binding a clip on first play allocates and
					// can drop a frame, which reads as the model blinking out.
					mixer.clipAction(g.animations[0]);
				}
			});
		}
		playRandomClip();
		// Every 2 full loops of the current clip, switch to a random different one.
		mixer.addEventListener("loop", (e) => {
			if (e.action !== currentAction) return;
			if (++loopCount >= 2) playRandomClip();
		});

		// The genital is placed at the crotch (midpoint of the upper-leg bones, in
		// model space), then handed to the Hips bone with attach() so it keeps that
		// world transform and rides every animation instead of the static model root.
		loadedModel.updateWorldMatrix(true, true);
		const legL = loadedModel.getObjectByName("LeftUpLeg");
		const legR = loadedModel.getObjectByName("RightUpLeg");
		if (legL && legR) {
			const crotch = new THREE.Vector3()
				.addVectors(legL.getWorldPosition(new THREE.Vector3()), legR.getWorldPosition(new THREE.Vector3()))
				.multiplyScalar(0.5);
			loadedModel.worldToLocal(crotch);
			genital.position.set(0, crotch.y, crotch.z + 0.09); // nudged to the front of the pelvis
		} else {
			genital.position.set(0, 0.377, 0.165); // fallback: old measured crotch
		}
		genital.rotation.set(1.45, 0, 0);
		genital.scale.setScalar(0.44 / RIG_K);
		loadedModel.add(genital);
		loadedModel.updateWorldMatrix(true, true);
		const hips = loadedModel.getObjectByName("Hips");
		if (hips) hips.attach(genital);


		addModelControls(gui, loadedModel); // Add model-specific controls AFTER loading

		// Force update glans with brown color and refresh all materials
		setTimeout(() => {
			updateGlansShape(gui.glansControls);
			forceUpdateMaterials(); // Force update all materials
			window.checkLayers = checkLayers; // Expose to console
			setTimeout(() => {
				console.log("Checking layers 3 seconds after load...");
				checkLayers();
			}, 3000);
		}, 100);

		// Add real-time glans shape updates
		const glansFolder = gui.children.find(
			(folder) => folder.title === "Glans Shape Controls",
		);
		if (glansFolder) {
			glansFolder.controllers.forEach((controller) => {
				controller.onChange(() => {
					updateGlansShape(gui.glansControls);
				});
			});
		}
	},
	undefined,
	function (error) {
		console.error("An error happened while loading the model:", error);
	},
);

// --- Global Functions ---
window.toggleWindow = (id) => {
	const win = document.getElementById(id);
	if (win) win.classList.toggle("hidden");
};

// Use window property to avoid "already declared" error during HMR/re-loads
window.updateClock = () => {
	const clockEl = document.getElementById("taskbar-clock");
	if (!clockEl) return;

	const now = new Date();
	let hours = now.getHours();
	let minutes = now.getMinutes();
	const ampm = hours >= 12 ? "PM" : "AM";
	hours = hours % 12;
	hours = hours ? hours : 12;
	minutes = minutes < 10 ? "0" + minutes : minutes;
	clockEl.textContent = hours + ":" + minutes + " " + ampm;
};

if (!window.clockInterval) {
	window.clockInterval = setInterval(() => window.updateClock(), 1000);
	window.updateClock();
}

// --- Event Listeners ---
// --- Global Event Delegation (survives React re-renders) ---
document.addEventListener("click", (e) => {
	const target = e.target;

	// Handle Rotation Toggle
	const rotBtn = target.closest("#rotation-toggle");
	if (rotBtn) {
		console.log("[DEBUG] Rotation toggle clicked");
		settings.autoRotate = !settings.autoRotate;

		// Update GUI display (search in root and all folders)
		const allControllers = [
			...gui.controllers,
			...(gui.folders
				? Object.values(gui.folders).flatMap((f) => f.controllers)
				: []),
		];

		const autoRotateCtrl = allControllers.find(
			(c) => c.property === "autoRotate",
		);
		if (autoRotateCtrl) autoRotateCtrl.updateDisplay();

		rotBtn.textContent = settings.autoRotate
			? "Disable rotation"
			: "Enable rotation";
		return;
	}

	// Handle Start Menu
	const startBtn = document.getElementById("start-btn");
	const startMenu = document.getElementById("start-menu");
	if (startBtn && startMenu) {
		if (startBtn.contains(target)) {
			e.stopPropagation();
			startMenu.style.display =
				startMenu.style.display === "flex" ? "none" : "flex";
		} else if (!startMenu.contains(target)) {
			startMenu.style.display = "none";
		}
	}

	// Handle About/Manifesto
	if (
		target.id === "start-about" ||
		target.closest(".desktop-icon[onclick*='toggleWindow(\"info-panel\")']") ||
		target.closest(".desktop-icon[onclick*='toggleWindow(\\'info-panel\\')']")
	) {
		window.toggleWindow("info-panel");
	}

	// Handle CA Copy
	if (target.closest("#ca-display")) {
		const ca =
			document.getElementById("ca-box-address")?.textContent ||
			"2ADR43Dcecc7HQPBKPcKKHBN5BjfWvPpFo483bjzpump";
		navigator.clipboard.writeText(ca);

		const caBtn = target.closest("#ca-display");
		const originalHtml = caBtn.innerHTML;
		caBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
		setTimeout(() => {
			const currentCaBtn = document.getElementById("ca-display");
			if (currentCaBtn) currentCaBtn.innerHTML = originalHtml;
		}, 2000);
	}
});

// Sync initial rotation button text
setTimeout(() => {
	const rotBtn = document.getElementById("rotation-toggle");
	if (rotBtn) {
		rotBtn.textContent = settings.autoRotate
			? "Disable rotation"
			: "Enable rotation";
	}
}, 1000);

// Listen for glans shape updates
window.addEventListener("glansUpdate", (event) => {
	console.log("Glans update event received:", event.detail);
	updateGlansShape(event.detail);
});

window.addEventListener("resize", () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
function animate() {
	requestAnimationFrame(animate);
	const delta = clock.getDelta();
	if (mixer) mixer.update(delta);
	updateWorld(delta);

	// Locomotion: the model's forward is -Z at heading 0 (Meshy export), so the
	// travel direction is (-sin h, -cos h). Non-travel clips leave him in place.
	if (loadedModel && currentAction) {
		let dh = targetHeading - heading;
		dh = Math.atan2(Math.sin(dh), Math.cos(dh)); // shortest way around
		heading += Math.max(-3 * delta, Math.min(3 * delta, dh));
		loadedModel.rotation.y = heading;

		const speed = SPEEDS[currentAction.getClip().name] || 0;
		if (speed) {
			// Flipped from -sin/-cos: the strides read backwards the other way.
			const nx = loadedModel.position.x + Math.sin(heading) * speed * delta;
			const nz = loadedModel.position.z + Math.cos(heading) * speed * delta;
			if (Math.hypot(nx, nz) > ROAM_LIMIT) {
				// Nearing the lagoon: turn back toward the middle, with some wobble
				// so he never ping-pongs along the same line.
				targetHeading = Math.atan2(-nx, -nz) + (Math.random() - 0.5);
			} else {
				loadedModel.position.set(nx, WORLD_Y + heightAt(nx, nz), nz);
			}
		}
		// The camera keeps him framed wherever he wanders (1.5 above his old spot).
		controls.target.lerp(
			new THREE.Vector3(
				loadedModel.position.x,
				loadedModel.position.y + 4.62,
				loadedModel.position.z,
			),
			0.05,
		);
	}
	// The camera orbits Jemo now; he and the scenery stay put. OrbitControls
	// applies this inside its own update() below, so the existing toggle and the
	// GUI checkbox keep working untouched.
	controls.autoRotate = settings.autoRotate;

	// Pulsating effect for the glans
	if (genital) {
		const glans = genital.getObjectByName("penis_tip");
		if (glans) {
			const time = Date.now() * 0.005; // Speed of the pulsation
			const pulse = Math.sin(time) * 0.05 + 1; // Pulsates between 0.95 and 1.05
			glans.scale.set(pulse, pulse, pulse);
		}
	}

	controls.update();

	// Dynamic camera zoom-out logic
	if (loadedModel && settings.autoZoom) {
		const tipObject = genital.getObjectByName("penis_tip");

		if (tipObject) {
			const tipPosition = new THREE.Vector3();
			tipObject.getWorldPosition(tipPosition);

			const orbitTarget = controls.target;
			const distanceOfTipFromTarget = tipPosition.distanceTo(orbitTarget);

			// Correctly calculate the distance required to keep the tip in the camera's view frustum
			const fovInRadians = camera.fov * (Math.PI / 180);
			const requiredDistance =
				distanceOfTipFromTarget / Math.tan(fovInRadians / 2);

			const desiredCameraDistance = requiredDistance * 1.2; // Add a 20% buffer
			const currentCameraDistance = camera.position.distanceTo(orbitTarget);

			if (currentCameraDistance < desiredCameraDistance) {
				// Smoothly zoom out by interpolating to the new distance
				const newDistance =
					currentCameraDistance +
					(desiredCameraDistance - currentCameraDistance) * 0.05;
				const offset = new THREE.Vector3().subVectors(
					camera.position,
					orbitTarget,
				);
				offset.setLength(newDistance);
				camera.position.copy(orbitTarget).add(offset);
			}
		}
	}

	renderer.render(scene, camera);
}

// ===== START EVERYTHING =====
startDataUpdates((scale) => {
	// Always use GUI controls if available, otherwise use default
	const controls = gui && gui.glansControls ? gui.glansControls : null;
	updateArbre(scale, controls);
});

// Initialize Matrix Rain Effect
const matrixRain = new MatrixRain();
// matrixRain.start(); // Start rain effect automatically disabled

animate();
