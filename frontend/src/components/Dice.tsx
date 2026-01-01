import { cn } from '@/lib/utils';

type DiceSize = 'sm' | 'md' | 'lg';

interface DiceProps {
  readonly value: number | null; // 1-6 or null for placeholder
  readonly size?: DiceSize;
  readonly className?: string;
  readonly onClick?: (e?: React.MouseEvent) => void;
  readonly clickable?: boolean;
}

const dotSizeClasses = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

// Dice face patterns: each array represents which positions in a 3x3 grid should show dots
const dicePatterns: Record<number, number[]> = {
  1: [4], // center
  2: [0, 8], // top-left, bottom-right
  3: [0, 4, 8], // top-left, center, bottom-right
  4: [0, 2, 6, 8], // all four corners
  5: [0, 2, 4, 6, 8], // four corners + center
  6: [0, 2, 3, 5, 6, 8], // two columns of three
};

function DiceFace({ value, size }: { readonly value: number; readonly size: DiceSize }) {
  const pattern = dicePatterns[value] || [];
  const dotSize = dotSizeClasses[size];

  return (
    <div className="grid grid-cols-3 gap-0.5 p-1">
      {Array.from({ length: 9 }, (_, index) => index).map((position) => (
        <div
          key={`dice-dot-${position}`}
          className={cn(
            'rounded-full bg-white',
            dotSize,
            pattern.includes(position) ? 'opacity-100' : 'opacity-0'
          )}
        />
      ))}
    </div>
  );
}

function getSizeClasses(size: DiceSize): string {
  if (size === 'sm') return 'w-10 h-10';
  if (size === 'lg') return 'w-16 h-16';
  return 'w-12 h-12';
}

interface PlaceholderDiceProps {
  readonly isClickable: boolean;
  readonly size: DiceSize;
  readonly className?: string;
  readonly onClick?: (e?: React.MouseEvent) => void;
}

function PlaceholderDice({ 
  isClickable, 
  size, 
  className, 
  onClick 
}: PlaceholderDiceProps) {
  const Component = isClickable ? 'button' : 'div';
  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-lg bg-muted text-muted-foreground border-2 border-dashed',
        getSizeClasses(size),
        isClickable && 'cursor-pointer hover:bg-muted/80 hover:border-solid transition-all duration-200 hover:scale-105',
        className
      )}
      title="Not rated - Click to rate"
    >
      <span className="text-xs font-medium">?</span>
    </Component>
  );
}

interface RatedDiceProps {
  readonly diceValue: number;
  readonly isClickable: boolean;
  readonly size: DiceSize;
  readonly className?: string;
  readonly onClick?: (e?: React.MouseEvent) => void;
}

function RatedDice({ 
  diceValue, 
  isClickable, 
  size, 
  className, 
  onClick 
}: RatedDiceProps) {
  const Component = isClickable ? 'button' : 'div';
  const title = isClickable ? `Your rating: ${diceValue} - Click to change` : `Rating: ${diceValue}`;
  
  return (
    <Component
      type={isClickable ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg',
        getSizeClasses(size),
        isClickable && 'cursor-pointer hover:from-orange-600 hover:to-amber-700 hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-105',
        className
      )}
      title={title}
    >
      <DiceFace value={diceValue} size={size} />
    </Component>
  );
}

export function Dice({ value, size = 'md', className, onClick, clickable = false }: DiceProps) {
  const isClickable = clickable || !!onClick;

  if (value === null || value === undefined) {
    return <PlaceholderDice isClickable={isClickable} size={size} className={className} onClick={onClick} />;
  }

  const diceValue = Math.max(1, Math.min(6, Math.round(value)));
  return <RatedDice diceValue={diceValue} isClickable={isClickable} size={size} className={className} onClick={onClick} />;
}
