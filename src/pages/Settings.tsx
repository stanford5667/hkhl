import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, User, Wifi, WifiOff, Trash2, LogOut, Settings as SettingsIcon, Shield, Sparkles, Crown, Palette } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDevMode } from "@/contexts/DevModeContext";
import { supabase } from "@/integrations/supabase/client";
import { clearAllCache } from "@/services/marketDataService";
import { clearMarketDataCache } from "@/services/MarketDataManager";
import { PageHeader, PAGE_ICON_PRESETS } from "@/components/layout/PageHeader";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

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
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: "", company: "" },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
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

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
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

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || "U";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
            subtitle="Manage your profile, preferences, and account security"
            {...PAGE_ICON_PRESETS.violet}
          />
        </div>
      </div>

      <motion.div 
        className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >

        {/* Profile Card */}
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
                    <Sparkles className="h-4 w-4 text-amber-400" />
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

        {/* Premium Features Teaser */}
        <motion.div variants={cardVariants}>
          <Card className="glass-card overflow-hidden border-amber-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-orange-500/5" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <Crown className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Premium Features
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                      Coming Soon
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Unlock advanced analytics and exclusive insights
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "AI Portfolio Advisor", icon: "🤖" },
                  { label: "Real-time Alerts", icon: "⚡" },
                  { label: "Priority Support", icon: "🎯" },
                ].map((feature) => (
                  <div 
                    key={feature.label}
                    className="p-3 rounded-lg bg-secondary/50 border border-border/50 text-center"
                  >
                    <span className="text-2xl mb-2 block">{feature.icon}</span>
                    <span className="text-sm font-medium text-muted-foreground">{feature.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sign Out Section */}
        <motion.div variants={cardVariants}>
          <Card className="glass-card overflow-hidden border-rose-500/20">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30">
                  <Shield className="h-5 w-5 text-rose-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account Security</CardTitle>
                  <CardDescription>
                    Manage your session and sign out securely
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
                    toast({
                      title: "Signed out",
                      description: "You have been logged out successfully.",
                    });
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Sign out failed:', error);
                    toast({
                      title: "Sign out failed",
                      description: "Please try again.",
                      variant: "destructive",
                    });
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
      </motion.div>
    </div>
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
              Control live market data fetching to manage API costs
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
              When disabled, the app shows cached data to reduce API costs
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
            Clear all cached market data
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            This will clear all locally cached prices and force fresh data on next fetch
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
