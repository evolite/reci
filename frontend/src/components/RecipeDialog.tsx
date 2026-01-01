import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Recipe } from '@/lib/api';
import { ExternalLink, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { updateRecipe, rateRecipe, getRecipe } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Dice } from './Dice';
import { RatingDialog } from './RatingDialog';

interface RecipeDialogProps {
  readonly recipe: Recipe | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function RecipeDialog({ recipe, open, onOpenChange }: RecipeDialogProps) {
  const [pastedRecipeText, setPastedRecipeText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(recipe);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const queryClient = useQueryClient();

  // Update currentRecipe when recipe prop changes
  useEffect(() => {
    setCurrentRecipe(recipe);
  }, [recipe]);

  // Reset pasted text when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setPastedRecipeText('');
      setIsSaving(false);
      setSaveProgress(0);
    }
  }, [open]);

  if (!currentRecipe) return null;

  const handleSavePastedRecipe = async () => {
    if (!pastedRecipeText.trim() || pastedRecipeText.trim().length < 50) {
      setShowValidationDialog(true);
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
      const updatedRecipe = await updateRecipe(currentRecipe.id, {
        instructions: pastedRecipeText,
      });

      setSaveProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));

      setIsSaving(false);
      setSaveProgress(0);
      setPastedRecipeText('');
      
      // Update local recipe state with the updated recipe
      setCurrentRecipe(updatedRecipe);
      
      // Invalidate queries to refresh the recipe data in the parent
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      queryClient.invalidateQueries({ queryKey: ['recipe', currentRecipe.id] });
      
      // Keep dialog open to show the updated recipe with instructions
    } catch (error) {
      console.error('Failed to save recipe:', error);
      setIsSaving(false);
      setSaveProgress(0);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save recipe');
      setShowErrorDialog(true);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl p-0 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Pinned Header */}
        <div className="flex-shrink-0 bg-background border-b px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="mb-2">
              <DialogTitle className="text-2xl flex-1 pr-8">{currentRecipe.dishName}</DialogTitle>
            </div>
          </DialogHeader>
          
          {/* View Source Button at Top */}
          <div className="mt-4">
            <Button
              onClick={() => window.open(currentRecipe.videoUrl, '_blank')}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View Source
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
          {/* Description */}
          {currentRecipe.description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {currentRecipe.description}
            </DialogDescription>
          )}
          
          {/* Rating Section */}
          <div className="flex items-center gap-4 pb-2 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Your rating:</span>
              <Dice 
                value={currentRecipe.userRating ?? null} 
                size="sm"
                onClick={() => setShowRatingDialog(true)}
                clickable
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Average:</span>
              <Dice value={currentRecipe.averageRating ?? null} size="sm" />
            </div>
            {currentRecipe.ratingCount !== undefined && currentRecipe.ratingCount > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {currentRecipe.ratingCount} {currentRecipe.ratingCount === 1 ? 'rating' : 'ratings'}
              </span>
            )}
          </div>
          {/* Ingredients Section */}
          {currentRecipe.ingredients && currentRecipe.ingredients.length > 0 && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Ingredients</h3>
              <ul className="list-none space-y-1 text-sm">
                {currentRecipe.ingredients.map((ingredient, index) => (
                  <li key={`${ingredient}-${index}`} className="flex items-start">
                    <span className="mr-2 text-orange-600">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions Section */}
          {currentRecipe.instructions ? (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Instructions</h3>
              <ol className="list-none space-y-2 text-sm">
                {(() => {
                  const instructions = currentRecipe.instructions;
                  
                  // First, try splitting by newlines
                  let steps = instructions.split(/\n+/).map((line) => line.trim()).filter((line) => line.length > 0);
                  
                  // If we got multiple lines, use them
                  if (steps.length > 1) {
                    return steps.map((step, index) => {
                      const cleanStep = step.replace(/^\d+[.)]\s*/, '').trim();
                      return (
                        <li key={`${cleanStep}-${index}`} className="flex items-start">
                          <span className="mr-3 text-orange-600 font-semibold min-w-[24px]">{index + 1}.</span>
                          <span className="flex-1">{cleanStep}</span>
                        </li>
                      );
                    });
                  }
                  
                  // If single line, try to split by numbered patterns (1., 2., 3., etc.)
                  // Pattern: number followed by period or parenthesis, then space
                  const numberedPattern = /(\d+[.)]\s+)/g;
                  const matches = [...instructions.matchAll(numberedPattern)];
                  
                  if (matches.length > 1) {
                    // Split by the numbered pattern
                    steps = instructions.split(/(\d+[.)]\s+)/).filter((part) => part.trim().length > 0);
                    
                    // Group number and text together
                    const groupedSteps: string[] = [];
                    for (let i = 0; i < steps.length; i += 2) {
                      if (i + 1 < steps.length) {
                        groupedSteps.push((steps[i] + steps[i + 1]).trim());
                      } else {
                        groupedSteps.push(steps[i].trim());
                      }
                    }
                    
                    return groupedSteps.map((step, index) => {
                      const cleanStep = step.replace(/^\d+[.)]\s*/, '').trim();
                      return (
                        <li key={`${cleanStep}-${index}`} className="flex items-start">
                          <span className="mr-3 text-orange-600 font-semibold min-w-[24px]">{index + 1}.</span>
                          <span className="flex-1">{cleanStep}</span>
                        </li>
                      );
                    });
                  }
                  
                  // Fallback: just split by periods if no numbered pattern found
                  steps = instructions.split(/\.\s+/).map((step) => step.trim()).filter((step) => step.length > 0);
                  
                  return steps.map((step, index) => {
                    const cleanStep = step.replace(/^\d+[.)]\s*/, '').trim();
                    return (
                      <li key={`${cleanStep}-${index}`} className="flex items-start">
                        <span className="mr-3 text-orange-600 font-semibold min-w-[24px]">{index + 1}.</span>
                        <span className="flex-1">{cleanStep}</span>
                      </li>
                    );
                  });
                })()}
              </ol>
            </div>
          ) : (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="text-center text-muted-foreground mb-3">
                <p className="font-medium mb-1">No instructions found.</p>
                <p className="text-sm">Paste the recipe text below and we'll extract ingredients and instructions automatically!</p>
              </div>
              {isSaving && (
                <Progress value={saveProgress} className="h-2 mb-2" />
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
                    <Spinner className="h-4 w-4 mr-2" />
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
        </div>
      </DialogContent>
    </Dialog>

    {/* Validation Dialog */}
    <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Invalid Input</AlertDialogTitle>
          <AlertDialogDescription>
            Please paste a recipe with at least 50 characters.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setShowValidationDialog(false)}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Error Dialog */}
    <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Error</AlertDialogTitle>
          <AlertDialogDescription>
            {errorMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <RatingDialog
      open={showRatingDialog}
      onOpenChange={setShowRatingDialog}
      currentRating={currentRecipe.userRating ?? null}
      onRate={async (rating: number) => {
        await rateRecipe(currentRecipe.id, rating);
        // Invalidate and refetch recipes to update rating data
        await queryClient.invalidateQueries({ queryKey: ['recipes'] });
        await queryClient.invalidateQueries({ queryKey: ['recipe', currentRecipe.id] });
        // Update local state with fresh recipe data
        const updatedRecipe = await getRecipe(currentRecipe.id);
        setCurrentRecipe(updatedRecipe);
      }}
      recipeName={currentRecipe.dishName}
    />
    </>
  );
}
