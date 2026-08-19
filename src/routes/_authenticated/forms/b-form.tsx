// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Printer, ShieldAlert, Building2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getBFormData, listSeatingArrangements } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/forms/b-form")({
  head: () => ({
    meta: [
      { title: "B Form (Individual Room) — InvigilateOS" },
      { name: "description", content: "Official B-Form for Individual Room Student Examination Attendance." },
    ],
  }),
  component: BFormPage,
});

function BFormPrint({ form }: { form: any }) {
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
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "100px", textAlign: "center" }}>Booklet Number</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "110px", textAlign: "center" }}>Signature</th>
            <th style={{ border: "1px solid #000", padding: "5px", fontSize: "10px", width: "50px", textAlign: "center" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 30 }, (_, i) => {
            const st = form.students[i];
            return (
              <tr key={i}>
                <td style={{ border: "1px solid #000", padding: "3px 4px", textAlign: "center", height: "20px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", fontFamily: "monospace", fontSize: "10px" }}>{st?.srn ?? ""}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", fontWeight: st ? "bold" : "normal" }}>{st?.name ?? ""}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center", fontFamily: "monospace" }}>{st?.booklet_no ?? ""}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px" }}>{/* Signature space */}</td>
                <td style={{ border: "1px solid #000", padding: "3px 6px", textAlign: "center" }}>{/* Blank space for manual entry */}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Bottom Summary Section (Absentees & Total left blank for manual entry) */}
      <div style={{ borderTop: "2px solid #000", paddingTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "11px" }}>
        <div style={{ spaceY: "6px" }}>
          <div><strong>Invigilator Name:</strong> {form.invigilator_name}</div>
          <div style={{ marginTop: "16px" }}><strong>Name & Signature Invigilator:</strong> ______________________</div>
          <div style={{ marginTop: "10px" }}><strong>Absentees:</strong> ________ (Total Students: ________)</div>
        </div>

        <div style={{ spaceY: "6px" }}>
          <div><strong>Malpractice Details:</strong> ________________________</div>
          <div style={{ marginTop: "16px" }}><strong>Room's Super Indent Name:</strong> {form.invigilator_name}</div>
          <div style={{ marginTop: "10px" }}><strong>Room's Super Indent Signature:</strong> ____________________</div>
        </div>
      </div>
    </div>
  );
}

function BFormPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);

  const getBFormFn = useServerFn(getBFormData);
  const seatingFn = useServerFn(listSeatingArrangements);
  const { data: seating = [] } = useQuery({ queryKey: ["seating"], queryFn: () => seatingFn(), enabled: isAdmin });

  const [selectedRoom, setSelectedRoom] = useState("");

  const { data: formData, isLoading } = useQuery({
    queryKey: ["b-form-data", selectedRoom],
    queryFn: () => getBFormFn({ data: { roomNumber: selectedRoom } } as any),
    enabled: isAdmin && Boolean(selectedRoom || seating.length > 0),
  });

  function handlePrint() {
    const content = document.getElementById("b-form-print");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>B-Form (Room ${formData?.room_no ?? ""})</title>
      <style>@media print { body { margin: 0; } } body { font-family: 'Times New Roman', serif; }</style>
    </head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.print();
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
    <AppShell title="B-Form — Individual Room Attendance" description="Official Student Examination Attendance & Booklet Allocation Form (Blank Total & Absentees for Manual Entry)">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2"><Building2 className="size-4" />Select Examination Room</h2>
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
                <Printer className="size-4" /> Print B-Form
              </Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="glass rounded-2xl p-12 text-center text-muted-foreground">Loading B-Form data…</div>
          ) : formData ? (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="border-b border-foreground/10 px-5 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-sm">Preview B-Form — Room {formData.room_no}</h2>
                <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="size-4" />Print</Button>
              </div>
              <div className="overflow-auto p-4 bg-white rounded-b-2xl">
                <BFormPrint form={formData} />
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
