// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, Printer, Sparkles, Send, X } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  generateAllocation,
  getExam,
  publishAllocation,
  reassignDuty,
  removeDuty,
} from "@/lib/invigilation.functions";
import type { AllocationPlan } from "@/lib/allocation.server";

const ROLE_LABEL: Record<string, string> = {
  primary: "Invigilator",
  secondary: "Checking staff",
  standby: "Replacement staff",
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/_authenticated/exams/$examId")({
  head: () => ({
    meta: [
      { title: "Duty allocation — InvigilateOS" },
      { name: "description", content: "Generate, review and publish invigilation duties hall by hall." },
      { property: "og:title", content: "Duty allocation — InvigilateOS" },
      { property: "og:description", content: "Generate, review and publish invigilation duties hall by hall." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamDetailPage,
});

function ExamDetailPage() {
  const { examId } = Route.useParams();
  const qc = useQueryClient();
  const examFn = useServerFn(getExam);
  const generateFn = useServerFn(generateAllocation);
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const publishFn = useServerFn(publishAllocation);
  const reassignFn = useServerFn(reassignDuty);
  const removeFn = useServerFn(removeDuty);
  const [plan, setPlan] = useState<AllocationPlan | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => examFn({ data: { examId } }),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["exam", examId] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const generate = useMutation({
    mutationFn: () => generateFn({ data: { examId } }),
    onSuccess: (result) => {
      setPlan(result);
      toast.success(`Allocated ${result.stats.assigned} duties across ${result.stats.rooms} halls`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: () => publishFn({ data: { examId } }),
    onSuccess: () => {
      toast.success("Duty chart published to faculty");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reassign = useMutation({
    mutationFn: (v: { allocationId: string; teacherId: string }) => reassignFn({ data: v }),
    onSuccess: () => {
      toast.success("Duty reassigned");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (allocationId: string) => removeFn({ data: { allocationId } }),
    onSuccess: () => {
      toast.success("Duty removed");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const exam = data?.exam;
  const published = exam?.status === "published";

  function exportDuties() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Exam", "Date", "Start", "Hall", "Floor", "Seats", "Role", "Staff", "Department", "Status"],
    ];
    for (const hall of data.halls) {
      for (const d of hall.duties) {
        rows.push([
          exam?.name ?? "",
          exam?.exam_date ?? "",
          String(exam?.start_time ?? "").slice(0, 5),
          hall.room?.room_number ?? "",
          hall.room?.floor ?? "",
          hall.seatFrom ? `${hall.seatFrom}-${hall.seatTo}` : "",
          ROLE_LABEL[d.duty_role] ?? d.duty_role,
          d.teacher?.full_name ?? "",
          d.teacher?.department ?? "",
          d.status,
        ]);
      }
    }
    for (const s of data.standby) {
      rows.push([
        exam?.name ?? "",
        exam?.exam_date ?? "",
        String(exam?.start_time ?? "").slice(0, 5),
        "Floor standby",
        s.floor ?? "",
        "",
        "Replacement staff",
        s.teacher?.full_name ?? "",
        s.teacher?.department ?? "",
        "",
      ]);
    }
    downloadCsv(`duty-chart-${exam?.exam_date ?? "exam"}.csv`, rows);
  }

  function exportSeating() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ["Hall", "Floor", "Seat", "Serial", "Register No", "Student", "Department", "Invigilator"],
    ];
    for (const hall of data.halls) {
      const invigilator =
        hall.duties.find((d) => d.duty_role === "primary")?.teacher?.full_name ?? "";
      hall.students.forEach((s, i) => {
        rows.push([
          hall.room?.room_number ?? "",
          hall.room?.floor ?? "",
          i + 1,
          s.serial_no,
          s.register_no,
          s.full_name,
          s.department ?? "",
          invigilator,
        ]);
      });
    }
    downloadCsv(`seating-chart-${exam?.exam_date ?? "exam"}.csv`, rows);
  }

  return (
    <AppShell
      title={exam?.name ?? "Examination"}
      description={
        exam
          ? `${exam.exam_date} · ${String(exam.start_time).slice(0, 5)} · ${exam.duration_minutes} min · report ${exam.reporting_minutes} min early`
          : undefined
      }
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => exportDuties()} disabled={!data} className="no-print">
            <Download className="size-4" /> Duty chart
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportSeating()} disabled={!data} className="no-print">
            <Download className="size-4" /> Seating
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Printer className="size-4" /> Print
          </Button>
          {!isAdmin ? (
            <Badge variant="secondary" className="no-print">Faculty View · View Only</Badge>
          ) : (
        <>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending || !isAdmin} className="no-print btn-3d">
            <Sparkles className="size-4" /> Generate allocation
          </Button>
          <Button variant="outline" onClick={() => publish.mutate()} disabled={publish.isPending || !isAdmin} className="no-print">
            <Send className="size-4" /> {published ? "Unpublish" : "Publish"}
          </Button>
        </>
          )}
        </>
      }
    >
      {/* Official Print Header */}
      <div className="print-header">
        <h2 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0 }}>EXAMINATION CELL — DUTY ROSTER & SEATING ALLOCATION</h2>
        <p style={{ fontSize: "12pt", margin: "4px 0" }}>{data?.name ?? "Internal Examination"} | Date: {data?.exam_date ?? "2026-08-13"} | Time: {data?.start_time ?? "10:00 AM"}</p>
        <p style={{ fontSize: "9pt", color: "#555" }}>Printed: {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
      </div>
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading allocation…</p>
      ) : (
        <div className="space-y-6">
          {plan ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Halls", plan.stats.rooms],
                ["Required", plan.stats.required],
                ["Assigned", plan.stats.assigned],
                ["Standby", plan.stats.standby],
                ["Eligible staff", plan.stats.eligible],
                ["Fairness", `${plan.stats.fairness}%`],
              ].map(([label, value]) => (
                <div key={String(label)} className="glass glass-hover rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground uppercase">{label}</p>
                  <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {plan && plan.conflicts.length > 0 ? (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="size-4" /> Conflict report ({plan.conflicts.length})
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {plan.conflicts.slice(0, 12).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h2 className="mb-3 text-sm font-semibold">
              Hall-wise duty &amp; seating chart · {data.seatedStudents} of {data.totalStudents} students seated
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.halls.map((hall) => (
                <div key={hall.id} className="glass glass-hover rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-base font-semibold">{hall.room?.room_number}</p>
                    <Badge variant="secondary">
                      Floor {hall.room?.floor} · {hall.students_allocated} students
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hall.seatFrom
                      ? `Serial numbers ${hall.seatFrom} – ${hall.seatTo}`
                      : "No students seated"}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {hall.duties.length === 0 ? (
                      <li className="text-sm text-muted-foreground">Unassigned</li>
                    ) : (
                      hall.duties.map((d) => (
                        <li key={d.id} className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{d.teacher?.full_name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">
                                {ROLE_LABEL[d.duty_role] ?? d.duty_role} · {d.teacher?.department} · {d.status}
                              </p>
                            </div>
                            {isAdmin ? (
                              <Button size="icon" variant="ghost" onClick={() => drop.mutate(d.id)}>
                                <X className="size-4" />
                              </Button>
                            ) : null}
                          </div>
                          {isAdmin ? (
                          <Select
                            value={d.teacher_id}
                            onValueChange={(teacherId) => reassign.mutate({ allocationId: d.id, teacherId })}
                          >
                            <SelectTrigger className="mt-2 h-8 w-full text-xs">
                              <SelectValue placeholder="Replace invigilator" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.teachers.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          ) : null}
                        </li>
                      ))
                    )}
                  </ul>
                  {hall.students.length > 0 ? (
                    <Accordion type="single" collapsible className="mt-3">
                      <AccordionItem value="students" className="border-none">
                        <AccordionTrigger className="py-2 text-xs">
                          View seated students ({hall.students.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <ol className="max-h-56 space-y-1 overflow-y-auto pr-1 text-xs">
                            {hall.students.map((s, i) => (
                              <li
                                key={s.id}
                                className="flex items-center justify-between gap-2 rounded-lg bg-foreground/[0.04] px-2 py-1"
                              >
                                <span className="truncate">
                                  #{s.serial_no} · {s.full_name}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {s.register_no} · seat {i + 1}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Replacement staff on duty (one per floor)</h2>
            <div className="flex flex-wrap gap-2">
              {data.standby.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replacement staff reserved yet.</p>
              ) : (
                data.standby.map((s) => (
                  <Badge key={s.id} variant="outline" className="px-3 py-1">
                    Floor {s.floor} · {s.teacher?.full_name} · {s.teacher?.department}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}