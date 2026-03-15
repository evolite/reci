import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Settings, Users } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { InvitesManagement, type InvitesManagementRef } from '@/components/InvitesManagement';
import { AIProviderConfigForm } from '@/components/AIProviderConfigForm';

export function AdminPanelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('invites');
  const invitesManagementRef = useRef<InvitesManagementRef>(null);

  // Settings
  const {
    loading: settingsLoading,
    saving: settingsSaving,
    error: settingsError,
    success: settingsSuccess,
    provider,
    setProvider,
    model,
    setModel,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    saveSettings: handleSaveSettings,
  } = useSettings();

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);


  if (settingsLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-brand-page">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <PageHeader
          title="Admin Panel"
          description="Manage invites and settings"
          actions={
            <Button onClick={() => navigate('/')} variant="outline">
              Back to Recipes
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="invites">
              <Users className="w-4 h-4 mr-2" />
              Invites
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="mt-6">
            <InvitesManagement ref={invitesManagementRef} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            {settingsError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{settingsError}</AlertDescription>
              </Alert>
            )}

            {settingsSuccess && (
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
                saving={settingsSaving}
                onSave={handleSaveSettings}
              />
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
