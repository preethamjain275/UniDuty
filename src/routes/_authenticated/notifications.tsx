// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, MailOpen, ShieldCheck, UserPlus, X, Trash2, Megaphone, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  listAdminNotices,
  createAdminNotice,
  deleteAdminNotice,
  myDuties,
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
  const listNoticesFn = useServerFn(listAdminNotices);
  const createNoticeFn = useServerFn(createAdminNotice);
  const deleteNoticeFn = useServerFn(deleteAdminNotice);

  const { data: alerts } = useQuery({ queryKey: ["emergencies"], queryFn: () => emergenciesFn(), refetchInterval: 20000 });
  const { data: requests } = useQuery({ queryKey: ["staff-requests"], queryFn: () => staffReqFn(), refetchInterval: 20000 });
  const { data: staff } = useQuery({ queryKey: ["teachers"], queryFn: () => teachersFn(), enabled: isAdmin });
  const { data: notices = [] } = useQuery({ queryKey: ["admin-notices"], queryFn: () => listNoticesFn(), refetchInterval: 10000 });
  const myDutiesFn = useServerFn(myDuties);
  const { data: duties = [] } = useQuery({ queryKey: ["my-duties"], queryFn: () => myDutiesFn(), enabled: !isAdmin, refetchInterval: 10000 });

  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeContent, setNewNoticeContent] = useState("");

  const createNoticeMut = useMutation({
    mutationFn: (v: { title: string; content: string }) => createNoticeFn({ data: v }),
    onSuccess: () => {
      toast.success("Notice published to all faculties");
      setNewNoticeTitle("");
      setNewNoticeContent("");
      qc.invalidateQueries({ queryKey: ["admin-notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteNoticeMut = useMutation({
    mutationFn: (noticeId: string) => deleteNoticeFn({ data: { noticeId } }),
    onSuccess: () => {
      toast.success("Notice removed");
      qc.invalidateQueries({ queryKey: ["admin-notices"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
      title="Announcements & Notifications"
      description={
        isAdmin
          ? "Manage institutional announcements, approve staff requests, and resolve emergency alerts."
          : "View announcements, check your duties, and manage notification status."
      }
      actions={
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <Badge variant={unreadCount > 0 ? "destructive" : "outline"}>
                <BellRing className="mr-1 size-3" /> {unreadCount} unread
              </Badge>
              {unreadCount > 0 ? (
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
            </>
          ) : (
            <Badge variant="outline">
              <Megaphone className="mr-1 size-3 text-primary" /> {notices.length} Notice{notices.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Section: Notice Board (Announcements) - Span 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin Notice Composer */}
          {isAdmin && (
            <section className="card-3d p-5">
              <h2 className="font-display mb-1 text-lg font-semibold flex items-center gap-1.5">
                <Megaphone className="size-4 text-amber-500" /> Publish Announcement / Notice
              </h2>
              <p className="text-muted-foreground mb-4 text-xs">
                Write a notice that will instantly display on all faculty dashbboards and notification screens.
              </p>
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="notice-title" className="text-xs">Notice Title</Label>
                  <Input
                    id="notice-title"
                    placeholder="Enter short, descriptive title (e.g. IA-1 Seating Charts Published)"
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    className="glass text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-content" className="text-xs">Notice Content</Label>
                  <Textarea
                    id="notice-content"
                    placeholder="Write detailed announcement content here (custom formatting text allowed)..."
                    rows={4}
                    value={newNoticeContent}
                    onChange={(e) => setNewNoticeContent(e.target.value)}
                    className="glass text-xs resize-none"
                  />
                </div>
                <Button
                  size="sm"
                  className="btn-3d"
                  disabled={createNoticeMut.isPending || !newNoticeTitle.trim() || !newNoticeContent.trim()}
                  onClick={() => createNoticeMut.mutate({ title: newNoticeTitle.trim(), content: newNoticeContent.trim() })}
                >
                  <Plus className="mr-1 size-4" /> Publish Announcement
                </Button>
              </div>
            </section>
          )}

          {/* Notices List */}
          <section className="card-3d p-5">
            <h2 className="font-display mb-1 text-lg font-semibold flex items-center gap-1.5">
              <Megaphone className="size-4 text-primary" /> Exam Cell Notice Board
            </h2>
            <p className="text-muted-foreground mb-4 text-xs">
              Official updates from the Examination Controller.
            </p>
            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
                  {isAdmin
                    ? "No announcements posted yet. Use the composer above to publish a notice."
                    : "No announcements from Exam Cell. Check your active duty alerts on the right."}
                </div>
              ) : (
                notices.map((n: any) => (
                  <article key={n.id} className="glass rounded-2xl p-5 border border-foreground/5 relative flex gap-4">
                    <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Megaphone className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-[0.95rem] font-bold leading-tight truncate">
                          {n.title}
                        </h3>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                        {n.content}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive absolute top-3 right-3"
                        onClick={() => deleteNoticeMut.mutate(n.id)}
                        disabled={deleteNoticeMut.isPending}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Section: Role Specific Notifications (1 Column) */}
        <div className="space-y-6">
          {isAdmin ? (
            <>
              {/* Filters for Admin Queue */}
              <section className="glass p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Filters</h3>
                  <Button
                    variant={unreadOnly ? "default" : "outline"}
                    size="icon"
                    className="size-7 rounded-lg"
                    onClick={() => setUnreadOnly((v) => !v)}
                    title="Toggle Unread Only"
                  >
                    <BellRing className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2">
                  <Select value={exam} onValueChange={setExam}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Exam" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All Exams</SelectItem>
                      {examOptions.map((e) => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={room} onValueChange={setRoom}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="Hall" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All Halls</SelectItem>
                      {roomOptions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* Staff Requests */}
              <section className="card-3d p-5">
                <h2 className="font-display mb-1 text-base font-semibold flex items-center gap-1.5">
                  <UserPlus className="size-4 text-primary" /> Staff Registrations
                </h2>
                <p className="text-muted-foreground mb-3.5 text-xs">
                  Active approvals queue.
                </p>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {visibleRequests.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-4">No pending registrations.</p>
                  ) : (
                    visibleRequests.map((r) => (
                      <article key={r.id} className="glass space-y-2.5 rounded-xl p-3.5 text-left border border-foreground/5">
                        <header className="flex flex-wrap items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <h3 className="font-display truncate text-xs leading-tight font-bold">
                              {r.full_name}
                              {!r.admin_read_at && (
                                <span className="bg-destructive ml-1.5 inline-block size-1.5 rounded-full align-middle" />
                              )}
                            </h3>
                            <p className="text-muted-foreground text-[10px] truncate">
                              {r.department} · {r.designation}
                            </p>
                          </div>
                          <Badge
                            className="shrink-0 capitalize text-[8px] py-0"
                            variant={r.status === "pending" ? "outline" : r.status === "approved" ? "secondary" : "destructive"}
                          >
                            {r.status}
                          </Badge>
                        </header>

                        <div className="text-[10px] space-y-1 text-muted-foreground">
                          <p className="truncate"><span className="font-medium text-foreground">Email:</span> {r.email}</p>
                          <p><span className="font-medium text-foreground">Duties Limit:</span> {r.max_duties}</p>
                          <p className="line-clamp-2"><span className="font-medium text-foreground">Reason:</span> {r.reason}</p>
                        </div>

                        {r.status !== "pending" && r.review_notes ? (
                          <div className="bg-muted/40 rounded-lg p-2 text-[10px]">
                            <span className="font-semibold">Notes:</span> {r.review_notes}
                          </div>
                        ) : null}

                        {isAdmin && r.status === "pending" && (
                          <div className="space-y-2 pt-1.5 border-t border-foreground/5">
                            <Textarea
                              value={decisionNotes[r.id] ?? ""}
                              onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="Review decision note..."
                              rows={1}
                              maxLength={300}
                              className="glass resize-none text-[10px]"
                            />
                            <div className="flex gap-1.5">
                              <Button
                                size="xs"
                                className="h-7 text-[10px] px-2.5"
                                disabled={review.isPending}
                                onClick={() =>
                                  review.mutate({
                                    requestId: r.id,
                                    action: "approve",
                                    ...(decisionNotes[r.id]?.trim() ? { notes: decisionNotes[r.id]!.trim() } : {}),
                                  })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="xs"
                                variant="destructive"
                                className="h-7 text-[10px] px-2.5"
                                disabled={review.isPending || (decisionNotes[r.id]?.trim().length ?? 0) < 3}
                                onClick={() =>
                                  review.mutate({
                                    requestId: r.id,
                                    action: "reject",
                                    notes: decisionNotes[r.id]!.trim(),
                                  })
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </section>

              {/* Emergency Alerts */}
              <section className="card-3d p-5">
                <h2 className="font-display mb-1 text-base font-semibold flex items-center gap-1.5">
                  <BellRing className="size-4 text-destructive" /> Emergency Alerts
                </h2>
                <p className="text-muted-foreground mb-3.5 text-xs">
                  Urgent duty swap coverage queue.
                </p>
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {visibleAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-4">No active emergencies.</p>
                  ) : (
                    visibleAlerts.map((a) => (
                      <div key={a.id} className="glass space-y-2 rounded-xl p-3 border border-foreground/5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold truncate">
                            {a.exam_name} · {a.hall ?? "Standby"}
                            {!a.admin_read_at && (
                              <span className="bg-destructive ml-1.5 inline-block size-1.5 rounded-full align-middle" />
                            )}
                          </p>
                          <Badge variant={a.status === "open" ? "destructive" : "secondary"} className="text-[8px] py-0">{a.status}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Date: {a.exam_date} at {String(a.start_time).slice(0, 5)} · Raised by {a.raised_by}
                        </p>
                        <p className="text-[10px] bg-destructive/10 text-destructive p-2 rounded-lg">{a.reason}</p>
                        {isAdmin && a.status === "open" && (
                          <div className="space-y-2 pt-1 border-t border-foreground/5">
                            <Select
                              value={replacement[a.id] ?? ""}
                              onValueChange={(v) => setReplacement((prev) => ({ ...prev, [a.id]: v }))}
                            >
                              <SelectTrigger className="w-full h-8 text-[11px]">
                                <SelectValue placeholder="Choose Cover Teacher" />
                              </SelectTrigger>
                              <SelectContent className="max-h-56">
                                {(staff ?? [])
                                  .filter((t) => t.active && t.id !== a.original_teacher_id)
                                  .map((t) => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs">
                                      {t.full_name} · {t.duties} duties
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <div className="flex gap-2">
                              <Button
                                size="xs"
                                disabled={resolve.isPending || !replacement[a.id]}
                                onClick={() =>
                                  resolve.mutate({
                                    requestId: a.id,
                                    action: "resolve",
                                    replacementTeacherId: replacement[a.id]!,
                                  })
                                }
                              >
                                Assign
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                disabled={resolve.isPending}
                                onClick={() => resolve.mutate({ requestId: a.id, action: "cancel" })}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : (
            /* Faculty Duty Summary */
            <section className="card-3d p-5">
              <h2 className="font-display mb-1 text-lg font-semibold flex items-center gap-1.5">
                <BellRing className="size-4 text-primary" /> My Duties & Alerts
              </h2>
              <p className="text-muted-foreground mb-4 text-xs">
                Review your current exam schedule and alert states.
              </p>
              <div className="space-y-3">
                {duties.length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center text-muted-foreground text-xs border border-dashed border-foreground/10">
                    No scheduled exam duties at the moment.
                  </div>
                ) : (
                  duties.map((d: any) => (
                    <div key={d.allocation_id} className="glass rounded-xl p-3.5 space-y-2 border border-foreground/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold truncate max-w-[170px]">{d.exam_name}</p>
                        <Badge variant={d.status === "accepted" ? "secondary" : "outline"} className="capitalize text-[8px] py-0">
                          {d.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{d.hall} (Floor {d.floor})</span>
                        <span>{d.exam_date}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-foreground/5 text-[10px]">
                        <span className="capitalize bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {d.duty_role}
                        </span>
                        {d.alert_raised ? (
                          <span className="text-destructive font-semibold flex items-center gap-0.5 animate-pulse">
                            ⚠️ Emergency Active
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">✓ Active</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
};
