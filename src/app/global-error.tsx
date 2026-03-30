'use client';

/**
 * Root error boundary — catches errors in the root layout itself.
 * Must render its own <html> and <body> since the layout may have failed.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d0f1a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#ffffff',
      }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#9ca3af', marginBottom: '2rem', lineHeight: 1.6 }}>
            A critical error occurred. Please reload the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              fontWeight: 500,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}
