import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRecipe } from '@/lib/api';
import type { Recipe } from '@/lib/api';
import { RecipeDialog } from '@/components/RecipeDialog';
import { LoadingScreen } from '@/components/LoadingScreen';

export function RecipePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const loadRecipe = async () => {
      try {
        setLoading(true);
        const recipeData = await getRecipe(id);
        setRecipe(recipeData);
      } catch (err) {
        console.error('Failed to load recipe:', err);
        setError(err instanceof Error ? err.message : 'Failed to load recipe');
        // Redirect to home after a delay if recipe not found
        setTimeout(() => navigate('/'), 2000);
      } finally {
        setLoading(false);
      }
    };

    loadRecipe();
  }, [id, navigate]);

  const handleClose = () => {
    navigate('/');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Recipe not found'}</p>
          <p className="text-sm text-muted-foreground">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  return (
    <RecipeDialog
      recipe={recipe}
      open={true}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    />
  );
}
