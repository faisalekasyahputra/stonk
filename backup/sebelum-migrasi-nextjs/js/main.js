import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { setupScene } from "./scene.js";
import {
	genital,
	updateArbre,
	updateGlansShape,
	forceUpdateMaterials,
} from "./dynamicPart.js";
import { createGUI, addModelControls } from "./ui.js";
import { MatrixRain } from "./matrixRain.js";
import { startDataUpdates, TOKEN_ADDRESS } from "./data.js";

// Close info panel functionality
document.getElementById("close-info").addEventListener("click", () => {
	document.getElementById("info-panel").style.display = "none";
});
setTimeout(() => {
	const infoPanel = document.getElementById("info-panel");
	if (infoPanel) infoPanel.style.display = "none";
}, 10000);

// --- CA Box Logic ---
const caBox = document.getElementById("ca-box");
if (TOKEN_ADDRESS) {
	document.getElementById(
		"ca-box-address"
	).textContent = `${TOKEN_ADDRESS.substring(0, 6)}...${TOKEN_ADDRESS.substring(
		TOKEN_ADDRESS.length - 4
	)}`;

	const clipboardIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`;
	const copyButton = document.getElementById("copy-ca-button");
	copyButton.addEventListener("click", () => {
		navigator.clipboard
			.writeText(TOKEN_ADDRESS)
			.then(() => {
				copyButton.innerHTML = `<span class="material-icons">done</span>`;
				setTimeout(() => {
					copyButton.innerHTML = clipboardIconSVG;
				}, 1500);
			})
			.catch((err) => {
				console.error("Failed to copy CA: ", err);
			});
	});
} else {
	caBox.style.display = "none";
}

// --- Social Links Logic ---
const buyLink = document.getElementById("buy-link");
if (TOKEN_ADDRESS) {
	buyLink.href = `https://pump.fun/coin/${TOKEN_ADDRESS}`;
} else {
	buyLink.style.display = "none"; // Hide buy button if no CA
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
	ground,
	gridHelper,
	groundMaterial,
} = setupScene();

// Set initial camera position after setup
camera.position.set(0, 2, 7);
controls.target.set(0, 1.5, 0);

// --- UI Initialization ---
const rotationToggle = document.getElementById("rotation-toggle");
const gui = createGUI({
	settings,
	gridHelper,
	groundMaterial,
	ambientLight,
	directionalLight,
	genital,
	rotationToggle,
});

// --- Model Loading ---
const loader = new GLTFLoader();
loader.load(
	"assets/alon.glb",
	function (gltf) {
		loadedModel = gltf.scene;

		// Apply the default settings from the control panel image
		loadedModel.scale.set(2.5, 2.5, 2.5);
		loadedModel.position.y = 1.14;
		loadedModel.rotation.z = 0.01;

		// We keep the automatic bounding box calculation commented out to respect the default position
		// const box = new THREE.Box3().setFromObject(loadedModel);
		// loadedModel.position.y = -box.min.y;

		loadedModel.traverse(function (child) {
			if (child.isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});

		scene.add(loadedModel);
		loadedModel.add(genital);

		addModelControls(gui, loadedModel); // Add model-specific controls AFTER loading

		// Force update glans with green color and refresh all materials
		setTimeout(() => {
			updateGlansShape(gui.glansControls);
			forceUpdateMaterials(); // Force update all materials
		}, 100);

		// Add real-time glans shape updates
		const glansFolder = gui.children.find(
			(folder) => folder.title === "Glans Shape Controls"
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
	}
);

// --- Event Listeners ---
rotationToggle.addEventListener("click", () => {
	settings.autoRotate = !settings.autoRotate;
	gui.controllers.forEach((c) => {
		if (c.property === "autoRotate") c.updateDisplay();
	});
	rotationToggle.textContent = settings.autoRotate
		? "Disable rotation"
		: "Enable rotation";
});

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
	if (settings.autoRotate && loadedModel) {
		loadedModel.rotation.y += 0.005;
	}

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
					orbitTarget
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
matrixRain.start(); // Start rain effect automatically

animate();
