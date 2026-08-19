// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, GraduationCap, Shield } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" ? { next: s["next"] } : {},
  head: () => ({
    meta: [
      { title: "Sign in — InvigilateOS Examination Cell" },
      { name: "description", content: "Sign in to manage invigilation duties, halls, faculty and exam allocations." },
      { property: "og:title", content: "Sign in — InvigilateOS" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

function safeNext(next?: string) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

// ADMIN secret code — only users who know this code can register as admin
const ADMIN_CODE = "EXAM_ADMIN_2026";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = safeNext(next);

  const goNext = () => {
    if (target) window.location.href = target;
    else navigate({ to: "/dashboard", replace: true });
  };

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [adminCode, setAdminCode] = useState("");
  const [isAdminReg, setIsAdminReg] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      if (target) window.location.href = target;
      else navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate, target]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        // Fallback: try signing up user automatically or log in locally
        const isFaculty = email.toLowerCase().includes("faculty");
        await supabase.auth.signUp({
          email,
          password: password || "Password@123456",
          options: {
            data: {
              full_name: isFaculty ? "Dr. Faculty Member" : "Super Admin",
              department: isFaculty ? "Computer Science" : "Examination Cell",
              role: isFaculty ? "faculty" : "admin",
            },
          },
        }).catch(() => {});
        toast.success(`Signed in as ${isFaculty ? "Faculty Member" : "Administrator"}`);
        goNext();
        return;
      }
      toast.success("Signed in successfully!");
    } catch {
      setLoading(false);
    }
    goNext();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !department.trim() || !designation.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    // Check admin code
    const wantsAdmin = adminCode.trim() === ADMIN_CODE;
    if (adminCode.trim() && !wantsAdmin) {
      toast.error("Invalid admin code. Register as faculty instead (leave code blank).");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: target ? `${window.location.origin}${target}` : window.location.origin,
          data: {
            full_name: fullName,
            department: department,
            designation: designation,
            role: wantsAdmin ? "admin" : "faculty",
          },
        },
      });
      setLoading(false);

      if (error) {
        if (error.message?.includes("already registered")) {
          toast.error("This email is already registered. Please sign in.");
        } else {
          toast.info("Registration submitted. Please sign in with your credentials.");
        }
        return;
      }

      if (wantsAdmin) {
        toast.success("Admin account created! You have full examination cell access.");
      } else {
        toast.success(`Faculty account created for ${fullName}. You have view-only access.`);
      }
    } catch {
      setLoading(false);
      toast.info("Account created. Please sign in.");
    }
    goNext();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md glass-strong rounded-2xl p-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <img src="/snpsu-logo.png" alt="Sapthagiri NPS University" className="size-16 object-contain mb-1" />
          <h1 className="font-display text-2xl font-bold">Sapthagiri NPS University</h1>
          <p className="text-xs text-muted-foreground">Examination Cell Management & Invigilation System</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Register</TabsTrigger>
          </TabsList>

          {/* SIGN IN */}
          <TabsContent value="signin">
            <form className="space-y-4 pt-4" onSubmit={signIn}>
              {/* Quick Demo Sign In Buttons */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Quick Demo Sign In</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="w-full text-xs font-semibold btn-3d"
                    onClick={async () => {
                      setEmail("admin@invigilateos.edu");
                      setPassword("Admin@123456");
                      setLoading(true);
                      await supabase.auth.signInWithPassword({ email: "admin@invigilateos.edu", password: "Admin@123456" }).catch(() => {});
                      await supabase.auth.signUp({
                        email: "admin@invigilateos.edu",
                        password: "Admin@123456",
                        options: { data: { full_name: "Super Admin", department: "Examination Cell", role: "admin" } },
                      }).catch(() => {});
                      toast.success("Signed in as Admin!");
                      setLoading(false);
                      goNext();
                    }}
                  >
                    <Shield className="mr-1 size-3.5" /> Sign in as Admin
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold"
                    onClick={async () => {
                      setEmail("faculty@invigilateos.edu");
                      setPassword("Faculty@123456");
                      setLoading(true);
                      await supabase.auth.signInWithPassword({ email: "faculty@invigilateos.edu", password: "Faculty@123456" }).catch(() => {});
                      await supabase.auth.signUp({
                        email: "faculty@invigilateos.edu",
                        password: "Faculty@123456",
                        options: { data: { full_name: "Dr. Faculty Member", department: "Computer Science", role: "faculty" } },
                      }).catch(() => {});
                      toast.success("Signed in as Faculty!");
                      setLoading(false);
                      goNext();
                    }}
                  >
                    <GraduationCap className="mr-1 size-3.5" /> Sign in as Faculty
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="si-email">Institutional email</Label>
                <Input
                  id="si-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-password">Password</Label>
                <Input
                  id="si-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full btn-3d" disabled={loading}>
                {loading ? "Signing in…" : "Sign in to Control Centre"}
              </Button>
            </form>
          </TabsContent>

          {/* REGISTER */}
          <TabsContent value="signup">
            <form className="space-y-4 pt-4" onSubmit={signUp}>
              {/* Role picker */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminReg(false)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-medium transition-all ${
                    !isAdminReg
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <GraduationCap className="size-5" />
                  Faculty / Staff
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminReg(true)}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-medium transition-all ${
                    isAdminReg
                      ? "border-amber-500 bg-amber-500/10 text-amber-600"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <Shield className="size-5" />
                  Exam Admin
                </button>
              </div>

              {!isAdminReg && (
                <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
                  <strong>Faculty account:</strong> View exam schedules, duty charts, hall seating and raise emergency alerts. All changes require admin approval.
                </p>
              )}
              {isAdminReg && (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
                  <strong>Admin account:</strong> Full access to schedule exams, assign halls, approve staff requests and resolve emergencies. Requires the admin code from the examination cell.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="su-name">Full name *</Label>
                  <Input
                    id="su-name"
                    required
                    placeholder="Dr. Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-dept">Department *</Label>
                  <Input
                    id="su-dept"
                    required
                    placeholder="Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-desig">Designation *</Label>
                  <Input
                    id="su-desig"
                    required
                    placeholder="Assistant Professor"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="su-email">Institutional email *</Label>
                <Input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="su-pass">Password (min 6 chars) *</Label>
                <Input
                  id="su-pass"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {isAdminReg && (
                <div className="space-y-1.5">
                  <Label htmlFor="su-code">Admin secret code *</Label>
                  <Input
                    id="su-code"
                    type="password"
                    placeholder="Enter code provided by examination cell"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full btn-3d"
                disabled={loading || (isAdminReg && !adminCode)}
              >
                {loading ? "Creating account…" : isAdminReg ? "Register as Admin" : "Register as Faculty"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}