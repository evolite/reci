import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAddRecipe } from '@/hooks/useRecipes';
import type { Recipe } from '@/lib/api';
import { Plus, AlertCircle, CheckCircle2, Tag } from 'lucide-react';

const addRecipeSchema = z.object({
  url: z.string().min(1, 'URL is required').url('Please enter a valid URL'),
});

type AddRecipeFormValues = z.infer<typeof addRecipeSchema>;

export function AddRecipeForm() {
  const { mutate: addRecipe, isPending, error } = useAddRecipe();
  const [newlyAddedRecipe, setNewlyAddedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const form = useForm<AddRecipeFormValues>({
    resolver: zodResolver(addRecipeSchema),
    defaultValues: {
      url: '',
    },
  });

  const handleSubmit = (values: AddRecipeFormValues) => {
    if (values.url.trim()) {
      addRecipe(values.url.trim(), {
        onSuccess: (recipe: Recipe) => {
          form.reset();
          setNewlyAddedRecipe(recipe);
          setShowRecipeDialog(true);
        },
      });
    }
  };

  return (
    <>
      <div className="w-full">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col sm:flex-row gap-2">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="Paste recipe URL (video, blog post, recipe site, etc.)"
                      disabled={isPending}
                      className="text-sm sm:text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              disabled={isPending || !form.watch('url')?.trim()}
              className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="text-white" />
                  Adding...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Recipe
                </span>
              )}
            </Button>
          </form>
        </Form>
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to add recipe'}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
        <DialogContent onClose={() => setShowRecipeDialog(false)} className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <DialogTitle>Recipe Added Successfully!</DialogTitle>
            </div>
            <DialogDescription>
              Your recipe has been processed and added to your collection.
            </DialogDescription>
          </DialogHeader>
          
          {newlyAddedRecipe && (
            <Card className="mt-4">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {newlyAddedRecipe.thumbnailUrl && (
                    <div className="aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <img
                        src={newlyAddedRecipe.thumbnailUrl}
                        alt={newlyAddedRecipe.dishName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{newlyAddedRecipe.dishName}</h3>
                    {newlyAddedRecipe.description && (
                      <p className="text-muted-foreground mb-4">{newlyAddedRecipe.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      {newlyAddedRecipe.cuisineType}
                    </Badge>
                  </div>

                  {newlyAddedRecipe.ingredients && newlyAddedRecipe.ingredients.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Ingredients:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {newlyAddedRecipe.ingredients.map((ingredient, index) => (
                          <li key={index}>{ingredient}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {newlyAddedRecipe.tags && newlyAddedRecipe.tags.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-semibold">Tags:</h4>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {newlyAddedRecipe.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {newlyAddedRecipe.videoUrl && (
                    <div>
                      <a
                        href={newlyAddedRecipe.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-orange-600 hover:underline"
                      >
                        View original video →
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button onClick={() => setShowRecipeDialog(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
