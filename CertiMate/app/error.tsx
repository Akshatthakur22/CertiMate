"use client";

import { useEffect } from "react";
import { BrandButton } from "@/components/ui/brand-button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-red-600">Oops!</h1>
          <h2 className="text-xl font-semibold">Something went wrong</h2>
        </div>
        
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
          <p className="text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
            {error.message || "An unexpected error occurred"}
          </p>
        </div>

        <div className="space-y-3">
          <BrandButton
            onClick={reset}
            className="w-full"
          >
            Try Again
          </BrandButton>
          
          <BrandButton
            onClick={() => (window.location.href = "/")}
            variant="outline"
            className="w-full"
          >
            Go Home
          </BrandButton>
        </div>

        <p className="text-sm text-gray-500">
          If this problem persists, please check the browser console for more details.
        </p>
      </div>
    </div>
  );
}
