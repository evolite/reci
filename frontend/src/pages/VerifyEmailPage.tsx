import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, AlertCircle, CheckCircle2 } from 'lucide-react';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing');
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        await verifyEmail(token);
        setSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify email');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>Verifying your email address</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            if (loading) {
              return <div className="text-center py-4">Verifying...</div>;
            }
            if (success) {
              return (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Your email has been verified successfully!
                  </AlertDescription>
                </Alert>
              );
            }
            return (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || 'Failed to verify email'}</AlertDescription>
              </Alert>
            );
          })()}
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
