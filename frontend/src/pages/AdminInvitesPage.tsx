import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInvites, createInvite, deleteInvite, getInviteStats, type Invite, type InviteStats } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChefHat, AlertCircle, Plus, Trash2, Copy, CheckCircle2 } from 'lucide-react';

export function AdminInvitesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [newInviteExpires, setNewInviteExpires] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [newlyCreatedInvite, setNewlyCreatedInvite] = useState<Invite | null>(null);

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

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    try {
      const expiresInDays = newInviteExpires ? parseInt(newInviteExpires) : undefined;
      const result = await createInvite(newInviteEmail || undefined, expiresInDays);
      setInvites([result.invite, ...invites]);
      setNewlyCreatedInvite(result.invite);
      setNewInviteEmail('');
      setNewInviteExpires('');
      setShowCreateForm(false);
      await loadData(); // Reload stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) {
      return;
    }

    try {
      await deleteInvite(inviteId);
      setInvites(invites.filter(inv => inv.id !== inviteId));
      await loadData(); // Reload stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete invite');
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
        <div className="text-center">Loading...</div>
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
              <form onSubmit={handleCreateInvite} className="mb-6 p-4 border rounded-lg space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newInviteEmail}
                    onChange={(e) => setNewInviteEmail(e.target.value)}
                    placeholder="Restrict to specific email (optional)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires">Expires In (Days, Optional)</Label>
                  <Input
                    id="expires"
                    type="number"
                    value={newInviteExpires}
                    onChange={(e) => setNewInviteExpires(e.target.value)}
                    placeholder="e.g., 7 (leave empty for no expiration)"
                    min="1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Invite'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No invites yet. Create one to get started.
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyToken(invite.token)}
                                title="Copy token"
                              >
                                {copiedToken === invite.token ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
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
                            <span className="text-green-600">Used</span>
                          ) : invite.expired ? (
                            <span className="text-red-600">Expired</span>
                          ) : (
                            <span className="text-blue-600">Available</span>
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
    </div>
  );
}
