"use client";

import { useProjectConfig } from "../lib/useProjectConfig";

export default function SocialLinks() {
	const { config, loading } = useProjectConfig();

	if (loading) return null;
	if (!config) return null;

	const getBuyUrl = () => {
		const platform = (config.buy_platform || "pumpfun").toLowerCase();

		if (platform.includes("pump")) {
			return config.contract_address
				? `https://pump.fun/coin/${config.contract_address}`
				: "https://pump.fun/board";
		} else if (platform.includes("jup")) {
			return config.contract_address
				? `https://jup.ag/swap/SOL-${config.contract_address}`
				: "https://jup.ag";
		}

		return platform; // If it's a custom URL
	};

	const buyUrl = getBuyUrl();
	const twitterUrl = config.twitter_url || null;
	const telegramUrl = config.community_url || null; // Mapping community_url to Telegram as per common pattern or user snippet
	const chartUrl = config.dexscreener_url || null;

	return (
		<div id="social-links" className="flex gap-4">
			{twitterUrl && (
				<a
					href={twitterUrl}
					className="neo-button social-button"
					target="_blank"
					rel="noopener noreferrer">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="white">
						<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
					</svg>
				</a>
			)}
			{telegramUrl && (
				<a
					href={telegramUrl}
					className="neo-button social-button"
					target="_blank"
					rel="noopener noreferrer">
					<svg
						width="24"
						height="24"
						viewBox="0 0 200 200"
						fill="none"
						xmlns="http://www.w3.org/2000/svg">
						<path
							opacity="0.991"
							fillRule="evenodd"
							clipRule="evenodd"
							d="M43.5021 29.4991C65.4655 27.6982 75.9655 37.6982 75.0021 59.4991C71.7901 72.2093 63.6234 78.876 50.5021 79.4991C29.7982 76.6096 21.9648 64.943 27.0021 44.4991C30.1922 36.8419 35.6922 31.8419 43.5021 29.4991Z"
							fill="white"
						/>
						<path
							opacity="0.992"
							fillRule="evenodd"
							clipRule="evenodd"
							d="M144.503 29.4996C170.537 28.8969 180.37 41.2302 174.003 66.4996C164.015 80.1206 151.515 82.9539 136.503 74.9996C125.843 65.1712 123.677 53.6712 130.003 40.4996C133.86 35.4674 138.693 31.8007 144.503 29.4996Z"
							fill="white"
						/>
						<path
							opacity="0.993"
							fillRule="evenodd"
							clipRule="evenodd"
							d="M95.5012 48.4998C113.389 47.5965 123.723 55.9299 126.501 73.4998C123.864 92.8263 112.864 100.993 93.5012 97.9998C76.5653 90.2812 71.732 77.7812 79.0012 60.4998C83.2346 54.6447 88.7346 50.6447 95.5012 48.4998Z"
							fill="white"
						/>
						<path
							opacity="0.990"
							fillRule="evenodd"
							clipRule="evenodd"
							d="M138.5 83.5003C166.228 82.064 183.728 94.7307 191 121.5C193.315 130.69 194.482 140.024 194.5 149.5C183.5 149.5 172.5 149.5 161.5 149.5C158.179 128.501 148.012 111.835 131 99.5003C131.621 93.2596 134.121 87.9262 138.5 83.5003Z"
							fill="white"
						/>
						<path
							opacity="0.994"
							fillRule="evenodd"
							clipRule="evenodd"
							d="M49.5016 83.4992C54.9318 83.1602 60.2652 83.6602 65.5016 84.9992C67.9051 88.9729 69.9051 93.1396 71.5016 97.4992C71.4728 99.0285 70.8061 100.195 69.5016 100.999C53.3496 113.113 43.683 129.279 40.5016 149.499C29.5016 149.499 18.5016 149.499 7.50157 149.499C6.68212 129.753 12.1822 112.086 24.0016 96.4992C31.4289 89.8696 39.9289 85.5362 49.5016 83.4992Z"
							fill="white"
						/>
						<path
							opacity="0.996"
							fillRule="evenodd"
							clipRule="evenodd"
							d="M97.4982 102.501C113.722 101.864 126.888 107.864 136.998 120.501C148.015 136.059 152.848 153.392 151.498 172.501C117.831 172.501 84.1649 172.501 50.4982 172.501C49.2298 153.904 53.7298 136.904 63.9982 121.501C72.5671 110.307 83.7338 103.974 97.4982 102.501Z"
							fill="white"
						/>
					</svg>
				</a>
			)}
			{buyUrl && (
				<a
					href={buyUrl}
					className="neo-button social-button"
					id="buy-link"
					target="_blank"
					rel="noopener noreferrer">
					<img src="assets/pump.webp" alt="Buy" />
					<span>BUY</span>
				</a>
			)}
		</div>
	);
}
