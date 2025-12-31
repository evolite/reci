import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { generateShoppingList } from '@/lib/api';
import type { ShoppingListResponse } from '@/lib/api';
import { useState, useEffect } from 'react';
import { X, ShoppingCart, AlertTriangle, Check, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { useShoppingCart } from '@/hooks/useShoppingCart';

interface ShoppingCartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeIds: string[];
  onClose: () => void;
  onSave?: (recipeIds: string[], shoppingList: ShoppingListResponse) => void;
  isSaved?: boolean;
  onComplete?: () => void;
  currentShoppingCart?: { id: string; recipeIds: string[]; shoppingList: ShoppingListResponse; checkedItems?: string[]; shareToken?: string | null } | null;
  savedCartFromHook?: { id: string; recipeIds: string[]; shoppingList: ShoppingListResponse; checkedItems: string[]; shareToken: string | null } | null;
}

export function ShoppingCartDialog({ open, onOpenChange, recipeIds, onClose, onSave, isSaved = false, onComplete, currentShoppingCart, savedCartFromHook }: ShoppingCartDialogProps) {
  const [shoppingList, setShoppingList] = useState<ShoppingListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [hasGenerated, setHasGenerated] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { updateCheckedItems, shareCart, unshareCart } = useShoppingCart();

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
        // Set share URL if cart is shared
        if (currentShoppingCart.shareToken) {
          setShareUrl(`${window.location.origin}/cart/shared/${currentShoppingCart.shareToken}`);
        } else {
          setShareUrl(null);
        }
      } else if (savedCartFromHook && isSaved) {
        // If we have a saved cart from the hook, use it
        setShoppingList(savedCartFromHook.shoppingList);
        setIsLoading(false);
        setError(null);
        setHasGenerated(false);
        setCheckedItems(new Set(savedCartFromHook.checkedItems));
        if (savedCartFromHook.shareToken) {
          setShareUrl(`${window.location.origin}/cart/shared/${savedCartFromHook.shareToken}`);
        } else {
          setShareUrl(null);
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
      setShareUrl(null);
      setCopied(false);
    }
  }, [open, recipeIds, isSaved, currentShoppingCart, savedCartFromHook, onSave, hasGenerated]);

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
    if (isSaved && (currentShoppingCart || savedCartFromHook)) {
      updateCheckedItems(Array.from(newChecked));
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const result = await shareCart();
      setShareUrl(result.shareUrl);
    } catch (err) {
      console.error('Failed to share cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to share cart');
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async () => {
    setIsSharing(true);
    try {
      await unshareCart();
      setShareUrl(null);
    } catch (err) {
      console.error('Failed to unshare cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to unshare cart');
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    } finally {
      setIsCopying(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[600px] max-w-[90vw] max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 sticky top-0 bg-background z-10 flex-shrink-0">
          <Separator className="absolute bottom-0 left-0 right-0" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Shopping Cart
            </DialogTitle>
            <DialogDescription>
              Organized by supermarket sections
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-transparent hover:scrollbar-thumb-orange-400">
          <div className="space-y-4">

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
                  {shoppingList.sections.map((section, sectionIndex) => (
                    <Card key={sectionIndex}>
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
                                key={ingredientIndex} 
                                className={`text-sm flex items-start gap-2 ${isChecked ? 'opacity-60 line-through' : ''}`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => handleItemCheck(sectionIndex, ingredientIndex, checked === true)}
                                  className="mt-0.5"
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
                      No ingredients found in selected recipes.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              {/* Summary */}
              <div className="pt-2 text-sm text-muted-foreground">
                <p>
                  {shoppingList.recipesWithIngredients} of {shoppingList.totalRecipes} recipe{shoppingList.totalRecipes > 1 ? 's' : ''} included
                </p>
              </div>

              {/* Sharing Section */}
              {isSaved && (
                <div className="pt-4">
                  <Separator className="mb-4" />
                {shareUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium">Cart is shared</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="flex-1 text-sm"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        onClick={handleCopyLink}
                        variant="outline"
                        size="sm"
                        disabled={isCopying}
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        onClick={handleUnshare}
                        variant="outline"
                        size="sm"
                        disabled={isSharing}
                      >
                        Stop Sharing
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    disabled={isSharing}
                    className="w-full"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    {isSharing ? 'Sharing...' : 'Share Cart'}
                  </Button>
                )}
              </div>
            )}
            </div>
          )}
          </div>
        </div>

        <div className="px-6 py-4 bg-background sticky bottom-0 flex justify-between flex-shrink-0">
          <Separator className="absolute top-0 left-0 right-0" />
          <Button onClick={handleClose} variant="outline">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
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
              Done Shopping
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
