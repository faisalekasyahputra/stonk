import * as THREE from "three";

// --- Materials for Dynamic Part ---
const skinMaterial = new THREE.MeshBasicMaterial({
	color: 0xbda184, // the stonk head skin, sampled from the model texture
	side: THREE.DoubleSide,
});
const glansMaterial = new THREE.MeshBasicMaterial({
	color: 0xbda184, // exactly the stonk head skin, tip included
});

// --- Dynamic Genital Part Setup ---
const genital = new THREE.Group();
// crotch of the minijemo mesh, measured: crotch y=0.2394, front surface z=0.1092
genital.position.set(0, 0.244, 0.107);
genital.rotation.set(1.45, 0, 0);
genital.scale.set(0.44, 0.44, 0.44);

let shaft, glans, testicle1, testicle2;

function addOrganicNoise(geometry, amplitude = 0.05) {
	const positions = geometry.attributes.position;
	for (let i = 0; i < positions.count; i++) {
		positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * amplitude);
		positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * amplitude);
		positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * amplitude);
	}
	geometry.attributes.position.needsUpdate = true;
	geometry.computeVertexNormals();
	return geometry;
}

function createLatheGeometry(profilePoints, segments = 24) {
	let geometry = new THREE.LatheGeometry(
		profilePoints,
		segments,
		0,
		Math.PI * 2,
	);
	geometry = addOrganicNoise(geometry, 0.05);
	return geometry;
}

function createBulletGeometry(
	baseRadius,
	tipRadius,
	length,
	taperCurve,
	segments = 24,
	bluntness = 0.8,
	constantLength = 0.7,
	tipRoundness = 0.9,
	pillShape = true,
	pillTaper = 0.3,
	pillAsymmetry = 0.5,
	overallRoundness = 0.9,
	cornerSmoothing = 0.8,
	edgeRadius = 0.15,
) {
	// Gunakan pendekatan titik-titik profil yang lebih sederhana dan efektif
	const points = [];

	if (pillShape) {
		// Bentuk pill - satu sisi lebih tumpul
		// Mulai dari dasar
		points.push(new THREE.Vector2(0.0, -length * 0.2));

		// Dasar datar
		points.push(new THREE.Vector2(baseRadius, -length * 0.2));

		// Badan silinder (sebagian besar panjang)
		const cylinderLength = length * constantLength;
		points.push(new THREE.Vector2(baseRadius, cylinderLength));

		// Transisi ke bentuk pill
		const pillTransitionY = cylinderLength + length * 0.2;
		const pillRadius = baseRadius * (1 - pillTaper * 0.3);
		points.push(new THREE.Vector2(pillRadius, pillTransitionY));

		// Ujung pill - satu sisi lebih tumpul
		const tipY = length * 0.9;
		const asymmetricRadius =
			baseRadius * (1 - pillTaper * (0.5 + pillAsymmetry * 0.3));
		points.push(new THREE.Vector2(asymmetricRadius, tipY));

		// Puncak pill yang sangat tumpul
		const finalTipRadius =
			baseRadius * (1 - pillTaper * (0.7 + pillAsymmetry * 0.2));
		points.push(new THREE.Vector2(finalTipRadius, length));

		// Puncak paling atas (benar-benar tumpul)
		points.push(new THREE.Vector2(0.0, length * 1.05));
	} else {
		// Bentuk bullet biasa
		// Mulai dari dasar (agak ke dalam untuk ujung tumpul)
		points.push(new THREE.Vector2(0.0, -length * 0.3));

		// Lurus ke luar untuk dasar datar
		points.push(new THREE.Vector2(baseRadius, -length * 0.3));

		// Lurus ke atas untuk badan silinder (sebagian besar panjang)
		const cylinderLength = length * constantLength;
		points.push(new THREE.Vector2(baseRadius, cylinderLength));

		// Titik untuk membuat lengkungan di ujung (lebih tumpul)
		const tipRadiusActual = baseRadius * (1 - bluntness * 0.4);
		points.push(new THREE.Vector2(tipRadiusActual, length * 0.8));

		// Titik puncak (sangat tumpul)
		const finalTipRadius = baseRadius * (1 - bluntness * 0.7);
		points.push(new THREE.Vector2(finalTipRadius, length));

		// Titik puncak paling atas (benar-benar tumpul)
		points.push(new THREE.Vector2(0.0, length * 1.1));
	}

	// Apply roundness to all points
	const roundedPoints = points.map((point) => {
		const x = point.x;
		const y = point.y;

		// Apply overall roundness
		const roundedX = x * (1 - overallRoundness * 0.2);
		const roundedY = y * (1 - overallRoundness * 0.1);

		// Apply corner smoothing
		const smoothFactor = cornerSmoothing * 0.3;
		const smoothedX = roundedX * (1 - smoothFactor);
		const smoothedY = roundedY * (1 - smoothFactor);

		// Apply edge radius
		const edgeFactor = edgeRadius * 0.5;
		const finalX = smoothedX * (1 - edgeFactor);
		const finalY = smoothedY * (1 - edgeFactor);

		return new THREE.Vector2(finalX, finalY);
	});

	// Buat LatheGeometry dari titik-titik yang sudah di-rounded
	let geometry = new THREE.LatheGeometry(roundedPoints, segments);
	geometry = addOrganicNoise(geometry, 0.01); // Kurangi noise untuk bentuk yang lebih halus
	return geometry;
}

