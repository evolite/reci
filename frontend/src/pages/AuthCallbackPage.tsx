import { useEffect } from 'react';

const TOKEN_KEY = 'reci_auth_token';

/**
 * Landing point after authentik signs the user in.
 *
 * The backend puts the session token in the URL fragment (fragments are never
 * sent to a server or written to access logs). We move it into localStorage and
 * then do a full navigation so AuthContext re-initialises with it.
 */
export function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = params.get('token');

    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      window.location.replace('/');
    } else {
      window.location.replace('/login?error=sso_failed');
    }
  }, []);

  return (
    <div className="min-h-screen bg-brand-page flex items-center justify-center p-4">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  );
}
