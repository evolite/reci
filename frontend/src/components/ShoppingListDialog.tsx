import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { generateShoppingList } from '@/lib/api';
import type { ShoppingListResponse } from '@/lib/api';
import { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertTriangle, Check } from 'lucide-react';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { ShoppingListContent } from '@/components/ShoppingListContent';

interface ShoppingCartDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly recipeIds: string[];
  readonly onClose: () => void;
  readonly onSave?: (recipeIds: string[], shoppingList: ShoppingListResponse) => void;
  readonly isSaved?: boolean;
  readonly onComplete?: () => void;
  readonly currentShoppingCart?: { id: string; recipeIds: string[]; shoppingList: ShoppingListResponse; checkedItems?: string[] } | null;
}

export function ShoppingCartDialog({ open, onOpenChange, recipeIds, onClose, onSave, isSaved = false, onComplete, currentShoppingCart }: ShoppingCartDialogProps) {
  const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [hasGenerated, setHasGenerated] = useState(false);
  const { updateCheckedItems } = useShoppingCart();

  useEffect(() => {
    if (open) {
      if (isSaved && currentShoppingCart) {
        // If it's a saved cart, just display it
        setShoppingList(currentShoppingCart.shoppingList);
        setIsLoading(false);
        setError(null);
        setHasGenerated(false);
        // Load checked items
        if (currentShoppingCart.checkedItems) {
          setCheckedItems(new Set(currentShoppingCart.checkedItems));
        } else {
          setCheckedItems(new Set());
        }
      } else if (recipeIds.length > 0 && !hasGenerated) {
        // Generate new list - only once
        setIsLoading(true);
        setError(null);
        setShoppingList(null);
        setCheckedItems(new Set());
        setHasGenerated(true);

        generateShoppingList(recipeIds)
          .then((response) => {
            setShoppingList(response);
            setIsLoading(false);
            // Auto-save when list is generated - only once
            if (onSave && !isSaved) {
              onSave(recipeIds, response);
            }
          })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to generate shopping list');
            setIsLoading(false);
            setHasGenerated(false); // Allow retry on error
          });
      }
    } else {
      // Reset when dialog closes
      setShoppingList(null);
      setError(null);
      setIsLoading(false);
      setCheckedItems(new Set());
      setHasGenerated(false);
    }
  }, [open, recipeIds, isSaved, currentShoppingCart, onSave, hasGenerated]);

  const handleItemCheck = (sectionIndex: number, ingredientIndex: number, checked: boolean) => {
    const key = `${sectionIndex}-${ingredientIndex}`;
    const newChecked = new Set(checkedItems);
    
    if (checked) {
      newChecked.add(key);
    } else {
      newChecked.delete(key);
    }
    
    setCheckedItems(newChecked);
    
    // Save checked state if this is a saved cart
    if (isSaved && currentShoppingCart) {
      updateCheckedItems(Array.from(newChecked));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shopping Cart
          </DialogTitle>
          <DialogDescription>
            Organized by supermarket sections
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="w-8 h-8 text-orange-500 mb-4" />
            <p className="text-sm text-muted-foreground">Generating your shopping cart...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {shoppingList && !isLoading && (
          <div className="space-y-6">
            <ShoppingListContent
              shoppingList={shoppingList}
              checkedItems={checkedItems}
              onItemCheck={handleItemCheck}
              useCardLayout={false}
            />
          </div>
        )}

        <div className="flex justify-between pt-4">
          {onComplete && (
            <Button 
              onClick={() => {
                if (onComplete) {
                  onComplete();
                }
                handleClose();
              }} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="w-4 h-4 mr-2" />
              Complete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button onClick={handleClose} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
