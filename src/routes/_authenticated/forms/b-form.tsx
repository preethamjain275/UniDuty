// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Printer, ShieldAlert, Building2, UserCheck, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getBFormData, listSeatingArrangements, updateBStudentPresence, updateBStudentBooklet } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/forms/b-form")({
  head: () => ({
    meta: [
      { title: "B Form (Individual Room) — InvigilateOS" },
      { name: "description", content: "Official B-Form for Individual Room Student Examination Attendance." },
    ],
  }),
  component: BFormPage,
});

function BFormPrint({
  form,
  onTogglePresence,
  onUpdateBooklet,
}: {
  form: any;
  onTogglePresence?: (srn: string, srNo: number, presence: string) => void;
  onUpdateBooklet?: (srn: string, srNo: number, bookletNo: string) => void;
}) {
  if (!form) return null;
  return (
    <div
      id="b-form-print"
      style={{
        fontFamily: "'Times New Roman', serif",
        fontSize: "11px",
        background: "#fff",
        color: "#000",
        padding: "20px 24px",
        width: "794px",
        minHeight: "1123px",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Title Header matching handwritten reference */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #000", paddingBottom: "6px", marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img src="/snpsu-logo.png" alt="SNPSU" style={{ width: "40px", height: "40px", objectFit: "contain" }} />
          <div>
            <div style={{ fontWeight: "900", fontSize: "16px" }}>B-forms</div>
            <div style={{ fontSize: "12px", fontStyle: "italic", textDecoration: "underline" }}>
              individual Rooms (only for exams)
            </div>
          </div>
        </div>
        <div style={{ border: "2px solid #000", padding: "4px 16px", fontWeight: "900", fontSize: "16px" }}>
          Room No: {form.room_no}
        </div>
      </div>

      {/* Main Student Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "12px" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "40px", textAlign: "center" }}>SL NO</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "120px", textAlign: "center" }}>SRN</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", textAlign: "left" }}>Student Name</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "110px", textAlign: "center" }}>Booklet Number</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "130px", textAlign: "center" }}>Signature</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "50px", textAlign: "center" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: Math.max(30, form.students ? form.students.length : 0) }, (_, i) => {
            const st = form.students ? form.students[i] : null;
            const isAbsent = st?.presence === "absent";
            return (
              <tr key={i} style={{ background: isAbsent ? "#fef2f2" : "#ffffff" }}>
                <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center", height: "24px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", fontFamily: "monospace", fontSize: "10px" }}>{st?.srn ?? ""}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", fontWeight: st ? "bold" : "normal" }}>
                  {st?.name ?? ""}
                </td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center", fontFamily: "monospace" }}>
                  {/* On Web UI: Editable Booklet Input */}
                  {st && onUpdateBooklet ? (
                    <input
                      type="text"
                      defaultValue={st.booklet_no ?? ""}
                      onBlur={(e) => onUpdateBooklet(st.srn, st.sr_no, e.target.value)}
                      className="print:hidden w-24 text-center bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-semibold focus:bg-white focus:border-primary focus:outline-none"
                      placeholder="BK0001"
                    />
                  ) : null}
                  {/* On PDF Print: Static Booklet Number */}
                  <span className="print-only" style={{ display: "none" }}>
                    {st?.booklet_no ?? ""}
                  </span>
                </td>
                <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center" }}>
                  {/* On Web UI: Attendance Toggle Buttons */}
                  {st && onTogglePresence ? (
                    <div className="print:hidden flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => onTogglePresence(st.srn, st.sr_no, "present")}
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold cursor-pointer transition-all ${
                          !isAbsent
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePresence(st.srn, st.sr_no, "absent")}
                        className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold cursor-pointer transition-all ${
                          isAbsent
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200"
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  ) : null}
                  {/* On PDF Print: Signature column is BLANK for student pen signature, or prints ABSENT if absent */}
                  <div className="print-only" style={{ display: "none", fontSize: "10px", fontWeight: "bold" }}>
                    {st ? (isAbsent ? "ABSENT" : "") : ""}
                  </div>
                </td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center", fontWeight: "bold", fontSize: "10px", color: isAbsent ? "#dc2626" : "#16a34a" }}>
                  {st ? (isAbsent ? "ABSENT" : "PRESENT") : ""}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bottom Summary Section */}
      <div style={{ borderTop: "2px solid #000", paddingTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "11px" }}>
        <div>
          <div><strong>Invigilator Name:</strong> {form.invigilator_name}</div>
          <div style={{ marginTop: "12px" }}><strong>Name & Signature Invigilator:</strong> ______________________</div>
          <div style={{ marginTop: "10px" }}>
            <strong>Absentees:</strong> <span style={{ textDecoration: "underline", fontWeight: "bold", color: "#dc2626" }}>{form.absentees_count ?? 0}</span> (Total Students: <strong>{form.total_count ?? 30}</strong> | Present: <strong style={{ color: "#16a34a" }}>{form.present_count ?? 30}</strong>)
          </div>
        </div>

        <div>
          <div><strong>Malpractice Details:</strong> ________________________</div>
          <div style={{ marginTop: "12px" }}><strong>Room's Super Indent Name:</strong> {form.invigilator_name}</div>
          <div style={{ marginTop: "10px" }}><strong>Room's Super Indent Signature:</strong> ____________________</div>
        </div>
      </div>
    </div>
  );
}

function BFormPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const qc = useQueryClient();

  const getBFormFn = useServerFn(getBFormData);
  const seatingFn = useServerFn(listSeatingArrangements);
  const updateBStudentPresenceFn = useServerFn(updateBStudentPresence);
  const updateBStudentBookletFn = useServerFn(updateBStudentBooklet);

  const { data: seating = [] } = useQuery({ queryKey: ["seating"], queryFn: () => seatingFn(), enabled: isAdmin });

  const [selectedRoom, setSelectedRoom] = useState("");

  const { data: formData, isLoading } = useQuery({
    queryKey: ["b-form-data", selectedRoom],
    queryFn: () => getBFormFn({ data: { roomNumber: selectedRoom } } as any),
    enabled: isAdmin && Boolean(selectedRoom || seating.length > 0),
  });

  const togglePresenceMut = useMutation({
    mutationFn: ({ roomNumber, studentSrn, studentSrNo, presence }: any) =>
      updateBStudentPresenceFn({ data: { roomNumber, studentSrn, studentSrNo, presence } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b-form-data"] });
      toast.success("Student attendance status updated");
    },
  });

  const updateBookletMut = useMutation({
    mutationFn: ({ roomNumber, studentSrn, studentSrNo, bookletNo }: any) =>
      updateBStudentBookletFn({ data: { roomNumber, studentSrn, studentSrNo, bookletNo } } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b-form-data"] });
      toast.success("Booklet number updated");
    },
  });

  function handlePrint() {
    const content = document.getElementById("b-form-print");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>B-Form (Room ${formData?.room_no ?? ""})</title>
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
      <AppShell title="B Form — Access Restricted">
        <div className="glass rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <ShieldAlert className="size-12 text-destructive" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            B-Form (Individual Room Attendance) is managed strictly by the Examination Cell Admin. Faculty members can view their allotted room duties from the main Invigilation menu.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="B-Form — Individual Room Attendance"
      description="Official Student Examination Attendance & Booklet Allocation Form (Admin Only)"
      actions={
        formData ? (
          <Button className="btn-3d font-bold shrink-0" size="sm" onClick={handlePrint}>
            <Printer className="size-4 mr-1" /> Print PDF
          </Button>
        ) : null
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Building2 className="size-4 text-primary" />Select Examination Room</h2>
            <div className="grid gap-2">
              <Label>Room Number</Label>
              <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                <SelectContent>
                  {(seating as any[]).map((s) => (
                    <SelectItem key={s.id} value={s.room_number}>
                      Room {s.room_number} ({s.seated} students)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData && (
              <Button className="w-full btn-3d" onClick={handlePrint}>
                <Printer className="size-4 mr-1" /> Print / Export PDF B-Form
              </Button>
            )}
          </div>

          {formData && (
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Users className="size-4 text-primary" /> Attendance Summary
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="glass p-2.5 rounded-xl border border-border/50">
                  <div className="text-[10px] text-muted-foreground font-semibold">Total</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">{formData.total_count}</div>
                </div>
                <div className="glass p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                  <div className="text-[10px] text-emerald-600 font-semibold flex items-center justify-center gap-1">
                    <UserCheck className="size-3" /> Present
                  </div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">{formData.present_count}</div>
                </div>
                <div className="glass p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                  <div className="text-[10px] text-rose-600 font-semibold flex items-center justify-center gap-1">
                    <UserX className="size-3" /> Absent
                  </div>
                  <div className="text-lg font-bold text-rose-600 mt-0.5">{formData.absentees_count}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading B-Form data…</div>
          ) : formData ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="border-b border-foreground/10 px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-foreground/[0.02]">
                <div>
                  <h2 className="font-semibold text-sm">Preview B-Form — Room {formData.room_no}</h2>
                  <p className="text-xs text-muted-foreground">Edit booklet numbers directly or toggle Present / Absent status</p>
                </div>
                <div className="flex items-center flex-wrap gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                    Present: {formData.present_count}
                  </Badge>
                  <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-xs">
                    Absent: {formData.absentees_count}
                  </Badge>
                  <Button size="sm" className="btn-3d shrink-0" onClick={handlePrint}><Printer className="size-4 mr-1" />Print PDF</Button>
                </div>
              </div>
              
              <div className="sm:hidden px-4 pt-3 pb-1 text-[11px] text-muted-foreground flex items-center justify-between font-medium border-b border-foreground/5 bg-muted/20">
                <span>↔️ Swipe table to view full columns</span>
                <Button size="xs" variant="ghost" className="h-6 text-[10px] text-primary" onClick={handlePrint}>
                  <Printer className="size-3 mr-1" /> Print PDF
                </Button>
              </div>

              <div className="w-full overflow-x-auto p-2 sm:p-4 bg-white rounded-b-2xl scrollbar-thin">
                <div className="min-w-[794px]">
                  <BFormPrint
                    form={formData}
                    onTogglePresence={(studentSrn: string, studentSrNo: number, presence: string) => {
                      togglePresenceMut.mutate({
                        roomNumber: formData.room_no,
                        studentSrn,
                        studentSrNo,
                        presence,
                      });
                    }}
                    onUpdateBooklet={(studentSrn: string, studentSrNo: number, bookletNo: string) => {
                      updateBookletMut.mutate({
                        roomNumber: formData.room_no,
                        studentSrn,
                        studentSrNo,
                        bookletNo,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Select a room to view and print its B-Form</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
