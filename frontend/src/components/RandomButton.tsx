import { Button } from '@/components/ui/button';
import { useRandomRecipe } from '@/hooks/useRecipes';
import { Shuffle } from 'lucide-react';
import { useState } from 'react';
import { RecipeDialog } from './RecipeDialog';
import type { Recipe } from '@/lib/api';

export function RandomButton() {
  const { refetch, isFetching } = useRandomRecipe();
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = () => {
    refetch().then((result) => {
      if (result.data) {
        setRandomRecipe(result.data);
        setDialogOpen(true);
      }
    });
  };

  return (
    <>
      <Button 
        onClick={handleClick} 
        disabled={isFetching}
        variant="outline"
        className="w-full sm:w-auto border-2 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950"
      >
        {isFetching ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></span>
            <span className="hidden sm:inline">Loading...</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Random Recipe</span>
            <span className="sm:hidden">Random</span>
          </span>
        )}
      </Button>
      <RecipeDialog 
        recipe={randomRecipe} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  );
}
