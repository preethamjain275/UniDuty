// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Lock, User, Info } from "lucide-react";
import { toast } from "sonner";
import { listTeachers } from "@/lib/invigilation.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s["next"] === "string" ? { next: s["next"] } : {},
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    // Check if already logged in
    const mockUser = localStorage.getItem("mock_user");
    if (mockUser) {
      const u = JSON.parse(mockUser);
      navigate({ to: "/dashboard", replace: true });
    }
    
    // Load mock teachers for demo
    listTeachers().then(setTeachers).catch(console.error);
  }, [navigate]);

  async function handleFacultyLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // Mock login logic
    setTimeout(() => {
      setLoading(false);
      const upperId = empId.toUpperCase();
      const teacher = teachers.find(t => t.employee_id === upperId);
      
      if (teacher && password === teacher.password) {
        localStorage.setItem("mock_user", JSON.stringify({
          ...teacher,
          role: "faculty"
        }));
        toast.success(`Welcome back, ${teacher.full_name}`);
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.error("Check the ID and the password.");
      }
    }, 800);
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (empId.toLowerCase() === "admin" && password === "admin123") {
        localStorage.setItem("mock_user", JSON.stringify({
          id: "admin-1",
          full_name: "Super Admin",
          employee_id: "ADMIN",
          department: "Examination Cell",
          role: "admin"
        }));
        toast.success("Welcome, Administrator");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.error("Invalid Admin credentials. Use admin / admin123");
      }
    }, 800);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4 py-12">
      <div className="w-full max-w-md glass-strong rounded-2xl p-8">
        
        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center mb-6">
          <img src="/snpsu-logo.png" alt="Sapthagiri NPS University" className="size-16 object-contain mb-1" />
          <h1 className="font-display text-2xl font-bold text-foreground">UniDuty</h1>
          <p className="text-sm text-muted-foreground">Sign in to your university account</p>
        </div>

        <Tabs defaultValue="faculty" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="faculty" className="text-xs sm:text-sm">Faculty Login</TabsTrigger>
            <TabsTrigger value="admin" className="text-xs sm:text-sm">Admin Access</TabsTrigger>
          </TabsList>

          <TabsContent value="faculty">
            <form onSubmit={handleFacultyLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="empId">Employee ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="empId" placeholder="e.g. EMP1001" value={empId} onChange={e => setEmpId(e.target.value)} required className="pl-9 bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="pl-9 bg-background/50" />
                </div>
              </div>
              


              <Button type="submit" className="w-full btn-3d mt-2" disabled={loading}>
                {loading ? "Authenticating..." : "Access Faculty Dashboard"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="admin">
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="adminId">Admin ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="adminId" placeholder="admin" value={empId} onChange={e => setEmpId(e.target.value)} required className="pl-9 bg-background/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input id="adminPassword" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="pl-9 bg-background/50" />
                </div>
              </div>
              


              <Button type="submit" className="w-full btn-3d mt-2" disabled={loading}>
                {loading ? "Authenticating..." : "Enter Exam Cell"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
