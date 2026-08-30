// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { LayoutGrid, Wand2, Printer, ShieldAlert, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { listSeatingArrangements, generateSeating, EXAMS2 } from "@/lib/exam-cell.functions";

export const Route = createFileRoute("/_authenticated/seating")({
  head: () => ({
    meta: [
      { title: "Seating Arrangement — InvigilateOS" },
      { name: "description", content: "Institutional Examination Seating Arrangement Chart." },
    ],
  }),
  component: SeatingPage,
});

// One printable page = up to 4 rooms
function SeatingPage_PrintPage({
  pageNum,
  totalPages,
  rows,
  currentExam,
}: {
  pageNum: number;
  totalPages: number;
  rows: any[];
  currentExam: any;
}) {
  return (
    <div
      style={{
        fontFamily: "'Times New Roman', serif",
        fontSize: "11px",
        background: "#fff",
        color: "#000",
        padding: "20px 24px",
        width: "100%",
        boxSizing: "border-box",
        pageBreakAfter: pageNum < totalPages ? "always" : "auto",
      }}
    >
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0px" }}>
        <tbody>
          <tr>
            {/* Logo Box */}
            <td style={{ border: "1.5px solid #000", padding: "8px 12px", width: "220px", verticalAlign: "middle" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <img
                  src="/snpsu-logo.png"
                  alt="Sapthagiri NPS University"
                  style={{ width: "48px", height: "48px", objectFit: "contain" }}
                />
                <div>
                  <div style={{ fontWeight: "900", fontSize: "11px", color: "#0c2340", letterSpacing: "0.5px" }}>
                    SAPTHAGIRI <span style={{ color: "#d97706" }}>NPS</span>
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: "bold" }}>UNIVERSITY</div>
                  <div style={{ fontSize: "6.5px", color: "#555" }}>UNMATCHED EXCELLENCE, UNLIMITED POTENTIAL</div>
                </div>
              </div>
            </td>

            {/* School & Dept Header */}
            <td style={{ border: "1.5px solid #000", padding: "8px 12px", textAlign: "center" }}>
              <div style={{ fontWeight: "900", fontSize: "18px" }}>School of Engineering and Technology</div>
              <div style={{ fontWeight: "bold", fontSize: "13px", marginTop: "2px" }}>{currentExam.dept}</div>
              <div style={{ fontWeight: "bold", fontSize: "11px", marginTop: "4px" }}>
                Date: {currentExam.exam_date} &nbsp;|&nbsp; Time: {currentExam.start_time} – {currentExam.end_time}
              </div>
            </td>
          </tr>

          {/* Subheader */}
          <tr>
            <td style={{ border: "1.5px solid #000", padding: "5px 12px", textAlign: "center" }}>
              <div style={{ fontWeight: "bold", fontSize: "12px" }}>{currentExam.term}</div>
              <div style={{ fontSize: "10px" }}>{currentExam.ay}</div>
              <div style={{ fontWeight: "bold", fontSize: "11px", marginTop: "2px" }}>25BEELY201 · Mathematics II</div>
            </td>
            <td style={{ border: "1.5px solid #000", padding: "5px 12px", textAlign: "center", background: "#fafafa" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                ROOM-WISE ALLOTMENT CHART &amp; ROLL NUMBER LIST
              </div>
              <div style={{ fontSize: "10px", color: "#555" }}>
                Page {pageNum} of {totalPages}
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Seating Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "-1px" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ border: "1.5px solid #000", padding: "6px", fontSize: "11px", textAlign: "center", width: "80px" }}>
              Room No
            </th>
            <th style={{ border: "1.5px solid #000", padding: "6px", fontSize: "11px", textAlign: "center", width: "45px" }}>
              Total
            </th>
            <th style={{ border: "1.5px solid #000", padding: "6px", fontSize: "11px", textAlign: "center", width: "140px" }}>
              Invigilator
            </th>
            <th style={{ border: "1.5px solid #000", padding: "6px", fontSize: "11px", textAlign: "left" }}>
              Allocated Student Roll Numbers (SRN List)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr key={row.room_number}>
              <td
                style={{
                  border: "1.5px solid #000",
                  padding: "8px 6px",
                  fontWeight: "900",
                  textAlign: "center",
                  fontSize: "13px",
                  background: "#fcfcfc",
                  verticalAlign: "top",
                }}
              >
                {row.room_number}
              </td>
              <td
                style={{
                  border: "1.5px solid #000",
                  padding: "8px 6px",
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: "12px",
                  verticalAlign: "top",
                }}
              >
                {row.seated}
              </td>
              <td
                style={{
                  border: "1.5px solid #000",
                  padding: "8px 6px",
                  fontSize: "10px",
                  textAlign: "center",
                  verticalAlign: "top",
                }}
              >
                <div style={{ fontWeight: "bold" }}>{row.invigilator_name}</div>
                <div style={{ color: "#555", fontSize: "9px" }}>{row.invigilator_dept}</div>
              </td>
              <td
                style={{
                  border: "1.5px solid #000",
                  padding: "8px 10px",
                  fontSize: "9.5px",
                  fontFamily: "monospace",
                  lineHeight: "1.6",
                  verticalAlign: "top",
                }}
              >
                {row.srn_list_formatted || row.students.map((s: any) => s.srn).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#777" }}>
        <span>Sapthagiri NPS University — Examination Cell — Confidential</span>
        <span>Page {pageNum} / {totalPages}</span>
      </div>
    </div>
  );
}

function SeatingPage() {
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const qc = useQueryClient();

  const listFn = useServerFn(listSeatingArrangements);
  const genFn = useServerFn(generateSeating);

  const { data: seating = [], isLoading } = useQuery({
    queryKey: ["seating"],
    queryFn: () => listFn(),
    enabled: isAdmin,
    refetchInterval: 60000,
    staleTime: 60000,
  });

  const genMut = useMutation({
    mutationFn: () => genFn({ data: {} } as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["seating"] });
      toast.success("Seating re-generated — faculty assignments shuffled!");
    },
  });

  function handlePrint() {
    const content = document.getElementById("institutional-seating-chart");
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Seating Arrangement Chart — SNPSU</title>
      <style>
        @media print {
          body { margin: 0; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
        body { font-family: 'Times New Roman', serif; margin: 0; }
      </style>
    </head><body>${content.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  }

  if (!isAdmin) {
    return (
      <AppShell title="Seating Arrangement — Access Restricted">
        <div className="glass rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <ShieldAlert className="size-12 text-destructive" />
          <h2 className="text-lg font-semibold">Admin Access Required</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Student Seating Arrangement & Room Generation is managed strictly by the Examination Cell Admin.
          </p>
        </div>
      </AppShell>
    );
  }

  const seatingRows = seating as any[];
  const totalSeated = seatingRows.reduce((a, b) => a + (b.seated || 0), 0);
  const currentExam = EXAMS2[0];

  // Split rooms into pages of 4 each (like the PDF)
  const ROOMS_PER_PAGE = 4;
  const pages: any[][] = [];
  for (let i = 0; i < seatingRows.length; i += ROOMS_PER_PAGE) {
    pages.push(seatingRows.slice(i, i + ROOMS_PER_PAGE));
  }

  return (
    <AppShell
      title="Seating Arrangement & Allotment Chart"
      description="Official Sapthagiri NPS University Room-wise Student Allotment Chart"
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => genMut.mutate()}
            disabled={genMut.isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`size-4 ${genMut.isPending ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{genMut.isPending ? "Shuffling…" : "Re-Generate & Shuffle"}</span>
            <span className="sm:hidden">{genMut.isPending ? "Shuffle…" : "Shuffle"}</span>
          </Button>
          <Button onClick={handlePrint} size="sm" className="btn-3d">
            <Printer className="size-4" />
            <span className="hidden sm:inline">Print All Pages</span>
            <span className="sm:hidden">Print</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="glass glass-hover rounded-2xl p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Total Exam Rooms</p>
            <p className="mt-1 font-display text-3xl font-bold text-primary">{seatingRows.length}</p>
          </div>
          <div className="glass glass-hover rounded-2xl p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Total Students Seated</p>
            <p className="mt-1 font-display text-3xl font-bold text-emerald-400">{totalSeated}</p>
          </div>
          <div className="glass glass-hover rounded-2xl p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">Printable Pages</p>
            <p className="mt-1 font-display text-3xl font-bold text-amber-400">{pages.length}</p>
          </div>
          <div className="glass glass-hover rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">B-Form Link</p>
              <p className="text-sm font-semibold mt-1">Generate Room B-Forms</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/forms/b-form"><FileText className="size-4" />Open B-Form</Link>
            </Button>
          </div>
        </div>

        {/* Room summary cards (quick view) */}
        {!isLoading && seatingRows.length > 0 && (
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              All Rooms ({seatingRows.length} rooms · {seatingRows.length * ROOMS_PER_PAGE > seatingRows.length ? pages.length : pages.length} pages)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {seatingRows.map((row) => (
                <div
                  key={row.room_number}
                  className="bg-foreground/5 rounded-lg p-2 text-center border border-foreground/10"
                >
                  <p className="font-bold text-sm">{row.room_number}</p>
                  <p className="text-xs text-muted-foreground">{row.seated} students</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Printable Chart — ALL PAGES */}
        <div className="glass rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading seating chart…</div>
          ) : seatingRows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No seating arrangement generated yet.</p>
              <Button onClick={() => genMut.mutate()} disabled={genMut.isPending} className="btn-3d">
                <Wand2 className="size-4" /> Generate Seating Chart
              </Button>
            </div>
          ) : (
            <div id="institutional-seating-chart" className="bg-white text-black">
              {pages.map((pageRows, idx) => (
                <div
                  key={idx}
                  className="print-page"
                  style={{ borderBottom: idx < pages.length - 1 ? "3px dashed #ccc" : "none" }}
                >
                  <SeatingPage_PrintPage
                    pageNum={idx + 1}
                    totalPages={pages.length}
                    rows={pageRows}
                    currentExam={currentExam}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
