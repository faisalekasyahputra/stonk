import "./globals.css";
import { headers } from "next/headers";

const metadata = {
	metadataBase: new URL(
		process.env.NEXT_PUBLIC_SITE_URL ||
			(process.env.VERCEL_PROJECT_PRODUCTION_URL
				? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
				: process.env.VERCEL_URL
					? `https://${process.env.VERCEL_URL}`
					: "http://localhost:3000"),
	),
	title: "STONK",
	description:
		"A STONK now paired with $STONK",
	openGraph: {
		title: "STONK",
		description:
			"A STONK now paired with $STONK",
		images: [
			{
				url: "/assets/og-stonk-rooftop.png",
				width: 1500,
				height: 500,
				alt: "STONK sitting on a rooftop overlooking the city at sunset",
			},
		],
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "STONK",
		description:
			"A STONK now paired with $STONK",
		images: ["/assets/og-stonk-rooftop.png"],
	},
};

export async function generateMetadata() {
	const requestHeaders = await headers();
	const host = requestHeaders.get("host");
	const protocol = requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
	let metadataBase = metadata.metadataBase;
	if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
		metadataBase = new URL(`${protocol}://${host}`);
	}
	return { ...metadata, metadataBase };
}

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
				<link rel="manifest" href="/assets/favico/site.webmanifest?v=20260923-stonk" />

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
