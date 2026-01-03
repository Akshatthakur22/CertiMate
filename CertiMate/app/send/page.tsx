"use client";

import dynamic from "next/dynamic";

// Dynamically import the wrapper that will mount the component only on client
// This ensures GoogleOAuthProvider is available
const SendPageWrapper = dynamic(() => import("./send-wrapper"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">Loading page...</div>
    </div>
  ),
});

export default function SendPage() {
  return <SendPageWrapper />;
}
