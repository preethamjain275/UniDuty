// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, MailOpen, ShieldCheck, UserPlus, X } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listEmergencies,
  listStaffRequests,
  listTeachers,
  markNotificationsRead,
  resolveEmergency,
  reviewStaffRequest,
} from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Queue — InvigilateOS" },
      {
        name: "description",
        content:
          "Admin queue for staff approval requests and emergency invigilator alerts, filterable by exam, hall and unread status.",
      },
      { property: "og:title", content: "Notification Queue — InvigilateOS" },
      { property: "og:description", content: "Approve staff requests and resolve emergency alerts in one queue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotificationsPage,
});

type Kind = "all" | "staff" | "emergency";

function NotificationsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);

  const emergenciesFn = useServerFn(listEmergencies);
  const staffReqFn = useServerFn(listStaffRequests);
  const teachersFn = useServerFn(listTeachers);
  const reviewFn = useServerFn(reviewStaffRequest);
  const resolveFn = useServerFn(resolveEmergency);
  const readFn = useServerFn(markNotificationsRead);

  const { data: alerts } = useQuery({ queryKey: ["emergencies"], queryFn: () => emergenciesFn(), refetchInterval: 20000 });
  const { data: requests } = useQuery({ queryKey: ["staff-requests"], queryFn: () => staffReqFn(), refetchInterval: 20000 });
  const { data: staff } = useQuery({ queryKey: ["teachers"], queryFn: () => teachersFn(), enabled: isAdmin });

  const [kind, setKind] = useState<Kind>("all");
  const [exam, setExam] = useState("all");
  const [room, setRoom] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [replacement, setReplacement] = useState<Record<string, string>>({});
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["emergencies"] });
    qc.invalidateQueries({ queryKey: ["staff-requests"] });
    qc.invalidateQueries({ queryKey: ["teachers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const review = useMutation({
    mutationFn: (v: { requestId: string; action: "approve" | "reject"; notes?: string }) => reviewFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.action === "approve" ? "Staff approved and activated" : "Request rejected");
      setDecisionNotes((prev) => {
        const next = { ...prev };
        delete next[v.requestId];
        return next;
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resolve = useMutation({
    mutationFn: (v: { requestId: string; action: "resolve" | "cancel"; replacementTeacherId?: string }) =>
      resolveFn({ data: v }),
    onSuccess: () => {
      toast.success("Duty roster updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markRead = useMutation({
    mutationFn: (v: { emergencyIds: string[]; staffRequestIds: string[] }) => readFn({ data: v }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const examOptions = useMemo(
    () => Array.from(new Set((alerts ?? []).map((a) => a.exam_name))).sort(),
    [alerts],
  );
  const roomOptions = useMemo(
    () => Array.from(new Set((alerts ?? []).map((a) => a.hall).filter((h): h is string => Boolean(h)))).sort(),
    [alerts],
  );

  const visibleAlerts = (alerts ?? []).filter((a) => {
    if (kind === "staff") return false;
    if (exam !== "all" && a.exam_name !== exam) return false;
    if (room !== "all" && (a.hall ?? "Floor standby") !== room) return false;
    if (unreadOnly && a.admin_read_at) return false;
    return true;
  });

  const visibleRequests = (requests ?? []).filter((r) => {
    if (kind === "emergency") return false;
    // Staff requests are not tied to an exam or hall.
    if (exam !== "all" || room !== "all") return false;
    if (unreadOnly && r.admin_read_at) return false;
    return true;
  });

  const unreadCount =
    (alerts ?? []).filter((a) => !a.admin_read_at).length + (requests ?? []).filter((r) => !r.admin_read_at).length;

  return (
    <AppShell
      title="Notification Queue"
      description={
        isAdmin
          ? "Staff approval requests and emergency alerts in one place — filter by exam, hall or unread"
          : "Your submitted requests and the alerts raised for your duties"
      }
      actions={
        <div className="flex items-center gap-2">
          <Badge variant={unreadCount > 0 ? "destructive" : "outline"}>
            <BellRing className="mr-1 size-3" /> {unreadCount} unread
          </Badge>
          {isAdmin && unreadCount > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={markRead.isPending}
              onClick={() =>
                markRead.mutate({
                  emergencyIds: (alerts ?? []).filter((a) => !a.admin_read_at).map((a) => a.id),
                  staffRequestIds: (requests ?? []).filter((r) => !r.admin_read_at).map((r) => r.id),
                })
              }
            >
              <MailOpen className="mr-1 size-4" /> Mark all read
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList className="glass">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="staff">Staff approvals</TabsTrigger>
            <TabsTrigger value="emergency">Emergencies</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={exam} onValueChange={setExam}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by exam" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All exams</SelectItem>
            {examOptions.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={room} onValueChange={setRoom}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by hall" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All halls</SelectItem>
            {roomOptions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => setUnreadOnly((v) => !v)}>
          Unread only
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-3d p-5">
          <h2 className="font-display mb-1 text-lg font-semibold">
            <UserPlus className="mr-1 inline size-4" /> Staff approval requests
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">
            New teaching and non-teaching staff stay inactive until an admin approves them here.
          </p>
          <div className="space-y-3">
            {visibleRequests.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing matching these filters.</p>
            ) : (
              visibleRequests.map((r) => (
                <article key={r.id} className="glass space-y-3 rounded-2xl p-4 text-left">
                  <header className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display truncate text-[0.95rem] leading-tight font-semibold tracking-tight">
                        {r.full_name}
                        {r.admin_read_at ? null : (
                          <span className="bg-destructive ml-2 inline-block size-2 rounded-full align-middle" />
                        )}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {r.department} · {r.designation}
                      </p>
                    </div>
                    <Badge
                      className="shrink-0 capitalize"
                      variant={r.status === "pending" ? "outline" : r.status === "approved" ? "secondary" : "destructive"}
                    >
                      {r.status}
                    </Badge>
                  </header>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="col-span-2 min-w-0">
                      <dt className="text-muted-foreground/70 text-[0.65rem] font-medium tracking-wide uppercase">Email</dt>
                      <dd className="truncate">{r.email}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground/70 text-[0.65rem] font-medium tracking-wide uppercase">Type</dt>
                      <dd>
                        {r.staff_type === "teaching" ? "Teaching" : "Non-teaching"}
                        {r.is_senior ? " · Senior" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground/70 text-[0.65rem] font-medium tracking-wide uppercase">Duty cap</dt>
                      <dd className="tabular-nums">{r.max_duties}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-muted-foreground/70 text-[0.65rem] font-medium tracking-wide uppercase">Reason</dt>
                      <dd className="leading-relaxed">{r.reason}</dd>
                    </div>
                  </dl>

                  <p className="text-muted-foreground border-border/50 border-t pt-2 text-[0.7rem]">
                    Requested by {r.requested_by_name} · {new Date(r.created_at).toLocaleString()}
                  </p>

                  {r.status !== "pending" && r.review_notes ? (
                    <p className="bg-muted/40 rounded-lg p-2.5 text-xs leading-relaxed">
                      <span className="text-muted-foreground/70 text-[0.65rem] font-medium tracking-wide uppercase">
                        Admin decision reason
                      </span>
                      <br />
                      {r.review_notes}
                      {r.reviewed_by_name ? (
                        <span className="text-muted-foreground"> — {r.reviewed_by_name}</span>
                      ) : null}
                    </p>
                  ) : null}

                  {isAdmin && r.status === "pending" ? (
                    <div className="space-y-2">
                      <Textarea
                        value={decisionNotes[r.id] ?? ""}
                        onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Decision reason (saved with your approval or rejection)"
                        rows={2}
                        maxLength={300}
                        className="glass resize-none text-xs"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={review.isPending}
                          onClick={() =>
                            review.mutate({
                              requestId: r.id,
                              action: "approve",
                              ...(decisionNotes[r.id]?.trim() ? { notes: decisionNotes[r.id]!.trim() } : {}),
                            })
                          }
                        >
                          <Check className="mr-1 size-4" /> Approve & activate
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={review.isPending || (decisionNotes[r.id]?.trim().length ?? 0) < 3}
                          onClick={() =>
                            review.mutate({
                              requestId: r.id,
                              action: "reject",
                              notes: decisionNotes[r.id]!.trim(),
                            })
                          }
                        >
                          <X className="mr-1 size-4" /> Reject
                        </Button>
                      </div>
                      <p className="text-muted-foreground text-[0.7rem]">
                        A reason of at least 3 characters is required to reject a request.
                      </p>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="card-3d p-5">
          <h2 className="font-display mb-1 text-lg font-semibold">
            <BellRing className="mr-1 inline size-4" /> Emergency alerts
          </h2>
          <p className="text-muted-foreground mb-4 text-sm">Filter by exam or hall and assign cover instantly.</p>
          <div className="space-y-3">
            {visibleAlerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nothing matching these filters.</p>
            ) : (
              visibleAlerts.map((a) => (
                <div key={a.id} className="glass space-y-2 rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {a.exam_name} · {a.hall ?? "Floor standby"}
                      {a.admin_read_at ? null : (
                        <span className="bg-destructive ml-2 inline-block size-2 rounded-full align-middle" />
                      )}
                    </p>
                    <Badge variant={a.status === "open" ? "destructive" : "secondary"}>{a.status}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {a.exam_date} at {String(a.start_time).slice(0, 5)} · raised by {a.raised_by}
                  </p>
                  <p className="text-xs">{a.reason}</p>
                  {isAdmin && a.status === "open" ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={replacement[a.id] ?? ""}
                        onValueChange={(v) => setReplacement((prev) => ({ ...prev, [a.id]: v }))}
                      >
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="Choose replacement" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {(staff ?? [])
                            .filter((t) => t.active && t.id !== a.original_teacher_id)
                            .map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.full_name} · {t.duties} duties
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={resolve.isPending || !replacement[a.id]}
                        onClick={() =>
                          resolve.mutate({
                            requestId: a.id,
                            action: "resolve",
                            replacementTeacherId: replacement[a.id]!,
                          })
                        }
                      >
                        <ShieldCheck className="mr-1 size-4" /> Assign cover
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resolve.isPending}
                        onClick={() => resolve.mutate({ requestId: a.id, action: "cancel" })}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
