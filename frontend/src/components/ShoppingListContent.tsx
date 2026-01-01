import type { ShoppingListResponse } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { AlertTriangle, ShoppingCart } from 'lucide-react';

interface ShoppingListContentProps {
  readonly shoppingList: ShoppingListResponse;
  readonly checkedItems: Set<string>;
  readonly onItemCheck: (sectionIndex: number, ingredientIndex: number, checked: boolean) => void;
  readonly useCardLayout?: boolean;
}

export function ShoppingListContent({
  shoppingList,
  checkedItems,
  onItemCheck,
  useCardLayout = true,
}: ShoppingListContentProps) {
  return (
    <div className="space-y-4">
      {/* Missing Recipes Warning */}
      {shoppingList.missingRecipes.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">
              {shoppingList.missingRecipes.length} recipe{shoppingList.missingRecipes.length > 1 ? 's' : ''} missing ingredients:
            </p>
            <ul className="list-disc list-inside space-y-1">
              {shoppingList.missingRecipes.map((recipe) => (
                <li key={recipe.id} className="text-sm">
                  {recipe.dishName}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Shopping Cart Sections */}
      {shoppingList.sections.length > 0 ? (
        <div className="space-y-4">
          {shoppingList.sections.map((section, sectionIndex) => {
            if (useCardLayout) {
              return (
                <Card key={section.name}>
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
                            key={`${section.name}-${ingredient}`}
                            className={`text-sm flex items-start gap-2 ${isChecked ? 'opacity-60 line-through' : ''}`}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => onItemCheck(sectionIndex, ingredientIndex, checked === true)}
                              className="mt-0.5"
                            />
                            <span className="flex-1">{ingredient}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            } else {
              return (
                <div key={section.name} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 text-orange-600 dark:text-orange-400">
                    {section.name}
                  </h3>
                  <ul className="space-y-2">
                    {section.ingredients.map((ingredient, ingredientIndex) => {
                      const itemKey = `${sectionIndex}-${ingredientIndex}`;
                      const isChecked = checkedItems.has(itemKey);
                      return (
                        <li
                          key={`${section.name}-${ingredient}`}
                          className={`text-sm flex items-start gap-2 ${isChecked ? 'opacity-60 line-through' : ''}`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => onItemCheck(sectionIndex, ingredientIndex, checked === true)}
                            className="mt-0.5"
                          />
                          <span className="flex-1">{ingredient}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            }
          })}
        </div>
      ) : (
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingCart className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No ingredients found</EmptyTitle>
            <EmptyDescription>
              No ingredients found in selected recipes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Summary */}
      <div className={`pt-2 text-sm text-muted-foreground ${useCardLayout ? '' : 'border-t'}`}>
        <p>
          {shoppingList.recipesWithIngredients} of {shoppingList.totalRecipes} recipe{shoppingList.totalRecipes > 1 ? 's' : ''} included
        </p>
      </div>
    </div>
  );
}
