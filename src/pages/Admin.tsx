import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Users, CreditCard, Activity, AlertCircle } from 'lucide-react';

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('user');
  const [loading, setLoading] = useState(true);

  // Check authentication and role
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth/login');
      return;
    }

    if (user) {
      checkUserRole();
    }
  }, [user, authLoading, navigate]);

  const checkUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      const role = data?.role || 'user';
      setUserRole(role);

      if (role !== 'admin' && role !== 'superadmin') {
        navigate('/');
      }
    } catch (err) {
      console.error('Error checking user role:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <div className="glass-panel p-8 rounded-2xl max-w-md mx-auto">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || (userRole !== 'admin' && userRole !== 'superadmin')) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass-panel p-8 rounded-2xl text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don't have permission to access the admin area.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome, <span className="text-foreground font-medium">{user.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">Coming Soon</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
                <p className="text-2xl font-bold">500+</p>
              </div>
              <CreditCard className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Claims Today</p>
                <p className="text-2xl font-bold">Coming Soon</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Cards</p>
                <p className="text-2xl font-bold">Coming Soon</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Main Content Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Redemptions Queue Placeholder */}
          <div className="glass-panel p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Redemptions Queue</h2>
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                Redemption management will be available in the next update.
              </p>
            </div>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="glass-panel p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                User activity tracking will be available soon.
              </p>
            </div>
          </div>
        </div>

        {/* Development Note */}
        <div className="mt-8 glass-panel p-6 rounded-xl border-l-4 border-l-primary">
          <h3 className="font-semibold mb-2">Development Note</h3>
          <p className="text-sm text-muted-foreground">
            This is the admin dashboard stub. Additional features like user management, 
            card analytics, and redemption queues will be implemented in future updates 
            as the platform grows.
          </p>
        </div>
      </div>
    </div>
  );
}