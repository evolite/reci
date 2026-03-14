import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Dice } from './Dice';
import { cn } from '@/lib/utils';

interface RatingDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly currentRating: number | null;
  readonly onRate: (rating: number) => Promise<void>;
  readonly recipeName: string;
}

export function RatingDialog({
  open,
  onOpenChange,
  currentRating,
  onRate,
  recipeName,
}: RatingDialogProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(currentRating);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update selectedRating when currentRating changes
  useEffect(() => {
    setSelectedRating(currentRating);
  }, [currentRating]);

  const handleRatingSelect = (rating: number) => {
    setSelectedRating(rating);
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedRating === null) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onRate(selectedRating);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedRating(currentRating);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Rate Recipe</DialogTitle>
          <DialogDescription className="text-base mt-2">
            How would you rate "{recipeName}"? Select a dice value from 1 to 6.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex justify-center gap-4 flex-wrap">
            {[1, 2, 3, 4, 5, 6].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleRatingSelect(rating)}
                disabled={isSubmitting}
                className={cn(
                  'transition-all duration-200',
                  selectedRating === rating
                    ? 'scale-110 ring-4 ring-brand ring-offset-2 shadow-lg'
                    : 'hover:scale-105 opacity-70 hover:opacity-100',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
                aria-label={`Rate ${rating}`}
              >
                <Dice value={rating} size="lg" />
              </button>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive text-center">{error}</p>
          )}
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="border-2"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedRating === null}
            className="bg-brand-gradient-r border-2 border-brand-text"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Rating'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
