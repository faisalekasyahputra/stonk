import { GUI } from "lil-gui";

function createGUI(params) {
	const {
		settings,
		gridHelper,
		groundMaterial,
		ambientLight,
		directionalLight,
		genital,
		rotationToggle,
	} = params;

	const gui = new GUI();

	// Scene Folder
	const sceneFolder = gui.addFolder("Scene Controls");
	sceneFolder
		.add(settings, "autoRotate")
		.name("Auto Rotate")
		.onChange((value) => {
			rotationToggle.textContent = value
				? "Disable rotation"
				: "Enable rotation";
		});
	sceneFolder.add(settings, "autoZoom").name("Auto Zoom Camera");
	sceneFolder.add(gridHelper, "visible").name("Show Grid");
	sceneFolder.addColor(groundMaterial, "color").name("Ground Color");

	// Lighting Folder
	const lightFolder = gui.addFolder("Lighting");
	lightFolder.add(ambientLight, "intensity", 0, 2).name("Ambient Intensity");
	const dirLightFolder = lightFolder.addFolder("Directional Light");
	dirLightFolder.add(directionalLight.position, "x", -20, 20).name("Pos X");
	dirLightFolder.add(directionalLight.position, "y", -20, 20).name("Pos Y");
	dirLightFolder.add(directionalLight.position, "z", -20, 20).name("Pos Z");
	dirLightFolder.add(directionalLight, "intensity", 0, 4).name("Intensity");

	// Genital Folder
	const genitalFolder = gui.addFolder("Genital Controls");
	genitalFolder.add(genital.position, "x", -1, 1).step(0.01).name("Pos X");
	genitalFolder.add(genital.position, "y", -1, 1).step(0.01).name("Pos Y");
	genitalFolder.add(genital.position, "z", -1, 1).step(0.01).name("Pos Z");
	genitalFolder
		.add(genital.rotation, "x", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot X");
	genitalFolder
		.add(genital.rotation, "y", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Y");
	genitalFolder
		.add(genital.rotation, "z", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Z");
	const genitalScale = { value: genital.scale.x };
	genitalFolder
		.add(genitalScale, "value", 0.1, 1.5)
		.name("Scale")
		.onChange((v) => genital.scale.set(v, v, v));

	// Glans Shape Controls
	const glansControls = {
		radius: 0.16,
		widthSegments: 24,
		heightSegments: 18,
		phiStart: 0,
		phiLength: Math.PI * 2,
		thetaStart: 0,
		thetaLength: Math.PI,
		noiseAmplitude: 0,
		color: 0x64c78d, // Green color instead of pink
		roughness: 0,
		metalness: 0,
		// Bullet shape controls - from GUI image
		bulletShape: true,
		baseRadius: 0.4, // From GUI image
		tipRadius: 0.2, // From GUI image
		bulletLength: 1.08, // From GUI image
		taperCurve: 5, // From GUI image
		// Bluntness controls
		bluntness: 0, // From GUI image
		constantLength: 0.61, // From GUI image
		tipRoundness: 0.37, // From GUI image
		// Pill shape controls
		pillShape: true, // From GUI image
		pillTaper: 0.57, // From GUI image
		pillAsymmetry: 0.13, // From GUI image
		// Roundness controls
		overallRoundness: 0.87, // From GUI image
		cornerSmoothing: 1, // From GUI image
		edgeRadius: 0.09, // From GUI image
		// Placement and rotation controls
		glansPosX: 0.0, // Reset to center
		glansPosY: 0.0, // Reset to center
		glansPosZ: 0.0, // Reset to center
		glansRotX: 1.59, // From GUI image
		glansRotY: 0.0, // Reset rotation
		glansRotZ: 0.0, // Reset rotation
	};

	const glansFolder = gui.addFolder("Glans Shape Controls");
	glansFolder.add(glansControls, "radius", 0.1, 2.0).step(0.01).name("Radius");
	glansFolder
		.add(glansControls, "widthSegments", 8, 64)
		.step(1)
		.name("Width Segments");
	glansFolder
		.add(glansControls, "heightSegments", 8, 32)
		.step(1)
		.name("Height Segments");
	glansFolder
		.add(glansControls, "phiStart", 0, Math.PI * 2)
		.step(0.01)
		.name("Phi Start");
	glansFolder
		.add(glansControls, "phiLength", 0, Math.PI * 2)
		.step(0.01)
		.name("Phi Length");
	glansFolder
		.add(glansControls, "thetaStart", 0, Math.PI)
		.step(0.01)
		.name("Theta Start");
	glansFolder
		.add(glansControls, "thetaLength", 0, Math.PI)
		.step(0.01)
		.name("Theta Length");
	glansFolder
		.add(glansControls, "noiseAmplitude", 0, 0.2)
		.step(0.001)
		.name("Noise Amplitude");
	glansFolder.addColor(glansControls, "color").name("Color");
	glansFolder
		.add(glansControls, "roughness", 0, 1)
		.step(0.01)
		.name("Roughness");
	glansFolder
		.add(glansControls, "metalness", 0, 1)
		.step(0.01)
		.name("Metalness");

	// Bullet Shape Controls
	const bulletFolder = glansFolder.addFolder("Bullet Shape Controls");
	bulletFolder.open(); // Buka folder agar terlihat
	bulletFolder.add(glansControls, "bulletShape").name("Enable Bullet Shape");
	bulletFolder
		.add(glansControls, "baseRadius", 0.1, 0.5)
		.step(0.01)
		.name("Base Radius");
	bulletFolder
		.add(glansControls, "tipRadius", 0.01, 0.2)
		.step(0.01)
		.name("Tip Radius");
	bulletFolder
		.add(glansControls, "bulletLength", 0.5, 3.0)
		.step(0.01)
		.name("Bullet Length");
	bulletFolder
		.add(glansControls, "taperCurve", 1.0, 5.0)
		.step(0.1)
		.name("Taper Curve");

	// Bluntness Controls
	const bluntFolder = bulletFolder.addFolder("Bluntness Controls");
	bluntFolder
		.add(glansControls, "bluntness", 0.0, 1.0)
		.step(0.01)
		.name("Bluntness Level");
	bluntFolder
		.add(glansControls, "constantLength", 0.0, 1.0)
		.step(0.01)
		.name("Constant Length %");
	bluntFolder
		.add(glansControls, "tipRoundness", 0.0, 1.0)
		.step(0.01)
		.name("Tip Roundness");

	// Pill Shape Controls
	const pillFolder = bulletFolder.addFolder("Pill Shape Controls");
	pillFolder.add(glansControls, "pillShape").name("Enable Pill Shape");
	pillFolder
		.add(glansControls, "pillTaper", 0.0, 1.0)
		.step(0.01)
		.name("Pill Taper");
	pillFolder
		.add(glansControls, "pillAsymmetry", 0.0, 1.0)
		.step(0.01)
		.name("Pill Asymmetry");

	// Roundness Controls
	const roundnessFolder = bulletFolder.addFolder("Roundness Controls");
	roundnessFolder.open(); // Buka folder agar terlihat
	roundnessFolder
		.add(glansControls, "overallRoundness", 0.0, 1.0)
		.step(0.01)
		.name("Overall Roundness");
	roundnessFolder
		.add(glansControls, "cornerSmoothing", 0.0, 1.0)
		.step(0.01)
		.name("Corner Smoothing");
	roundnessFolder
		.add(glansControls, "edgeRadius", 0.0, 0.5)
		.step(0.01)
		.name("Edge Radius");

	// Placement and Rotation Controls
	const placementFolder = glansFolder.addFolder("Placement & Rotation");
	placementFolder.open(); // Buka folder agar terlihat
	placementFolder
		.add(glansControls, "glansPosX", -2.0, 2.0)
		.step(0.01)
		.name("Position X");
	placementFolder
		.add(glansControls, "glansPosY", -2.0, 2.0)
		.step(0.01)
		.name("Position Y");
	placementFolder
		.add(glansControls, "glansPosZ", -2.0, 2.0)
		.step(0.01)
		.name("Position Z");
	placementFolder
		.add(glansControls, "glansRotX", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rotation X");
	placementFolder
		.add(glansControls, "glansRotY", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rotation Y");
	placementFolder
		.add(glansControls, "glansRotZ", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rotation Z");

	// Store glans controls for external access
	gui.glansControls = glansControls;

	// Add onChange listeners for real-time updates - ALL controllers
	function addListenersToFolder(folder) {
		folder.controllers.forEach((controller) => {
			controller.onChange(() => {
				// Trigger custom event for glans update
				window.dispatchEvent(
					new CustomEvent("glansUpdate", {
						detail: glansControls,
					})
				);
			});
		});

		// Add listeners to subfolders
		folder.children.forEach((child) => {
			if (child.controllers) {
				addListenersToFolder(child);
			}
		});
	}

	// Add listeners to all folders
	addListenersToFolder(glansFolder);

	// Matrix Rain Controls
	const rainControls = {
		enabled: true,
		intensity: 0.5,
		toggle: () => {
			// This will be set by main.js
		},
	};

	const rainFolder = gui.addFolder("Matrix Rain");
	rainFolder
		.add(rainControls, "enabled")
		.name("Enable Rain")
		.onChange((value) => {
			if (window.matrixRain) {
				if (value) {
					window.matrixRain.start();
				} else {
					window.matrixRain.stop();
				}
			}
		});
	rainFolder
		.add(rainControls, "intensity", 0, 1)
		.step(0.1)
		.name("Rain Intensity")
		.onChange((value) => {
			if (window.matrixRain) {
				window.matrixRain.setIntensity(value);
			}
		});
	rainFolder.open(); // Keep rain controls open by default

	gui.close(); // Close the GUI by default on load
	gui.hide(); // Hide the GUI completely
	return gui;
}

function addModelControls(gui, loadedModel) {
	if (!loadedModel) return;
	const modelFolder = gui.addFolder("Model Controls");
	modelFolder.add(loadedModel.position, "y", 0, 5).step(0.01).name("Pos Y");
	modelFolder
		.add(loadedModel.rotation, "y", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Y");
	modelFolder
		.add(loadedModel.rotation, "z", -Math.PI, Math.PI)
		.step(0.01)
		.name("Rot Z");
	const modelScale = { value: loadedModel.scale.x };
	modelFolder
		.add(modelScale, "value", 0.1, 5)
		.name("Scale")
		.onChange((v) => loadedModel.scale.set(v, v, v));
}

export { createGUI, addModelControls };
