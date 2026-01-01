import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, CheckCircle2 } from 'lucide-react';

interface CopyButtonProps {
  value: string;
  copiedValue: string | null;
  onCopy: (value: string) => void;
  tooltipText: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg';
}

export function CopyButton({
  value,
  copiedValue,
  onCopy,
  tooltipText,
  variant = 'ghost',
  size = 'sm',
}: CopyButtonProps) {
  const isCopied = copiedValue === value;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={() => onCopy(value)}
          >
            {isCopied ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
