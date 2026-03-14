import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/ui/spinner';
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AI_PROVIDERS, PROVIDER_MODELS } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function AdminSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    loading,
    saving,
    error,
    success,
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    saveSettings: handleSave,
  } = useSettings();

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  const isCustomProvider = provider === 'custom';
  const providerModels = PROVIDER_MODELS[provider] ?? [];
  const isKnownProvider = !isCustomProvider && providerModels.length > 0;

  return (
    <div className="min-h-screen bg-brand-page">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <PageHeader
          title="Admin Settings"
          description="Configure application settings"
          actions={
            <>
              <Button onClick={() => navigate('/admin/invites')} variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invites
              </Button>
              <Button onClick={() => navigate('/')} variant="outline">
                Back to Recipes
              </Button>
            </>
          }
        />

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
            <CardTitle>AI Provider Configuration</CardTitle>
            <CardDescription>
              Configure the AI provider and model used for recipe analysis. Changes take effect immediately without rebuilding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger id="ai-provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-api-key">API Key</Label>
              <Input
                id="ai-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Leave empty to use OPENAI_API_KEY environment variable"
              />
              <p className="text-xs text-muted-foreground">
                Falls back to <code>OPENAI_API_KEY</code> env var if empty.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-base-url">Base URL</Label>
              <Input
                id="ai-base-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                readOnly={!isCustomProvider}
                className={isCustomProvider ? '' : 'opacity-60 cursor-not-allowed'}
              />
              {!isCustomProvider && (
                <p className="text-xs text-muted-foreground">
                  Auto-configured for the selected provider.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-model">Model</Label>
              {isKnownProvider ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="ai-model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="ai-model"
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama3, mistral, gpt-4o"
                />
              )}
              <p className="text-xs text-muted-foreground">
                Current model: <strong>{model}</strong>
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