// Restore the original, thicker base profile
const baseProfilePoints = [
	new THREE.Vector2(0.4, 0),
	new THREE.Vector2(0.45, 0.5),
	new THREE.Vector2(0.5, 1.5),
	new THREE.Vector2(0.48, 2.5),
	new THREE.Vector2(0.52, 3.5),
	new THREE.Vector2(0.5, 4.5),
];

function updateArbre(scale, glansControls = null) {
	console.log(`[DEBUG] updateArbre called with scale: ${scale}`);
	window.currentOrangutanScale = scale; // Save for real-time shaping updates

	// To make sure the tip ("pucuk") and the shaft ("batang") enlarge equally:
	// The thickness (radius) of both will be capped so they don't look deformed.
	const maxScaleForBase = 0.35;
	const thicknessScale = Math.min(scale, maxScaleForBase); // Uniform thickness limit
	const tipScale = scale; // Length stretches with full scale

	console.log(
		`[DEBUG] lengthScale: ${tipScale}, thicknessScale: ${thicknessScale}`,
	);

	const scaledProfile = baseProfilePoints.map((p) => {
		const newY = p.y * tipScale; // Length uses the full stretching scale
		const newX = p.x * thicknessScale; // Thickness uses the uniform limited scale
		return new THREE.Vector2(newX, newY);
	});

	const shaftGeometry = createLatheGeometry(scaledProfile);
	if (shaft) genital.remove(shaft);
	shaft = new THREE.Mesh(shaftGeometry, skinMaterial);
	shaft.position.y = 0;
	shaft.castShadow = true;
	shaft.receiveShadow = true;
	shaft.layers.mask = 4;
	genital.add(shaft);

	// Glans (pink part)
	const glansRadius = glansControls
		? glansControls.radius * thicknessScale
		: 0.6 * thicknessScale;
	const glansWidthSegments = glansControls ? glansControls.widthSegments : 24;
	const glansHeightSegments = glansControls ? glansControls.heightSegments : 18;
	const glansPhiStart = glansControls ? glansControls.phiStart : 0;
	const glansPhiLength = glansControls ? glansControls.phiLength : Math.PI * 2;
	const glansThetaStart = glansControls ? glansControls.thetaStart : 0;
	const glansThetaLength = glansControls
		? glansControls.thetaLength
		: Math.PI / 1.2;
	const glansNoiseAmplitude = glansControls
		? glansControls.noiseAmplitude * thicknessScale
		: 0.03 * thicknessScale;

	let glansGeometry;

	// Ensure bullet shape is enabled by default if no controls provided
	const useBulletShape = glansControls ? glansControls.bulletShape : true;

	// Scale position by the length scale, but shape by the thickness scale.
	const positionScale = tipScale;
	// To match user's custom adjustments (0.29 base in ui.js), we set sizeScale symmetrically to thicknessScale * 3.
	const sizeScale = thicknessScale * 4.0;

	if (useBulletShape) {
		// Gunakan nilai default scaling jika parameter ada tapi tidak memperhitungkan sizeScale
		// karena ui.js passing nilai mentah tanpa sizeScale
		const baseRadius = sizeScale * (glansControls?.baseRadius || 0.4);
		const tipRadius = sizeScale * (glansControls?.tipRadius || 0.2);
		// The length of the bullet stretches somewhat to avoid looking like a disk
		const bulletLengthScale = Math.max(
			thicknessScale * 3,
			Math.min(tipScale, 1.0),
		);
		const bulletLength = sizeScale * (glansControls?.bulletLength || 1.08);
		const taperCurve = glansControls?.taperCurve || 5;

		glansGeometry = createBulletGeometry(
			baseRadius,
			tipRadius,
			bulletLengthScale * bulletLength, // Multiply by bulletLengthScale to stretch proportionally!
			taperCurve,
			glansWidthSegments,
			glansControls?.bluntness || 0,
			glansControls?.constantLength || 0.61,
			glansControls?.tipRoundness || 0.37,
			glansControls?.pillShape || true,
			glansControls?.pillTaper || 0.57,
			glansControls?.pillAsymmetry || 0.13,
			glansControls?.overallRoundness || 0.87,
			glansControls?.cornerSmoothing || 1,
			glansControls?.edgeRadius || 0.09,
		);
	} else {
		// Create sphere shape
		glansGeometry = new THREE.SphereGeometry(
			glansRadius,
			glansWidthSegments,
			glansHeightSegments,
			glansPhiStart,
			glansPhiLength,
			glansThetaStart,
			glansThetaLength,
		);
		addOrganicNoise(glansGeometry, glansNoiseAmplitude);
	}

	if (glans) genital.remove(glans);

	// Create material with customizable properties
	const glansMaterialCustom = new THREE.MeshBasicMaterial({
		color: glansControls ? glansControls.color : 0xbda184,
		roughness: glansControls ? glansControls.roughness : 0.3,
		metalness: glansControls ? glansControls.metalness : 0.05,
	});

	glans = new THREE.Mesh(glansGeometry, glansMaterialCustom);
	glans.name = "penis_tip"; // Give the tip a name for tracking

	// Apply placement and rotation from controls with defaults
	glans.position.set(
		glansControls?.glansPosX || 0.0,
		4.5 * positionScale + (glansControls?.glansPosY || 0.0),
		glansControls?.glansPosZ || 0.0,
	);
	glans.rotation.set(
		-Math.PI / 2 + (glansControls?.glansRotX || 0.0),
		glansControls?.glansRotY || 0.0,
		glansControls?.glansRotZ || 0.0,
	);

	glans.castShadow = true;
	glans.receiveShadow = true;
	glans.layers.set(2);
	genital.add(glans);

	// Testicles scale with the capped base scale
	const testRadius = 0.6 * thicknessScale;
	const testGeometry1 = new THREE.SphereGeometry(testRadius, 18, 12);
	addOrganicNoise(testGeometry1, 0.04 * thicknessScale);
	if (testicle1) genital.remove(testicle1);
	testicle1 = new THREE.Mesh(testGeometry1, skinMaterial);
	testicle1.position.set(
		-0.4 * thicknessScale,
		-testRadius * -0.5,
		0.8 * thicknessScale,
	);
	testicle1.castShadow = true;
	testicle1.receiveShadow = true;
	testicle1.layers.mask = 4;
	genital.add(testicle1);

	const testGeometry2 = new THREE.SphereGeometry(testRadius, 18, 12);
	addOrganicNoise(testGeometry2, 0.04 * thicknessScale);
	if (testicle2) genital.remove(testicle2);
	testicle2 = new THREE.Mesh(testGeometry2, skinMaterial);
	testicle2.position.set(
		0.4 * thicknessScale,
		-testRadius * -0.5,
		0.8 * thicknessScale,
	);
	testicle2.castShadow = true;
	testicle2.receiveShadow = true;
	testicle2.layers.mask = 4;
	genital.add(testicle2);
}

