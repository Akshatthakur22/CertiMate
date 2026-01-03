"use client";

import dynamic from "next/dynamic";

// Dynamically import the content with ssr: false to skip server-side rendering
// This prevents GoogleOAuthProvider errors during build time
const SendPageContent = dynamic(() => import("./send-content"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>
  ),
});

export default function SendPage() {
  return <SendPageContent />;
}
