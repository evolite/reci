import { Link, useSearchParams } from 'react-router-dom';
import { ChefHat, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AuthentikSignInButton } from '@/components/AuthentikSignInButton';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const hasInviteToken = searchParams.get('token');

  // Invited users still go through local registration.
  if (hasInviteToken) {
    return (
      <div className="min-h-screen bg-brand-page flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center mb-4">
              <div className="bg-brand-gradient p-3 rounded-xl shadow-lg">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">You've been invited!</h2>
            <p className="text-muted-foreground">
              Click below to create your account and get started with Reci.
            </p>
            <Link to={`/register?token=${hasInviteToken}`}>
              <Button className="w-full bg-brand-gradient-r">
                Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="ghost" className="w-full">
                Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-brand-gradient p-4 rounded-2xl shadow-2xl">
            <ChefHat className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold mb-3 text-brand-gradient">Reci</h1>
        <p className="text-muted-foreground mb-8">Your personal recipe library</p>

        <div className="space-y-3">
          <AuthentikSignInButton className="w-full bg-brand-gradient-r" />
          <Link to="/login" className="block">
            <Button variant="outline" size="lg" className="w-full">
              Sign in with email
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
