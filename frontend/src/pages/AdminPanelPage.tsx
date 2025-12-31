import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInvites, createInvite, deleteInvite, getInviteStats, type Invite, type InviteStats } from '@/lib/api';
import { getSetting, updateSetting } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChefHat, AlertCircle, Plus, Trash2, Copy, CheckCircle2, Save, Settings, Users } from 'lucide-react';

interface InviteFormValues {
  email: string;
  expires: string;
}

const AVAILABLE_MODELS = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini ($0.25/$2.00)', description: 'Cheapest option' },
  { value: 'gpt-5', label: 'GPT-5 ($1.25/$10.00)', description: 'Balanced performance' },
  { value: 'gpt-5.1', label: 'GPT-5.1 ($1.25/$10.00)', description: 'Latest GPT-5 variant' },
  { value: 'gpt-5.2', label: 'GPT-5.2 ($1.75/$14.00)', description: 'Higher performance' },
  { value: 'gpt-4.1', label: 'GPT-4.1 ($2.00/$8.00)', description: 'Good balance' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini ($0.40/$1.60)', description: 'Budget GPT-4' },
  { value: 'gpt-4o', label: 'GPT-4o ($2.50/$10.00)', description: 'Original GPT-4o' },
];

export function AdminPanelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('invites');
  
  // Invites state
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [invitesError, setInvitesError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [newlyCreatedInvite, setNewlyCreatedInvite] = useState<Invite | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [inviteIdToDelete, setInviteIdToDelete] = useState<string | null>(null);
  
  // Settings state
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [openaiModel, setOpenaiModel] = useState('gpt-5-mini');
  
  const inviteForm = useForm<InviteFormValues>({
    defaultValues: {
      email: '',
      expires: '',
    },
  });

  useEffect(() => {
    if (!user || !user.isAdmin) {
      navigate('/');
      return;
    }
    loadInvitesData();
    loadSettings();
  }, [user, navigate]);

  // Invites functions
  const loadInvitesData = async () => {
    try {
      setInvitesLoading(true);
      setInvitesError('');
      const [invitesData, statsData] = await Promise.all([
        getInvites(),
        getInviteStats(),
      ]);
      setInvites(invitesData.invites);
      setStats(statsData.stats);
    } catch (err) {
      setInvitesError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleCreateInvite = async (values: InviteFormValues) => {
    setInvitesError('');
    setCreating(true);

    try {
      const expiresInDays = values.expires ? parseInt(values.expires) : undefined;
      const result = await createInvite(values.email || undefined, expiresInDays);
      setInvites([result.invite, ...invites]);
      setNewlyCreatedInvite(result.invite);
      inviteForm.reset();
      setShowCreateForm(false);
      await loadInvitesData(); // Reload stats
    } catch (err) {
      setInvitesError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = (inviteId: string) => {
    setInviteIdToDelete(inviteId);
    setShowDeleteDialog(true);
  };

  const confirmDeleteInvite = async () => {
    if (!inviteIdToDelete) return;

    try {
      await deleteInvite(inviteIdToDelete);
      setInvites(invites.filter(inv => inv.id !== inviteIdToDelete));
      await loadInvitesData(); // Reload stats
    } catch (err) {
      setInvitesError(err instanceof Error ? err.message : 'Failed to delete invite');
    } finally {
      setShowDeleteDialog(false);
      setInviteIdToDelete(null);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/signup?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Settings functions
  const loadSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError('');
      const setting = await getSetting('openai_model');
      setOpenaiModel(setting.value || 'gpt-5-mini');
    } catch (err) {
      // If setting doesn't exist, use default (don't show error)
      if (err instanceof Error && (err.message.includes('404') || err.message.includes('Setting not found'))) {
        setOpenaiModel('gpt-5-mini');
        setSettingsError(''); // Clear any error
      } else {
        setSettingsError(err instanceof Error ? err.message : 'Failed to load settings');
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError('');
      setSettingsSuccess(false);
      
      await updateSetting('openai_model', openaiModel, 'OpenAI model used for recipe analysis');
      
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  if (invitesLoading && settingsLoading) {
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl shadow-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground">Manage invites and settings</p>
            </div>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Recipes
          </Button>
        </div>

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
            {invitesError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{invitesError}</AlertDescription>
              </Alert>
            )}

            {newlyCreatedInvite && (
              <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Invite created successfully! Token: <strong>{newlyCreatedInvite.token}</strong>
                </AlertDescription>
              </Alert>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Invites</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Used</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.used}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Available</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stats.unused}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Expired</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Create Invite Form */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Create New Invite</CardTitle>
                    <CardDescription>Generate an invite token for new users</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateForm(!showCreateForm);
                      inviteForm.reset();
                    }}
                  >
                    {showCreateForm ? 'Cancel' : <Plus className="w-4 h-4 mr-2" />}
                    {showCreateForm ? 'Cancel' : 'New Invite'}
                  </Button>
                </div>
              </CardHeader>
              {showCreateForm && (
                <CardContent>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(handleCreateInvite)} className="space-y-4">
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="email"
                                placeholder="user@example.com"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={inviteForm.control}
                        name="expires"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expires In (Days, Optional)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="30"
                                min="1"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" disabled={creating}>
                        {creating ? (
                          <>
                            <Spinner className="w-4 h-4 mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Invite
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              )}
            </Card>

            {/* Invites List */}
            {invitesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : invites.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No invites</EmptyTitle>
                  <EmptyDescription>Create your first invite to get started</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Invites</CardTitle>
                  <CardDescription>Manage user invites</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Token</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-mono text-xs">
                            {invite.token.substring(0, 20)}...
                          </TableCell>
                          <TableCell>{invite.email || 'No email'}</TableCell>
                          <TableCell>
                            {invite.usedAt ? (
                              <Badge variant="secondary">Used</Badge>
                            ) : (
                              <Badge>Available</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {invite.expiresAt
                              ? new Date(invite.expiresAt).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyToken(invite.token)}
                                    >
                                      {copiedToken === invite.token ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy token</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopyLink(invite.token)}
                                    >
                                      {copiedLink === invite.token ? (
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Copy invite link</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              {!invite.usedAt && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteInvite(invite.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invite</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this invite? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteInvite} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
