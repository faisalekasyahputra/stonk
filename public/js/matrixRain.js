// Matrix Rain Effect using SVG
class MatrixRain {
	constructor() {
		this.container = null;
		this.drops = [];
		this.isRunning = false;
		this.intensity = 0.5;
		this.dropCount = 0;
		this.maxDrops = 20;
		this.animationId = null;

		// Using pump.webp image for rain drops

		this.init();
	}

	init() {
		console.log("Matrix Rain initializing...");
		// Create container for rain drops
		this.container = document.createElement("div");
		this.container.id = "matrix-rain-container";
		this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10;
            overflow: hidden;
        `;

		document.body.appendChild(this.container);
		console.log("Matrix Rain container added to DOM");

		// Make it available globally for GUI controls
		window.matrixRain = this;
	}

	createDrop() {
		console.log("Creating rain drop...");
		const drop = document.createElement("div");
		drop.style.cssText = `
            position: absolute;
            top: -50px;
            left: ${Math.random() * 100}%;
            width: 32px;
            height: 32px;
            opacity: ${0.2 + Math.random() * 0.8};
            transform: rotate(${Math.random() * 360}deg);
            transition: none;
        `;

		// Use pump.webp image instead of SVG
		drop.innerHTML = `<img src="assets/pump.webp" alt="pump" style="width: 100%; height: 100%; object-fit: contain;">`;

		// Random speed and direction
		const speed = 1 + Math.random() * 3; // 1-4 seconds
		const delay = Math.random() * 2; // 0-2 seconds delay

		drop.style.animation = `matrixRainFall ${speed}s linear ${delay}s infinite`;

		this.container.appendChild(drop);
		this.drops.push(drop);

		// Remove drop after animation completes
		setTimeout(() => {
			if (drop.parentNode) {
				drop.parentNode.removeChild(drop);
			}
			const index = this.drops.indexOf(drop);
			if (index > -1) {
				this.drops.splice(index, 1);
			}
		}, (speed + delay) * 1000);
	}

	start() {
		if (this.isRunning) return;

		this.isRunning = true;
		console.log(
			"Matrix Rain starting with intensity:",
			this.intensity,
			"maxDrops:",
			this.maxDrops
		);

		// Add CSS animation keyframes
		if (!document.getElementById("matrix-rain-styles")) {
			const style = document.createElement("style");
			style.id = "matrix-rain-styles";
			style.textContent = `
                @keyframes matrixRainFall {
                    0% {
                        transform: translateY(-50px) rotate(0deg);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(calc(100vh + 50px)) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
			document.head.appendChild(style);
		}

		// Start creating drops
		this.createDropLoop();
	}

	stop() {
		this.isRunning = false;

		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}

		// Remove all existing drops
		this.drops.forEach((drop) => {
			if (drop.parentNode) {
				drop.parentNode.removeChild(drop);
			}
		});
		this.drops = [];
	}

	createDropLoop() {
		if (!this.isRunning) return;

		// Create new drops based on intensity
		const dropsToCreate = Math.floor(this.intensity * 2); // 0-2 drops per frame

		for (let i = 0; i < dropsToCreate; i++) {
			if (this.drops.length < this.maxDrops) {
				this.createDrop();
			}
		}

		// Schedule next frame
		this.animationId = requestAnimationFrame(() => this.createDropLoop());
	}

	setIntensity(value) {
		this.intensity = Math.max(0, Math.min(1, value));
	}

	destroy() {
		this.stop();
		if (this.container && this.container.parentNode) {
			this.container.parentNode.removeChild(this.container);
		}
		if (window.matrixRain === this) {
			delete window.matrixRain;
		}
	}
}

// Export for use in main.js
export { MatrixRain };
