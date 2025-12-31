import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSharedCart, updateSharedCart, type SharedCartResponse } from '@/lib/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { ShoppingCart, AlertTriangle } from 'lucide-react';

export function SharedCartPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [cart, setCart] = useState<SharedCartResponse | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!shareToken) {
      setError('Invalid share token');
      setIsLoading(false);
      return;
    }

    const loadCart = async () => {
      try {
        const sharedCart = await getSharedCart(shareToken);
        setCart(sharedCart);
        setCheckedItems(new Set(sharedCart.checkedItems));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shared cart');
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [shareToken]);

  const handleItemCheck = async (sectionIndex: number, ingredientIndex: number, checked: boolean) => {
    if (!shareToken) return;

    const key = `${sectionIndex}-${ingredientIndex}`;
    const previousChecked = new Set(checkedItems);
    const newChecked = new Set(checkedItems);
    
    if (checked) {
      newChecked.add(key);
    } else {
      newChecked.delete(key);
    }
    
    setCheckedItems(newChecked);
    setIsUpdating(true);

    try {
      await updateSharedCart(shareToken, Array.from(newChecked));
    } catch (err) {
      console.error('Failed to update shared cart:', err);
      // Revert on error
      setCheckedItems(previousChecked);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Spinner className="w-8 h-8 text-orange-500 mb-4" />
          <p className="text-sm text-muted-foreground">Loading shared cart...</p>
        </div>
      </div>
    );
  }

  if (error || !cart) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Shared cart not found'}
            </AlertDescription>
          </Alert>
          <div className="mt-4 text-center">
            <Link to="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Shared Shopping Cart
                </h1>
                {cart.ownerName && (
                  <p className="text-sm text-muted-foreground">
                    Shared by {cart.ownerName}
                  </p>
                )}
              </div>
            </div>
            <Link to="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
          {/* Missing Recipes Warning */}
          {cart.shoppingList.missingRecipes.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">
                  {cart.shoppingList.missingRecipes.length} recipe{cart.shoppingList.missingRecipes.length > 1 ? 's' : ''} missing ingredients:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {cart.shoppingList.missingRecipes.map((recipe) => (
                    <li key={recipe.id} className="text-sm">
                      {recipe.dishName}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Shopping Cart Sections */}
          {cart.shoppingList.sections.length > 0 ? (
            <div className="space-y-4">
              {cart.shoppingList.sections.map((section, sectionIndex) => (
                <Card key={`section-${section.name}-${sectionIndex}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-orange-600 dark:text-orange-400">
                      {section.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                  <ul className="space-y-2">
                    {section.ingredients.map((ingredient, ingredientIndex) => {
                      const itemKey = `${sectionIndex}-${ingredientIndex}`;
                      const isChecked = checkedItems.has(itemKey);
                      return (
                        <li 
                          key={`${itemKey}-${ingredient}`} 
                          className={`text-sm flex items-start gap-2 ${isChecked ? 'opacity-60 line-through' : ''}`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => handleItemCheck(sectionIndex, ingredientIndex, checked === true)}
                            className="mt-0.5"
                            disabled={isUpdating}
                          />
                          <span className="flex-1">{ingredient}</span>
                        </li>
                      );
                    })}
                  </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShoppingCart className="h-6 w-6" />
                </EmptyMedia>
                <EmptyTitle>No ingredients found</EmptyTitle>
                <EmptyDescription>
                  No ingredients found in this cart.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {/* Summary */}
          <div className="pt-4 text-sm text-muted-foreground">
            <Separator className="mb-4" />
            <p>
              {cart.shoppingList.recipesWithIngredients} of {cart.shoppingList.totalRecipes} recipe{cart.shoppingList.totalRecipes > 1 ? 's' : ''} included
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
