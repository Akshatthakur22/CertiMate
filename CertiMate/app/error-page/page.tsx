"use client";

import { useRouter } from "next/navigation";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-background)" }}
    >
      <div
        className="max-w-lg w-full text-center animate-fade-in"
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-2xl)",
          padding: "var(--space-16)",
          boxShadow: "var(--shadow-brand-lg)",
        }}
      >
        {/* Accent line */}
        <div
          className="mx-auto mb-6"
          style={{
            width: "56px",
            height: "4px",
            borderRadius: "var(--radius-full)",
            background: "var(--color-primary)",
          }}
        />

        {/* System label */}
        <p
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-tertiary)",
            marginBottom: "var(--space-2)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Status
        </p>

        {/* Main heading */}
        <h1
          className="animate-scale-in"
          style={{
            fontFamily: "var(--font-family-sans)",
            fontSize: "var(--font-size-3xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-text-primary)",
            lineHeight: "var(--line-height-tight)",
            marginBottom: "var(--space-4)",
          }}
        >
          This is already handled
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--color-text-secondary)",
            lineHeight: "var(--line-height-relaxed)",
            marginBottom: "var(--space-10)",
          }}
        >
          The page you’re looking for no longer exists,
          <br />
          or the certificate has been moved.
          <br />
          You’re in the right place now.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push("/")}
            style={{
              background: "var(--color-primary)",
              color: "#ffffff",
              padding: "0.75rem 1.75rem",
              borderRadius: "var(--radius-lg)",
              fontWeight: "var(--font-weight-medium)",
              boxShadow: "var(--shadow-brand-md)",
              transition: "var(--transition-all)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-brand-lg)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-brand-md)")
            }
          >
            Go to Home
          </button>

          <button
            onClick={() => router.push("/upload")}
            style={{
              background: "transparent",
              color: "var(--color-primary)",
              padding: "0.75rem 1.75rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--color-gray-200)",
              fontWeight: "var(--font-weight-medium)",
              transition: "var(--transition-all)",
            }}
          >
            Upload Template
          </button>
        </div>

        {/* Footer */}
        <p
          style={{
            marginTop: "var(--space-12)",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-tertiary)",
          }}
        >
          Error 404 · CertiMate · Certificate automation
        </p>
      </div>
    </div>
  );
}
