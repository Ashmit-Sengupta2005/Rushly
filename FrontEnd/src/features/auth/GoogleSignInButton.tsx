import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { env } from '@/config/env';
import { useGoogleLogin } from './useGoogleLogin';

// Minimal typings for the Google Identity Services script we use.
interface GoogleCredentialResponse {
  credential: string; // ID token (JWT)
}
interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

// Load the GIS script once per page, shared by every button instance.
let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisPromise = null; // allow retry on next mount
        reject(new Error('Failed to load Google sign-in'));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

export function GoogleSignInButton({ text = 'signin_with' }: { text?: 'signin_with' | 'signup_with' }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // TanStack's `mutate` is referentially stable, so it is safe as an effect dependency
  const { mutate, isPending } = useGoogleLogin();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  useEffect(() => {
    if (!env.GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: env.GOOGLE_CLIENT_ID,
          callback: ({ credential }) => mutate(credential),
        });
        containerRef.current.replaceChildren(); // re-render on theme change
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: dark ? 'filled_black' : 'outline',
          size: 'large',
          text,
          width: containerRef.current.offsetWidth || 320,
        });
      })
      .catch(() => {
        /* script blocked (ad-blocker / offline) — password login still works */
      });
    return () => {
      cancelled = true;
    };
  }, [mutate, text, dark]);

  if (!env.GOOGLE_CLIENT_ID) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <div
        ref={containerRef}
        className="flex justify-center"
        aria-busy={isPending}
      />
    </div>
  );
}
