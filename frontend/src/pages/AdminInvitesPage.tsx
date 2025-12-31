import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInvites, createInvite, deleteInvite, getInviteStats, type Invite, type InviteStats } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
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
import { ChefHat, AlertCircle, Plus, Trash2, Copy, CheckCircle2 } from 'lucide-react';

interface InviteFormValues {
  email: string;
  expires: string;
}

export function AdminInvitesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [newlyCreatedInvite, setNewlyCreatedInvite] = useState<Invite | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [inviteIdToDelete, setInviteIdToDelete] = useState<string | null>(null);
  
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
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      const [invitesData, statsData] = await Promise.all([
        getInvites(),
        getInviteStats(),
      ]);
      setInvites(invitesData.invites);
      setStats(statsData.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (values: InviteFormValues) => {
    setError('');
    setCreating(true);

    try {
      const expiresInDays = values.expires ? parseInt(values.expires) : undefined;
      const result = await createInvite(values.email || undefined, expiresInDays);
      setInvites([result.invite, ...invites]);
      setNewlyCreatedInvite(result.invite);
      inviteForm.reset();
      setShowCreateForm(false);
      await loadData(); // Reload stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = (inviteId: string) => {
    setInviteIdToDelete(inviteId);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!inviteIdToDelete) return;

    try {
      await deleteInvite(inviteIdToDelete);
      setInvites(invites.filter(inv => inv.id !== inviteIdToDelete));
      await loadData(); // Reload stats
      setShowDeleteDialog(false);
      setInviteIdToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invite');
      setShowDeleteDialog(false);
      setInviteIdToDelete(null);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getInviteLink = (token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/signup?token=${token}`;
  };

  const handleCopyLink = (token: string) => {
    const link = getInviteLink(token);
    navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-2.5 rounded-xl shadow-lg">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Invite Management
              </h1>
              <p className="text-sm text-muted-foreground">Manage user invites</p>
            </div>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Recipes
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {newlyCreatedInvite && (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="space-y-3">
                <p className="font-semibold">Invite created successfully!</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white dark:bg-gray-800 px-3 py-2 rounded border border-green-200 dark:border-green-800 break-all">
                      {getInviteLink(newlyCreatedInvite.token)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(newlyCreatedInvite.token)}
                      className="shrink-0"
                    >
                      {copiedLink === newlyCreatedInvite.token ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this link with the person you want to invite. They can click it to register.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewlyCreatedInvite(null)}
                  className="mt-2"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

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

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invites</CardTitle>
                <CardDescription>Manage and create invite codes</CardDescription>
              </div>
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invite
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCreateForm && (
              <>
                <Separator className="mb-4" />
                <Form {...inviteForm}>
                  <form onSubmit={inviteForm.handleSubmit(handleCreateInvite)} className="mb-6 p-4 border rounded-lg space-y-4">
                    <FormField
                      control={inviteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Restrict to specific email (optional)"
                              {...field}
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
                              type="number"
                              placeholder="e.g., 7 (leave empty for no expiration)"
                              min="1"
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" disabled={creating}>
                        {creating ? 'Creating...' : 'Create Invite'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => {
                        setShowCreateForm(false);
                        inviteForm.reset();
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token</TableHead>
                    <TableHead>Email Restriction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0">
                        <Empty className="py-12">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <ChefHat className="h-6 w-6" />
                            </EmptyMedia>
                            <EmptyTitle>No invites yet</EmptyTitle>
                            <EmptyDescription>
                              Create one to get started.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                                {invite.token.substring(0, 16)}...
                              </code>
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
                                  <TooltipContent>
                                    <p>Copy token</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            {!invite.used && !invite.expired && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => handleCopyLink(invite.token)}
                              >
                                {copiedLink === invite.token ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                                    Link Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy Invite Link
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{invite.email || '-'}</TableCell>
                        <TableCell>
                          {invite.used ? (
                            <Badge variant="default" className="bg-green-600">Used</Badge>
                          ) : invite.expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-600">Available</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(invite.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {invite.expiresAt
                            ? new Date(invite.expiresAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          {invite.usedBy ? invite.usedBy.email : '-'}
                        </TableCell>
                        <TableCell>
                          {!invite.used && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteInvite(invite.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invite? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setInviteIdToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
