import type { ShoppingListResponse } from './Recipe';

// Base interface for common shopping cart fields
interface BaseShoppingCartFields {
  recipeIds: string[];
  shoppingList: ShoppingListResponse;
  checkedItems: string[];
}

// Base interface for cart with metadata
interface BaseShoppingCartMetadata {
  id: string;
  userId: string;
  shareToken: string | null;
}

export interface ShoppingCart extends BaseShoppingCartFields, BaseShoppingCartMetadata {
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingCartRequest extends Pick<BaseShoppingCartFields, 'recipeIds' | 'shoppingList'> {
  checkedItems?: string[];
}

export interface ShoppingCartResponse extends BaseShoppingCartFields, BaseShoppingCartMetadata {
  createdAt: string;
  updatedAt: string;
}

export interface SharedCartResponse extends Pick<BaseShoppingCartFields, 'shoppingList' | 'checkedItems'> {
  ownerName?: string | null;
  shareToken: string;
}

export interface ShareCartResponse {
  shareToken: string;
  shareUrl: string;
}
