import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { PageHeader } from '@/components/PageHeader';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, Save, Settings, Users } from 'lucide-react';
import { AVAILABLE_MODELS } from '@/lib/constants';
import { useSettings } from '@/hooks/useSettings';
import { InvitesManagement, type InvitesManagementRef } from '@/components/InvitesManagement';

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
    openaiModel,
    setOpenaiModel,
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
                  <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                    {settingsSaving ? (
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
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}
