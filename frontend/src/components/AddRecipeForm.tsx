import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useAddRecipe } from '@/hooks/useRecipes';
import { Plus, AlertCircle } from 'lucide-react';

const addRecipeSchema = z.object({
  url: z.string().min(1, 'URL is required').url('Please enter a valid URL'),
});

type AddRecipeFormValues = z.infer<typeof addRecipeSchema>;

export function AddRecipeForm() {
  const navigate = useNavigate();
  const { mutate: addRecipe, isPending, error } = useAddRecipe();
  const form = useForm<AddRecipeFormValues>({
    resolver: zodResolver(addRecipeSchema),
    defaultValues: {
      url: '',
    },
  });

  const handleSubmit = (values: AddRecipeFormValues) => {
    if (values.url.trim()) {
      const urlToAdd = values.url.trim();
      
      addRecipe(urlToAdd, {
        onSuccess: (recipe) => {
          form.reset();
          // Navigate directly to the recipe page
          navigate(`/recipe/${recipe.id}`);
        },
      });
    }
  };

  return (
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
            className="bg-brand-gradient-r text-white shadow-md"
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
  );
}
