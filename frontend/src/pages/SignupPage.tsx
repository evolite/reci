import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ChefHat, AlertCircle } from 'lucide-react';

interface InviteFormValues {
  inviteToken: string;
}

interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'invite' | 'register'>('invite');
  const [emailFromInvite, setEmailFromInvite] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, checkInvite } = useAuth();
  const navigate = useNavigate();
  
  const inviteForm = useForm<InviteFormValues>({
    defaultValues: {
      inviteToken: '',
    },
  });
  
  const registerForm = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Check if token is in URL query params
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      inviteForm.setValue('inviteToken', tokenFromUrl);
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
          registerForm.setValue('email', result.email);
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

  const handleCheckInvite = async (values: InviteFormValues) => {
    setError('');
    setLoading(true);

    try {
      // If no invite token provided, try to proceed (might be first user)
      if (!values.inviteToken.trim()) {
        setStep('register');
        setLoading(false);
        return;
      }

      const result = await checkInvite(values.inviteToken);
      if (result.valid) {
        setStep('register');
        if (result.email) {
          registerForm.setValue('email', result.email);
          setEmailFromInvite(true);
        }
      } else {
        setError('Invalid invite token');
      }
    } catch (err) {
      // If check fails but no token, might be first user - allow proceeding
      if (!values.inviteToken.trim()) {
        setStep('register');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to validate invite token');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values: RegisterFormValues) => {
    setError('');

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (values.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const inviteToken = inviteForm.getValues('inviteToken');
      // First user doesn't need invite token
      await register(values.email, values.password, values.name || undefined, inviteToken || undefined);
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
            <Form {...inviteForm}>
              <form onSubmit={inviteForm.handleSubmit(handleCheckInvite)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <FormField
                  control={inviteForm.control}
                  name="inviteToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invite Code (Optional for first user)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter your invite code (optional)"
                          disabled={loading}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        If you're the first user, you can register without an invite code.
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Checking...' : 'Continue to Registration'}
                </Button>
              </form>
            </Form>
            <div className="mt-6 pt-6">
              <Separator className="mb-6" />
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
          <Form {...registerForm}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={registerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Your name"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="email"
                rules={{ required: 'Email is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        disabled={loading || emailFromInvite}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="password"
                rules={{ 
                  required: 'Password is required',
                  minLength: { value: 8, message: 'Password must be at least 8 characters' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="At least 8 characters"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={registerForm.control}
                name="confirmPassword"
                rules={{ 
                  required: 'Please confirm your password',
                  validate: (value) => value === registerForm.getValues('password') || 'Passwords do not match'
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Confirm your password"
                        disabled={loading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className="mt-4 pt-4 text-center">
                <Separator className="mb-4" />
                <span className="text-sm text-muted-foreground">Already have an account? </span>
                <Link to="/login" className="text-sm font-medium text-orange-600 hover:underline">
                  Login here
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
