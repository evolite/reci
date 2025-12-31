import type { ShoppingListResponse } from './Recipe';

export interface ShoppingCart {
  id: string;
  userId: string;
  recipeIds: string[];
  shoppingList: ShoppingListResponse;
  checkedItems: string[];
  shareToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
