"use client";

import { useEffect, useState } from "react";
import SendPageContent from "./send-content";

export default function SendPageWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return <SendPageContent />;
}
