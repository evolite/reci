import { useState, useEffect } from 'react';
import type { ShoppingListResponse } from '@/lib/api';

export interface SavedShoppingCart {
  id: string;
  createdAt: string;
  recipeIds: string[];
  shoppingList: ShoppingListResponse;
  checkedItems?: string[]; // Array of ingredient keys: "sectionIndex-ingredientIndex"
}

const STORAGE_KEY = 'reci_saved_shopping_cart';

export function useShoppingCart() {
  const [savedCart, setSavedCart] = useState<SavedShoppingCart | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Handle both old array format and new single object format
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedCart(parsed[0]);
        } else if (parsed && !Array.isArray(parsed)) {
          setSavedCart(parsed);
        }
      } catch (error) {
        console.error('Failed to load saved shopping cart:', error);
      }
    }
  }, []);

  const saveShoppingCart = (recipeIds: string[], shoppingList: ShoppingListResponse) => {
    const newCart: SavedShoppingCart = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      recipeIds,
      shoppingList,
    };

    setSavedCart(newCart);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));
  };

  const removeShoppingCart = () => {
    setSavedCart(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateCheckedItems = (checkedItems: string[]) => {
    if (savedCart) {
      const updated = { ...savedCart, checkedItems };
      setSavedCart(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return {
    savedCart,
    saveShoppingCart,
    removeShoppingCart,
    updateCheckedItems,
  };
}
