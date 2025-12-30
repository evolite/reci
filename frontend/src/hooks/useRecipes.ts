import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addRecipe, getRecipes, searchRecipes, getRandomRecipe } from '@/lib/api';

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: getRecipes,
  });
}

export function useSearchRecipes(query: string) {
  return useQuery({
    queryKey: ['recipes', 'search', query],
    queryFn: () => searchRecipes(query),
    enabled: query.length > 0,
  });
}

export function useAddRecipe() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addRecipe,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useRandomRecipe() {
  return useQuery({
    queryKey: ['recipes', 'random'],
    queryFn: getRandomRecipe,
    enabled: false,
  });
}
