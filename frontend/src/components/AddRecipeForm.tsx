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
import { Plus, AlertCircle, Link2 } from 'lucide-react';

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
          navigate(`/recipe/${recipe.id}`);
        },
      });
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border border-brand-border/40 rounded-2xl p-4 sm:p-5 shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col sm:flex-row gap-3">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="url"
                        placeholder="Paste a YouTube, blog, or recipe site URL…"
                        disabled={isPending}
                        className="text-base pl-9 h-11 border-border/60 focus:border-brand-border-strong"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending || !form.watch('url')?.trim()}
              className="h-11 px-6 bg-brand-gradient-r text-white shadow-md font-semibold shrink-0 transition-all hover:shadow-lg hover:scale-[1.01]"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner className="text-white w-4 h-4" />
                  Extracting recipe…
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
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to add recipe'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
