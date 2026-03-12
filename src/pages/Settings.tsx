import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, User, Wifi, Trash2, LogOut, Settings as SettingsIcon, Shield, Sparkles, Crown, Palette, CreditCard, ExternalLink, AlertTriangle, Key, Mail, Lock, LinkIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUsage } from "@/contexts/UsageContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { supabase } from "@/integrations/supabase/client";
import { clearAllCache } from "@/services/marketDataService";
import { clearMarketDataCache } from "@/services/MarketDataManager";
import { PageHeader, PAGE_ICON_PRESETS } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useUpgrade } from "@/hooks/useUpgrade";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  company: z.string().trim().max(100, "Company name is too long").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  company: string | null;
  avatar_url: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function Settings() {
  const { user, signOut, resetPassword } = useAuth();
  const { isPro } = useUsage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("profile");

  // Signed-out reset password (for people landing on /settings)
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", company: "" },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Check URL hash for billing tab
  useEffect(() => {
    if (window.location.hash === '#billing') {
      setActiveTab('billing');
    }
  }, []);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    if (data) {
      setProfile(data);
      setAvatarUrl(data.avatar_url);
      form.reset({
        fullName: data.full_name || "",
        company: data.company || "",
      });
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated.",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          company: data.company || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignedOutReset = async () => {
    const email = resetEmail.trim();
    if (!email) return;

    setResetSending(true);
    const { error } = await resetPassword(email);
    setResetSending(false);

    if (error) {
      toast({
        title: "Couldn't send reset email",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setResetEmailSent(true);
    toast({
      title: "Reset email sent",
      description: "Check your email for a password reset link.",
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // If a signed-out user lands on /settings, show login + reset password here.
  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent" />
          <div className="relative p-6 lg:p-8 max-w-4xl mx-auto">
            <PageHeader
              icon={SettingsIcon}
              title="Account Settings"
              subtitle="Sign in to manage your account"
              {...PAGE_ICON_PRESETS.violet}
            />
          </div>
        </div>

        <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
          <Card className="glass-card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent" />
            <CardHeader className="relative">
              <CardTitle className="text-lg">Quick access</CardTitle>
              <CardDescription>Log in, create an account, or reset your password.</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                <Button onClick={() => navigate("/auth")}>Log in</Button>
                <Button variant="outline" onClick={() => navigate("/auth")}>Sign up</Button>
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Reset password</p>
                </div>

                {resetEmailSent ? (
                  <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
                    <p className="text-sm text-foreground">Reset link sent.</p>
                    <p className="text-xs text-muted-foreground mt-1">Check your inbox (and spam folder).</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-foreground">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@company.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSignedOutReset}
                      disabled={resetSending || !resetEmail.trim()}
                      className="gap-2"
                    >
                      {resetSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Send reset link
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      We’ll email you a link to set a new password.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Gradient Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-500/5 to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl opacity-20" />
        
        <div className="relative p-6 lg:p-8 max-w-4xl mx-auto">
          <PageHeader
            icon={SettingsIcon}
            title="Account Settings"
            subtitle="Manage your profile, subscription, and preferences"
            {...PAGE_ICON_PRESETS.violet}
          />
        </div>
      </div>

      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-secondary/50 p-1">
            <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-background">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-background">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2 data-[state=active]:bg-background">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-background">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-2 data-[state=active]:bg-background">
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Affiliate</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={cardVariants}>
                <Card className="glass-card overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full" />
                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/30">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Profile Information</CardTitle>
                        <CardDescription>
                          Update your personal details and profile picture
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 relative">
                    {/* Avatar Section */}
                    <div className="flex items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-secondary/50 to-transparent border border-border/50">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-violet-500/50 rounded-full blur opacity-25 group-hover:opacity-50 transition-opacity" />
                        <Avatar className="relative h-24 w-24 border-2 border-primary/30">
                          <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary text-xl font-semibold">
                            {getInitials(profile?.full_name || null)}
                          </AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          disabled={isUploading}
                          className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          {isUploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          ) : (
                            <Camera className="h-6 w-6 text-foreground" />
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                          Profile Picture
                          {isPro && <Sparkles className="h-4 w-4 text-amber-400" />}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Click to upload a new photo. Max 5MB.
                        </p>
                      </div>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-foreground font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ""}
                          disabled
                          className="bg-secondary/50 border-border text-muted-foreground"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-foreground font-medium">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Smith"
                          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50"
                          {...form.register("fullName")}
                        />
                        {form.formState.errors.fullName && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-foreground font-medium">Company</Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Acme Capital"
                          className="bg-secondary border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/50"
                          {...form.register("company")}
                        />
                        {form.formState.errors.company && (
                          <p className="text-sm text-destructive">
                            {form.formState.errors.company.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-4">
                        <Button type="submit" disabled={isLoading} className="gap-2">
                          {isLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={cardVariants}>
                <SubscriptionManagement />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Appearance Settings */}
              <motion.div variants={cardVariants}>
                <Card className="glass-card overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-bl-full" />
                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                        <Palette className="h-5 w-5 text-violet-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Appearance</CardTitle>
                        <CardDescription>
                          Customize the look and feel of the app
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/50">
                      <div>
                        <h3 className="font-semibold text-foreground">Theme</h3>
                        <p className="text-sm text-muted-foreground">
                          Switch between light and dark mode
                        </p>
                      </div>
                      <ThemeToggle />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Market Data Settings */}
              <motion.div variants={cardVariants}>
                <MarketDataSettings />
              </motion.div>
            </motion.div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <motion.div 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {/* Password Change */}
              <motion.div variants={cardVariants}>
                <SecuritySettings />
              </motion.div>

              {/* Sign Out */}
              <motion.div variants={cardVariants}>
                <Card className="glass-card overflow-hidden border-rose-500/20">
                  <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent" />
                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30">
                        <LogOut className="h-5 w-5 text-rose-400" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Session</CardTitle>
                        <CardDescription>
                          Sign out of your account
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <Button 
                      variant="destructive" 
                      onClick={async () => {
                        try {
                          await signOut();
                          window.location.href = '/';
                        } catch (error) {
                          console.error('Sign out failed:', error);
                        }
                      }}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Delete Account */}
              <motion.div variants={cardVariants}>
                <Card className="glass-card overflow-hidden border-destructive/30">
                  <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-transparent to-transparent" />
                  <CardHeader className="relative">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/20 border border-destructive/30">
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                        <CardDescription>
                          Permanently delete your account and all data
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-2">
                          <Trash2 className="h-4 w-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove all your data from our servers, including portfolios, studies,
                            and saved configurations.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                              // TODO: Implement account deletion
                              console.log("Account deletion requested");
                            }}
                          >
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <p className="text-xs text-muted-foreground mt-3">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Affiliate Program Card */}
        {user && (
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <LinkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Affiliate Program</CardTitle>
                    <CardDescription>Earn recurring commissions by referring new users</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Join our affiliate program to earn 20% recurring commission on every referral. Get your unique link, track clicks &amp; conversions, and grow your earnings.
                </p>
                <Button onClick={() => navigate('/affiliate')} variant="outline" className="gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Go to Affiliate Dashboard
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SecuritySettings() {
  const { user, resetPassword } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setIsLoading(true);
    try {
      const { error } = await resetPassword(user.email);
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for a link to reset your password.",
      });
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast({
        title: "Failed to send reset email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full" />
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
            <Lock className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Password & Authentication</CardTitle>
            <CardDescription>
              Manage your password and security settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Email</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Key className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground">••••••••••••</p>
            </div>
          </div>
        </div>

        <Button 
          variant="outline" 
          onClick={handlePasswordReset}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lock className="h-4 w-4" />
          )}
          Change Password
        </Button>
        <p className="text-xs text-muted-foreground">
          We'll send you an email with a link to reset your password
        </p>
      </CardContent>
    </Card>
  );
}

function MarketDataSettings() {
  const { toast } = useToast();
  const { marketDataEnabled, setMarketDataEnabled, apiCallCount } = useDevMode();

  const handleClearCache = () => {
    clearAllCache();
    clearMarketDataCache();
    toast({
      title: "Cache cleared",
      description: "All cached market data has been cleared.",
    });
  };

  return (
    <Card className="glass-card overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full" />
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
            <Wifi className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Market Data</CardTitle>
            <CardDescription>
              Control live market data fetching
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 relative">
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-secondary/50 to-transparent border border-border/50">
          <div className="space-y-0.5">
            <Label htmlFor="market-data-toggle" className="text-foreground font-medium">
              Enable live market data
            </Label>
            <p className="text-sm text-muted-foreground">
              When disabled, the app shows cached data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              marketDataEnabled 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {marketDataEnabled ? 'Live' : 'Cached'}
            </div>
            <Switch
              id="market-data-toggle"
              checked={marketDataEnabled}
              onCheckedChange={setMarketDataEnabled}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
            <p className="text-sm font-medium text-muted-foreground mb-1">API calls this session</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{apiCallCount}</p>
          </div>
          <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
            <p className="text-sm font-medium text-muted-foreground mb-1">Cache Status</p>
            <p className="text-lg font-semibold text-emerald-400">Active</p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClearCache}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear cached data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubscriptionManagement() {
  const { toast } = useToast();
  const { isPro, refreshUsage } = useUsage();
  const [isLoading, setIsLoading] = useState(false);
  const { startCheckout } = useUpgrade();

  const handleManageSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Opening billing portal",
          description: "Manage your subscription in the new tab.",
        });
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Unable to open billing portal. You may not have an active subscription.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card overflow-hidden border-primary/20">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-purple-500/5" />
      <CardHeader className="relative">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Subscription</CardTitle>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isPro 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : 'bg-muted text-muted-foreground border border-border'
              }`}>
                {isPro ? '✨ Pro Plan' : 'Free Plan'}
              </span>
            </div>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {isPro ? (
          <>
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <span className="font-semibold text-foreground">Pro Member</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You have access to all premium features including unlimited studies, saves, and AI analyses.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                variant="outline" 
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage Subscription
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Cancel, update payment method, or change your plan through our secure billing portal
              </p>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-500">No Refunds Policy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All sales are final. If you cancel, you'll retain Pro access until the end of your billing period.
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to Pro for unlimited access to all features:
              </p>
              <ul className="text-sm space-y-2">
                <li className="flex items-center gap-2 text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Unlimited portfolio saves
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  All 100+ quant studies
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Deep conditional probability studies
                </li>
                <li className="flex items-center gap-2 text-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Extended historical timeframes
                </li>
              </ul>
            </div>
            
            <Button 
              onClick={() => startCheckout()}
              className="w-full gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
            >
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
