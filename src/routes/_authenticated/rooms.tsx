// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Shield, Users, ChevronDown, ChevronUp, UserCheck } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { HallImportDialog } from "@/components/HallImportDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listRooms } from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/rooms")({
  head: () => ({
    meta: [
      { title: "Halls & Floors — InvigilateOS" },
      { name: "description", content: "All examination halls across blocks A to H with capacity, invigilator assignments and student SRN seating." },
      { property: "og:title", content: "Halls & Floors — InvigilateOS" },
      { property: "og:description", content: "Examination halls with invigilators and student SRN seating." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomsPage,
});

function RoomCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="glass glass-hover flex flex-col justify-between rounded-2xl p-4 transition-all">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-display text-base font-semibold">{r.room_number}</p>
            <p className="text-xs text-muted-foreground">
              Floor {r.floor} · Capacity {r.capacity}
            </p>
          </div>
          <Badge variant="default">2 duties assigned</Badge>
        </div>

        {/* Assigned Invigilators (Main Faculty & Non-Teaching Staff) */}
        <div className="mt-3 space-y-1.5 rounded-xl bg-background/40 p-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Shield className="size-3.5 text-primary shrink-0" />
            <span className="truncate">
              <span className="font-semibold text-primary">Main:</span>{" "}
              {r.mainFaculty?.full_name ?? "Dr. Aarav Sharma"}{" "}
              <span className="text-[10px] text-muted-foreground">
                ({r.mainFaculty?.department ?? "CS"} · Faculty)
              </span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <UserCheck className="size-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">
              <span className="font-semibold text-emerald-500">Support:</span>{" "}
              {r.supportStaff?.full_name ?? "Mr. Rajesh Kumar"}{" "}
              <span className="text-[10px] text-muted-foreground">
                ({r.supportStaff?.designation ?? "Lab Superintendent"})
              </span>
            </span>
          </div>
        </div>

        {/* Seating Summary */}
        <p className="mt-3 text-xs font-medium">
          {r.seated > 0 ? (
            <>
              Seating: serial{" "}
              <span className="font-semibold text-foreground">
                {r.seatFrom}–{r.seatTo}
              </span>{" "}
              <span className="text-muted-foreground">({r.seated} students)</span>
            </>
          ) : (
            <span className="text-muted-foreground">No students seated in this hall</span>
          )}
        </p>

        {/* Seat Grid */}
        <div className={r.seated > 0 ? "mt-2 grid grid-cols-6 gap-1" : "hidden"}>
          {Array.from({ length: Math.min(r.seated, 12) }, (_, i) => (
            <span
              key={i}
              title={`Seat ${i + 1} · SRN ${(r.seatFrom ?? 1) + i}`}
              className="rounded-[4px] bg-primary/80 py-1 text-center text-[9px] font-semibold text-primary-foreground"
            >
              {(r.seatFrom ?? 1) + i}
            </span>
          ))}
          {r.seated > 12 ? (
            <span className="col-span-6 text-center text-[10px] text-muted-foreground">
              + {r.seated - 12} more seats
            </span>
          ) : null}
        </div>
      </div>

      {/* Expandable Seated Students Roster with SRN */}
      {r.seated > 0 ? (
        <div className="mt-3 border-t border-border/40 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              View Seated Roster ({r.seated})
            </span>
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>

          {expanded ? (
            <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg bg-background/60 p-2 text-xs">
              {(r.studentsList ?? []).map((s: any) => (
                <div key={s.registerNo} className="flex items-center justify-between gap-1 text-[11px]">
                  <span className="font-mono font-medium text-foreground">
                    Seat {s.seatNo}: {s.registerNo}
                  </span>
                  <span className="truncate text-muted-foreground">{s.name}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function RoomsPage() {
  const fn = useServerFn(listRooms);
  const { data } = useQuery({ queryKey: ["rooms"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);

  const grouped = useMemo(() => {
    const rooms = (data ?? []).filter((r: any) => r.room_number.toLowerCase().includes(q.toLowerCase()));
    const map = new Map<string, typeof rooms>();
    for (const r of rooms) map.set(r.block, [...(map.get(r.block) ?? []), r]);
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(
        ([block, list]) =>
          [
            block,
            [...list].sort((a, b) => a.floor - b.floor || a.room_number.localeCompare(b.room_number)),
          ] as const,
      );
  }, [data, q]);

  return (
    <AppShell
      title="Halls & Floors"
      description={`${data?.length ?? 0} examination halls · Main Faculty & Support Staff assigned · Serial-wise seating with SRNs`}
      actions={
        <>
          <Input
            placeholder="Search hall (e.g. A-101)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-40 sm:w-48 no-print"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title="Print Official Hall Duty & Seating Matrix"
            className="no-print"
          >
            Print Seating Matrix
          </Button>
          {isAdmin ? (
            <HallImportDialog halls={data ?? []} />
          ) : (
            <Badge variant="secondary" className="no-print">Faculty View</Badge>
          )}
        </>
      }
    >
      {/* Official Print Header */}
      <div className="print-header">
        <h2 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0 }}>EXAMINATION CELL — BLOCK A HALL ALLOCATION & SEATING MATRIX</h2>
        <p style={{ fontSize: "11pt", margin: "4px 0" }}>Block A | Total Halls: {data?.length ?? 40} | Capacity per Hall: 30 Students</p>
        <p style={{ fontSize: "9pt", color: "#555" }}>Date: {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
      </div>

      <div className="space-y-8">
        {grouped.map(([block, rooms]) => (
          <section key={block}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight">{block}</h2>
              <span className="text-xs text-muted-foreground">
                Floor {rooms[0]?.floor ?? "—"} · {rooms.length} halls ·{" "}
                {rooms.reduce((n, r) => n + r.seated, 0)} students seated
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {rooms.map((r) => (
                <RoomCard key={r.id} r={r} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}