import "./globals.css";

export const metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_SITE_URL ||
			(process.env.VERCEL_URL
				? `https://${process.env.VERCEL_URL}`
				: "http://localhost:3000"),
	),
	title: "Stonk",
	description:
		"Meet STONK whose penis size changes based on token market cap! Watch it grow and shrink in real-time.",
	openGraph: {
		title: "Stonk",
		description:
			"Meet STONK whose penis size changes based on token market cap! Watch it grow and shrink in real-time.",
		images: [
			{
				url: "/assets/og-stonk-market.png",
				width: 1200,
				height: 630,
				alt: "STONK market banner",
			},
		],
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Stonk",
		description:
			"Meet STONK whose penis size changes based on token market cap! Watch it grow and shrink in real-time.",
		images: ["/assets/og-stonk-market.png"],
	},
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<head>
				<link rel="icon" href="/assets/favico/favicon.ico" sizes="any" />
				<link
					rel="icon"
					href="/assets/favico/favicon-16x16.png"
					type="image/png"
					sizes="16x16"
				/>
				<link
					rel="icon"
					href="/assets/favico/favicon-32x32.png"
					type="image/png"
					sizes="32x32"
				/>
				<link
					rel="apple-touch-icon"
					href="/assets/favico/apple-touch-icon.png"
				/>
				<link rel="manifest" href="/assets/favico/site.webmanifest" />

				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin=""
				/>
				<link
					href="https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,100..900;1,100..900&display=swap"
					rel="stylesheet"
				/>
				<link
					href="https://fonts.googleapis.com/icon?family=Material+Icons"
					rel="stylesheet"
				/>
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
				/>
			</head>
			<body>{children}</body>
		</html>
	);
}
