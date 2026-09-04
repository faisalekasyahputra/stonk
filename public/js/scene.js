import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

let scene,
	camera,
	renderer,
	controls,
	ambientLight,
	directionalLight,
	genitalAmbientLight,
	genitalDirectionalLight,
	fixedLight,
	ground,
	gridHelper;

function setupScene() {
	scene = new THREE.Scene();
	scene.background = null;
	camera = new THREE.PerspectiveCamera(
		75,
		window.innerWidth / window.innerHeight,
		0.1,
		1000,
	);
	camera.layers.enable(0); // See default layer
	camera.layers.enable(1); // See main model layer
	camera.layers.enable(2); // See genital layer
	camera.position.set(0, 2, 7); // Set initial position

	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	// Render at device resolution (capped at 1.5x to stay light) so edges and
	// the 2k character texture stop looking jagged on HiDPI screens.
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = false; // Disable shadows
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	renderer.setClearColor(0x000000, 0); // Transparent background
	renderer.domElement.id = "scene-canvas";
	renderer.domElement.style.position = "fixed";
	renderer.domElement.style.top = "0";
	renderer.domElement.style.left = "0";
	renderer.domElement.style.zIndex = "1";
	document.body.appendChild(renderer.domElement);

	controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 1.5, 0); // Set initial look-at target
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.minDistance = 0.5;
	controls.maxDistance = 50;

	// Swap Mouse Button Controls: Left Click = Pan (Move), Right Click = Rotate
	controls.mouseButtons = {
		LEFT: THREE.MOUSE.PAN,
		MIDDLE: THREE.MOUSE.DOLLY,
		RIGHT: THREE.MOUSE.ROTATE,
	};

	// --- Lights ---

	// Monkey Lights (Target Layer 1 - mask: 2)
	ambientLight = new THREE.AmbientLight(0xffffff, 0); // User requested 0
	ambientLight.layers.mask = 2; // Strict Layer 1
	scene.add(ambientLight);

	directionalLight = new THREE.DirectionalLight(0xffffff, 2.07); // User requested 2.07
	directionalLight.position.set(5, 10, 7.5);
	directionalLight.castShadow = false;
	directionalLight.layers.mask = 2; // Strict Layer 1
	camera.add(directionalLight); // Relative to camera

	// Genital Lights (Target Layer 2 - mask: 4)
	// Kept near a total of 1.0: the body is unlit, so anything higher makes the
	// same hex render brighter than Jemo's face.
	genitalAmbientLight = new THREE.AmbientLight(0xffffff, 0.55);
	genitalAmbientLight.layers.mask = 4; // Strict Layer 2
	scene.add(genitalAmbientLight);

	genitalDirectionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
	genitalDirectionalLight.position.set(-5, 5, 5);
	genitalDirectionalLight.layers.mask = 4; // Strict Layer 2
	camera.add(genitalDirectionalLight); // Relative to camera

	scene.add(camera);

	// Fixed context light (Target Layer 0 - mask: 1 - Ground/Grid)
	fixedLight = new THREE.AmbientLight(0xffffff, 0.5);
	fixedLight.layers.mask = 1; // Strict Layer 0
	scene.add(fixedLight);

	// --- Ground ---
	const groundGeometry = new THREE.PlaneGeometry(20, 20);
	const groundMaterial = new THREE.MeshStandardMaterial({
		color: 0x000000,
		roughness: 0.8,
		metalness: 0.2,
		transparent: true,
		opacity: 0.5,
	});
	ground = new THREE.Mesh(groundGeometry, groundMaterial);
	ground.rotation.x = -Math.PI / 2;
	ground.receiveShadow = true;
	ground.visible = false; // Hidden as requested
	ground.layers.mask = 1; // Layer 0
	scene.add(ground);

	gridHelper = new THREE.GridHelper(20, 50);
	gridHelper.visible = false;
	gridHelper.layers.mask = 1; // Layer 0
	scene.add(gridHelper);

	return {
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
	};
}

const checkLayers = () => {
	console.log("--- LAYER DEBUGER ---");
	scene.traverse((child) => {
		if (child.isMesh) {
			console.log(
				`Mesh: ${child.name || child.type}, Mask: ${child.layers.mask}`,
			);
		}
		if (child.isLight) {
			console.log(`Light: ${child.type}, Mask: ${child.layers.mask}`);
		}
	});
};

export { setupScene, checkLayers };
