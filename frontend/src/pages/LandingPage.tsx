import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChefHat, Sparkles, Search, Plus, ArrowRight, Github, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Recipe {
  id: string;
  dishName: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  cuisineType: string;
  tags: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const GITHUB_URL = 'https://github.com/evolite/reci';

export function LandingPage() {
  const [searchParams] = useSearchParams();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
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
              Save your favorite recipes from videos, blogs, and recipe sites. Discover them later with AI-powered tagging and smart search.
            </p>
            <p className="text-base text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              This is a self-hosted project. Deploy it yourself with Docker or Podman.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <a 
                href={GITHUB_URL} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700">
                  <Github className="w-4 h-4 mr-2" />
                  View on GitHub
                </Button>
              </a>
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
                  Paste recipe URLs
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
              Save Your Favorites, Discover Them Later
            </h2>
            <p className="text-center text-white/90 mb-8 max-w-2xl mx-auto">
              Add recipes from any source and find them easily later with smart search and AI-powered organization.
            </p>
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-hidden items-stretch"
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
                  className="flex-shrink-0 w-80 sm:w-96 h-full flex flex-col overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300 bg-white dark:bg-gray-800"
                >
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.dishName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">
                      {recipe.dishName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 flex-1 line-clamp-4">
                      {recipe.description}
                    </p>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {recipe.cuisineType}
                      </Badge>
                    </div>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="border-t pt-3 mt-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.tags.slice(0, 6).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {recipe.tags.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{recipe.tags.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {/* Duplicate recipes for seamless infinite loop */}
              {recipes.map((recipe) => (
                <Card
                  key={`${recipe.id}-dup`}
                  className="flex-shrink-0 w-80 sm:w-96 h-full flex flex-col overflow-hidden group cursor-pointer hover:scale-105 transition-transform duration-300 bg-white dark:bg-gray-800"
                >
                  <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.dishName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-base sm:text-lg mb-2 line-clamp-2">
                      {recipe.dishName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3 flex-1 line-clamp-4">
                      {recipe.description}
                    </p>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                        {recipe.cuisineType}
                      </Badge>
                    </div>
                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="border-t pt-3 mt-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.tags.slice(0, 6).map((tag, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {recipe.tags.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{recipe.tags.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <p>© 2024 Reci. All rights reserved.</p>
            <a 
              href={GITHUB_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-orange-600 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
