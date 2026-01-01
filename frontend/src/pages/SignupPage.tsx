import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'invite' | 'register'>('invite');
  const [emailFromInvite, setEmailFromInvite] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, checkInvite } = useAuth();
  const navigate = useNavigate();
  
  const inviteForm = useForm<InviteFormValues>({
    defaultValues: { inviteToken: '' },
  });
  
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Helper to handle validation
  const validateToken = useCallback(async (token: string) => {
    setLoading(true);
    setError('');
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
  }, [checkInvite, registerForm]);

  // Run only once on mount or when token in URL changes
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl && step === 'invite') {
      inviteForm.setValue('inviteToken', tokenFromUrl);
      validateToken(tokenFromUrl);
    }
  }, [searchParams, step, validateToken, inviteForm]);

  const onInviteSubmit = async (values: InviteFormValues) => {
    if (!values.inviteToken.trim()) {
      setStep('register');
      return;
    }
    await validateToken(values.inviteToken);
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    setError('');
    setLoading(true);

    try {
      const inviteToken = inviteForm.getValues('inviteToken');
      await register(values.email, values.password, values.name, inviteToken || undefined);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {step === 'invite' ? 'Register with Invite' : 'Create Your Account'}
          </CardTitle>
          <CardDescription>
            {step === 'invite' ? 'Enter your invite code' : 'Complete your registration'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'invite' ? (
            <Form {...inviteForm} key="invite-step">
              <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)} className="space-y-4">
                <FormField
                  control={inviteForm.control}
                  name="inviteToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invite Code (Optional for first user)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter code" disabled={loading} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Checking...' : 'Continue'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...registerForm} key="register-step">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" disabled={loading || emailFromInvite} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 8 characters" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repeat password" disabled={loading} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('invite')} disabled={loading}>
                  Back
                </Button>
              </form>
            </Form>
          )}

          <div className="mt-6">
            <Separator className="mb-4" />
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