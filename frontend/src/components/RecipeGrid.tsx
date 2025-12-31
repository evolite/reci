import type { Recipe } from '@/lib/api';
import { RecipeCard } from './RecipeCard';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ChefHat } from 'lucide-react';

interface RecipeGridProps {
  readonly recipes: Recipe[];
  readonly selectedRecipes: Set<string>;
  readonly onRecipeSelect: (recipeId: string) => void;
  readonly onRecipeDeselect: (recipeId: string) => void;
}

export function RecipeGrid({ recipes, selectedRecipes, onRecipeSelect, onRecipeDeselect }: RecipeGridProps) {
  if (recipes.length === 0) {
    return (
      <Empty className="py-12 sm:py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ChefHat className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No recipes found</EmptyTitle>
          <EmptyDescription>
            Add a recipe URL to get started!
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {recipes.map((recipe) => (
        <RecipeCard 
          key={recipe.id} 
          recipe={recipe}
          isSelected={selectedRecipes.has(recipe.id)}
          onSelect={onRecipeSelect}
          onDeselect={onRecipeDeselect}
        />
      ))}
    </div>
  );
}
