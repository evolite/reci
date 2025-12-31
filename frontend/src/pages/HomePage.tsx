import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/SearchBar';
import { RandomButton } from '@/components/RandomButton';
import { AddRecipeForm } from '@/components/AddRecipeForm';
import { RecipeGrid } from '@/components/RecipeGrid';
import { ShoppingCartDialog } from '@/components/ShoppingCartDialog';
import { ShoppingCartDropdown } from '@/components/ShoppingCartDropdown';
import { useRecipes, useSearchRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/contexts/AuthContext';
import { useShoppingCart, type SavedShoppingCart } from '@/hooks/useShoppingCart';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChefHat, LogOut, Shield, ShoppingCart } from 'lucide-react';

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set());
  const [showShoppingCartDialog, setShowShoppingCartDialog] = useState(false);
  const [currentShoppingCart, setCurrentShoppingCart] = useState<SavedShoppingCart | null>(null);
  const [showNewCartDialog, setShowNewCartDialog] = useState(false);
  const [pendingRecipeIds, setPendingRecipeIds] = useState<string[]>([]);
  const { data: allRecipes = [], isLoading: isLoadingAll } = useRecipes();
  const { data: searchResults = [], isLoading: isLoadingSearch } = useSearchRecipes(searchQuery);
  const { user, logout } = useAuth();
  const { savedCart, saveShoppingCart, removeShoppingCart } = useShoppingCart();
  const navigate = useNavigate();

  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipes(prev => new Set(prev).add(recipeId));
  };

  const handleRecipeDeselect = (recipeId: string) => {
    setSelectedRecipes(prev => {
      const next = new Set(prev);
      next.delete(recipeId);
      return next;
    });
  };

  const recipes = searchQuery.trim() ? searchResults : allRecipes;
  const isLoading = searchQuery.trim() ? isLoadingSearch : isLoadingAll;

  const handleLogout = () => {
    logout();
    navigate('/signup');
  };

  const handleCreateShoppingCart = () => {
    const newRecipeIds = Array.from(selectedRecipes);
    const existingCart = currentShoppingCart || savedCart;
    
    // Check if there's an existing cart with different recipes
    if (existingCart) {
      const existingRecipeIds = existingCart.recipeIds;
      const recipeIdsMatch = newRecipeIds.length === existingRecipeIds.length &&
        newRecipeIds.every(id => existingRecipeIds.includes(id)) &&
        existingRecipeIds.every(id => newRecipeIds.includes(id));
      
      if (!recipeIdsMatch) {
        // Recipes are different, ask for confirmation
        setPendingRecipeIds(newRecipeIds);
        setShowNewCartDialog(true);
        return;
      }
    }
    
    // No existing cart or recipes match, proceed normally
    setShowShoppingCartDialog(true);
  };

  const handleConfirmNewCart = async () => {
    // Remove existing cart
    if (savedCart) {
      await removeShoppingCart();
    }
    setCurrentShoppingCart(null);
    setShowNewCartDialog(false);
    // Now open the dialog with new recipes
    setShowShoppingCartDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-7xl">
        {/* Header with Branding */}
        <header className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 sm:p-3 rounded-xl shadow-lg">
                <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Reci
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground -mt-1">
                  Recipe Video Manager
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <>
                  <ShoppingCartDropdown
                    onSelectCart={(cart) => {
                      setCurrentShoppingCart(cart);
                      setShowShoppingCartDialog(true);
                    }}
                  />
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{user.name || user.email}</p>
                    {user.isAdmin && (
                      <p className="text-xs text-muted-foreground">Admin</p>
                    )}
                  </div>
                  {user.isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/admin/settings')}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground ml-0 sm:ml-16">
            Discover and organize your favorite recipe videos
          </p>
        </header>

        {/* Add Recipe Form */}
        <div className="mb-4 sm:mb-6">
          <AddRecipeForm />
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="flex gap-2">
            {selectedRecipes.size > 0 && (
              <Button
                onClick={handleCreateShoppingCart}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Shopping Cart ({selectedRecipes.size})
              </Button>
            )}
            <RandomButton />
          </div>
        </div>

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="text-center py-12 sm:py-16 text-muted-foreground">
            <Spinner className="h-8 w-8 sm:h-12 sm:w-12 text-orange-600 mb-4 mx-auto" />
            <p className="text-sm sm:text-base">Loading recipes...</p>
          </div>
        ) : (
          <RecipeGrid 
            recipes={recipes} 
            selectedRecipes={selectedRecipes}
            onRecipeSelect={handleRecipeSelect}
            onRecipeDeselect={handleRecipeDeselect}
          />
        )}

        {/* New Cart Confirmation Dialog */}
        <AlertDialog open={showNewCartDialog} onOpenChange={setShowNewCartDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start New Shopping List?</AlertDialogTitle>
              <AlertDialogDescription>
                You already have a shopping list saved. Starting a new one will replace your current shopping list. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowNewCartDialog(false);
                // Show existing cart instead
                if (savedCart) {
                  setCurrentShoppingCart(savedCart);
                  setShowShoppingCartDialog(true);
                }
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmNewCart}>
                Start New List
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Shopping Cart Dialog */}
        <ShoppingCartDialog
          open={showShoppingCartDialog}
          onOpenChange={setShowShoppingCartDialog}
          recipeIds={currentShoppingCart ? currentShoppingCart.recipeIds : (pendingRecipeIds.length > 0 ? pendingRecipeIds : Array.from(selectedRecipes))}
          onClose={() => {
            setShowShoppingCartDialog(false);
            setSelectedRecipes(new Set());
            setCurrentShoppingCart(null);
            setPendingRecipeIds([]);
          }}
          onSave={async (recipeIds, shoppingList) => {
            await saveShoppingCart(recipeIds, shoppingList);
            setPendingRecipeIds([]);
          }}
          isSaved={currentShoppingCart !== null || (savedCart !== null && pendingRecipeIds.length === 0)}
          currentShoppingCart={currentShoppingCart ? { 
            id: currentShoppingCart.id, 
            recipeIds: currentShoppingCart.recipeIds, 
            shoppingList: currentShoppingCart.shoppingList, 
            checkedItems: currentShoppingCart.checkedItems,
            shareToken: currentShoppingCart.shareToken
          } : null}
          savedCartFromHook={savedCart && pendingRecipeIds.length === 0 ? {
            id: savedCart.id,
            recipeIds: savedCart.recipeIds,
            shoppingList: savedCart.shoppingList,
            checkedItems: savedCart.checkedItems,
            shareToken: savedCart.shareToken
          } : null}
          onComplete={async () => {
            await removeShoppingCart();
            setCurrentShoppingCart(null);
          }}
        />
      </div>
    </div>
  );
}
