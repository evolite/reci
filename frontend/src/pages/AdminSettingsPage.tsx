import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { ChefHat, ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getSetting, updateSetting } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AVAILABLE_MODELS = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini ($0.25/$2.00)', description: 'Cheapest option' },
  { value: 'gpt-5', label: 'GPT-5 ($1.25/$10.00)', description: 'Balanced performance' },
  { value: 'gpt-5.1', label: 'GPT-5.1 ($1.25/$10.00)', description: 'Latest GPT-5 variant' },
  { value: 'gpt-5.2', label: 'GPT-5.2 ($1.75/$14.00)', description: 'Higher performance' },
  { value: 'gpt-4.1', label: 'GPT-4.1 ($2.00/$8.00)', description: 'Good balance' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini ($0.40/$1.60)', description: 'Budget GPT-4' },
  { value: 'gpt-4o', label: 'GPT-4o ($2.50/$10.00)', description: 'Original GPT-4o' },
];

export function AdminSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [openaiModel, setOpenaiModel] = useState('gpt-5-mini');

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/');
      return;
    }
    loadSettings();
  }, [user, navigate]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const setting = await getSetting('openai_model');
      setOpenaiModel(setting.value || 'gpt-5-mini');
    } catch (err) {
      // If setting doesn't exist, use default
      if (err instanceof Error && err.message.includes('404')) {
        setOpenaiModel('gpt-5-mini');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess(false);
      
      await updateSetting('openai_model', openaiModel, 'OpenAI model used for recipe analysis');
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-orange-500" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl shadow-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Admin Settings
              </h1>
              <p className="text-sm text-muted-foreground">Configure application settings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin/invites')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invites
            </Button>
            <Button onClick={() => navigate('/')} variant="outline">
              Back to Recipes
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Settings saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>OpenAI Model Configuration</CardTitle>
            <CardDescription>
              Change the OpenAI model used for recipe analysis. Changes take effect immediately without rebuilding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-model">Model</Label>
              <Select value={openaiModel} onValueChange={setOpenaiModel}>
                <SelectTrigger id="openai-model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Current model: <strong>{openaiModel}</strong>
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
