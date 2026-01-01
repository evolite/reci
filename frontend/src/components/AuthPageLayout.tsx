import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuthCardHeader } from '@/components/AuthCardHeader';
import { AlertCircle } from 'lucide-react';

interface AuthPageLayoutProps {
  title: string;
  description: string;
  error?: string;
  success?: ReactNode;
  children: ReactNode;
  backLink?: {
    to: string;
    text: string;
  };
}

export function AuthPageLayout({
  title,
  description,
  error,
  success,
  children,
  backLink,
}: AuthPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AuthCardHeader title={title} description={description} />
        </CardHeader>
        <CardContent>
          {success || (
            <>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {children}
            </>
          )}
          {backLink && (
            <div className="mt-4 text-center">
              <Link to={backLink.to} className="text-sm text-muted-foreground hover:underline">
                {backLink.text}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
