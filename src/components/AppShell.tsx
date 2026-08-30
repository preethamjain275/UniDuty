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
  "/settings",
  "/forms/a-form",
  "/forms/b-form",
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

      const mergedProfile = {
        ...(meServer?.profile || {}),
        ...mockUser,
        id: mockUser.id || mockUser.employee_id || meServer?.profile?.id,
        full_name: mockUser.full_name || meServer?.profile?.full_name || "Dr. Aarav Sharma",
        department: mockUser.department || meServer?.profile?.department || "Computer Science",
        designation: mockUser.designation || meServer?.profile?.designation || "Assistant Professor",
      };

      setMe({
        ...meServer,
        ...mockUser,
        profile: mergedProfile,
        full_name: mergedProfile.full_name,
        isAdmin: mockUser.role === "admin"
      });
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
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const { data: staffRequests } = useQuery({
    queryKey: ["staff-requests"],
    queryFn: () => staffReqFn(),
    enabled: hasSession && Boolean(me?.isAdmin),
    retry: false,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const unread =
    (alerts ?? []).filter((a) => !a.admin_read_at).length +
    (staffRequests ?? []).filter((r) => !r.admin_read_at).length;
  const isAdmin = Boolean(me?.isAdmin);
  const nav = NAV.filter((item) => isAdmin || !ADMIN_ONLY.has(item.to));
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    localStorage.removeItem("mock_user");
    navigate({ to: "/auth", replace: true });
  }

  const displayName = me?.full_name ?? (isAdmin ? "Admin User" : "Faculty Member");
  const avatarSrc =
    me?.profile?.avatar_url ||
    "https://api.dicebear.com/7.x/initials/svg?seed=" + (me?.full_name || "User");

  const navLinks = (mobile: boolean) =>
    nav.map((item) => {
      const active = pathname.startsWith(item.to);
      const count = item.to === "/notifications" ? unread : 0;
      const badge = isAdmin && count > 0 ? count : null;
      return (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setNavOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-300",
            mobile ? "py-2.5" : "py-2",
            mobile
              ? active
                ? "bg-primary/10 text-primary font-bold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              : active
                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground shadow-[0_8px_24px_-14px_rgba(0,0,0,0.9)] backdrop-blur-md font-bold"
                : "opacity-80 hover:bg-sidebar-accent/60 hover:opacity-100",
          )}
        >
          <item.icon className="size-4 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {badge ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold",
                mobile
                  ? "bg-primary text-primary-foreground"
                  : "bg-sidebar-primary text-sidebar-primary-foreground",
              )}
            >
              {badge}
            </span>
          ) : null}
        </Link>
      );
    });

  return (
    <div className="flex min-h-dvh w-full max-w-[100vw] bg-transparent overflow-x-clip">
      <aside className="glass-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
          <img src="/snpsu-logo.png" alt="SNPSU Emblem" className="size-9 rounded-lg object-contain bg-white/10 p-0.5" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold leading-tight tracking-wide">SNPSU</p>
            <p className="text-[11px] opacity-75 font-medium truncate">UniDuty — Exam Operations</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto overscroll-contain">{navLinks(false)}</nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between rounded-xl bg-sidebar-accent/30 p-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold">{displayName}</p>
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex min-h-14 min-w-0 flex-wrap items-center gap-x-2 gap-y-2 px-2 py-2 sm:px-4 lg:h-16 lg:flex-nowrap lg:px-6 lg:py-0">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 shrink-0 touch-manipulation lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex h-dvh w-[min(20rem,88vw)] flex-col bg-background/95 p-0 backdrop-blur-xl"
              >
                <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 pr-12">
                  <img src="/snpsu-logo.png" alt="SNPSU Emblem" className="size-8 rounded-lg object-contain bg-white/10 p-0.5" />
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold leading-tight tracking-wide">SNPSU</p>
                    <p className="text-[11px] opacity-75 font-medium">Exam Cell</p>
                  </div>
                </div>
                <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">{navLinks(true)}</nav>
                <div className="border-t border-border/50 bg-muted/30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        {isAdmin ? "Administrator" : "Faculty"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={signOut}>
                      <LogOut className="size-4" />
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <img src="/snpsu-logo.png" alt="SNPSU" className="size-7 shrink-0 lg:hidden" />

            <div className="min-w-0 flex-1">
              <h1 className="font-display truncate text-sm font-bold leading-tight sm:text-base lg:text-lg">{title}</h1>
              {description ? (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{description}</p>
              ) : null}
            </div>

            {actions ? (
              <div className="app-header-actions order-last flex w-full min-w-0 items-center gap-2 overflow-x-auto md:order-none md:w-auto md:max-w-[min(28rem,42vw)] lg:max-w-none">
                {actions}
              </div>
            ) : null}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative size-9 shrink-0 rounded-full bg-muted/50 p-0 hover:bg-muted sm:size-10"
                  aria-label="Open profile menu"
                >
                  <img
                    src={avatarSrc}
                    alt="Profile"
                    className="size-9 rounded-full border-2 border-background object-cover sm:size-10"
                  />
                  <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm sm:size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mt-2 w-56 max-w-[calc(100vw-1.5rem)]">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex min-w-0 flex-col space-y-1 leading-none">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
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
                <DropdownMenuItem className="cursor-pointer text-rose-500 focus:bg-rose-50 focus:text-rose-600" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 overflow-x-clip p-3 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}