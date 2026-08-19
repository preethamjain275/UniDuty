// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeftRight, Plus, CheckCircle, XCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSwapRequests, createSwapRequest, respondToSwap, adminReviewSwap, listDuties, stateFacultyTenancy } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/duty-swap")({
  head: () => ({
    meta: [
      { title: "Duty Swap & Alter — InvigilateOS" },
      { name: "description", content: "Faculty Duty Swap Requests and Target Permission Approvals." },
    ],
  }),
  component: DutySwapPage,
});

const STATUS_STYLE: Record<string, { color: string; label: string }> = {
  pending: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Awaiting Target Faculty Permission" },
  target_accepted: { color: "bg-sky-500/20 text-sky-400 border-sky-500/30", label: "Target Consented — Pending Admin Approval" },
  target_rejected: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Target Faculty Declined" },
  approved: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Swap Approved & Room Reassigned" },
  rejected: { color: "bg-red-600/20 text-red-400 border-red-600/30", label: "Admin Rejected" },
};

function SwapCard({ req, onAdminAction, onRespond, isAdmin }: any) {
  const [adminRemarks, setAdminRemarks] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const style = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;

  return (
    <div className="glass glass-hover rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${style.color}`}>
              {style.label}
            </span>
          </div>
          <p className="font-extrabold text-base">{req.requester_name}</p>
          <p className="text-xs text-muted-foreground">{req.requester_dept}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold">{req.exam_name}</p>
          <p className="text-xs text-muted-foreground">Room {req.room_number} · {req.exam_date}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold">Requester Faculty</p>
          <p className="font-bold text-sm mt-0.5">{req.requester_name}</p>
        </div>
        <ArrowLeftRight className="size-5 text-primary shrink-0" />
        <div className="flex-1 rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
          <p className="text-[10px] uppercase text-muted-foreground font-bold">Target Swap Faculty</p>
          <p className="font-bold text-sm mt-0.5 text-primary">{req.target_name}</p>
        </div>
      </div>

      <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-3">
        <p className="text-[10px] uppercase text-muted-foreground font-bold">Reason for Duty Swap Request</p>
        <p className="text-sm mt-1 font-medium">{req.reason}</p>
      </div>

      {/* Target Faculty Permission Buttons */}
      {req.status === "pending" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-300">
            Permission required from target faculty ({req.target_name}):
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 btn-3d" onClick={() => onRespond(req.id, "accept")}>
              <CheckCircle className="size-4 mr-1" /> Grant Permission (Accept)
            </Button>
            <Button size="sm" variant="destructive" className="flex-1" onClick={() => onRespond(req.id, "reject")}>
              <XCircle className="size-4 mr-1" /> Decline Request
            </Button>
          </div>
        </div>
      )}

      {/* Admin Approval Panel */}
      {isAdmin && (req.status === "target_accepted" || req.status === "pending") && (
        <div className="space-y-2 pt-2 border-t border-foreground/10">
          {!showAdminPanel ? (
            <Button size="sm" variant="outline" onClick={() => setShowAdminPanel(true)}>
              <Shield className="size-4 mr-1" /> Admin Final Review
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Admin remarks…"
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => { onAdminAction(req.id, "approve", adminRemarks); setShowAdminPanel(false); }}>
                  <CheckCircle className="size-4 mr-1" /> Approve & Reassign Room
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => { onAdminAction(req.id, "reject", adminRemarks); setShowAdminPanel(false); }}>
                  <XCircle className="size-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DutySwapPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const qc = useQueryClient();

  const listFn = useServerFn(listSwapRequests);
  const createFn = useServerFn(createSwapRequest);
  const respondFn = useServerFn(respondToSwap);
  const adminFn = useServerFn(adminReviewSwap);
  const dutiesFn = useServerFn(listDuties);

  const { data: requests = [] } = useQuery({ queryKey: ["swap-requests"], queryFn: () => listFn() });
  const { data: duties = [] } = useQuery({ queryKey: ["duties"], queryFn: () => dutiesFn() });

  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({ duty_id: "", requester_id: "fac-1", target_id: "", reason: "", remarks: "" });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: newForm } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swap-requests"] });
      setOpenNew(false);
      toast.success("Duty swap request sent to faculty member");
    },
  });

  const respondMut = useMutation({
    mutationFn: ({ requestId, response }: any) => respondFn({ data: { requestId, response } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swap-requests"] });
      toast.success("Permission response recorded");
    },
  });

  const adminMut = useMutation({
    mutationFn: ({ requestId, action, remarks }: any) => adminFn({ data: { requestId, action, remarks } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["swap-requests"] });
      qc.invalidateQueries({ queryKey: ["duties"] });
      toast.success("Admin decision updated & room reassigned");
    },
  });

  return (
    <AppShell
      title="Alter / Swap Duty Request"
      description="Select target faculty from all teachers, request permission, and obtain admin room reassignment"
      actions={
        <Button size="sm" className="btn-3d" onClick={() => setOpenNew(true)}>
          <Plus className="size-4" /> Request Duty Swap
        </Button>
      }
    >
      <div className="space-y-4">
        {(requests as any[]).length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-muted-foreground">No duty swap requests found.</div>
        ) : (
          (requests as any[]).map((req: any) => (
            <SwapCard
              key={req.id}
              req={req}
              isAdmin={isAdmin}
              onRespond={(id: string, response: string) => respondMut.mutate({ requestId: id, response })}
              onAdminAction={(id: string, action: string, remarks: string) => adminMut.mutate({ requestId: id, action, remarks })}
            />
          ))
        )}
      </div>

      {/* New Request Modal */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Duty Alter / Swap (All Fields Required)</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label className="after:content-['*'] after:text-red-500 after:ml-0.5">Select Requester Faculty (Your Account)</Label>
              <Select value={newForm.requester_id} onValueChange={(v) => setNewForm({ ...newForm, requester_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select requester faculty member *" /></SelectTrigger>
                <SelectContent>
                  {stateFacultyTenancy.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} — {t.department} ({t.reporting_cell})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="after:content-['*'] after:text-red-500 after:ml-0.5">Select Your Allotted Duty</Label>
              <Select value={newForm.duty_id} onValueChange={(v) => setNewForm({ ...newForm, duty_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select duty to swap *" /></SelectTrigger>
                <SelectContent>
                  {(duties as any[]).map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.teacher_name} — Room {d.room_number} — {d.exam_name} ({d.exam_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="after:content-['*'] after:text-red-500 after:ml-0.5">Select Target Faculty (All Teachers List)</Label>
              <Select value={newForm.target_id} onValueChange={(v) => setNewForm({ ...newForm, target_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select target faculty member *" /></SelectTrigger>
                <SelectContent>
                  {stateFacultyTenancy.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.full_name} — {t.department} ({t.reporting_cell})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="after:content-['*'] after:text-red-500 after:ml-0.5">Reason for Requested Duty Swap</Label>
              <Textarea
                placeholder="State your exact reason for requested duty swap (Required) *"
                value={newForm.reason}
                onChange={(e) => setNewForm({ ...newForm, reason: e.target.value })}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={createMut.isPending || !newForm.duty_id || !newForm.target_id || !newForm.reason.trim()}
              className="btn-3d"
            >
              Send Swap Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
