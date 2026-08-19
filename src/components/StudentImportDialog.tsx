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
import { importStudents } from "@/lib/invigilation.functions";

type ParsedRow = {
  serial_no?: number;
  register_no: string;
  full_name: string;
  department?: string;
  semester?: number;
};

type RowError = { row: number; field: string; message: string };
type ParseResult = { rows: ParsedRow[]; errors: RowError[]; missingColumns: string[] };

type Placement = {
  register_no: string;
  full_name: string;
  serial_no: number;
  seat_no: number;
  hall: string;
  floor: number | null;
};

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

const REGISTER_KEYS = ["registerno", "regno", "registernumber", "rollno", "rollnumber", "register"];
const NAME_KEYS = ["fullname", "name", "studentname"];

const hasColumn = (headers: string[], keys: string[]) => headers.some((h) => keys.includes(h));

function parseSheet(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const first = wb.SheetNames[0];
  if (!first) return { rows: [], errors: [], missingColumns: ["Register No", "Name"] };
  const sheet = wb.Sheets[first];
  if (!sheet) return { rows: [], errors: [], missingColumns: ["Register No", "Name"] };
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const headers = Object.keys(json[0] ?? {}).map((k) => k.toLowerCase().replace(/[^a-z]/g, ""));
  const missingColumns: string[] = [];
  if (!hasColumn(headers, REGISTER_KEYS)) missingColumns.push("Register No");
  if (!hasColumn(headers, NAME_KEYS)) missingColumns.push("Name");
  if (missingColumns.length > 0) return { rows: [], errors: [], missingColumns };

  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();

  json.forEach((raw, index) => {
    const line = index + 2; // sheet row number (header is row 1)
    const register = pick(raw, REGISTER_KEYS);
    const name = pick(raw, NAME_KEYS);
    const serial = pick(raw, ["sno", "serialno", "serial", "sino", "slno"]);
    const semester = pick(raw, ["semester", "sem"]);
    const department = pick(raw, ["department", "dept", "branch"]);

    const blank = !register && !name && !serial && !semester && !department;
    if (blank) return;

    let bad = false;
    if (!register) {
      errors.push({ row: line, field: "Register No", message: "is empty" });
      bad = true;
    } else if (register.length > 60) {
      errors.push({ row: line, field: "Register No", message: "is longer than 60 characters" });
      bad = true;
    } else if (!/^[A-Za-z0-9/\-_.]+$/.test(register)) {
      errors.push({ row: line, field: "Register No", message: `"${register}" has unsupported characters` });
      bad = true;
    } else {
      const prev = seen.get(register.toLowerCase());
      if (prev) {
        errors.push({ row: line, field: "Register No", message: `"${register}" duplicates row ${prev}` });
        bad = true;
      }
    }

    if (!name) {
      errors.push({ row: line, field: "Name", message: "is empty" });
      bad = true;
    } else if (name.length > 160) {
      errors.push({ row: line, field: "Name", message: "is longer than 160 characters" });
      bad = true;
    }

    let semesterValue: number | undefined;
    if (semester) {
      const n = Number(semester);
      if (!Number.isInteger(n) || n < 1 || n > 12) {
        errors.push({ row: line, field: "Semester", message: `"${semester}" must be a whole number 1-12` });
        bad = true;
      } else semesterValue = n;
    }

    let serialValue: number | undefined;
    if (serial) {
      const n = Number(serial);
      if (!Number.isInteger(n) || n < 1) {
        errors.push({ row: line, field: "S.No", message: `"${serial}" must be a positive whole number` });
        bad = true;
      } else serialValue = n;
    }

    if (department && department.length > 80) {
      errors.push({ row: line, field: "Department", message: "is longer than 80 characters" });
      bad = true;
    }

    if (bad || !register || !name) return;
    seen.set(register.toLowerCase(), line);
    rows.push({
      register_no: register,
      full_name: name,
      ...(department ? { department } : {}),
      ...(serialValue ? { serial_no: serialValue } : {}),
      ...(semesterValue ? { semester: semesterValue } : {}),
    });
  });

  return { rows, errors, missingColumns };
}

