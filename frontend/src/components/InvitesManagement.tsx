import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getInvites, createInvite, deleteInvite, getInviteStats, type Invite, type InviteStats } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { CopyButton } from '@/components/CopyButton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { AlertCircle, Plus, Trash2, CheckCircle2, Users } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

const inviteSchema = z.object({
  email: z.string().optional().refine(
    (val) => !val || val.trim() === '' || z.string().email().safeParse(val).success,
    { message: 'Please enter a valid email address' }
  ),
  expires: z.string().optional().refine(
    (val) => !val || val.trim() === '' || (!Number.isNaN(Number(val)) && Number(val) > 0),
    { message: 'Expires must be a positive number' }
  ),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export interface InvitesManagementRef {
  loadData: () => Promise<void>;
}

interface InvitesManagementProps {
  onError?: (error: string) => void;
  onInviteCreated?: (invite: Invite) => void;
  compact?: boolean;
}

export const InvitesManagement = forwardRef<InvitesManagementRef, InvitesManagementProps>(
  ({ onError, onInviteCreated }, ref) => {
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
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: '',
      expires: '',
    },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [invitesData, statsData] = await Promise.all([
        getInvites(),
        getInviteStats(),
      ]);
      setInvites(invitesData.invites);
      setStats(statsData.stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load invites';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const handleCreateInvite = async (values: InviteFormValues) => {
    setError('');
    setCreating(true);

    try {
      const expiresInDays = values.expires ? Number.parseInt(values.expires, 10) : undefined;
      const result = await createInvite(values.email || undefined, expiresInDays);
      setInvites([result.invite, ...invites]);
      setNewlyCreatedInvite(result.invite);
      inviteForm.reset();
      setShowCreateForm(false);
      await loadData(); // Reload stats
      onInviteCreated?.(result.invite);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create invite';
      setError(errorMessage);
      onError?.(errorMessage);
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
      await loadData(); // Reload stats
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete invite';
      setError(errorMessage);
      onError?.(errorMessage);
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
    const link = `${globalThis.location.origin}/signup?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Expose loadData for parent components
  useImperativeHandle(ref, () => ({
    loadData,
  }));

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
                      <FormMessage />
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
                      <FormMessage />
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
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      )}
      {!loading && invites.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No invites</EmptyTitle>
            <EmptyDescription>Create your first invite to get started</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {!loading && invites.length > 0 && (
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
                        <CopyButton
                          value={invite.token}
                          copiedValue={copiedToken}
                          onCopy={handleCopyToken}
                          tooltipText="Copy token"
                        />
                        <CopyButton
                          value={invite.token}
                          copiedValue={copiedLink}
                          onCopy={handleCopyLink}
                          tooltipText="Copy invite link"
                        />
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
    </>
  );
  }
);
InvitesManagement.displayName = 'InvitesManagement';
