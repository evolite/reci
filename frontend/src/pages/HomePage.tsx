import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/SearchBar';
import { RandomButton } from '@/components/RandomButton';
import { AddRecipeForm } from '@/components/AddRecipeForm';
import { RecipeGrid } from '@/components/RecipeGrid';
import { useRecipes, useSearchRecipes } from '@/hooks/useRecipes';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ChefHat, LogOut, Shield } from 'lucide-react';

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: allRecipes = [], isLoading: isLoadingAll } = useRecipes();
  const { data: searchResults = [], isLoading: isLoadingSearch } = useSearchRecipes(searchQuery);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const recipes = searchQuery.trim() ? searchResults : allRecipes;
  const isLoading = searchQuery.trim() ? isLoadingSearch : isLoadingAll;

  const handleLogout = () => {
    logout();
    navigate('/signup');
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
                      onClick={() => navigate('/admin/invites')}
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
          <RandomButton />
        </div>

        {/* Recipe Grid */}
        {isLoading ? (
          <div className="text-center py-12 sm:py-16 text-muted-foreground">
            <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-orange-600 mb-4"></div>
            <p className="text-sm sm:text-base">Loading recipes...</p>
          </div>
        ) : (
          <RecipeGrid recipes={recipes} />
        )}
      </div>
    </div>
  );
}
