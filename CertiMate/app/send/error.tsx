"use client";

import { useEffect } from "react";
import { BrandButton } from "@/components/ui/brand-button";

export default function SendError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Send page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-lg w-full space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
        <div className="space-y-2 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Page Error</h1>
          <p className="text-gray-600 dark:text-gray-400">
            There was a problem loading this page
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm font-mono text-red-800 dark:text-red-300 break-words">
            {error.message || "Unknown error occurred"}
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
            onClick={() => (window.location.href = "/generate")}
            variant="outline"
            className="w-full"
          >
            Go to Generate Page
          </BrandButton>
        </div>

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>Possible causes:</p>
          <ul className="list-disc list-inside text-left">
            <li>Missing Google OAuth configuration</li>
            <li>Browser compatibility issue</li>
            <li>Network connection problem</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
