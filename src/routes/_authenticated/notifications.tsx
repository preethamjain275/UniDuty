// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, Check, MailOpen, UserPlus, X, Trash2, Megaphone, Plus, AlertTriangle, ShieldAlert, FileWarning, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  createFacultyIncident,
  myDuties,
} from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications & Incidents — InvigilateOS" },
      {
        name: "description",
        content: "Institutional notice board, student malpractice incident reports, and duty swap approvals.",
      },
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
  const createIncidentFn = useServerFn(createFacultyIncident);
  const myDutiesFn = useServerFn(myDuties);

  const { data: alerts } = useQuery({ queryKey: ["emergencies"], queryFn: () => emergenciesFn(), refetchInterval: 30000 });
  const { data: requests } = useQuery({ queryKey: ["staff-requests"], queryFn: () => staffReqFn(), refetchInterval: 30000 });
  const { data: staff } = useQuery({ queryKey: ["teachers"], queryFn: () => teachersFn(), enabled: isAdmin });
  const { data: notices = [] } = useQuery({ queryKey: ["admin-notices"], queryFn: () => listNoticesFn(), refetchInterval: 30000 });
  const { data: duties = [] } = useQuery({ queryKey: ["my-duties"], queryFn: () => myDutiesFn(), enabled: !isAdmin, refetchInterval: 30000 });

  const [newNoticeTitle, setNewNoticeTitle] = useState("");
  const [newNoticeContent, setNewNoticeContent] = useState("");

  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    type: "student_malpractice",
    category: "Student Copying / Malpractice",
    hall: "Hall A-202",
    student_srn: "",
    student_name: "",
    reason: "",
  });

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

  const createIncidentMut = useMutation({
    mutationFn: () =>
      createIncidentFn({
        data: {
          ...incidentForm,
          raised_by: me?.full_name ? `${me.full_name} (${me.department || "Faculty"})` : "Faculty Invigilator",
        },
      }),
    onSuccess: () => {
      toast.success("Incident / Request submitted to Examination Cell Admin");
      setIncidentOpen(false);
      setIncidentForm({
        type: "student_malpractice",
        category: "Student Copying / Malpractice",
        hall: "Hall A-202",
        student_srn: "",
        student_name: "",
        reason: "",
      });
      qc.invalidateQueries({ queryKey: ["emergencies"] });
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
      toast.success(v.action === "approve" ? "Staff request approved" : "Staff request rejected");
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
    mutationFn: (v: { requestId: string; action: "accept" | "reject" | "resolve" | "cancel"; replacementTeacherId?: string; notes?: string }) =>
      resolveFn({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.action === "accept" || v.action === "resolve" ? "Status updated: Accepted" : "Status updated: Rejected");
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
          ? "Manage institutional announcements, review student incident reports, and accept/reject faculty requests."
          : "View Exam Cell announcements, submit student copying / incident reports to admin, and track request statuses."
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
            <Button size="sm" className="btn-3d font-semibold" onClick={() => setIncidentOpen(true)}>
              <FileWarning className="mr-1 size-4" /> Report Incident to Admin
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Section: Notice Board & Announcements (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Admin Notice Composer */}
          {isAdmin && (
            <section className="card-3d p-5">
              <h2 className="font-display mb-1 text-lg font-semibold flex items-center gap-1.5">
                <Megaphone className="size-4 text-amber-500" /> Publish Announcement / Notice
              </h2>
              <p className="text-muted-foreground mb-4 text-xs">
                Write a notice that will instantly display on all faculty dashboards and notification screens.
              </p>
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="notice-title" className="text-xs">Notice Title</Label>
                  <Input
                    id="notice-title"
                    placeholder="Enter short, descriptive title (e.g. IA-1 Seating Charts & B-Forms Published)"
                    value={newNoticeTitle}
                    onChange={(e) => setNewNoticeTitle(e.target.value)}
                    className="glass text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notice-content" className="text-xs">Notice Content</Label>
                  <Textarea
                    id="notice-content"
                    placeholder="Write detailed announcement content here..."
                    rows={3}
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

          {/* Exam Cell Notice Board */}
          <section className="card-3d p-5">
            <h2 className="font-display mb-1 text-lg font-semibold flex items-center gap-1.5">
              <Megaphone className="size-4 text-primary" /> Exam Cell Notice Board
            </h2>
            <p className="text-muted-foreground mb-4 text-xs">
              Official updates & announcements from the Chief Controller of Examinations.
            </p>
            <div className="space-y-4">
              {notices.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center text-muted-foreground text-sm">
                  {isAdmin
                    ? "No announcements posted yet. Use the composer above to publish a notice."
                    : "No announcements from Exam Cell."}
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

          {/* For Faculty: Incident Reports & Requests Sent to Admin */}
          {!isAdmin && (
            <section className="card-3d p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-semibold flex items-center gap-1.5">
                    <FileWarning className="size-4 text-amber-500" /> My Submitted Requests & Incident Reports
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Track the real-time status of student copying reports & duty requests submitted to Admin.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setIncidentOpen(true)}>
                  <Plus className="size-3.5 mr-1" /> New Report
                </Button>
              </div>

              <div className="space-y-3">
                {(alerts ?? []).length === 0 ? (
                  <div className="glass rounded-xl p-6 text-center text-xs text-muted-foreground">
                    You have not submitted any student incidents or duty requests yet.
                  </div>
                ) : (
                  (alerts ?? []).map((a: any) => {
                    const isAccepted = a.status === "accepted" || a.status === "resolved";
                    const isRejected = a.status === "rejected" || a.status === "cancelled";
                    const isPending = !isAccepted && !isRejected;

                    return (
                      <div key={a.id} className="glass rounded-xl p-4 space-y-2 border border-foreground/10">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs">{a.category || "Incident Report"}</span>
                              <Badge
                                variant={isAccepted ? "secondary" : isRejected ? "destructive" : "outline"}
                                className="text-[9px] capitalize py-0 font-bold"
                              >
                                {isAccepted ? "✓ Accepted" : isRejected ? "✕ Rejected" : "⏳ Pending Admin Review"}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {a.hall} · {a.exam_name} · Reported on {new Date(a.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {a.student_srn && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-lg p-2 text-xs font-mono">
                            <strong>Student Details:</strong> SRN {a.student_srn} {a.student_name ? `(${a.student_name})` : ""}
                          </div>
                        )}

                        <p className="text-xs bg-foreground/[0.03] p-2.5 rounded-lg border border-foreground/5 leading-relaxed">
                          <strong>Description:</strong> {a.reason}
                        </p>

                        {/* Admin Decision Note Displayed directly to Faculty */}
                        {a.admin_notes && (
                          <div className={`p-2.5 rounded-lg text-xs font-medium border ${isAccepted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-rose-500/10 border-rose-500/30 text-rose-600'}`}>
                            <strong>Admin Note / Action:</strong> {a.admin_notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Section: Admin Queue or Faculty Duty Summary (1 Column) */}
        <div className="space-y-6">
          {isAdmin ? (
            <>
              {/* Admin Queue Filters */}
              <section className="glass p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Queue Filters</h3>
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
                </div>
              </section>

              {/* Emergency Alerts & Student Copying Reports Queue */}
              <section className="card-3d p-5">
                <h2 className="font-display mb-1 text-base font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="size-4 text-destructive" /> Student Incidents & Emergency Alerts
                </h2>
                <p className="text-muted-foreground mb-3.5 text-xs">
                  Review student malpractice reports & invigilator relief alerts. Accept or reject with notes.
                </p>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {visibleAlerts.length === 0 ? (
                    <p className="text-muted-foreground text-xs text-center py-6">No active alerts or incident reports.</p>
                  ) : (
                    visibleAlerts.map((a) => {
                      const isAccepted = a.status === "accepted" || a.status === "resolved";
                      const isRejected = a.status === "rejected" || a.status === "cancelled";
                      const isOpen = !isAccepted && !isRejected;

                      return (
                        <div key={a.id} className="glass space-y-2 rounded-xl p-3.5 border border-foreground/10 text-left">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold truncate">
                                {a.category || "Incident Alert"}
                                {!a.admin_read_at && (
                                  <span className="bg-destructive ml-1.5 inline-block size-2 rounded-full align-middle animate-pulse" />
                                )}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {a.hall} · {a.exam_name}
                              </p>
                            </div>
                            <Badge
                              variant={isAccepted ? "secondary" : isRejected ? "destructive" : "outline"}
                              className="text-[9px] capitalize py-0 font-bold"
                            >
                              {isAccepted ? "✓ Accepted" : isRejected ? "✕ Rejected" : "Pending"}
                            </Badge>
                          </div>

                          <p className="text-[10px] text-muted-foreground">
                            Reported by: <strong className="text-foreground">{a.raised_by}</strong>
                          </p>

                          {a.student_srn && (
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-1.5 rounded text-[10px] font-mono">
                              <strong>Student:</strong> SRN {a.student_srn} {a.student_name ? `(${a.student_name})` : ""}
                            </div>
                          )}

                          <p className="text-[11px] bg-foreground/[0.03] p-2 rounded-lg leading-relaxed border border-foreground/5">
                            {a.reason}
                          </p>

                          {a.admin_notes && (
                            <p className="text-[10px] text-muted-foreground italic">
                              <strong className="not-italic">Admin Note:</strong> {a.admin_notes}
                            </p>
                          )}

                          {/* Admin Accept / Reject Decision Actions */}
                          {isOpen && (
                            <div className="space-y-2 pt-2 border-t border-foreground/10">
                              <Input
                                value={decisionNotes[a.id] ?? ""}
                                onChange={(e) => setDecisionNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                                placeholder="Write decision notes / action taken..."
                                className="glass text-[10px] h-7"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="xs"
                                  className="h-7 text-[10px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1"
                                  disabled={resolve.isPending}
                                  onClick={() =>
                                    resolve.mutate({
                                      requestId: a.id,
                                      action: "accept",
                                      notes: decisionNotes[a.id]?.trim() || "Accepted / Action Taken by Admin",
                                    })
                                  }
                                >
                                  <Check className="size-3 mr-1" /> Accept / Approve
                                </Button>
                                <Button
                                  size="xs"
                                  variant="destructive"
                                  className="h-7 text-[10px] px-3 font-bold flex-1"
                                  disabled={resolve.isPending}
                                  onClick={() =>
                                    resolve.mutate({
                                      requestId: a.id,
                                      action: "reject",
                                      notes: decisionNotes[a.id]?.trim() || "Rejected by Admin",
                                    })
                                  }
                                >
                                  <X className="size-3 mr-1" /> Reject
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </>
          ) : (
            /* Faculty Scheduled Duty Summary */
            <section className="card-3d p-5">
              <h2 className="font-display mb-1 text-lg font-semibold flex items-center gap-1.5">
                <BellRing className="size-4 text-primary" /> My Scheduled Duties
              </h2>
              <p className="text-muted-foreground mb-4 text-xs">
                Review your invigilation hall assignments.
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
                        <span className="text-emerald-500 font-medium">✓ Active</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Report Student Copying / Incident Dialog for Faculty */}
      <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" /> Report Incident / Request to Admin
            </DialogTitle>
            <DialogDescription>
              Report student copying, malpractice, or duty relief requests directly to the Examination Cell Admin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={incidentForm.category}
                onValueChange={(v) => setIncidentForm({ ...incidentForm, category: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student Copying / Malpractice">🚨 Student Copying / Malpractice</SelectItem>
                  <SelectItem value="Student Phone / Tech Misuse">📱 Student Phone / Unauthorized Material</SelectItem>
                  <SelectItem value="Duty Relief Request">🚑 Duty Relief / Emergency Request</SelectItem>
                  <SelectItem value="Answer Booklet Shortage">📦 Answer Booklet / Supply Request</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Exam Hall / Room Number</Label>
              <Input
                value={incidentForm.hall}
                onChange={(e) => setIncidentForm({ ...incidentForm, hall: e.target.value })}
                placeholder="Hall A-202"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1.5">
                <Label>Student SRN (Optional)</Label>
                <Input
                  value={incidentForm.student_srn}
                  onChange={(e) => setIncidentForm({ ...incidentForm, student_srn: e.target.value })}
                  placeholder="2026CS0014"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Student Name (Optional)</Label>
                <Input
                  value={incidentForm.student_name}
                  onChange={(e) => setIncidentForm({ ...incidentForm, student_name: e.target.value })}
                  placeholder="Karan Verma"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Detailed Reason / Description</Label>
              <Textarea
                value={incidentForm.reason}
                onChange={(e) => setIncidentForm({ ...incidentForm, reason: e.target.value })}
                placeholder="Describe what happened (e.g. Student caught using unauthorized study notes in Hall A-202)..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentOpen(false)}>Cancel</Button>
            <Button
              className="btn-3d"
              onClick={() => createIncidentMut.mutate()}
              disabled={createIncidentMut.isPending || !incidentForm.reason.trim()}
            >
              <Send className="size-4 mr-1" /> Submit to Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
