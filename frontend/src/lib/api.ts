// API base URL - use environment variable or relative path
// When running in browser, requests go through nginx proxy, so use relative URLs
// This works on both desktop and mobile devices
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Helper function to handle 401 responses (token expired)
function handle401Response() {
  // Clear token and redirect to signup
  localStorage.removeItem('reci_auth_token');
  if (window.location.pathname !== '/signup' && window.location.pathname !== '/login') {
    window.location.href = '/signup';
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

// Helper function to handle API responses and check for 401
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    handle401Response();
    const error = await response.json().catch(() => ({ error: 'Unauthorized' }));
    throw new Error(error.error || 'Session expired. Please login again.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
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
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name, inviteToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to register');
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to login');
  }

  return response.json();
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
      // Ignore errors on logout
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
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify email');
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request password reset');
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reset password');
  }
}

export async function checkInvite(token: string): Promise<{ valid: boolean; email?: string; expiresAt?: Date }> {
  const response = await fetch(`${API_BASE_URL}/api/auth/check-invite/${token}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Invalid invite token');
  }

  return response.json();
}

// Waitlist API functions
export async function joinWaitlist(email: string): Promise<{ email: string; position: number; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join waitlist');
  }

  return response.json();
}

export async function getWaitlistPosition(email: string): Promise<{ email: string; position: number; total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/waitlist/position/${encodeURIComponent(email)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get waitlist position');
  }

  return response.json();
}

export async function getWaitlistStats(): Promise<{ total: number }> {
  const response = await fetch(`${API_BASE_URL}/api/waitlist/stats`);

  if (!response.ok) {
    throw new Error('Failed to get waitlist statistics');
  }

  return response.json();
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
  const response = await fetch(`${API_BASE_URL}/api/invites/${inviteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handle401Response();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete invite' }));
    throw new Error(error.error || 'Failed to delete invite');
  }
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
  const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handle401Response();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete recipe' }));
    throw new Error(error.error || 'Failed to delete recipe');
  }
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
  const response = await fetch(`${API_BASE_URL}/api/cart`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handle401Response();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete shopping cart' }));
    throw new Error(error.error || 'Failed to delete shopping cart');
  }
}

export async function getSharedCart(shareToken: string): Promise<SharedCartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/cart/shared/${shareToken}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch shared cart' }));
    throw new Error(error.error || 'Failed to fetch shared cart');
  }

  return response.json();
}

export async function updateSharedCart(shareToken: string, checkedItems: string[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/cart/shared/${shareToken}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ checkedItems }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update shared cart' }));
    throw new Error(error.error || 'Failed to update shared cart');
  }
}

export async function shareShoppingCart(): Promise<ShareCartResponse> {
  const response = await fetch(`${API_BASE_URL}/api/cart/share`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  return handleApiResponse<ShareCartResponse>(response);
}

export async function unshareShoppingCart(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/cart/share`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    handle401Response();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to unshare shopping cart' }));
    throw new Error(error.error || 'Failed to unshare shopping cart');
  }
}
