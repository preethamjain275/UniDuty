import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Save, Trash2, KeyRound, Eye, EyeOff, ContactRound, User, Mail, Building2, MapPin, Phone, ShieldAlert, BadgeInfo, Image } from "lucide-react";
import { toast } from "sonner";

import { AppShell, useMe } from "@/components/AppShell";
import { updateProfile } from "@/lib/invigilation.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function readMockUser() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("mock_user") : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function facultyRecordId(me: any) {
  const mock = readMockUser();
  const p = { ...(me?.profile || {}), ...(me || {}), ...(mock || {}) };
  const id = p.employee_id || mock?.employee_id || mock?.id || p.id;
  if (!id || id === "demo-admin-id") return mock?.employee_id || mock?.id || null;
  return id;
}

function ProfilePage() {
  const { data: meServer } = useMe();
  const [mockUser, setMockUser] = useState(() => readMockUser());
  const me = {
    ...meServer,
    ...mockUser,
    profile: {
      ...(meServer?.profile || {}),
      ...(mockUser || {}),
      id: mockUser?.id || mockUser?.employee_id || meServer?.profile?.id,
    },
    full_name: mockUser?.full_name || meServer?.full_name || meServer?.profile?.full_name,
    isAdmin: mockUser?.role === "admin" || Boolean(meServer?.isAdmin && !mockUser),
  };
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateProfile);

  const [phone, setPhone] = useState("");
  const [office, setOffice] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const p = { ...(meServer?.profile || {}), ...(mockUser || {}) } as any;
    setPhone(p.phone || "");
    setOffice(p.office || "");
    setEmergencyPhone(p.emergency_phone || "");
    setAvatarUrl(p.avatar_url || null);
    setBannerUrl(p.banner_url || null);
  }, [meServer, mockUser]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const id = facultyRecordId(me);
      if (!id) throw new Error("Not logged in");
      return updateFn({ data: { id: String(id), ...data } });
    },
    onSuccess: (res, variables) => {
      if (res.ok) {
        toast.success("Profile updated successfully!");
        
        // Sync local storage if using mock user
        const mockUserStr = localStorage.getItem("mock_user");
        if (mockUserStr) {
          try {
            const currentMock = JSON.parse(mockUserStr);
            const updatedMock = { ...currentMock, ...variables };
            if (variables.avatar_url !== undefined) updatedMock.avatar_url = variables.avatar_url;
            if (variables.banner_url !== undefined) updatedMock.banner_url = variables.banner_url;
            if (variables.password !== undefined) updatedMock.password = variables.password;
            localStorage.setItem("mock_user", JSON.stringify(updatedMock));
            setMockUser(updatedMock);
          } catch (e) {
            console.error("Failed to sync mock_user in localStorage", e);
          }
        }

        queryClient.invalidateQueries({ queryKey: ["me"] });
        queryClient.invalidateQueries({ queryKey: ["teachers"] });
      } else {
        toast.error(res.error || "Failed to update profile");
      }
    },
    onError: (e: any) => toast.error("Failed to save: " + e.message),
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("File size exceeds 8MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setAvatarUrl(result);
      updateMutation.mutate({ avatar_url: result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Banner file size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      setBannerUrl(result);
      updateMutation.mutate({ banner_url: result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    updateMutation.mutate({ avatar_url: null });
  };

  const handleRemoveBanner = () => {
    setBannerUrl(null);
    updateMutation.mutate({ banner_url: null });
  };

  const handleSaveContact = () => {
    updateMutation.mutate({ 
      phone, 
      office, 
      emergency_phone: emergencyPhone,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
    });
  };

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    updateMutation.mutate({ password: newPassword });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleClearPassword = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!me?.profile && !me) return null;
  const p = { ...(me?.profile || {}), ...(me || {}) } as any;
  const fullName = p.full_name || (me as any)?.full_name || "Dr. Aarav Sharma";
  const displayAvatar = avatarUrl || p.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=" + fullName;

  return (
    <AppShell title="My Profile" description="Photo, contact details and password">
    <div className="flex flex-col gap-6 pb-8 fade-in-up">
      {/* Banner & Profile Header */}
      <Card className="overflow-hidden border-border/50 shadow-2xl bg-card/60 backdrop-blur-xl rounded-2xl relative">
        {/* LinkedIn 4:1 Ratio Glass Banner */}
        <div className="relative aspect-[4/1] min-h-[100px] w-full overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 sm:min-h-[140px] md:min-h-[185px]">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Profile Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950">
              {/* Glassmorphic ambient light blobs */}
              <div className="absolute -bottom-10 -right-10 size-64 bg-cyan-500/20 rounded-full blur-3xl"></div>
              <div className="absolute -top-10 -left-10 size-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-80 bg-primary/10 rounded-full blur-3xl"></div>
            </div>
          )}

          {/* Banner Controls & Badge */}
          <div className="absolute right-2 top-2 flex max-w-[calc(100%-0.5rem)] flex-wrap items-center justify-end gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
            <Label htmlFor="banner-file-input" className="cursor-pointer">
              <Input 
                id="banner-file-input" 
                type="file" 
                accept="image/*" 
                onChange={handleBannerUpload} 
                className="hidden" 
              />
              <div className="glass hover:bg-white/20 text-white backdrop-blur-xl px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all shadow-lg border border-white/20">
                <Image className="size-3.5" />
                {bannerUrl ? "Change Banner" : "Upload Banner"}
              </div>
            </Label>
            {bannerUrl && (
              <button 
                type="button"
                onClick={handleRemoveBanner}
                className="glass hover:bg-rose-600/80 text-white backdrop-blur-xl px-3 py-1.5 rounded-full flex items-center gap-1 text-xs font-bold transition-all shadow-lg border border-white/20"
                title="Remove Banner Background"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <div className="glass-strong text-white backdrop-blur-xl px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold shadow-lg border border-white/20">
              <User className="size-3.5 text-cyan-400" />
              {me.isAdmin ? "ADMINISTRATOR" : "FACULTY"}
            </div>
          </div>
        </div>

        <CardContent className="relative px-4 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col justify-between gap-6 -mt-12 sm:-mt-20 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-4">
              <div className="relative inline-block self-start rounded-full p-1.5 bg-background shadow-2xl border border-border/50">
                <img
                  src={displayAvatar}
                  alt={fullName}
                  className="size-24 sm:size-32 rounded-full object-cover border-4 border-background shadow-inner"
                />
                <span className="absolute bottom-3 right-3 size-4 rounded-full border-2 border-background bg-emerald-500 shadow-md animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold leading-none tracking-tight">{fullName}</h2>
                <div className="mt-2.5 text-sm font-semibold text-primary flex items-center gap-1.5">
                  {p.designation || "Assistant Professor"} • {p.department || "Computer Science"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground font-medium">{p.email || (me.isAdmin ? "admin@snpsu.edu.in" : "faculty@snpsu.edu.in")}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 mr-2 glass px-3.5 py-2 rounded-xl border border-border/50 text-xs font-semibold">
                <Building2 className="size-4 text-primary" />
                {p.department || "Computer Science"}
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Label htmlFor="avatar-file-input" className="flex-1 sm:flex-none">
                  <Input 
                    id="avatar-file-input" 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                  />
                  <Button asChild className="w-full gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl cursor-pointer" size="sm">
                    <span>
                      <Camera className="size-4" /> Change Photo
                    </span>
                  </Button>
                </Label>
                <Button 
                  variant="outline" 
                  onClick={handleRemovePhoto}
                  className="flex-1 sm:flex-none gap-2 font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/20 rounded-xl" 
                  size="sm"
                >
                  <Trash2 className="size-4" /> Remove Photo
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-xs text-muted-foreground/80 font-medium">
            Supported image formats: JPG, PNG, WEBP, GIF, SVG · LinkedIn aspect ratio banner background (4:1)
          </div>
        </CardContent>
      </Card>

      {/* Contact Details Form */}
      <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur-xl rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ContactRound className="size-5 text-primary" />
            Contact Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
              <div className="relative">
                <Input value={fullName} disabled className="bg-muted/30 font-semibold pl-9 border-border/50" />
                <User className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
              <div className="relative">
                <Input value={p.email || (me.isAdmin ? "admin@snpsu.edu.in" : "faculty@snpsu.edu.in")} disabled className="bg-muted/30 font-medium pl-9 border-border/50" />
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>
              <div className="relative">
                <Input value={p.department || "Computer Science"} disabled className="bg-muted/30 font-medium pl-9 border-border/50" />
                <Building2 className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee ID</Label>
              <div className="relative">
                <Input value={p.employee_id || (me.isAdmin ? "ADMIN" : p.id)} disabled className="bg-muted/30 font-medium pl-9 border-border/50" />
                <BadgeInfo className="absolute left-3 top-2.5 size-4 text-muted-foreground/70" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
              <div className="relative group">
                <Input 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="Enter phone number..." 
                  className="font-medium transition-all pl-9 border-border/50 focus:border-primary focus:ring-primary/20" 
                />
                <Phone className="absolute left-3 top-2.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Office Location</Label>
              <div className="relative group">
                <Input 
                  value={office} 
                  onChange={e => setOffice(e.target.value)} 
                  placeholder="e.g. Room 101" 
                  className="font-medium transition-all pl-9 border-border/50 focus:border-primary focus:ring-primary/20" 
                />
                <MapPin className="absolute left-3 top-2.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Emergency Contact Phone</Label>
              <div className="relative group md:w-1/2 md:pr-3">
                <Input 
                  value={emergencyPhone} 
                  onChange={e => setEmergencyPhone(e.target.value)} 
                  placeholder="Enter emergency contact phone..." 
                  className="font-medium transition-all pl-9 border-border/50 focus:border-primary focus:ring-primary/20" 
                />
                <ShieldAlert className="absolute left-3 top-2.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/40 flex justify-end">
            <Button onClick={handleSaveContact} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20 rounded-xl">
              <Save className="size-4 mr-2" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Form */}
      <Card className="border-border/50 shadow-xl bg-card/60 backdrop-blur-xl rounded-2xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <KeyRound className="size-5 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</Label>
              <div className="relative group">
                <Input 
                  type={showCurrentPassword ? "text" : "password"} 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  className="font-medium pr-10 border-border/50 focus:border-primary focus:ring-primary/20" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                  {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</Label>
              <div className="relative group">
                <Input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="font-medium pr-10 border-border/50 focus:border-primary focus:ring-primary/20" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
              <div className="relative group">
                <Input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  className="font-medium pr-10 border-border/50 focus:border-primary focus:ring-primary/20" 
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-border/40 pt-6">
            <Button variant="outline" onClick={handleClearPassword} className="font-bold text-rose-500 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 hover:text-rose-600 rounded-xl px-6">
              Clear
            </Button>
            <Button onClick={handleUpdatePassword} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/20 rounded-xl">
              <KeyRound className="size-4 mr-2" /> Update Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </AppShell>
  );
}
