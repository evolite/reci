import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Recipe } from '@/lib/api';
import { ExternalLink, Tag, Edit2, Save, X, Trash2, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { updateRecipe, deleteRecipe, rescrapeAndAnalyzeRecipe } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { RecipeDialog } from './RecipeDialog';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tags, setTags] = useState(recipe.tags || []);
  const [newTag, setNewTag] = useState('');
  const [editData, setEditData] = useState({
    dishName: recipe.dishName,
    description: recipe.description,
    cuisineType: recipe.cuisineType,
    ingredients: recipe.ingredients.join('\n'),
    instructions: recipe.instructions || '',
  });
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRescrapingAndAnalyzing, setIsRescrapingAndAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const queryClient = useQueryClient();

  // Update local state when recipe prop changes
  useEffect(() => {
    setEditData({
      dishName: recipe.dishName,
      description: recipe.description,
      cuisineType: recipe.cuisineType,
      ingredients: recipe.ingredients.join('\n'),
      instructions: recipe.instructions || '',
    });
    setTags(recipe.tags || []);
  }, [recipe]);

  const handleCardClick = () => {
    if (!isEditing) {
      setShowRecipeDialog(true);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.stopPropagation();
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const hasInstructions = editData.instructions && editData.instructions.trim().length > 50;
    const instructionsChanged = editData.instructions !== (recipe.instructions || '');
    
    setIsSaving(true);
    setSaveProgress(0);
    
    try {
      // Simulate progress for instructions analysis
      if (hasInstructions && instructionsChanged) {
        setSaveProgress(20); // Starting analysis
        await new Promise(resolve => setTimeout(resolve, 300));
        setSaveProgress(40); // Analyzing with OpenAI
        await new Promise(resolve => setTimeout(resolve, 300));
        setSaveProgress(60); // Converting measurements
        await new Promise(resolve => setTimeout(resolve, 300));
        setSaveProgress(80); // Updating fields
      } else {
        setSaveProgress(50);
      }
      
      await updateRecipe(recipe.id, {
        dishName: editData.dishName,
        description: editData.description,
        cuisineType: editData.cuisineType,
        ingredients: editData.ingredients.split('\n').map(i => i.trim()).filter(i => i.length > 0),
        instructions: editData.instructions || null,
        tags: tags,
      });
      
      setSaveProgress(100);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setIsEditing(false);
      setIsSaving(false);
      setSaveProgress(0);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error) {
      console.error('Failed to update recipe:', error);
      setIsSaving(false);
      setSaveProgress(0);
      alert(error instanceof Error ? error.message : 'Failed to save recipe');
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditData({
      dishName: recipe.dishName,
      description: recipe.description,
      cuisineType: recipe.cuisineType,
      ingredients: recipe.ingredients.join('\n'),
      instructions: recipe.instructions || '',
    });
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recipe?')) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteRecipe(recipe.id);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete recipe');
      setIsDeleting(false);
    }
  };

  const handleRescrapeAndAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRescrapingAndAnalyzing(true);
    try {
      const updatedRecipe = await rescrapeAndAnalyzeRecipe(recipe.id);
      // Update local state with new data
      setEditData({
        dishName: updatedRecipe.dishName,
        description: updatedRecipe.description,
        cuisineType: updatedRecipe.cuisineType,
        ingredients: updatedRecipe.ingredients.join('\n'),
        instructions: updatedRecipe.instructions || '',
      });
      setTags(updatedRecipe.tags || []);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setIsRescrapingAndAnalyzing(false);
    } catch (error) {
      console.error('Failed to re-scrape and analyze recipe:', error);
      alert(error instanceof Error ? error.message : 'Failed to re-scrape and analyze recipe');
      setIsRescrapingAndAnalyzing(false);
    }
  };

  return (
    <>
      <Card 
        className={`transition-all duration-300 hover:scale-[1.02] border-2 overflow-hidden group ${
          isEditing 
            ? 'border-orange-400 cursor-default' 
            : 'cursor-pointer hover:shadow-xl hover:border-orange-300'
        }`}
        onClick={handleCardClick}
      >
        <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
          <img
            src={recipe.thumbnailUrl}
            alt={recipe.dishName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {!isEditing && (
            <>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 sm:w-10 sm:h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <Button
                onClick={handleEdit}
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 shadow-lg"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button
                onClick={handleRescrapeAndAnalyze}
                size="sm"
                variant="secondary"
                className="absolute top-2 left-2 h-8 px-2 bg-white/90 hover:bg-white dark:bg-gray-800/90 dark:hover:bg-gray-800 shadow-lg"
                disabled={isRescrapingAndAnalyzing}
              >
                {isRescrapingAndAnalyzing ? (
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline-block"></span>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    <span className="text-xs">Re-analyze</span>
                  </>
                )}
              </Button>
              <Button
                onClick={handleDelete}
                size="sm"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 shadow-lg"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current inline-block"></span>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
        </div>
        <CardHeader className="p-3 sm:p-4 sm:p-6">
          {isEditing ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <Input
                value={editData.dishName}
                onChange={(e) => setEditData({ ...editData, dishName: e.target.value })}
                placeholder="Dish Name"
                className="text-base sm:text-lg font-semibold"
              />
            </div>
          ) : (
            <>
              <CardTitle className="line-clamp-2 text-base sm:text-lg sm:text-xl mb-1 sm:mb-2 group-hover:text-orange-600 transition-colors">
                {recipe.dishName}
              </CardTitle>
              <CardDescription className="line-clamp-4 text-xs sm:text-sm">
                {recipe.description}
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="p-3 sm:p-4 sm:p-6 pt-0 space-y-3">
          {isEditing ? (
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="text-xs font-medium mb-1 block">Description</label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Description"
                  className="text-xs sm:text-sm min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Cuisine Type</label>
                <Input
                  value={editData.cuisineType}
                  onChange={(e) => setEditData({ ...editData, cuisineType: e.target.value })}
                  placeholder="Cuisine Type"
                  className="text-xs sm:text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Ingredients (one per line, with amounts)</label>
                <Textarea
                  value={editData.ingredients}
                  onChange={(e) => setEditData({ ...editData, ingredients: e.target.value })}
                  placeholder="2 dl milk&#10;500 g flour&#10;3 eggs&#10;1 tsp salt"
                  className="text-xs sm:text-sm min-h-[100px] font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Instructions</label>
                <Textarea
                  value={editData.instructions}
                  onChange={(e) => setEditData({ ...editData, instructions: e.target.value })}
                  placeholder="Step-by-step cooking instructions..."
                  className="text-xs sm:text-sm min-h-[120px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1.5 hover:text-red-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <form onSubmit={handleAddTag} className="flex gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="flex-1 text-xs px-2 py-1 border rounded-md"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs bg-orange-500 text-white rounded-md hover:bg-orange-600"
                  >
                    Add
                  </button>
                </form>
              </div>
              <div className="space-y-2 pt-2">
                {isSaving && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${saveProgress}%` }}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave} 
                    size="sm" 
                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1 inline-block"></span>
                        {saveProgress < 100 ? `Saving... ${saveProgress}%` : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={handleCancel} 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    disabled={isSaving}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  {recipe.cuisineType}
                </Badge>
              </div>

              {/* Tags Section - Display only when not editing */}
              {tags.length > 0 && (
                <div className="border-t pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <RecipeDialog
        recipe={recipe}
        open={showRecipeDialog}
        onOpenChange={setShowRecipeDialog}
      />
    </>
  );
}
