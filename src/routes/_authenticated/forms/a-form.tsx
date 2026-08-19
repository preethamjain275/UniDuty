// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Printer, ShieldAlert, Filter, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

function AFormPrint({ form, onDelete }: { form: any; onDelete: any }) {
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
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "80px" }}>Signature</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "75px" }}>No of Books Used</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "80px" }}>No of Books Returned (Unused)</th>
            <th style={{ border: "1px solid #000", padding: "6px", fontSize: "10px", textAlign: "center", width: "70px" }}>Remarks</th>
            <th className="print:hidden" style={{ border: "1px solid #000", padding: "4px", width: "50px" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {form.rows.map((row: any, i: number) => (
            <tr key={row.id || i}>
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.floor}</td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold", textAlign: "center" }}>{row.room_no}</td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontWeight: "bold" }}>{row.faculty_name}</td>
              {/* Space left blank for manual entry */}
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.booklets_issued}</td>
              <td style={{ border: "1px solid #000", padding: "16px 6px" }}>{/* Signature space */}</td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.booklets_used}</td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", textAlign: "center" }}>{row.booklets_returned}</td>
              <td style={{ border: "1px solid #000", padding: "4px 6px", fontSize: "10px" }}>{row.remarks}</td>
              <td className="print:hidden" style={{ border: "1px solid #000", padding: "2px", textAlign: "center" }}>
                <button onClick={() => onDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">Del</button>
              </td>
            </tr>
          ))}
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
              <td className="print:hidden" style={{ border: "1px solid #000" }}>&nbsp;</td>
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

  const [floorFilter, setFloorFilter] = useState("all");
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({ floor: "2", room_number: "A202", teacher_id: "fac-1", duty_role: "Room Invigilation" });

  const { data: formData, isLoading } = useQuery({
    queryKey: ["a-form-data", floorFilter],
    queryFn: () => getAFormFn({ data: { floor: floorFilter } } as any),
    enabled: isAdmin,
  });

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

  function handlePrint() {
    const content = document.getElementById("a-form-print");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>A-Form (Floorwise)</title>
      <style>@media print { body { margin: 0; } .print\\:hidden { display: none !important; } } body { font-family: 'Times New Roman', serif; }</style>
    </head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  }

  if (!isAdmin) {
    return (
      <AppShell title="A Form — Access Restricted">
        <div className="glass rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <ShieldAlert className="size-12 text-destructive" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            A-Form is strictly managed by the Examination Cell Admin. Faculty members can access their duties and the Tenancy Form from the main menu.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="A-Form — Invigilators / Faculty (Floor-wise)" description="Official Floor-wise Invigilator & Booklet Control Form (Pre-filled Floor, Room & Faculty)">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Filter className="size-4" />Floor Filter & Actions</h2>
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
            <Button className="w-full btn-3d" onClick={() => setOpenAdd(true)}>
              <Plus className="size-4 mr-1" /> Add Faculty Entry
            </Button>
            {formData && (
              <Button className="w-full" variant="outline" onClick={handlePrint}>
                <Printer className="size-4" /> Print A-Form
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading A-Form data…</div>
          ) : formData ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="border-b border-foreground/10 px-5 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-sm">Preview A-Form ({formData.subtitle})</h2>
                <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="size-4" />Print</Button>
              </div>
              <div className="overflow-auto p-4 bg-white rounded-b-2xl">
                <AFormPrint form={formData} onDelete={(id: string) => delMut.mutate(id)} />
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
