import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChefHat, Sparkles, Search, Plus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { joinWaitlist } from '@/lib/api';

interface Recipe {
  id: string;
  dishName: string;
  description: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  cuisineType: string;
  tags: string[];
}

interface WaitlistResponse {
  email: string;
  position: number;
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState<WaitlistResponse | null>(null);
  const [waitlistError, setWaitlistError] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInviteToken = searchParams.get('token');

  useEffect(() => {
    // Fetch public recipes
    fetch(`${API_BASE_URL}/api/recipes/public`)
      .then(res => res.json())
      .then(data => {
        setRecipes(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch recipes:', err);
        setLoading(false);
      });
  }, []);

  // Auto-scroll recipe feed horizontally infinitely
  useEffect(() => {
    if (!scrollContainerRef.current || recipes.length === 0) return;

    const container = scrollContainerRef.current;
    let scrollPosition = 0;
    const scrollSpeed = 0.5; // pixels per frame
    let animationId: number | null = null;
    let isPaused = false;

    const scroll = () => {
      if (isPaused) {
        animationId = requestAnimationFrame(scroll);
        return;
      }
      
      scrollPosition += scrollSpeed;
      const maxScroll = container.scrollWidth - container.clientWidth;
      
      // Reset to start for seamless infinite loop
      if (scrollPosition >= maxScroll) {
        scrollPosition = 0;
      }
      
      container.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    // Pause on hover
    const handleMouseEnter = () => {
      isPaused = true;
    };
    const handleMouseLeave = () => {
      isPaused = false;
      if (animationId === null) {
        animationId = requestAnimationFrame(scroll);
      }
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [recipes]);

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaitlistError('');
    setWaitlistSuccess(null);
    setWaitlistLoading(true);

    try {
      const data = await joinWaitlist(email);
      setWaitlistSuccess(data);
      setEmail('');
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Failed to join waitlist');
    } finally {
      setWaitlistLoading(false);
    }
  };

  // If user has invite token, show registration link
  if (hasInviteToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-3 rounded-xl shadow-lg">
                <ChefHat className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold">You've been invited!</h2>
            <p className="text-muted-foreground">
              Click below to create your account and get started with Reci.
            </p>
            <Link to={`/register?token=${hasInviteToken}`}>
              <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
                Create Account <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="ghost" className="w-full">
                Back to Landing Page
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-2xl">
                <ChefHat className="w-16 h-16 text-white" />
              </div>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-600 bg-clip-text text-transparent">
              Reci
            </h1>
            <p className="text-xl sm:text-2xl md:text-3xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
              Your Personal Recipe Video Library
            </p>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Save, organize, and discover amazing recipes from YouTube. AI-powered tagging and smart search make finding your next meal effortless.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Already have an account? Login
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-12">
              <Card className="text-center p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Quick Add</h3>
                <p className="text-xs text-muted-foreground">
                  Paste YouTube URLs
                </p>
              </Card>
              <Card className="text-center p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold mb-1">Smart Search</h3>
                <p className="text-xs text-muted-foreground">
                  Find by ingredients
                </p>
              </Card>
              <Card className="text-center p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm font-semibold mb-1">AI-Powered</h3>
                <p className="text-xs text-muted-foreground">
                  Auto-tagging
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal Scrolling Recipe Feed - Full Width */}
      {!loading && recipes.length > 0 && (
        <section className="w-full py-12 bg-gradient-to-r from-orange-500 to-amber-600">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-white">
              Discover Amazing Recipes
            </h2>
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <style>{`
                div[ref="${scrollContainerRef}"]::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {recipes.map((recipe) => (
                <Card
                  key={recipe.id}
                  className="flex-shrink-0 w-72 sm:w-80 overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300 bg-white dark:bg-gray-800"
                >
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.dishName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1">
                      {recipe.dishName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                        {recipe.cuisineType}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {/* Duplicate recipes for seamless infinite loop */}
              {recipes.map((recipe) => (
                <Card
                  key={`${recipe.id}-dup`}
                  className="flex-shrink-0 w-72 sm:w-80 overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300 bg-white dark:bg-gray-800"
                >
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.dishName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1">
                      {recipe.dishName}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                        {recipe.cuisineType}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-r from-orange-500 to-amber-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Transform Your Recipe Collection?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of food lovers organizing their favorite recipes
          </p>
          <Card className="max-w-md mx-auto border-2 border-white/20 bg-white/10 backdrop-blur">
            <CardContent className="p-6">
              {waitlistSuccess ? (
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 text-white mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">You're on the list!</p>
                  <p className="text-sm opacity-90">
                    Position #{waitlistSuccess.position}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleJoinWaitlist} className="space-y-3">
                  {waitlistError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded p-3 text-sm text-white">
                      {waitlistError}
                    </div>
                  )}
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={waitlistLoading}
                    className="bg-white/90 text-gray-900 placeholder:text-gray-500"
                  />
                  <Button
                    type="submit"
                    disabled={waitlistLoading}
                    className="w-full bg-white text-orange-600 hover:bg-gray-100"
                    size="lg"
                  >
                    {waitlistLoading ? 'Joining...' : (
                      <>
                        Join Waitlist <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Reci. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
