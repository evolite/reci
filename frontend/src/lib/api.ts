import { getErrorMessage } from './utils';

// API base URL - use environment variable or relative path
// When running in browser, requests go through nginx proxy, so use relative URLs
// This works on both desktop and mobile devices
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to handle 401 responses (token expired)
function handle401Response() {
  // Clear token and redirect to signup
  localStorage.removeItem('reci_auth_token');
  if (globalThis.location.pathname !== '/signup' && globalThis.location.pathname !== '/login') {
    globalThis.location.href = '/signup';
  }
}

// Helper function to get auth headers
function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const authToken = token || localStorage.getItem('reci_auth_token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}

// Helper function to extract error from response
async function extractErrorFromResponse(response: Response, defaultError: string): Promise<string> {
  const error = await response.json().catch(() => ({ error: defaultError }));
  return error.error || defaultError;
}

// Helper function to handle API responses and check for 401
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    handle401Response();
    const errorMessage = await extractErrorFromResponse(response, 'Unauthorized');
    throw new Error(errorMessage || 'Session expired. Please login again.');
  }
  
  if (!response.ok) {
    const errorMessage = await extractErrorFromResponse(response, 'Request failed');
    throw new Error(errorMessage);
  }
  
  return response.json();
}

// Helper function for simple POST requests without auth (register, login, etc.)
async function postWithoutAuth<T>(url: string, body: unknown, errorMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorMsg = await extractErrorFromResponse(response, errorMessage);
    throw new Error(errorMsg);
  }

  return response.json();
}

// Helper function for PUT requests without auth
async function putWithoutAuth<T>(url: string, body: unknown, errorMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorMsg = await extractErrorFromResponse(response, errorMessage);
    throw new Error(errorMsg);
  }

  return response.json();
}

// Helper function for GET requests without auth
async function getWithoutAuth<T>(url: string, errorMessage: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`);

  if (!response.ok) {
    const errorMsg = await extractErrorFromResponse(response, errorMessage);
    throw new Error(errorMsg);
  }

  return response.json();
}

// Helper function for DELETE requests with auth that need custom error handling
async function deleteWithAuth(url: string, errorMessage: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handle401Response();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const errorMsg = await extractErrorFromResponse(response, errorMessage);
    throw new Error(errorMsg);
  }
}

export interface Recipe {
  id: string;
  videoUrl: string;
  videoPlatform?: string | null;
  thumbnailUrl: string;
  description: string;
  dishName: string;
  cuisineType: string;
  ingredients: string[];
  tags: string[];
  instructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Auth API functions
export interface User {
  id: string;
  email: string;
  name?: string | null;
  isAdmin: boolean;
  emailVerified: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function register(
  email: string,
  password: string,
  name?: string,
  inviteToken?: string
): Promise<AuthResponse> {
  return postWithoutAuth<AuthResponse>('/api/auth/register', { email, password, name, inviteToken }, 'Failed to register');
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return postWithoutAuth<AuthResponse>('/api/auth/login', { email, password }, 'Failed to login');
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('reci_auth_token');
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(token),
      });
    } catch (error) {
      // Ignore errors on logout - user is already logged out
      console.debug('Logout error (ignored):', getErrorMessage(error));
    }
  }
}

export async function getCurrentUser(token?: string | null): Promise<{ user: User }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    headers: getAuthHeaders(token),
  });

  return handleApiResponse<{ user: User }>(response);
}

export async function verifyEmail(token: string): Promise<void> {
  await postWithoutAuth<void>('/api/auth/verify-email', { token }, 'Failed to verify email');
}

export async function forgotPassword(email: string): Promise<void> {
  await postWithoutAuth<void>('/api/auth/forgot-password', { email }, 'Failed to request password reset');
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await postWithoutAuth<void>('/api/auth/reset-password', { token, newPassword }, 'Failed to reset password');
}

export async function checkInvite(token: string): Promise<{ valid: boolean; email?: string; expiresAt?: Date }> {
  return getWithoutAuth<{ valid: boolean; email?: string; expiresAt?: Date }>(`/api/auth/check-invite/${token}`, 'Invalid invite token');
}

// Waitlist API functions
export async function joinWaitlist(email: string): Promise<{ email: string; position: number; message: string }> {
  return postWithoutAuth<{ email: string; position: number; message: string }>('/api/waitlist', { email }, 'Failed to join waitlist');
}

export async function getWaitlistPosition(email: string): Promise<{ email: string; position: number; total: number }> {
  return getWithoutAuth<{ email: string; position: number; total: number }>(`/api/waitlist/position/${encodeURIComponent(email)}`, 'Failed to get waitlist position');
}

export async function getWaitlistStats(): Promise<{ total: number }> {
  return getWithoutAuth<{ total: number }>('/api/waitlist/stats', 'Failed to get waitlist statistics');
}

// Invite API functions (admin only)
export interface Invite {
  id: string;
  token: string;
  email?: string | null;
  used: boolean;
  usedAt?: string | null;
  expiresAt?: string | null;
  expired: boolean;
  createdAt: string;
  createdBy: {
    email: string;
    name?: string | null;
  };
  usedBy?: {
    email: string;
    name?: string | null;
  } | null;
}

export interface InviteStats {
  total: number;
  used: number;
  unused: number;
  expired: number;
}

export async function createInvite(email?: string, expiresInDays?: number): Promise<{ invite: Invite }> {
  const response = await fetch(`${API_BASE_URL}/api/invites`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email, expiresInDays }),
  });

  return handleApiResponse<{ invite: Invite }>(response);
}

export async function getInvites(): Promise<{ invites: Invite[] }> {
  const response = await fetch(`${API_BASE_URL}/api/invites`, {
    headers: getAuthHeaders(),
  });

  return handleApiResponse<{ invites: Invite[] }>(response);
}

export async function deleteInvite(inviteId: string): Promise<void> {
  return deleteWithAuth(`/api/invites/${inviteId}`, 'Failed to delete invite');
}

export async function getInviteStats(): Promise<{ stats: InviteStats }> {
  const response = await fetch(`${API_BASE_URL}/api/invites/stats`, {
    headers: getAuthHeaders(),
  });

  return handleApiResponse<{ stats: InviteStats }>(response);
}

// Recipe API functions (updated to include auth)
export async function addRecipe(videoUrl: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ videoUrl }),
  });

  return handleApiResponse<Recipe>(response);
}

export async function getRecipes(): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE_URL}/api/recipes`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse<Recipe[]>(response);
}

