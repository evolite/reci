import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { useShoppingCart, type SavedShoppingCart } from '@/hooks/useShoppingCart';

interface ShoppingCartDropdownProps {
  onSelectCart: (cart: SavedShoppingCart) => void;
}

export function ShoppingCartDropdown({ onSelectCart }: ShoppingCartDropdownProps) {
  const { savedCart } = useShoppingCart();

  if (!savedCart) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onSelectCart(savedCart)}
    >
      <ShoppingCart className="w-4 h-4 mr-2" />
      Shopping Cart
    </Button>
  );
}
