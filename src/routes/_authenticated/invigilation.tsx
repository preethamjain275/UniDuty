// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Filter, ClipboardList, ArrowLeftRight, AlertTriangle, Edit } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listDuties, createDuty, updateDuty, deleteDuty, stateFacultyTenancy, EXAMS2, ROOMS2 } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/invigilation")({
  head: () => ({
    meta: [
      { title: "Invigilation Duties & Schedule — InvigilateOS" },
      { name: "description", content: "Faculty Invigilation Schedule and Daily Room Allotment." },
    ],
  }),
  component: InvigilationPage,
});

const ROLE_COLORS: Record<string, string> = {
  "Room Invigilation": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Frisking Duty": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Floor Squad": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

function InvigilationPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const qc = useQueryClient();

  const listFn = useServerFn(listDuties);
  const createFn = useServerFn(createDuty);
  const updateFn = useServerFn(updateDuty);
  const deleteFn = useServerFn(deleteDuty);

  const { data: duties = [], isLoading } = useQuery({ queryKey: ["duties"], queryFn: () => listFn() });

  const [openAssign, setOpenAssign] = useState(false);
  const [editingDuty, setEditingDuty] = useState<any>(null);
  const [filterSession, setFilterSession] = useState("all");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    exam_id: "exam-1",
    room_number: "A202",
    floor: "2",
    teacher_id: "fac-1",
    session: "Afternoon",
    start_time: "01:30 PM",
    end_time: "04:30 PM",
    reporting_time: "12:55 PM",
    duty_role: "Room Invigilation",
    exam_date: "2026-08-08",
  });

  const [editFormState, setEditFormState] = useState({ room_number: "", teacher_id: "", duty_role: "" });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: form } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duties"] });
      setOpenAssign(false);
      toast.success("Duty assigned successfully");
    },
  });

  const updateMut = useMutation({
    mutationFn: () => updateFn({ data: { dutyId: editingDuty?.id, ...editFormState } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duties"] });
      setEditingDuty(null);
      toast.success("Duty allotment updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { dutyId: id } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duties"] });
      toast.success("Duty removed");
    },
  });

  const filtered = (duties as any[]).filter((d) => {
    if (filterSession !== "all" && d.session !== filterSession) return false;
    if (search && !`${d.teacher_name} ${d.room_number} ${d.exam_name} ${d.duty_role}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell
      title="Invigilation Duties & Schedule"
      description={isAdmin ? "Allot different rooms & change daily faculty duties" : "View your allotted daily examination duties and schedule"}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/duty-swap"><ArrowLeftRight className="size-4" />Alter / Swap Duty</Link>
          </Button>
          {isAdmin && (
            <Button size="sm" className="btn-3d" onClick={() => setOpenAssign(true)}>
              <Plus className="size-4" />Assign Duty
            </Button>
          )}
        </div>
      }
    >
      {/* Notice Banner */}
      <div className="glass mb-6 rounded-2xl p-4 flex items-center justify-between border-l-4 border-l-amber-500">
        <div className="flex items-center gap-3">
          <AlertTriangle className="size-5 text-amber-400 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Faculty Duty Rotation & 2-Day Gap Compliance</p>
            <p className="text-xs text-muted-foreground">
              Duties are automatically assigned across rotating rooms. Faculties with consecutive duties (<span className="text-amber-400 font-semibold">&lt; 2 Days</span>) are highlighted.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="glass mb-4 flex flex-wrap gap-3 rounded-2xl p-4 items-center">
        <Input
          placeholder="Search faculty, room, duty role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterSession} onValueChange={setFilterSession}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Session" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="Afternoon">Afternoon (1:30 PM)</SelectItem>
            <SelectItem value="Morning">Morning (10:00 AM)</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setFilterSession("all"); setSearch(""); }}>
          <Filter className="size-4" />Clear Filter
        </Button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading duties…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center text-muted-foreground">
              <ClipboardList className="size-10 opacity-40" />
              <p>No assigned duties found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                  {["Date", "Examination", "Allotted Room", "Faculty Name", "Department", "Reporting Time", "Duty Role", "Gap Compliance", isAdmin ? "Actions" : ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: any) => (
                  <tr key={d.id} className="border-b border-foreground/5 hover:bg-foreground/[0.02]">
                    <td className="px-4 py-3 font-mono font-bold text-xs text-primary">{d.exam_date}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-sm">{d.exam_name}</p>
                      <p className="text-xs text-muted-foreground">{d.session} · {d.start_time}–{d.end_time}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-extrabold text-base text-amber-400">Room {d.room_number}</td>
                    <td className="px-4 py-3 font-bold">{d.teacher_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{d.department}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.reporting_time}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${ROLE_COLORS[d.duty_role] ?? "bg-slate-500/20 text-slate-400"}`}>
                        {d.duty_role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.gap_warning ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                          <AlertTriangle className="size-3" /> Tight Gap (&lt; 2 Days)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          ✓ 2-Day Gap OK
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDuty(d);
                              setEditFormState({ room_number: d.room_number, teacher_id: d.teacher_id, duty_role: d.duty_role });
                            }}
                          >
                            <Edit className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteMut.mutate(d.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assign Duty Dialog (Admin Only) */}
      <Dialog open={openAssign} onOpenChange={setOpenAssign}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Duty & Room Allotment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Examination</Label>
              <Select value={form.exam_id} onValueChange={(v) => setForm({ ...form, exam_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAMS2.map((e) => <SelectItem key={e.id} value={e.id}>{e.name} ({e.exam_date})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Faculty Member (All Teachers)</Label>
              <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stateFacultyTenancy.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.department})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room Number</Label>
              <Input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="A202" />
            </div>
            <div className="grid gap-2">
              <Label>Duty Role</Label>
              <Select value={form.duty_role} onValueChange={(v) => setForm({ ...form, duty_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Room Invigilation">Room Invigilation</SelectItem>
                  <SelectItem value="Frisking Duty">Frisking Duty</SelectItem>
                  <SelectItem value="Floor Squad">Floor Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAssign(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>Assign Duty</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Allotment Dialog (Admin Only) */}
      <Dialog open={Boolean(editingDuty)} onOpenChange={() => setEditingDuty(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Change Room or Allotted Faculty</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Allotted Room Number</Label>
              <Input
                value={editFormState.room_number}
                onChange={(e) => setEditFormState({ ...editFormState, room_number: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Faculty Member</Label>
              <Select value={editFormState.teacher_id} onValueChange={(v) => setEditFormState({ ...editFormState, teacher_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stateFacultyTenancy.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.department})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Duty Role</Label>
              <Select value={editFormState.duty_role} onValueChange={(v) => setEditFormState({ ...editFormState, duty_role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Room Invigilation">Room Invigilation</SelectItem>
                  <SelectItem value="Frisking Duty">Frisking Duty</SelectItem>
                  <SelectItem value="Floor Squad">Floor Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDuty(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
