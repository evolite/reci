import { useState, useEffect } from 'react';
import { getShoppingCart, saveShoppingCart as saveCartAPI, deleteShoppingCart as deleteCartAPI, shareShoppingCart as shareCartAPI, unshareShoppingCart as unshareCartAPI, type ShoppingCartRequest } from '@/lib/api';
import type { ShoppingListResponse } from '@/lib/api';

export interface SavedShoppingCart {
  id: string;
  createdAt: string;
  recipeIds: string[];
  shoppingList: ShoppingListResponse;
  checkedItems: string[];
  shareToken: string | null;
}

export function useShoppingCart() {
  const [savedCart, setSavedCart] = useState<SavedShoppingCart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load cart from API on mount
    const loadCart = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const cart = await getShoppingCart();
        setSavedCart({
          id: cart.id,
          createdAt: cart.createdAt,
          recipeIds: cart.recipeIds,
          shoppingList: cart.shoppingList,
          checkedItems: cart.checkedItems,
          shareToken: cart.shareToken,
        });
      } catch (err) {
        // Cart not found is expected if user hasn't created one yet
        if (err instanceof Error && err.message.includes('not found')) {
          setSavedCart(null);
        } else {
          console.error('Failed to load shopping cart:', err);
          setError(err instanceof Error ? err.message : 'Failed to load shopping cart');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, []);

  const saveShoppingCart = async (recipeIds: string[], shoppingList: ShoppingListResponse, checkedItems?: string[]) => {
    try {
      const cartRequest: ShoppingCartRequest = {
        recipeIds,
        shoppingList,
        checkedItems: checkedItems || [],
      };

      const cart = await saveCartAPI(cartRequest);
      setSavedCart({
        id: cart.id,
        createdAt: cart.createdAt,
        recipeIds: cart.recipeIds,
        shoppingList: cart.shoppingList,
        checkedItems: cart.checkedItems,
        shareToken: cart.shareToken,
      });
    } catch (err) {
      console.error('Failed to save shopping cart:', err);
      throw err;
    }
  };

  const removeShoppingCart = async () => {
    try {
      await deleteCartAPI();
      setSavedCart(null);
    } catch (err) {
      console.error('Failed to delete shopping cart:', err);
      throw err;
    }
  };

  const updateCheckedItems = async (checkedItems: string[]) => {
    if (!savedCart) {
      throw new Error('No shopping cart to update');
    }

    try {
      const cartRequest: ShoppingCartRequest = {
        recipeIds: savedCart.recipeIds,
        shoppingList: savedCart.shoppingList,
        checkedItems,
      };

      const cart = await saveCartAPI(cartRequest);
      setSavedCart({
        id: cart.id,
        createdAt: cart.createdAt,
        recipeIds: cart.recipeIds,
        shoppingList: cart.shoppingList,
        checkedItems: cart.checkedItems,
        shareToken: cart.shareToken,
      });
    } catch (err) {
      console.error('Failed to update checked items:', err);
      throw err;
    }
  };

  const shareCart = async () => {
    try {
      const result = await shareCartAPI();
      if (savedCart) {
        setSavedCart({
          ...savedCart,
          shareToken: result.shareToken,
        });
      }
      return result;
    } catch (err) {
      console.error('Failed to share shopping cart:', err);
      throw err;
    }
  };

  const unshareCart = async () => {
    try {
      await unshareCartAPI();
      if (savedCart) {
        setSavedCart({
          ...savedCart,
          shareToken: null,
        });
      }
    } catch (err) {
      console.error('Failed to unshare shopping cart:', err);
      throw err;
    }
  };

  return {
    savedCart,
    isLoading,
    error,
    saveShoppingCart,
    removeShoppingCart,
    updateCheckedItems,
    shareCart,
    unshareCart,
  };
}
