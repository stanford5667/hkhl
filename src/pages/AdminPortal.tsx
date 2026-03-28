import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Database, Settings, BarChart3, Loader2, Zap, GraduationCap, LinkIcon, ClipboardList } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { AdminUsersTab } from '@/components/admin/AdminUsersTab';
import { AdminContentTab } from '@/components/admin/AdminContentTab';
import { AdminSettingsTab } from '@/components/admin/AdminSettingsTab';
import { AdminAnalyticsTab } from '@/components/admin/AdminAnalyticsTab';
import { AdminApiUsageTab } from '@/components/admin/AdminApiUsageTab';
import { AdminCoursesTab } from '@/components/admin/AdminCoursesTab';
import { AdminAffiliatesTab } from '@/components/admin/AdminAffiliatesTab';
import { AdminQuestionnairesTab } from '@/components/admin/AdminQuestionnairesTab';

export default function AdminPortal() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin && user) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, user, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground">Manage users, content, courses, affiliates, questionnaires, and view analytics</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-8 bg-muted/50">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Courses</span>
          </TabsTrigger>
          <TabsTrigger value="affiliates" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Affiliates</span>
          </TabsTrigger>
          <TabsTrigger value="questionnaires" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Surveys</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="api-usage" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">API Usage</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <AdminCoursesTab />
        </TabsContent>

        <TabsContent value="affiliates" className="mt-6">
          <AdminAffiliatesTab />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <AdminContentTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <AdminSettingsTab />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AdminAnalyticsTab />
        </TabsContent>

        <TabsContent value="api-usage" className="mt-6">
          <AdminApiUsageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
