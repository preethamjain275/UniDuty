// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Printer, ShieldAlert, Filter, Plus, Users, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getAFormData, createDuty, updateAFRow, deleteDuty, stateFacultyTenancy } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/forms/a-form")({
  head: () => ({
    meta: [
      { title: "A Form (Floorwise) — InvigilateOS" },
      { name: "description", content: "Official A-Form for Invigilators & Faculty Inside Exam Cell." },
    ],
  }),
  component: AFormPage,
});

function AFormPrint({
  form,
  onDelete,
  onTogglePresence,
  isAdmin,
}: {
  form: any;
  onDelete: any;
  onTogglePresence: any;
  isAdmin: boolean;
}) {
  if (!form) return null;
  return (
    <div
      id="a-form-print"
      style={{
        fontFamily: "'Times New Roman', serif",
        fontSize: "12px",
        background: "#fff",
        color: "#000",
        padding: "24px 28px",
        width: "794px",
        minHeight: "1123px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <div style={{ fontSize: "12px", fontStyle: "italic", textDecoration: "underline", fontWeight: "bold" }}>
            for all floors (floor wise)
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/snpsu-logo.png" alt="SNPSU" style={{ width: "36px", height: "36px", objectFit: "contain" }} />
          <div style={{ fontSize: "20px", fontWeight: "900", letterSpacing: "1px" }}>SNPSU</div>
        </div>
      </div>

      {/* Main Title Box */}
      <div style={{ textAlign: "center", border: "2px solid #000", padding: "8px", marginBottom: "14px", background: "#f8f8f8" }}>
        <div style={{ fontWeight: "900", fontSize: "16px" }}>A-FORM</div>
        <div style={{ fontSize: "12px", fontWeight: "bold", marginTop: "2px" }}>
          Invigilators / Faculty Inside Exam Cell
        </div>
        <div style={{ fontSize: "10px", marginTop: "2px" }}>
          ({form.subtitle})
        </div>
      </div>

      {/* Main Table matching reference */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "40px" }}>Floor</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "70px" }}>Room No</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "left" }}>Faculty Name</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "75px" }}>No of Booklets Issued</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "140px" }}>Signature / Attendance</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "75px" }}>No of Books Used</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "80px" }}>No of Books Returned (Unused)</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "70px" }}>Remarks</th>
            {isAdmin && <th className="print:hidden" style={{ border: "1px solid #000", padding: "4px", width: "50px" }}>Action</th>}
          </tr>
        </thead>
        <tbody>
          {form.rows.map((row: any, i: number) => {
            const isAbsent = row.presence === "absent";
            return (
              <tr key={row.id || i} style={{ background: isAbsent ? "#fef2f2" : "#ffffff" }}>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.floor}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold", textAlign: "center" }}>{row.room_no}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{row.faculty_name}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.booklets_issued}</td>
                
                {/* Signature space with toggle buttons on screen & tick/cross on print */}
                <td style={{ border: "1px solid #000", padding: "6px 4px", textAlign: "center", position: "relative" }}>
                  {/* On Web: Interactive Toggle Buttons */}
                  <div className="print:hidden flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => onTogglePresence(row.id, "present")}
                      className={`px-2 py-1 rounded text-[10px] font-sans font-bold transition-all cursor-pointer ${
                        !isAbsent
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePresence(row.id, "absent")}
                      className={`px-2 py-1 rounded text-[10px] font-sans font-bold transition-all cursor-pointer ${
                        isAbsent
                          ? "bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                  
                  {/* On Print: Shows status */}
                  <div className="print-only" style={{ display: "none", fontSize: "11px", fontWeight: "900" }}>
                    {isAbsent ? "ABSENT" : "✓ Present"}
                  </div>
                </td>

                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.booklets_used}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.booklets_returned}</td>
                <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: "10px" }}>{row.remarks}</td>
                
                {isAdmin && (
                  <td className="print:hidden" style={{ border: "1px solid #000", padding: "2px", textAlign: "center" }}>
                    <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer">Del</button>
                  </td>
                )}
              </tr>
            );
          })}
          {/* Empty rows to fill sheet */}
          {Array.from({ length: Math.max(0, 15 - form.rows.length) }, (_, idx) => (
            <tr key={`empty-${idx}`}>
              <td style={{ border: "1px solid #000", padding: "14px" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              <td style={{ border: "1px solid #000" }}>&nbsp;</td>
              {isAdmin && <td className="print:hidden" style={{ border: "1px solid #000" }}>&nbsp;</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", paddingTop: "12px" }}>
        <div>
          <div style={{ borderTop: "1px solid #000", width: "180px", textAlign: "center", paddingTop: "4px" }}>
            Exam Cell Superintendent
          </div>
        </div>
        <div>
          <div style={{ borderTop: "1px solid #000", width: "180px", textAlign: "center", paddingTop: "4px" }}>
            Chief Controller of Examinations
          </div>
        </div>
      </div>
    </div>
  );
}

function AFormPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const qc = useQueryClient();

  const getAFormFn = useServerFn(getAFormData);
  const createDutyFn = useServerFn(createDuty);
  const deleteDutyFn = useServerFn(deleteDuty);
  const updateAFRowFn = useServerFn(updateAFRow);

  const [floorFilter, setFloorFilter] = useState("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({ floor: "2", room_number: "A202", teacher_id: "fac-1", duty_role: "Room Invigilation" });

  const { data: formData, isLoading } = useQuery({
    queryKey: ["a-form-data", floorFilter],
    queryFn: () => getAFormFn({ data: { floor: floorFilter } } as any),
  });

  const totalFaculty = formData?.rows?.length ?? 0;
  const absenteesFaculty = formData?.rows?.filter((r: any) => r.presence === "absent").length ?? 0;
  const presentFaculty = totalFaculty - absenteesFaculty;

  const addMut = useMutation({
    mutationFn: () => createDutyFn({ data: { exam_id: "exam-1", ...addForm } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["a-form-data"] });
      setOpenAdd(false);
      toast.success("Faculty added to A-Form");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteDutyFn({ data: { dutyId: id } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["a-form-data"] });
      toast.success("Faculty removed from A-Form");
    },
  });

  const togglePresenceMut = useMutation({
    mutationFn: ({ id, presence }: { id: string; presence: string }) =>
      updateAFRowFn({ data: { dutyId: id, presence } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["a-form-data"] });
      toast.success("Faculty presence status updated");
    },
  });

  function handlePrint() {
    const content = document.getElementById("a-form-print");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>A-Form (Floorwise)</title>
      <style>
        @media print { 
          body { margin: 0; padding: 0; } 
          .print\\:hidden { display: none !important; } 
          .print-only { display: block !important; }
        } 
        body { font-family: 'Times New Roman', serif; margin: 20px; }
        .print-only { display: none; }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 250);
  }

  if (!isAdmin) {
    return (
      <AppShell title="A Form — Access Restricted">
        <div className="glass rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <ShieldAlert className="size-12 text-destructive" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            A-Form (Floor-wise Faculty Invigilation) is managed strictly by the Examination Cell Admin.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="A-Form — Invigilators / Faculty (Floor-wise)" description="Official Floor-wise Invigilator & Booklet Control Form (Admin Only)">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Filter className="size-4 text-primary" />Floor Filter & Actions</h2>
            <div className="grid gap-2">
              <Label>Select Floor</Label>
              <Select value={floorFilter} onValueChange={setFloorFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">For All Floors</SelectItem>
                  <SelectItem value="1">1st Floor</SelectItem>
                  <SelectItem value="2">2nd Floor</SelectItem>
                  <SelectItem value="3">3rd Floor</SelectItem>
                  <SelectItem value="4">4th Floor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <Button className="w-full btn-3d animate-fade-in" onClick={() => setOpenAdd(true)}>
                <Plus className="size-4 mr-1" /> Add Faculty Entry
              </Button>
            )}
            {formData && (
              <Button className="w-full" variant="outline" onClick={handlePrint}>
                <Printer className="size-4" /> Print / Export PDF A-Form
              </Button>
            )}
          </div>

          {formData && (
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="size-4 text-primary" /> Faculty Presence Summary
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="glass p-2.5 rounded-xl border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-semibold">Total</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{totalFaculty}</div>
                </div>
                <div className="glass p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                    <UserCheck className="size-3" /> Present
                  </div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">{presentFaculty}</div>
                </div>
                <div className="glass p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                  <div className="text-[10px] text-rose-600 font-semibold flex items-center justify-center gap-1">
                    <UserX className="size-3" /> Absent
                  </div>
                  <div className="text-lg font-bold text-rose-600 mt-0.5">{absenteesFaculty}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading A-Form data…</div>
          ) : formData ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="border-b border-foreground/10 px-5 py-3 flex items-center justify-between bg-foreground/[0.02]">
                <div>
                  <h2 className="font-semibold text-sm">Preview A-Form ({formData.subtitle})</h2>
                  <p className="text-xs text-muted-foreground">Toggle Present / Absent to update faculty duty presence</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    Present: {presentFaculty}
                  </Badge>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">
                    Absent: {absenteesFaculty}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="size-4" />Print PDF</Button>
                </div>
              </div>
              
              {/* Horizontal Scroll Support for Mobile Screens */}
              <div className="w-full overflow-x-auto p-4 bg-white rounded-b-2xl scrollbar-thin">
                <div className="min-w-[794px]">
                  <AFormPrint
                    form={formData}
                    onDelete={(id: string) => delMut.mutate(id)}
                    onTogglePresence={(id: string, presence: string) => togglePresenceMut.mutate({ id, presence })}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Faculty Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Faculty Entry to A-Form</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Faculty Member</Label>
              <Select value={addForm.teacher_id} onValueChange={(v) => setAddForm({ ...addForm, teacher_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stateFacultyTenancy.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} ({t.department})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Floor Number</Label>
              <Input value={addForm.floor} onChange={(e) => setAddForm({ ...addForm, floor: e.target.value })} placeholder="2" />
            </div>
            <div className="grid gap-2">
              <Label>Room Number</Label>
              <Input value={addForm.room_number} onChange={(e) => setAddForm({ ...addForm, room_number: e.target.value })} placeholder="A202" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending}>Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