export async function getRecipe(id: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse<Recipe>(response);
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/search?q=${encodeURIComponent(query)}`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse<Recipe[]>(response);
}

export async function getRandomRecipe(): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/random`, {
    headers: getAuthHeaders(),
  });
  return handleApiResponse<Recipe>(response);
}

export async function updateRecipeTags(recipeId: string, tags: string[]): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/tags`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ tags }),
  });

  return handleApiResponse<Recipe>(response);
}

export async function updateRecipe(recipeId: string, updates: Partial<Recipe>): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  return handleApiResponse<Recipe>(response);
}

export async function deleteRecipe(recipeId: string): Promise<void> {
  return deleteWithAuth(`/api/recipes/${recipeId}`, 'Failed to delete recipe');
}

export async function rescrapeRecipe(recipeId: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/rescrape`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<Recipe>(response);
}

export async function analyzeRecipeVision(recipeId: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/analyze-vision`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<Recipe>(response);
}

export async function rescrapeAndAnalyzeRecipe(recipeId: string): Promise<Recipe> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}/rescrape-and-analyze`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<Recipe>(response);
}

// Shopping List API functions
export interface ShoppingListSection {
  name: string;
  ingredients: string[];
}

export interface ShoppingListResponse {
  sections: ShoppingListSection[];
  missingRecipes: Array<{
    id: string;
    dishName: string;
  }>;
  totalRecipes: number;
  recipesWithIngredients: number;
}

export async function generateShoppingList(recipeIds: string[]): Promise<ShoppingListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/recipes/shopping-list`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipeIds }),
  });

  return handleApiResponse<ShoppingListResponse>(response);
}

// Shopping Cart API functions
export interface ShoppingCartRequest {
  recipeIds: string[];
  shoppingList: ShoppingListResponse;
  checkedItems?: string[];
}

export interface ShoppingCartResponse {
  id: string;
  userId: string;
  recipeIds: string[];
  shoppingList: ShoppingListResponse;
  checkedItems: string[];
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedCartResponse {
  shoppingList: ShoppingListResponse;
  checkedItems: string[];
  ownerName?: string | null;
  shareToken: string;
}

export interface ShareCartResponse {
  shareToken: string;
  shareUrl: string;
}

export async function getShoppingCart(): Promise<ShoppingCartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/cart`, {
    headers: getAuthHeaders(),
  });

  return handleApiResponse<ShoppingCartResponse>(response);
}

export async function saveShoppingCart(cart: ShoppingCartRequest): Promise<ShoppingCartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/cart`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(cart),
  });

  return handleApiResponse<ShoppingCartResponse>(response);
}

export async function deleteShoppingCart(): Promise<void> {
  return deleteWithAuth('/api/cart', 'Failed to delete shopping cart');
}

export async function getSharedCart(shareToken: string): Promise<SharedCartResponse> {
  return getWithoutAuth<SharedCartResponse>(`/api/cart/shared/${shareToken}`, 'Failed to fetch shared cart');
}

export async function updateSharedCart(shareToken: string, checkedItems: string[]): Promise<void> {
  await putWithoutAuth<void>(`/api/cart/shared/${shareToken}`, { checkedItems }, 'Failed to update shared cart');
}

export async function shareShoppingCart(): Promise<ShareCartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/cart/share`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<ShareCartResponse>(response);
}

export async function unshareShoppingCart(): Promise<void> {
  return deleteWithAuth('/api/cart/share', 'Failed to unshare shopping cart');
}

// Settings API
export async function getSettings(): Promise<Record<string, string>> {
  const response = await fetch(`${API_BASE_URL}/api/settings`, {
    headers: getAuthHeaders(),
  });

  return handleApiResponse<Record<string, string>>(response);
}

export async function getSetting(key: string): Promise<{ key: string; value: string; description?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/settings/${key}`, {
    headers: getAuthHeaders(),
  });

  return handleApiResponse<{ key: string; value: string; description?: string }>(response);
}

export async function updateSetting(key: string, value: string, description?: string): Promise<{ key: string; value: string; description?: string }> {
  const response = await fetch(`${API_BASE_URL}/api/settings/${key}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ value, description }),
  });

  return handleApiResponse<{ key: string; value: string; description?: string }>(response);
}
