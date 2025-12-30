import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { Recipe } from '@/lib/api';
import { ExternalLink, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { updateRecipe } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

interface RecipeDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDialog({ recipe, open, onOpenChange }: RecipeDialogProps) {
  const [pastedRecipeText, setPastedRecipeText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const queryClient = useQueryClient();

  // Reset pasted text when dialog opens/closes or recipe changes
  useEffect(() => {
    if (!open) {
      setPastedRecipeText('');
      setIsSaving(false);
      setSaveProgress(0);
    }
  }, [open, recipe]);

  if (!recipe) return null;

  const handleSavePastedRecipe = async () => {
    if (!pastedRecipeText.trim() || pastedRecipeText.trim().length < 50) {
      alert('Please paste a recipe with at least 50 characters');
      return;
    }

    setIsSaving(true);
    setSaveProgress(0);

    try {
      setSaveProgress(20); // Starting analysis
      await new Promise(resolve => setTimeout(resolve, 300));
      setSaveProgress(40); // Analyzing with OpenAI
      await new Promise(resolve => setTimeout(resolve, 300));
      setSaveProgress(60); // Converting measurements
      await new Promise(resolve => setTimeout(resolve, 300));
      setSaveProgress(80); // Updating fields

      // Update recipe with pasted text - backend will analyze it
      await updateRecipe(recipe.id, {
        instructions: pastedRecipeText,
      });

      setSaveProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      setIsSaving(false);
      setSaveProgress(0);
      setPastedRecipeText('');
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipe.id] });
      onOpenChange(false); // Close dialog after saving to show updated recipe card
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setIsSaving(false);
      setSaveProgress(0);
      alert(error instanceof Error ? error.message : 'Failed to save recipe');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.dishName}</DialogTitle>
          <DialogDescription>{recipe.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Ingredients Section */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Ingredients</h3>
              <ul className="list-none space-y-1 text-sm">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 text-orange-600">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions Section */}
          {recipe.instructions ? (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-lg">Instructions</h3>
              <div className="whitespace-pre-wrap text-sm">{recipe.instructions}</div>
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="text-center text-muted-foreground mb-3">
                <p className="font-medium mb-1">No instructions found.</p>
                <p className="text-sm">Paste the recipe text below and we'll extract ingredients and instructions automatically!</p>
              </div>
              {isSaving && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${saveProgress}%` }}
                  />
                </div>
              )}
              <Textarea
                value={pastedRecipeText}
                onChange={(e) => setPastedRecipeText(e.target.value)}
                placeholder="Paste the full recipe here (ingredients and instructions)..."
                className="min-h-[150px] text-sm"
                disabled={isSaving}
              />
              <Button
                onClick={handleSavePastedRecipe}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
                disabled={isSaving || !pastedRecipeText.trim() || pastedRecipeText.trim().length < 50}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2 inline-block"></span>
                    {saveProgress < 100 ? `Analyzing... ${saveProgress}%` : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save & Analyze Recipe
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => window.open(recipe.youtubeUrl, '_blank')}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Watch on YouTube
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
