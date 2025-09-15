import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserDetailModal } from '@/components/UserDetailModal';
import { Search, Users, UserCheck, UserX, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface User {
  user_id: string;
  email: string;
  created_at: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
  is_blocked: boolean;
  block_reason?: string;
  blocked_at?: string;
  blocked_by_email?: string;
  total_cards_owned: number;
  pending_redemptions: number;
  credited_redemptions: number;
  total_scans: number;
  last_activity?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  newUsersToday: number;
}

export default function AdminUsers() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({ totalUsers: 0, activeUsers: 0, blockedUsers: 0, newUsersToday: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Admin check
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!loading && !user) {
        navigate('/auth/login');
        return;
      }
      
      if (!user) return;
      
      const { data, error } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (!mounted) return;
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(!!data);
    })();
    return () => {
      mounted = false;
    };
  }, [user, loading, navigate]);

  // Load data when admin status is confirmed
  useEffect(() => {
    if (isAdmin === true) {
      loadUsers();
      calculateStats();
    }
  }, [isAdmin, searchTerm, statusFilter]);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.rpc('admin_list_users', {
        p_search: searchTerm || null,
        p_status_filter: statusFilter || null,
        p_limit: 100,
        p_offset: 0
      });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      const { data: allUsers } = await supabase.rpc('admin_list_users', {
        p_limit: 1000
      });

      if (allUsers) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const stats: UserStats = {
          totalUsers: allUsers.length,
          activeUsers: allUsers.filter(u => !u.is_blocked).length,
          blockedUsers: allUsers.filter(u => u.is_blocked).length,
          newUsersToday: allUsers.filter(u => new Date(u.created_at) >= today).length
        };
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  const handleBlockUser = async (userId: string, reason?: string) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('admin_block_user_by_email', {
        p_email: user.email,
        p_reason: reason || 'Admin action'
      });

      if (error) throw error;

      toast({
        title: 'User Blocked',
        description: `${user.email} has been blocked`
      });
      
      loadUsers();
      calculateStats();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to block user',
        variant: 'destructive'
      });
    }
  };

  const handleUnblockUser = async (userId: string) => {
    const user = users.find(u => u.user_id === userId);
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('admin_unblock_user_by_email', {
        p_email: user.email
      });

      if (error) throw error;

      toast({
        title: 'User Unblocked',
        description: `${user.email} has been unblocked`
      });
      
      loadUsers();
      calculateStats();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Error',
        description: 'Failed to unblock user',
        variant: 'destructive'
      });
    }
  };

  const handleBulkAction = async (action: 'block' | 'unblock') => {
    if (selectedUsers.size === 0) return;

    try {
      const promises = Array.from(selectedUsers).map(userId => {
        return action === 'block' 
          ? handleBlockUser(userId, 'Bulk admin action')
          : handleUnblockUser(userId);
      });

      await Promise.all(promises);
      setSelectedUsers(new Set());
      
      toast({
        title: 'Bulk Action Complete',
        description: `${action === 'block' ? 'Blocked' : 'Unblocked'} ${selectedUsers.size} users`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Some bulk actions failed',
        variant: 'destructive'
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-panel p-8 rounded-2xl text-center">
          <div className="text-destructive text-lg font-medium">Access Denied</div>
          <div className="text-muted-foreground mt-2">You are not authorized to access user management.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-muted-foreground">Manage and monitor user accounts</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked Users</CardTitle>
              <UserX className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.blockedUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Today</CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.newUsersToday}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Users</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="blocked">Blocked Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('block')}
                >
                  Block Selected ({selectedUsers.size})
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleBulkAction('unblock')}
                >
                  Unblock Selected ({selectedUsers.size})
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
            <CardDescription>
              Manage user accounts, permissions, and activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(new Set(users.map(u => u.user_id)));
                            } else {
                              setSelectedUsers(new Set());
                            }
                          }}
                          checked={selectedUsers.size === users.length && users.length > 0}
                        />
                      </TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cards</TableHead>
                      <TableHead>Redemptions</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.user_id)}
                            onChange={() => toggleUserSelection(user.user_id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.email}
                          {!user.email_confirmed_at && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Unverified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_blocked ? "destructive" : "default"}>
                            {user.is_blocked ? 'Blocked' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.total_cards_owned}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{user.credited_redemptions} credited</div>
                            <div className="text-muted-foreground">{user.pending_redemptions} pending</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {user.last_activity 
                            ? formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              View
                            </Button>
                            {user.is_blocked ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnblockUser(user.user_id)}
                              >
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBlockUser(user.user_id)}
                              >
                                Block
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {users.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No users found matching your criteria
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail Modal */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onUserUpdated={() => {
              loadUsers();
              calculateStats();
            }}
          />
        )}
      </div>
    </div>
  );
}