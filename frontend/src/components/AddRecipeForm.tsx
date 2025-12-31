import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { useAddRecipe } from '@/hooks/useRecipes';
import { Plus, AlertCircle } from 'lucide-react';

interface AddRecipeFormValues {
  url: string;
}

export function AddRecipeForm() {
  const { mutate: addRecipe, isPending, error } = useAddRecipe();
  const form = useForm<AddRecipeFormValues>({
    defaultValues: {
      url: '',
    },
  });

  const handleSubmit = (values: AddRecipeFormValues) => {
    if (values.url.trim()) {
      addRecipe(values.url.trim(), {
        onSuccess: () => {
          form.reset();
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
            rules={{ required: true }}
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
  );
}
