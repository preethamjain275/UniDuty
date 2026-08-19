// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldCheck, CheckCircle, MessageSquare, Send, Building2, Clock } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listEmergencies, raiseEmergency, resolveEmergency } from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency & Complaint Desk — InvigilateOS" },
      {
        name: "description",
        content: "Raise and resolve live classroom complaints, exam hall emergencies, and issue alerts in real time.",
      },
    ],
  }),
  component: EmergencyPage,
});

function EmergencyPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);

  const listFn = useServerFn(listEmergencies);
  const raiseFn = useServerFn(raiseEmergency);
  const resolveFn = useServerFn(resolveEmergency);

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["emergencies"],
    queryFn: () => listFn(),
    refetchInterval: 5000,
  });

  const [form, setForm] = useState({
    roomNumber: "A202",
    issueType: "Classroom Issue / Disturbance",
    urgency: "High",
    message: "",
  });

  const raiseMut = useMutation({
    mutationFn: () =>
      raiseFn({
        data: {
          allocationId: `room-${form.roomNumber}`,
          reason: `[${form.urgency} Urgency - ${form.issueType}] Room ${form.roomNumber}: ${form.message}`,
        },
      } as any),
    onSuccess: () => {
      toast.success("Emergency complaint sent directly to Admin Examination Cell Desk!");
      setForm({ roomNumber: "A202", issueType: "Classroom Issue / Disturbance", urgency: "High", message: "" });
      qc.invalidateQueries({ queryKey: ["emergencies"] });
    },
    onError: () => toast.error("Failed to send complaint"),
  });

  const resolveMut = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: "resolve" | "cancel" }) =>
      resolveFn({ data: { requestId, action } } as any),
    onSuccess: () => {
      toast.success("Complaint resolved and marked solved by Admin");
      qc.invalidateQueries({ queryKey: ["emergencies"] });
    },
  });

  const openComplaints = (alerts as any[]).filter((a) => a.status === "open");
  const solvedComplaints = (alerts as any[]).filter((a) => a.status !== "open");

  return (
    <AppShell
      title="Emergency & Classroom Complaint Desk"
      description={
        isAdmin
          ? "Live classroom complaints & emergency alerts raised by invigilators — review and resolve instantly"
          : "Report any ongoing classroom issue, disturbance, medical alert, or booklet shortage directly to Admin"
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Send Complaint Box (Faculty & Admin) */}
        <section className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-primary" />
            <div>
              <h2 className="font-bold text-lg">Send Classroom Emergency Complaint</h2>
              <p className="text-xs text-muted-foreground">Direct notification box to Chief Superintendent & Admin Desk</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Classroom / Room No *</Label>
                <Input
                  value={form.roomNumber}
                  onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                  placeholder="e.g. A202 or A307"
                />
              </div>
              <div className="grid gap-2">
                <Label>Urgency Level</Label>
                <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">🔴 High Urgency</SelectItem>
                    <SelectItem value="Medium">🟠 Medium</SelectItem>
                    <SelectItem value="Low">🟢 Low / Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Issue Category</Label>
              <Select value={form.issueType} onValueChange={(v) => setForm({ ...form, issueType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Classroom Issue / Disturbance">Classroom Issue / Noise Disturbance</SelectItem>
                  <SelectItem value="Answer Booklet Shortage">Answer Booklet / Stationery Shortage</SelectItem>
                  <SelectItem value="Medical Emergency">Student Medical Emergency</SelectItem>
                  <SelectItem value="Equipment / Projector Fault">Equipment / Light / Fan Fault</SelectItem>
                  <SelectItem value="Invigilator Replacement">Invigilator Relief Needed</SelectItem>
                  <SelectItem value="Other Urgent Issue">Other Urgent Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Complaint Details / Message *</Label>
              <Textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Describe what is going on in the classroom (e.g. Projector power failure in Room A202 during Mathematics exam)…"
              />
            </div>

            <Button
              className="btn-3d w-full"
              disabled={raiseMut.isPending || !form.roomNumber || !form.message.trim()}
              onClick={() => raiseMut.mutate()}
            >
              <Send className="size-4 mr-1.5" />
              {raiseMut.isPending ? "Sending Complaint…" : "Send Emergency Alert to Admin Desk"}
            </Button>
          </div>
        </section>

        {/* Live Open Complaints (Admin & Faculty View) */}
        <section className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-400" />
              <h2 className="font-bold text-lg">Active Room Complaints ({openComplaints.length})</h2>
            </div>
            {openComplaints.length > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse">
                Live Monitoring
              </Badge>
            )}
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading complaint desk…</div>
            ) : openComplaints.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground glass rounded-xl">
                <CheckCircle className="size-10 text-emerald-400 mx-auto mb-2 opacity-60" />
                <p className="font-medium text-sm">No active emergency complaints!</p>
                <p className="text-xs mt-1">All classroom operations are running smoothly.</p>
              </div>
            ) : (
              openComplaints.map((item: any) => (
                <div key={item.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-primary text-sm">Room {item.hall ?? item.room_number ?? "A202"}</span>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">Raised by {item.raised_by || item.original_teacher || "Faculty Member"}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-bold">
                      Open Alert
                    </Badge>
                  </div>

                  <p className="text-sm font-medium leading-relaxed bg-background/50 p-2.5 rounded-lg border border-foreground/10">
                    {item.reason}
                  </p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1 font-mono"><Clock className="size-3" /> {item.exam_date || "Today"}</span>
                    {isAdmin && (
                      <Button
                        size="sm"
                        className="btn-3d text-xs"
                        onClick={() => resolveMut.mutate({ requestId: item.id, action: "resolve" })}
                      >
                        <ShieldCheck className="size-3.5 mr-1" /> Mark Solved & Resolved
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Solved History */}
      <section className="glass rounded-2xl p-6 mt-6 space-y-4">
        <h2 className="font-bold text-base flex items-center gap-2">
          <CheckCircle className="size-4 text-emerald-400" /> Resolved Complaint History ({solvedComplaints.length})
        </h2>
        {solvedComplaints.length === 0 ? (
          <p className="text-xs text-muted-foreground">No resolved complaints yet.</p>
        ) : (
          <div className="space-y-2">
            {solvedComplaints.map((item: any) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-foreground/[0.02] border border-foreground/10 p-3 text-xs">
                <div>
                  <span className="font-bold text-emerald-400">✓ Solved</span> · <span className="font-mono font-bold">Room {item.hall ?? "A202"}</span>: {item.reason}
                </div>
                <span className="text-muted-foreground font-mono">{item.updated_at ? new Date(item.updated_at).toLocaleTimeString() : "Resolved"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}