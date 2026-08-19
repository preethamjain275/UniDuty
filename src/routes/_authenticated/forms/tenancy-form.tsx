// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Printer, Edit, FileText, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getTenancyDirectory, updateTenancyMember } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/forms/tenancy-form")({
  head: () => ({
    meta: [
      { title: "Tenancy Form (August 2026) — InvigilateOS" },
      { name: "description", content: "Faculty Examination Duty Tenancy Form and Allotment Directory." },
    ],
  }),
  component: TenancyFormPage,
});

function TenancyFormPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const qc = useQueryClient();

  const getTenancyFn = useServerFn(getTenancyDirectory);
  const updateTenancyFn = useServerFn(updateTenancyMember);

  const { data: tenancyData, isLoading } = useQuery({
    queryKey: ["tenancy-directory"],
    queryFn: () => getTenancyFn(),
  });

  const [editingMember, setEditingMember] = useState<any>(null);
  const [formState, setFormState] = useState({ mobile: "", reporting_cell: "", duties_dates: "", duty_type: "" });

  const updateMut = useMutation({
    mutationFn: () => updateTenancyFn({ data: { facultyId: editingMember?.id, ...formState } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenancy-directory"] });
      setEditingMember(null);
      toast.success("Tenancy details updated successfully");
    },
  });

  function openEdit(fac: any) {
    setEditingMember(fac);
    setFormState({
      mobile: fac.mobile,
      reporting_cell: fac.reporting_cell,
      duties_dates: fac.duties_dates,
      duty_type: fac.duty_type,
    });
  }

  function handlePrint() {
    const content = document.getElementById("tenancy-print-area");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Tenancy Form - August 2026</title>
      <style>@media print { body { margin: 0; } } body { font-family: 'Times New Roman', serif; }</style>
    </head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  }

  return (
    <AppShell
      title="Tenancy Form — August 2026"
      description="Faculty Room Invigilation & Frisking Duty Allotment Directory"
      actions={
        <Button size="sm" onClick={handlePrint} variant="outline">
          <Printer className="size-4" /> Print Tenancy Form
        </Button>
      }
    >
      {isLoading ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading Tenancy Form…</div>
      ) : (
        <div className="space-y-6">
          {/* Official Printable Sheet Container */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-foreground/10 flex justify-between items-center bg-foreground/[0.02]">
              <div>
                <h2 className="text-xl font-bold font-display">August - 2026 Tenancy Duty Directory</h2>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Timings: 1.30PM-4.30PM | Reporting: 12.55PM-1.45PM
                </p>
              </div>
              <Button size="sm" className="btn-3d" onClick={handlePrint}>
                <Printer className="size-4" /> Print Sheet
              </Button>
            </div>

            {/* Print Viewable Table */}
            <div id="tenancy-print-area" className="p-6 bg-white text-black font-serif">
              <div style={{ textAlign: "center", marginBottom: "16px", borderBottom: "2px solid #000", paddingBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "4px" }}>
                  <img src="/snpsu-logo.png" alt="SNPSU" style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                  <h2 style={{ fontSize: "18px", fontWeight: "900", margin: 0 }}>SAPTHAGIRI NPS UNIVERSITY</h2>
                </div>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: "4px 0" }}>Faculty Examination Duty Tenancy Form — August 2026</h3>
                <p style={{ fontSize: "11px", margin: 0 }}>
                  <strong>Duty Timings:</strong> 1.30PM - 4.30PM | <strong>Frisking/Reporting Cell Timings:</strong> 12.55PM - 1.45PM
                </p>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#f0f0f0" }}>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "35px" }}>SI. No</th>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "left" }}>Name of the Faculty</th>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "80px" }}>Department</th>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "95px" }}>Mobile No</th>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "130px" }}>Reporting Cell / Duty Type</th>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "110px" }}>Allotted Duty Dates (August)</th>
                    <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", width: "70px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(tenancyData?.duties ?? []).map((fac: any) => (
                    <tr key={fac.id}>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontWeight: "bold" }}>{fac.sl_no}</td>
                      <td style={{ border: "1px solid #000", padding: "6px", fontWeight: "bold" }}>{fac.full_name}</td>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{fac.department}</td>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontFamily: "monospace" }}>{fac.mobile}</td>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>
                        <span style={{ fontWeight: "bold" }}>{fac.reporting_cell}</span>
                        <div style={{ fontSize: "9px", color: "#444" }}>({fac.duty_type})</div>
                      </td>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontWeight: "bold", fontFamily: "monospace", fontSize: "12px", color: "#1e3a8a" }}>
                        {fac.duties_dates}
                      </td>
                      <td style={{ border: "1px solid #000", padding: "4px", textAlign: "center" }}>
                        <button
                          onClick={() => openEdit(fac)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border rounded text-[10px] font-sans print:hidden"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", fontSize: "11px" }}>
                <div>
                  <p>Verified by HOD / Department Coordinator</p>
                  <div style={{ marginTop: "30px", borderTop: "1px solid #000", width: "180px" }} />
                </div>
                <div>
                  <p>Chief Superintendent of Examinations</p>
                  <div style={{ marginTop: "30px", borderTop: "1px solid #000", width: "180px" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog for Faculty / Admin */}
      <Dialog open={Boolean(editingMember)} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tenancy Details — {editingMember?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Mobile Number</Label>
              <Input
                value={formState.mobile}
                onChange={(e) => setFormState({ ...formState, mobile: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Reporting Cell / Room</Label>
              <Input
                value={formState.reporting_cell}
                onChange={(e) => setFormState({ ...formState, reporting_cell: e.target.value })}
                placeholder="e.g. A-307 or 1st Floor Squad"
              />
            </div>
            <div className="grid gap-2">
              <Label>Duty Type</Label>
              <Input
                value={formState.duty_type}
                onChange={(e) => setFormState({ ...formState, duty_type: e.target.value })}
                placeholder="e.g. Room Invigilation, Frisking Duty, Floor Squad"
              />
            </div>
            <div className="grid gap-2">
              <Label>Allotted Dates (August 2026)</Label>
              <Input
                value={formState.duties_dates}
                onChange={(e) => setFormState({ ...formState, duties_dates: e.target.value })}
                placeholder="e.g. 8,11,13"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
              <Check className="size-4 mr-1" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
