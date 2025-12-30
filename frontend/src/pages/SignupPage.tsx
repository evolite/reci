import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, AlertCircle } from 'lucide-react';

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'invite' | 'register'>('invite');
  const [inviteToken, setInviteToken] = useState('');
  const [email, setEmail] = useState('');
  const [emailFromInvite, setEmailFromInvite] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, checkInvite } = useAuth();
  const navigate = useNavigate();

  // Check if token is in URL query params
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setInviteToken(tokenFromUrl);
      // Automatically validate and proceed if token is in URL
      handleTokenFromUrl(tokenFromUrl);
    }
  }, [searchParams]);

  // If no token and not first user, redirect to landing page
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl && step === 'invite') {
      // Check if there are any users (if yes, require invite)
      // This will be handled by the backend when they try to register
    }
  }, [searchParams, step]);

  const handleTokenFromUrl = async (token: string) => {
    setLoading(true);
    try {
      const result = await checkInvite(token);
      if (result.valid) {
        setStep('register');
        if (result.email) {
          setEmail(result.email);
          setEmailFromInvite(true);
        }
      } else {
        setError('Invalid invite token');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate invite token');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If no invite token provided, try to proceed (might be first user)
      if (!inviteToken.trim()) {
        setStep('register');
        setLoading(false);
        return;
      }

      const result = await checkInvite(inviteToken);
      if (result.valid) {
        setStep('register');
        if (result.email) {
          setEmail(result.email);
          setEmailFromInvite(true);
        }
      } else {
        setError('Invalid invite token');
      }
    } catch (err) {
      // If check fails but no token, might be first user - allow proceeding
      if (!inviteToken.trim()) {
        setStep('register');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to validate invite token');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // First user doesn't need invite token
      await register(email, password, name || undefined, inviteToken || undefined);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'invite') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl">Register with Invite</CardTitle>
            <CardDescription>Enter your invite code to create your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCheckInvite} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="inviteToken">Invite Code (Optional for first user)</Label>
                <Input
                  id="inviteToken"
                  type="text"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="Enter your invite code (optional)"
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  If you're the first user, you can register without an invite code.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Checking...' : 'Continue to Registration'}
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-center text-muted-foreground mb-3">
                Don't have an invite? Contact an administrator to request one.
              </p>
              <div className="text-center">
                <span className="text-sm text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-sm font-medium text-orange-600 hover:underline">
                  Login here
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>Complete your registration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading || emailFromInvite}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={() => setStep('invite')}
                disabled={loading}
              >
                Back
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <span className="text-sm text-muted-foreground">Already have an account? </span>
              <Link to="/login" className="text-sm font-medium text-orange-600 hover:underline">
                Login here
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
