import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddRecipe } from '@/hooks/useRecipes';
import { Plus } from 'lucide-react';

export function AddRecipeForm() {
  const [url, setUrl] = useState('');
  const { mutate: addRecipe, isPending, error } = useAddRecipe();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      addRecipe(url.trim(), {
        onSuccess: () => {
          setUrl('');
        },
      });
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="url"
          placeholder="Paste YouTube URL (videos or shorts)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
          className="flex-1 text-sm sm:text-base"
        />
        <Button 
          type="submit" 
          disabled={isPending || !url.trim()}
          className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-md"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
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
      {error && (
        <p className="text-sm text-destructive mt-2 ml-1">
          {error instanceof Error ? error.message : 'Failed to add recipe'}
        </p>
      )}
    </div>
  );
}
