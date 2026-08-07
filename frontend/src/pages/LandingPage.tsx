import { Link } from 'react-router-dom';
import { ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthentikSignInButton } from '@/components/AuthentikSignInButton';

export function LandingPage() {
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
