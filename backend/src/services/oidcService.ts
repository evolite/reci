import crypto from 'node:crypto';

/**
 * OpenID Connect (authorization code + PKCE) against authentik.
 *
 * Tokens are exchanged server-to-server over TLS with client authentication,
 * and identity is read from the userinfo endpoint, so no local JWT signature
 * verification is required.
 */

export interface OidcUserInfo {
  sub: string;
  email: string;
  name: string | null;
}

interface OidcDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  end_session_endpoint?: string;
}

const DISCOVERY_TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;

let cachedDiscovery: { value: OidcDiscovery; fetchedAt: number } | null = null;

export function isOidcEnabled(): boolean {
  return Boolean(
    process.env.AUTHENTIK_ISSUER &&
    process.env.AUTHENTIK_CLIENT_ID &&
    process.env.AUTHENTIK_CLIENT_SECRET
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/** Where authentik sends the browser back to. Must match the provider config. */
export function getRedirectUri(): string {
  const base = (process.env.APP_URL || 'http://localhost:4001').replace(/\/+$/, '');
  return `${base}/api/auth/oidc/callback`;
}

async function discover(): Promise<OidcDiscovery> {
  if (cachedDiscovery && Date.now() - cachedDiscovery.fetchedAt < DISCOVERY_TTL_MS) {
    return cachedDiscovery.value;
  }

  const issuer = requireEnv('AUTHENTIK_ISSUER').replace(/\/+$/, '');
  const response = await fetch(`${issuer}/.well-known/openid-configuration`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`OIDC discovery failed: ${response.status}`);
  }

  const value = (await response.json()) as OidcDiscovery;
  cachedDiscovery = { value, fetchedAt: Date.now() };
  return value;
}

/** PKCE pair: the verifier stays with us, the challenge goes to authentik. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function createState(): string {
  return crypto.randomBytes(16).toString('base64url');
}

export async function buildAuthorizationUrl(state: string, codeChallenge: string): Promise<string> {
  const { authorization_endpoint } = await discover();
  const params = new URLSearchParams({
    client_id: requireEnv('AUTHENTIK_CLIENT_ID'),
    response_type: 'code',
    scope: 'openid email profile',
    redirect_uri: getRedirectUri(),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${authorization_endpoint}?${params.toString()}`;
}

async function exchangeCode(code: string, codeVerifier: string): Promise<string> {
  const { token_endpoint } = await discover();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: requireEnv('AUTHENTIK_CLIENT_ID'),
    client_secret: requireEnv('AUTHENTIK_CLIENT_SECRET'),
    code_verifier: codeVerifier,
  });

  const response = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const tokens = (await response.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new Error('Token response contained no access_token');
  }
  return tokens.access_token;
}

async function fetchUserInfo(accessToken: string): Promise<OidcUserInfo> {
  const { userinfo_endpoint } = await discover();

  const response = await fetch(userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Userinfo request failed: ${response.status}`);
  }

  const info = (await response.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    preferred_username?: string;
  };

  if (!info.sub || !info.email) {
    throw new Error('Userinfo response missing sub or email');
  }

  return {
    // Normalised by the caller with normalizeEmail(), the same helper local
    // registration uses, so an authentik identity matches an existing local
    // account with the same address.
    sub: info.sub,
    email: info.email,
    name: info.name || info.preferred_username || null,
  };
}

/** Complete the callback: code -> access token -> identity. */
export async function completeAuthorization(code: string, codeVerifier: string): Promise<OidcUserInfo> {
  const accessToken = await exchangeCode(code, codeVerifier);
  return fetchUserInfo(accessToken);
}
