"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ReactNode } from "react";

export function GoogleOAuthProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  // If no client ID is configured, render children without OAuth provider
  if (!clientId) {
    console.warn("⚠️ NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured. Google OAuth will not work.");
    // Return a dummy wrapper to prevent hydration issues
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}

