import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboard, myDuties } from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Control Centre — InvigilateOS" },
      { name: "description", content: "Live overview of exams, halls, duties and faculty workload." },
      { property: "og:title", content: "Control Centre — InvigilateOS" },
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
];

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
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  const { data: me } = useMe();
  const dutiesFn = useServerFn(myDuties);
  const { data: duties } = useQuery({ queryKey: ["my-duties"], queryFn: () => dutiesFn() });
  const isAdmin = Boolean(me?.isAdmin);

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
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">My duty schedule</h2>
              <Button asChild size="sm" variant="outline">
                <Link to="/emergency">Emergency desk</Link>
              </Button>
            </div>
            {(duties ?? []).length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No invigilation duties assigned to your account yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {(duties ?? []).slice(0, 9).map((d) => (
                  <li
                    key={d.allocation_id}
                    className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {d.exam_name} · {d.hall ?? "Floor standby"}
                      </p>
                      {d.alert_raised ? <Badge variant="outline">Alert raised</Badge> : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {d.exam_date} at {String(d.start_time).slice(0, 5)} · {d.duty_role} ·{" "}
                      {d.duration_minutes} min
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.departments} dataKey="value" nameKey="name" outerRadius={90} label>
                      {data.departments.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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