export function StudentImportDialog() {
  const qc = useQueryClient();
  const runImport = useServerFn(importStudents);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [fileName, setFileName] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: () => runImport({ data: { rows, replaceExisting } }),
    onSuccess: (r) => {
      toast.success(
        `Imported ${r.total} rows — ${r.created} added, ${r.updated} updated, seats allocated across ${r.hallsUsed} hall(s)`,
      );
      qc.invalidateQueries({ queryKey: ["students"] });
      setPlacements(r.placements as Placement[]);
      setRows([]);
      setRowErrors([]);
      setFileName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(file: File) {
    setError("");
    setPlacements([]);
    setFileName(file.name);
    try {
      const parsed = parseSheet(await file.arrayBuffer());
      setRowErrors(parsed.errors.slice(0, 100));
      if (parsed.missingColumns.length > 0) {
        setError(`Missing required column(s): ${parsed.missingColumns.join(", ")}.`);
        setRows([]);
        return;
      }
      if (parsed.rows.length === 0) {
        setError("No valid rows found — fix the errors listed below and upload again.");
        setRows([]);
        return;
      }
      setRows(parsed.rows.slice(0, 5000));
    } catch {
      setError("Could not read that file. Upload a .xlsx, .xls or .csv sheet.");
      setRows([]);
      setRowErrors([]);
    }
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      { "S.No": 1, "Register No": "24CS0001", Name: "Student name", Department: "Computer Science", Semester: 3 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student-import-template.xlsx");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-3d">Import Excel</Button>
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import students from a sheet</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV report. Columns are matched automatically: Register No, Name, Department,
            Semester and optional S.No.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="depth-tile flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-center">
            <span className="font-display text-sm font-semibold">
              {fileName || "Click to choose a .xlsx, .xls or .csv file"}
            </span>
            <span className="text-xs text-muted-foreground">
              {rows.length > 0 ? `${rows.length} student rows ready to import` : "Up to 5000 rows per upload"}
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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {rowErrors.length > 0 ? (
            <div className="glass max-h-40 overflow-auto rounded-xl border border-destructive/40 p-3 text-xs">
              <p className="mb-1 font-semibold text-destructive">
                {rowErrors.length} row issue{rowErrors.length > 1 ? "s" : ""} — these rows are skipped
              </p>
              {rowErrors.map((e, i) => (
                <p key={`${e.row}-${e.field}-${i}`} className="text-muted-foreground">
                  Row {e.row}: {e.field} {e.message}
                </p>
              ))}
            </div>
          ) : null}

          {placements.length > 0 ? (
            <div className="glass max-h-44 overflow-auto rounded-xl p-3 text-xs">
              <p className="mb-1 font-semibold">Seats auto-allocated</p>
              {placements.slice(0, 12).map((p) => (
                <div key={p.register_no} className="flex justify-between gap-3 py-0.5">
                  <span className="font-medium">#{p.serial_no}</span>
                  <span className="flex-1 truncate text-muted-foreground">{p.full_name}</span>
                  <span>
                    Hall {p.hall} · Seat {p.seat_no}
                  </span>
                </div>
              ))}
              {placements.length > 12 ? (
                <p className="pt-2 text-muted-foreground">+ {placements.length - 12} more placed…</p>
              ) : null}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="glass max-h-44 overflow-auto rounded-xl p-3 text-xs">
              {rows.slice(0, 8).map((r, i) => (
                <div key={`${r.register_no}-${i}`} className="flex justify-between gap-3 py-0.5">
                  <span className="font-medium">{r.register_no}</span>
                  <span className="flex-1 truncate text-muted-foreground">{r.full_name}</span>
                  <span className="text-muted-foreground">{r.department ?? "General"}</span>
                </div>
              ))}
              {rows.length > 8 ? <p className="pt-2 text-muted-foreground">+ {rows.length - 8} more…</p> : null}
            </div>
          ) : null}

          <label className="flex items-center gap-3 text-sm">
            <Switch checked={replaceExisting} onCheckedChange={setReplaceExisting} />
            Replace the entire roster (otherwise existing register numbers are updated)
          </label>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={downloadTemplate}>
            Download template
          </Button>
          <Button className="btn-3d" onClick={() => save.mutate()} disabled={rows.length === 0 || save.isPending}>
            {save.isPending ? "Importing…" : `Import ${rows.length || ""} students`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
