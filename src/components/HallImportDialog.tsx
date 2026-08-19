import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { importRooms } from "@/lib/invigilation.functions";

type HallRow = { room_number: string; floor: number; block: string; capacity: number };

const pick = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of Object.keys(row)) {
    const norm = key.toLowerCase().replace(/[^a-z]/g, "");
    if (keys.includes(norm)) {
      const value = row[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
  }
  return undefined;
};

function parseHalls(buffer: ArrayBuffer): { rows: HallRow[]; errors: string[] } {
  const wb = XLSX.read(buffer, { type: "array" });
  const first = wb.SheetNames[0];
  const sheet = first ? wb.Sheets[first] : undefined;
  if (!sheet) return { rows: [], errors: ["The sheet is empty."] };
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const rows: HallRow[] = [];
  const errors: string[] = [];
  json.forEach((raw, i) => {
    const line = i + 2;
    const room = pick(raw, ["hall", "hallno", "room", "roomno", "roomnumber", "hallnumber"]);
    const floor = pick(raw, ["floor", "floorno", "level"]);
    const block = pick(raw, ["block", "building", "wing"]);
    const capacity = pick(raw, ["capacity", "seats", "maxstudents", "students"]);
    if (!room && !floor && !block && !capacity) return;
    if (!room) {
      errors.push(`Row ${line}: Hall number is empty`);
      return;
    }
    const floorNum = Number(floor ?? room.replace(/\D/g, "").slice(0, 1));
    const capNum = Number(capacity ?? 30);
    if (!Number.isInteger(floorNum) || floorNum < 0) {
      errors.push(`Row ${line}: Floor must be a whole number`);
      return;
    }
    if (!Number.isInteger(capNum) || capNum < 1) {
      errors.push(`Row ${line}: Capacity must be a whole number`);
      return;
    }
    rows.push({
      room_number: room.toUpperCase(),
      floor: floorNum,
      block: (block ?? room.charAt(0)).toUpperCase(),
      capacity: capNum,
    });
  });
  return { rows, errors: errors.slice(0, 40) };
}

export function HallImportDialog({
  halls,
}: {
  halls: { room_number: string; floor: number; block: string; capacity: number }[];
}) {
  const qc = useQueryClient();
  const run = useServerFn(importRooms);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HallRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [deactivateMissing, setDeactivateMissing] = useState(false);

  const save = useMutation({
    mutationFn: () => run({ data: { rows, deactivateMissing } }),
    onSuccess: (r) => {
      toast.success(`${r.created} halls added, ${r.updated} updated${r.deactivated ? `, ${r.deactivated} closed` : ""}`);
      qc.invalidateQueries({ queryKey: ["rooms"] });
      setRows([]);
      setFileName("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(file: File) {
    setFileName(file.name);
    try {
      const parsed = parseHalls(await file.arrayBuffer());
      setErrors(parsed.errors);
      setRows(parsed.rows);
      if (parsed.rows.length === 0) setErrors((e) => [...e, "No valid hall rows found."]);
    } catch {
      setRows([]);
      setErrors(["Could not read that file. Upload a .xlsx, .xls or .csv sheet."]);
    }
  }

  function exportCurrent() {
    const ws = XLSX.utils.json_to_sheet(
      halls.map((h) => ({ Hall: h.room_number, Floor: h.floor, Block: h.block, Capacity: h.capacity })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Halls");
    XLSX.writeFile(wb, "hall-arrangement.xlsx");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-3d">Upload hall plan</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload hall arrangement</DialogTitle>
          <DialogDescription>
            Excel or CSV with columns Hall, Floor, Block, Capacity. Existing halls are updated, new halls are
            created — seating recalculates automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="depth-tile flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-center">
            <span className="font-display text-sm font-semibold">
              {fileName || "Click to choose a .xlsx, .xls or .csv file"}
            </span>
            <span className="text-muted-foreground text-xs">
              {rows.length > 0 ? `${rows.length} halls ready` : "Up to 1000 halls per upload"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </label>

          {errors.length > 0 ? (
            <div className="glass border-destructive/40 max-h-32 overflow-auto rounded-xl border p-3 text-xs">
              {errors.map((e, i) => (
                <p key={i} className="text-muted-foreground">
                  {e}
                </p>
              ))}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="glass max-h-40 overflow-auto rounded-xl p-3 text-xs">
              {rows.slice(0, 10).map((r) => (
                <div key={r.room_number} className="flex justify-between gap-3 py-0.5">
                  <span className="font-medium">{r.room_number}</span>
                  <span className="text-muted-foreground">
                    Block {r.block} · Floor {r.floor} · {r.capacity} seats
                  </span>
                </div>
              ))}
              {rows.length > 10 ? (
                <p className="text-muted-foreground pt-2">+ {rows.length - 10} more…</p>
              ) : null}
            </div>
          ) : null}

          <label className="flex items-center gap-3 text-sm">
            <Switch checked={deactivateMissing} onCheckedChange={setDeactivateMissing} />
            Close halls that are not in this sheet
          </label>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={exportCurrent}>
            Download current plan
          </Button>
          <Button className="btn-3d" onClick={() => save.mutate()} disabled={rows.length === 0 || save.isPending}>
            {save.isPending ? "Saving…" : `Apply ${rows.length || ""} halls`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}