// Function to update glans shape in real-time
function updateGlansShape(glansControls) {
	if (!glans) {
		console.log("Glans not found, cannot update shape");
		return;
	}

	console.log("Updating glans shape with controls:", glansControls);

	const tipScale = window.currentOrangutanScale || 0.1;
	const thicknessScale = Math.min(tipScale, 0.35);

	const glansRadius = glansControls.radius * thicknessScale;
	const glansWidthSegments = glansControls.widthSegments;
	const glansHeightSegments = glansControls.heightSegments;
	const glansPhiStart = glansControls.phiStart;
	const glansPhiLength = glansControls.phiLength;
	const glansThetaStart = glansControls.thetaStart;
	const glansThetaLength = glansControls.thetaLength;
	const glansNoiseAmplitude = glansControls.noiseAmplitude * thicknessScale;
	const positionScale = tipScale; // Keep available for placement in all shape branches

	// Create new geometry with bullet shape
	let glansGeometry;

	if (glansControls.bulletShape) {
		const sizeScale = thicknessScale * 4.0;
		console.log(
			`[DEBUG] updateGlansShape - tipScale: ${tipScale}, positionScale: ${positionScale}, sizeScale: ${sizeScale}`,
		);

		// Gunakan nilai default scaling jika parameter di glansControls tidak terskala
		const baseRadius = sizeScale * (glansControls.baseRadius || 0.4);
		const tipRadius = sizeScale * (glansControls.tipRadius || 0.2);
		// The length of the bullet stretches somewhat to avoid looking like a disk
		const bulletLengthScale = Math.max(
			thicknessScale * 3,
			Math.min(tipScale, 1.0),
		);
		const bulletLength = sizeScale * (glansControls.bulletLength || 1.08);
		const taperCurve = glansControls.taperCurve;

		glansGeometry = createBulletGeometry(
			baseRadius,
			tipRadius,
			bulletLengthScale * bulletLength, // Multiply by bulletLengthScale to stretch proportionally!
			taperCurve,
			glansWidthSegments,
			glansControls.bluntness,
			glansControls.constantLength,
			glansControls.tipRoundness,
			glansControls.pillShape,
			glansControls.pillTaper,
			glansControls.pillAsymmetry,
			glansControls.overallRoundness,
			glansControls.cornerSmoothing,
			glansControls.edgeRadius,
		);
	} else {
		// Create sphere shape
		glansGeometry = new THREE.SphereGeometry(
			glansRadius,
			glansWidthSegments,
			glansHeightSegments,
			glansPhiStart,
			glansPhiLength,
			glansThetaStart,
			glansThetaLength,
		);
		addOrganicNoise(glansGeometry, glansNoiseAmplitude);
	}

	// Update material properties
	glans.material.color.setHex(glansControls.color || 0xbda184);
	glans.material.roughness = glansControls.roughness;
	glans.material.metalness = glansControls.metalness;
	glans.material.needsUpdate = true;

	// Update placement and rotation
	glans.position.set(
		glansControls.glansPosX,
		4.5 * positionScale + glansControls.glansPosY, // Use positionScale for consistent positioning
		glansControls.glansPosZ,
	);
	glans.rotation.set(
		-Math.PI / 2 + glansControls.glansRotX,
		glansControls.glansRotY,
		glansControls.glansRotZ,
	);

	// Replace geometry
	if (glans.geometry) {
		glans.geometry.dispose();
	}
	glans.geometry = glansGeometry;
	glans.layers.set(2);

	console.log("Glans shape updated successfully");
}

updateArbre(0.1); // Default scale for 10cm

// Force update all materials to ensure colors are applied and layers are correct
function forceUpdateMaterials() {
	genital.traverse((child) => {
		if (child.isMesh) {
			child.layers.mask = 4; // Absolute Layer 2 Enforcement
			if (child.material) {
				// Update shaft and testicles to dark brown
				if (child.material === skinMaterial || child.name !== "penis_tip") {
					child.material.color.setHex(0xbda184);
					child.material.needsUpdate = true;
				}
				// Update glans to brown
				if (child.name === "penis_tip") {
					child.material.color.setHex(0xbda184);
					child.material.needsUpdate = true;
				}
			}
		}
	});
}

// Apply material updates after a short delay
setTimeout(forceUpdateMaterials, 200);

export {
	genital,
	updateArbre,
	updateGlansShape,
	forceUpdateMaterials,
	skinMaterial,
	glansMaterial,
};
