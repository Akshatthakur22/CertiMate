import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import "../styles/theme.css";
import { Toaster } from "sonner";
import { GoogleOAuthProviderWrapper } from "@/components/providers/google-oauth";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "CertiMate - AI-Powered Certificate Generation",
    template: "%s | CertiMate",
  },
  description:
    "Generate beautiful, professional certificates in minutes with AI-powered placement. Bulk certificate generation from CSV with Canva integration.",
  keywords: [
    "certificate generator",
    "bulk certificates",
    "AI certificate",
    "certificate automation",
    "digital certificates",
    "certificate design",
    "CSV certificate generation",
  ],
  authors: [{ name: "CertiMate" }],
  creator: "CertiMate",
  publisher: "CertiMate",
  metadataBase: new URL("https://certimate.app"), // Update with your domain
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://certimate.app", // Update with your domain
    siteName: "CertiMate",
    title: "CertiMate - AI-Powered Certificate Generation",
    description:
      "Generate beautiful, professional certificates in minutes with AI-powered placement.",
    images: [
      {
        url: "/og-image.png", // Add your OG image
        width: 1200,
        height: 630,
        alt: "CertiMate Certificate Generation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CertiMate - AI-Powered Certificate Generation",
    description:
      "Generate beautiful, professional certificates in minutes with AI-powered placement.",
    images: ["/og-image.png"], // Add your OG image
    creator: "@certimate", // Update with your Twitter handle
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} font-sans antialiased`}
      >
        <GoogleOAuthProviderWrapper>
          {children}
          <Toaster position="top-right" />
        </GoogleOAuthProviderWrapper>
      </body>
    </html>
  );
}
