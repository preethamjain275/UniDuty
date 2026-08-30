import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock, Building2, GraduationCap, Users, CheckCircle2, UserCheck, UserX, AlertTriangle, CalendarIcon } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDashboard, myDuties, listStudents } from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Centre — UniDuty" },
      {
        name: "description",
        content: "Invigilation allocation control center showing floor status, exam schedules and duty rosters.",
      },
      { property: "og:title", content: "Control Centre — UniDuty" },
      { property: "og:description", content: "Live overview of exams, halls, duties and faculty workload." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "#6366f1",
  "#f59e0b",
];

const DEPT_SHORT: Record<string, string> = {
  "Computer Science": "CSE",
  "Electronics": "ECE",
  "Electrical": "EEE",
  "Mechanical": "ME",
  "Civil": "CE",
  "Information Technology": "IT",
  "General": "GEN",
};

function DeptPieChart({ departments }: { departments: any[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const active = activeIdx !== null ? departments[activeIdx] : null;

  const facultyList: { name: string; room: string }[] = active
    ? Array.isArray(active.faculty)
      ? active.faculty.map((f: any) =>
          typeof f === "string" ? { name: f, room: "" } : f
        )
      : []
    : [];

  // Custom label: show short name beside each slice
  const renderLabel = ({ name, cx, cy, midAngle, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 22;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const short = DEPT_SHORT[name] || name.slice(0, 3).toUpperCase();
    return (
      <text
        x={x}
        y={y}
        fill={CHART_COLORS[index % CHART_COLORS.length]}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
      >
        {short}
      </text>
    );
  };

  return (
    <div className="mt-3">
      {/* Faculty panel — always above the chart */}
      <div
        style={{
          minHeight: 90,
          background: active ? "var(--card)" : "transparent",
          border: active ? "1px solid var(--border)" : "1px solid transparent",
          borderRadius: 10,
          padding: active ? "10px 14px" : "0",
          marginBottom: 8,
          transition: "all 0.2s",
          overflowY: "auto",
          maxHeight: 180,
        }}
      >
        {active ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{active.name}</span>
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    background: CHART_COLORS[activeIdx! % CHART_COLORS.length],
                    color: "#fff",
                    borderRadius: 4,
                    padding: "1px 7px",
                  }}
                >
                  {DEPT_SHORT[active.name] || active.name.slice(0, 3).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{active.value} members</span>
            </div>
            {facultyList.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1px 12px", fontSize: 11 }}>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)" }}>Faculty Name</span>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--muted-foreground)", textAlign: "right" }}>Room</span>
                {facultyList.map((f, i) => (
                  <>
                    <span key={`n${i}`} style={{ padding: "1px 0" }}>{f.name}</span>
                    <span key={`r${i}`} style={{ fontWeight: 600, textAlign: "right", color: "var(--primary)", padding: "1px 0" }}>{f.room || "—"}</span>
                  </>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No faculty data.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">Hover or tap a slice to see faculty details</p>
        )}
      </div>

      {/* Pie chart — always visible below the panel */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={departments}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              label={renderLabel}
              labelLine={false}
              onMouseEnter={(_: any, index: number) => setActiveIdx(index)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={(_: any, index: number) =>
                setActiveIdx((prev) => (prev === index ? null : index))
              }
              style={{ cursor: "pointer" }}
            >
              {departments.map((_, i) => (
                <Cell
                  key={i}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  opacity={activeIdx === null || activeIdx === i ? 1 : 0.55}
                  stroke={activeIdx === i ? "#fff" : "none"}
                  strokeWidth={activeIdx === i ? 2 : 0}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon }: { label: string; value: number; hint?: string; icon?: any }) {
  return (
    <div className="glass-strong glass-hover rounded-2xl p-5 border border-border/50 shadow-xl backdrop-blur-xl bg-card/60 relative overflow-hidden group transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
        {Icon && <Icon className="size-4 text-primary/70 group-hover:text-primary transition-colors" />}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1.5 text-[11px] font-medium text-muted-foreground/80">{hint}</p> : null}
      <div className="absolute -bottom-8 -right-8 size-20 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
    </div>
  );
}

function DashboardPage() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn(), refetchInterval: 60000, staleTime: 60000 });
  const { data: me } = useMe();
  const dutiesFn = useServerFn(myDuties);
  const { data: duties } = useQuery({ queryKey: ["my-duties"], queryFn: () => me?.profile?.id ? dutiesFn({ data: { teacherId: me.profile.id } }) : [], enabled: !!me?.profile?.id, refetchInterval: 60000, staleTime: 60000 });
  const isAdmin = Boolean(me?.isAdmin);

  const [students, setStudents] = useState<any[]>([]);
  const [absentees, setAbsentees] = useState<Set<string>>(new Set());

  useEffect(() => {
    listStudents().then(res => setStudents(res || [])).catch(console.error);
  }, []);

  const todaysDuty = (duties && duties.length > 0) ? duties[0] : null;
  const myStudents = students.sort((a, b) => (a.register_no || "").localeCompare(b.register_no || "")).slice(0, 30);

  const toggleAbsentee = (studentId: string) => {
    const newAbsentees = new Set(absentees);
    if (newAbsentees.has(studentId)) newAbsentees.delete(studentId);
    else newAbsentees.add(studentId);
    setAbsentees(newAbsentees);
  };

  return (
    <AppShell
      title="Examination Control Centre"
      description="Today's duties, hall utilisation and faculty workload at a glance"
      actions={
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20 rounded-xl px-5">
          <Link to="/exams">{isAdmin ? "Plan an examination" : "View examinations"}</Link>
        </Button>
      }
    >
      {isLoading || !data ? (
        <div className="p-8 text-center glass rounded-2xl">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Loading control centre…</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today's Schedule Card */}
          <section>
            <h2 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-3 flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" /> My Duty Schedule
            </h2>
            {todaysDuty ? (
              <Card className="glass-strong border border-border/50 border-l-4 border-l-primary shadow-2xl backdrop-blur-xl bg-card/60 overflow-hidden relative">
                <div className="absolute top-0 right-0 size-48 bg-primary/10 rounded-full blur-3xl" />
                <CardContent className="p-5 sm:p-7 relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl font-bold text-primary">{todaysDuty.hall}</CardTitle>
                      <CardDescription className="text-sm sm:text-base font-semibold text-foreground/90 mt-1">
                        {todaysDuty.exam_name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit bg-emerald-500/15 text-emerald-500 border-emerald-500/30 px-3.5 py-1 text-xs sm:text-sm font-bold rounded-full shadow-sm">
                      Active Duty
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-6">
                    <div className="glass p-3.5 rounded-xl border border-border/50 backdrop-blur-md">
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5 text-primary"/> Time</div>
                      <div className="font-bold text-xs sm:text-sm">{todaysDuty.start_time}</div>
                    </div>
                    <div className="glass p-3.5 rounded-xl border border-border/50 backdrop-blur-md">
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mb-1"><Building2 className="w-3.5 h-3.5 text-primary"/> Location</div>
                      <div className="font-bold text-xs sm:text-sm">Floor {todaysDuty.floor}</div>
                    </div>
                    <div className="glass p-3.5 rounded-xl border border-border/50 backdrop-blur-md">
                      <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 mb-1"><GraduationCap className="w-3.5 h-3.5 text-primary"/> Department</div>
                      <div className="font-bold text-xs sm:text-sm">{(todaysDuty as any).department || "General"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-strong border border-dashed border-border/60 shadow-lg backdrop-blur-xl bg-card/40 rounded-2xl">
                <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="size-12 rounded-full glass flex items-center justify-center border border-border/50">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">No Assignments Today</h3>
                    <p className="text-xs text-muted-foreground">You don't have any invigilation duties scheduled for today.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>



          {/* Admin-only metrics and charts */}
          {isAdmin && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Today's exams" value={data.cards.todaysExams} hint={`${data.cards.upcomingExams} upcoming`} />
                <Stat label="Halls in use today" value={data.cards.roomsInUseToday} hint={`${data.cards.totalRooms} halls total`} />
                <Stat label="Assigned today" value={data.cards.assignedToday} hint={`${data.cards.standbyToday} standby reserved`} />
                <Stat label="Pending acceptance" value={data.cards.pendingAcceptance} hint={`${data.cards.acceptedDuties} accepted`} />
                <Stat label="Faculty on roll" value={data.cards.teachers} hint={`${data.cards.declinedDuties} declined duties`} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="glass rounded-2xl p-5 lg:col-span-2">
                  <h2 className="text-sm font-semibold">Workload distribution (top faculty)</h2>
                  <div className="mt-4 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.workload}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} height={50} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="duties" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass rounded-2xl p-5">
                  <h2 className="text-sm font-semibold">Faculty by department</h2>
                  <DeptPieChart departments={data.departments} />
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <h2 className="text-sm font-semibold">Floor utilisation</h2>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.floors}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="floor" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="duties" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Upcoming Examinations list */}
          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold">Upcoming examinations</h2>
            <ul className="mt-3 space-y-3">
              {data.upcoming.length === 0 ? (
                <li className="text-sm text-muted-foreground">No examinations scheduled yet.</li>
              ) : (
                data.upcoming.map((e) => (
                  <li key={e.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3">
                    <Link to="/exams/$examId" params={{ examId: e.id }} className="text-sm font-medium hover:underline">
                      {e.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {e.exam_date} · {e.start_time.slice(0, 5)} · {e.duration_minutes} min ·{" "}
                      {e.exam_type === "internal" ? "Internal" : "Semester"}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </AppShell>
  );
}