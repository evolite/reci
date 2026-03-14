import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-page flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-8 w-8 text-brand" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
