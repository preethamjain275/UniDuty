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

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="glass glass-hover rounded-2xl p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn(), refetchInterval: 10000 });
  const { data: me } = useMe();
  const dutiesFn = useServerFn(myDuties);
  const { data: duties } = useQuery({ queryKey: ["my-duties"], queryFn: () => me?.profile?.id ? dutiesFn({ data: { teacherId: me.profile.id } }) : [], enabled: !!me?.profile?.id, refetchInterval: 10000 });
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
        <Button asChild>
          <Link to="/exams">{isAdmin ? "Plan an examination" : "View examinations"}</Link>
        </Button>
      }
    >
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading control centre…</p>
      ) : (
        <div className="space-y-6">
          {/* Today's Schedule Card */}
          <section>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <CalendarIcon className="size-4 text-primary" /> My duty schedule
            </h2>
            {todaysDuty ? (
              <Card className="glass-strong border-l-4 border-l-primary overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl sm:text-2xl text-primary">{todaysDuty.hall}</CardTitle>
                      <CardDescription className="text-sm sm:text-base font-medium mt-1">
                        {todaysDuty.exam_name}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 text-xs sm:text-sm">
                      Active Duty
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
                    <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><Clock className="w-3.5 h-3.5"/> Time</div>
                      <div className="font-semibold text-xs sm:text-sm">{todaysDuty.start_time}</div>
                    </div>
                    <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><Building2 className="w-3.5 h-3.5"/> Location</div>
                      <div className="font-semibold text-xs sm:text-sm">Floor {todaysDuty.floor}</div>
                    </div>
                    <div className="bg-background/50 p-3 rounded-xl border border-border/50">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><GraduationCap className="w-3.5 h-3.5"/> Department</div>
                      <div className="font-semibold text-xs sm:text-sm">{(todaysDuty as any).department || "General"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass border-dashed border-border/50 shadow-sm">
                <CardContent className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-muted-foreground/50" />
                  <div className="space-y-1">
                    <h3 className="text-base font-medium text-foreground">No Assignments Today</h3>
                    <p className="text-xs text-muted-foreground">You don't have any invigilation duties scheduled for today.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Form B / Attendance */}
          {todaysDuty && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="size-4 text-primary" /> Form B (Attendance)
              </h2>
              
              <Tabs defaultValue="list" className="w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <TabsList>
                    <TabsTrigger value="list">Student List</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-background/50 text-muted-foreground border-border/50">
                      Total: {myStudents.length}
                    </Badge>
                    <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20">
                      Present: {myStudents.length - absentees.size}
                    </Badge>
                    <Badge variant="outline" className="bg-destructive/5 text-destructive border-destructive/20">
                      Absent: {absentees.size}
                    </Badge>
                  </div>
                </div>

                <TabsContent value="list" className="space-y-4">
                  <div className="glass rounded-xl border border-border/50 overflow-hidden max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3">Seat</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3">Register No</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3">Student Name</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {myStudents.map((s, idx) => {
                          const isAbsent = absentees.has(s.id);
                          return (
                            <tr key={s.id} className={"hover:bg-muted/30 transition-colors " + (isAbsent ? "bg-destructive/5" : "")}>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 font-medium text-muted-foreground">{idx * 2 + 1}</td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 font-semibold">{s.register_no}</td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 truncate max-w-[120px] sm:max-w-none">{s.full_name}</td>
                              <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                                <Button 
                                  variant={isAbsent ? "destructive" : "outline"} 
                                  size="sm"
                                  className={"h-8 px-2 sm:px-3 text-xs " + (isAbsent ? "" : "text-muted-foreground")}
                                  onClick={() => toggleAbsentee(s.id)}
                                >
                                  {isAbsent ? <><UserX className="size-3 mr-1"/> Absent</> : <><UserCheck className="size-3 mr-1"/> Present</>}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="summary">
                  <Card className="glass">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium mb-4">Attendance Summary</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-muted/50 p-4 rounded-xl text-center">
                          <div className="text-sm text-muted-foreground">Total Assigned</div>
                          <div className="text-3xl font-bold mt-1">{myStudents.length}</div>
                        </div>
                        <div className="bg-green-500/10 p-4 rounded-xl text-center border border-green-500/20">
                          <div className="text-sm text-green-700">Present</div>
                          <div className="text-3xl font-bold mt-1 text-green-700">{myStudents.length - absentees.size}</div>
                        </div>
                        <div className="bg-destructive/10 p-4 rounded-xl text-center border border-destructive/20">
                          <div className="text-sm text-destructive">Absent</div>
                          <div className="text-3xl font-bold mt-1 text-destructive">{absentees.size}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
          )}

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

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass rounded-2xl p-5 lg:col-span-2">
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
        </div>
      )}
    </AppShell>
  );
}