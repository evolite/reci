import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Redirects to authentik. Renders nothing until the backend confirms SSO is
 * configured, so the button never appears when it would just 404.
 */
export function AuthentikSignInButton({ className }: { readonly className?: string }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE_URL}/api/auth/config`)
      .then((res) => (res.ok ? res.json() : { oidcEnabled: false }))
      .then((data) => {
        if (active) setEnabled(Boolean(data.oidcEnabled));
      })
      .catch(() => {
        if (active) setEnabled(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <Button
      type="button"
      size="lg"
      className={className}
      onClick={() => {
        window.location.href = `${API_BASE_URL}/api/auth/oidc/login`;
      }}
    >
      <LogIn className="mr-2 h-4 w-4" />
      Sign in
    </Button>
  );
}
