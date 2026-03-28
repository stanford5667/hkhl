import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageLoader } from '@/components/shared/PageLoader';
import EliteOnboardingPage from '@/components/elite-assessment/EliteOnboardingPage';
import SimTrading from '@/pages/SimTrading';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EliteProfileViewer } from '@/components/elite-assessment/shared/EliteProfileViewer';
import { ClipboardList, Pencil } from 'lucide-react';

export default function ElitePortfolio() {
  const { user } = useAuth();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [profileData, setProfileData] = useState<Record<string, any> | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('elite_client_profiles' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfileData(data as any);
    setHasProfile(!!data);
  };

  useEffect(() => { loadProfile(); }, [user]);

  if (hasProfile === null) return <PageLoader />;

  if (!hasProfile || editing) {
    return (
      <EliteOnboardingPage
        onComplete={() => {
          setEditing(false);
          loadProfile();
        }}
      />
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-end gap-2 px-4 pt-4 pb-2">
        <Button variant="outline" size="sm" onClick={() => setShowProfile(true)}>
          <ClipboardList className="h-4 w-4 mr-2" /> View Profile
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Profile
        </Button>
      </div>

      <SimTrading />

      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Your Elite Profile</DialogTitle>
          </DialogHeader>
          {profileData && <EliteProfileViewer profile={profileData} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
