import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { AIProviderConfigForm } from '@/components/AIProviderConfigForm';

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
          <AIProviderConfigForm
            provider={provider}
            setProvider={setProvider}
            model={model}
            setModel={setModel}
            apiKey={apiKey}
            setApiKey={setApiKey}
            baseUrl={baseUrl}
            setBaseUrl={setBaseUrl}
            saving={saving}
            onSave={handleSave}
          />
        </Card>
      </div>
    </div>
  );
}
