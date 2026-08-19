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
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getMe, listEmergencies, listStaffRequests } from "@/lib/invigilation.functions";
import { Button } from "@/components/ui/button";
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
  "/forms/b-form",
  "/seating",
  "/notifications",
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
  const { data: me } = useMe();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

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
    await supabase.auth.signOut();
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
            <p className="text-[11px] opacity-75 font-medium">Exam Cell Operations</p>
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
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/40 bg-background/60 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <img src="/snpsu-logo.png" alt="SNPSU Logo" className="size-7 md:hidden" />
            <div>
              <h1 className="font-display text-lg font-bold leading-tight">{title}</h1>
              {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <Button size="sm" variant="ghost" onClick={signOut} className="hidden sm:flex">
              <LogOut className="size-4 mr-1.5" /> Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}