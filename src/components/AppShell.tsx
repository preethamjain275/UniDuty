// @ts-nocheck
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  DoorOpen,
  Inbox,
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Settings,
  SirenIcon,
  Users,
  ClipboardList,
  ArrowLeftRight,
  LayoutGrid,
  FileText,
  BookOpen,
  ScrollText,
  Menu,
  User,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getMe, listEmergencies, listStaffRequests } from "@/lib/invigilation.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Control Centre", icon: LayoutDashboard },
  { to: "/exams", label: "Examinations", icon: CalendarDays },
  { to: "/rooms", label: "Halls & Floors", icon: DoorOpen },
  { to: "/students", label: "Students", icon: GraduationCap },
  { to: "/teachers", label: "Staff Directory", icon: Users },
  { to: "/invigilation", label: "Invigilation Duties", icon: ClipboardList },
  { to: "/seating", label: "Seating Arrangement", icon: LayoutGrid },
  { to: "/duty-swap", label: "Alter / Swap Duty", icon: ArrowLeftRight },
  { to: "/forms/a-form", label: "A Form", icon: FileText },
  { to: "/forms/b-form", label: "B Form", icon: BookOpen },
  { to: "/forms/tenancy-form", label: "Tenancy Form", icon: ScrollText },
  { to: "/emergency", label: "Emergency & Complaint Desk", icon: SirenIcon },
  { to: "/notifications", label: "Notifications", icon: Inbox },
  { to: "/settings", label: "Rules & Settings", icon: Settings },
] as const;

const ADMIN_ONLY = new Set<string>([
  "/forms/a-form",
  "/settings",
]);

export function useMe() {
  const fn = useServerFn(getMe);
  return useQuery({ queryKey: ["me"], queryFn: () => fn(), retry: false });
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: meServer } = useMe();
  const [hasSession, setHasSession] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    let active = true;
    const mockUserStr = localStorage.getItem("mock_user");
    
    if (mockUserStr) {
      const mockUser = JSON.parse(mockUserStr);
      setHasSession(true);
      
      // Merge mock user data into me object
      setMe({ ...meServer, ...mockUser, isAdmin: mockUser.role === "admin" });
    } else {
      setHasSession(false);
      navigate({ to: "/auth", replace: true });
    }

    return () => {
      active = false;
    };
  }, [pathname, navigate, meServer]);

  const emergenciesFn = useServerFn(listEmergencies);
  const staffReqFn = useServerFn(listStaffRequests);

  const { data: alerts } = useQuery({
    queryKey: ["emergencies"],
    queryFn: () => emergenciesFn(),
    enabled: hasSession && Boolean(me?.isAdmin),
    retry: false,
    refetchInterval: 20000,
  });

  const { data: staffRequests } = useQuery({
    queryKey: ["staff-requests"],
    queryFn: () => staffReqFn(),
    enabled: hasSession && Boolean(me?.isAdmin),
    retry: false,
    refetchInterval: 20000,
  });

  const unread =
    (alerts ?? []).filter((a) => !a.admin_read_at).length +
    (staffRequests ?? []).filter((r) => !r.admin_read_at).length;
  const isAdmin = Boolean(me?.isAdmin);
  const nav = NAV.filter((item) => isAdmin || !ADMIN_ONLY.has(item.to));

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    localStorage.removeItem("mock_user");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside className="glass-sidebar sticky top-0 hidden h-screen w-64 shrink-0 flex-col text-sidebar-foreground md:flex">
        {/* SNPSU Logo Header */}
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <img src="/snpsu-logo.png" alt="SNPSU Emblem" className="size-9 rounded-lg object-contain bg-white/10 p-0.5" />
          <div>
            <p className="font-display text-base font-bold leading-tight tracking-wide">SNPSU</p>
            <p className="text-[11px] opacity-75 font-medium">UniDuty — Exam Operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          {nav.map((item) => {
            const active = pathname.startsWith(item.to);
            const count = item.to === "/notifications" ? unread : 0;
            const badge = isAdmin && count > 0 ? count : null;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-sidebar-accent/80 text-sidebar-accent-foreground shadow-[0_8px_24px_-14px_rgba(0,0,0,0.9)] backdrop-blur-md font-bold"
                    : "opacity-80 hover:bg-sidebar-accent/60 hover:opacity-100",
                )}
              >
                <item.icon className="size-4" />
                <span className="flex-1 truncate">{item.label}</span>
                {badge ? (
                  <span className="rounded-full bg-sidebar-primary px-2 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/30 p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{me?.full_name ?? (isAdmin ? "Admin User" : "Faculty Member")}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                {isAdmin ? "Administrator" : "Faculty"}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={signOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/40 bg-background/60 px-4 md:px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-background/95 backdrop-blur-xl">
                  {/* Mobile Logo */}
                  <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
                    <img src="/snpsu-logo.png" alt="SNPSU Emblem" className="size-8 rounded-lg object-contain bg-white/10 p-0.5" />
                    <div>
                      <p className="font-display text-base font-bold leading-tight tracking-wide">SNPSU</p>
                      <p className="text-[11px] opacity-75 font-medium">Exam Cell</p>
                    </div>
                  </div>
                  {/* Mobile Nav */}
                  <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                    {nav.map((item) => {
                      const active = pathname.startsWith(item.to);
                      const count = item.to === "/notifications" ? unread : 0;
                      const badge = isAdmin && count > 0 ? count : null;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                            active
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <item.icon className="size-4" />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge ? (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                              {badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </nav>
                  {/* Mobile User Card */}
                  <div className="border-t border-border/50 p-4 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{me?.full_name ?? (isAdmin ? "Admin User" : "Faculty Member")}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          {isAdmin ? "Administrator" : "Faculty"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={signOut}>
                        <LogOut className="size-4" />
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <img src="/snpsu-logo.png" alt="SNPSU Logo" className="size-7 hidden sm:block md:hidden" />
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">{title}</h1>
              {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-muted/50 hover:bg-muted p-0">
                  <img 
                    src={me?.profile?.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=" + (me?.full_name || "User")} 
                    alt="Avatar" 
                    className="h-10 w-10 rounded-full border-2 border-background object-cover" 
                  />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 mt-2">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{me?.full_name ?? (isAdmin ? "Admin User" : "Faculty Member")}</p>
                    <p className="w-[200px] truncate text-xs text-muted-foreground">
                      {me?.profile?.email || (isAdmin ? "admin@snpsu.edu.in" : "faculty@snpsu.edu.in")}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-rose-500 focus:text-rose-600 focus:bg-rose-50" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}