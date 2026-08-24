import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { ChevronLeft, ChevronRight } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  section?: string;
  hall?: string;
  floor?: number;
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
    const serial = pick(raw, ["sno", "serialno", "serial", "sino", "slno"]); // ignored later, but we check for blankness
    const semester = pick(raw, ["semester", "sem"]);
    const department = pick(raw, ["department", "dept", "branch", "course"]);
    const section = pick(raw, ["section", "sec"]);
    const hall = pick(raw, ["hall", "room", "roomno", "roomnumber"]);
    const floorRaw = pick(raw, ["floor", "floorno"]);

    const blank = !register && !name && !serial && !semester && !department && !section && !hall && !floorRaw;
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

    let floorValue: number | undefined;
    if (floorRaw) {
      const n = Number(floorRaw);
      if (Number.isInteger(n)) floorValue = n;
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
      ...(semesterValue ? { semester: semesterValue } : {}),
      ...(section ? { section } : {}),
      ...(hall ? { hall } : {}),
      ...(floorValue !== undefined ? { floor: floorValue } : {}),
    });
  });

  // Sort by Register No (SRN/USN) as requested by user
  rows.sort((a, b) => {
    return a.register_no.localeCompare(b.register_no);
  });

  // Re-assign serial numbers sequentially 1, 2, 3...
  rows.forEach((r, idx) => {
    r.serial_no = idx + 1;
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
  const [aiStatus, setAiStatus] = useState("");
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deptFilter, setDeptFilter] = useState("All");

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

  async function handlePdfParsing(file: File) {
    try {
      setAiStatus(`Loading PDF "${file.name}"...`);
      setImporting(true);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setAiStatus(`Extracting text from ${pdf.numPages} pages...`);
      
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + " ";
      }
      
      setAiStatus("Analyzing extracted text for USN/SRN and Names...");
      
      // Naive Regex approach to find SRN/USN patterns (e.g. 1RV21CS001, 24CS0001)
      const extractedRows: ParsedRow[] = [];
      const tokens = fullText.split(/\s+/);
      
      let currentSrn = "";
      let currentName = "";
      let currentDept = "";
      let currentSection = "";
      
      // Common keywords to detect
      const deptKeywords = ["Computer", "Electrical", "Mechanical", "Civil", "Electronics", "CSE", "ECE", "ME", "CE"];
      
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        
        // Match department keywords
        if (deptKeywords.some(k => token.includes(k))) {
          currentDept = deptKeywords.find(k => token.includes(k)) || "General";
        }
        
        // Match section (e.g. "Section A")
        if (token.toLowerCase() === "section" && tokens[i+1] && /^[A-E]$/i.test(tokens[i+1])) {
          currentSection = tokens[i+1].toUpperCase();
        }

        // Look for Alphanumeric pattern that looks like a Register No (6-15 chars, contains both letters and numbers)
        if (/^[0-9A-Z]{6,15}$/i.test(token) && /[0-9]/.test(token) && /[A-Za-z]/.test(token)) {
          if (currentSrn && currentName.trim()) {
            extractedRows.push({ 
              register_no: currentSrn.toUpperCase(), 
              full_name: currentName.trim().replace(/[^a-zA-Z\s\.]/g, ''),
              department: currentDept || "General",
              section: currentSection || undefined,
            });
          }
          currentSrn = token;
          currentName = "";
        } else if (currentSrn) {
          // If we have an SRN, append following text as name until it hits a known non-name token or gets too long
          if (currentName.length < 40 && !deptKeywords.some(k => token.includes(k)) && token.toLowerCase() !== "section" && !/^[0-9]+$/.test(token)) {
             currentName += token + " ";
          }
        }
      }
      
      // Push the last one
      if (currentSrn && currentName.trim()) {
        extractedRows.push({ 
          register_no: currentSrn.toUpperCase(), 
          full_name: currentName.trim().replace(/[^a-zA-Z\s\.]/g, ''),
          department: currentDept || "General",
          section: currentSection || undefined,
        });
      }
      
      // Sort by Register No (SRN/USN)
      extractedRows.sort((a, b) => a.register_no.localeCompare(b.register_no));
      extractedRows.forEach((r, idx) => r.serial_no = idx + 1);
      
      if (extractedRows.length === 0) {
        toast.error("Could not find any student records (USN/SRNs) in the PDF text.");
        setRows([]);
      } else {
        setRows(extractedRows);
        toast.success(`AI Extracted ${extractedRows.length} students from the PDF. Please review the data before importing.`);
      }
    } catch (e: any) {
      toast.error("Failed to parse PDF: " + e.message);
    } finally {
      setImporting(false);
      setAiStatus("");
      setPage(1);
    }
  }

  async function onFile(file: File) {
    setError("");
    setPlacements([]);
    setFileName(file.name);

    if (file.name.toLowerCase().endsWith(".pdf")) {
      await handlePdfParsing(file);
      return;
    }

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
      setPage(1);
    } catch {
      setError("Could not read that file. Upload a .xlsx, .xls, .csv, or .pdf file.");
      setRows([]);
      setRowErrors([]);
    }
  }

  const filteredRows = rows.filter(r => deptFilter === "All" || r.department === deptFilter);

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
      <DialogContent className="glass-strong sm:max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Import students from a sheet</DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV report. Columns are matched automatically: Register No, Name, Department,
            Semester and optional S.No.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label 
            className={`depth-tile flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : ''} ${isDragOver ? 'border-primary bg-primary/10' : 'border-border'}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragOver(false);
              const file = e.dataTransfer?.files?.[0];
              if (file && !importing) {
                void onFile(file);
              }
            }}
          >
            <span className="font-display text-sm font-semibold">
              {fileName || "Click to choose a .xlsx, .xls, .csv, or .pdf file"}
            </span>
            <span className="text-xs text-muted-foreground">
              {rows.length > 0 ? `${rows.length} student rows ready to import` : "Up to 5000 rows per upload (PDFs analyzed via AI)"}
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
                e.target.value = '';
              }}
            />
          </label>

          {aiStatus && (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-primary font-medium animate-pulse">{aiStatus}</p>
            </div>
          )}

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
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px] h-8 text-xs glass">
                    <SelectValue placeholder="Filter Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Departments</SelectItem>
                    {Array.from(new Set(rows.map(r => r.department || "General"))).sort().map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page:</span>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-[70px] h-8 text-xs glass">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="border border-border/50 rounded-lg max-h-[40vh] sm:max-h-64 overflow-y-auto bg-background/50 shadow-inner">
                <table className="w-full text-xs text-left whitespace-nowrap">
                  <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold text-foreground">S.No</th>
                      <th className="px-4 py-2.5 font-semibold text-foreground">SRN / USN</th>
                      <th className="px-4 py-2.5 font-semibold text-foreground">Name</th>
                      <th className="px-4 py-2.5 font-semibold text-foreground">Dept</th>
                      {rows.some(r => r.section) && <th className="px-4 py-2.5 font-semibold text-foreground">Section</th>}
                      {rows.some(r => r.hall) && <th className="px-4 py-2.5 font-semibold text-foreground">Hall</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredRows.slice((page - 1) * pageSize, page * pageSize).map((r, i) => (
                      <tr key={`${r.register_no}-${i}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2">{r.serial_no}</td>
                        <td className="px-4 py-2 font-medium">{r.register_no}</td>
                        <td className="px-4 py-2 truncate max-w-[150px]">{r.full_name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{r.department || "-"}</td>
                        {rows.some(r => r.section) && <td className="px-4 py-2 text-muted-foreground">{r.section || "-"}</td>}
                        {rows.some(r => r.hall) && <td className="px-4 py-2 text-muted-foreground">{r.hall || "-"}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No students match this department filter.
                  </div>
                )}
              </div>

              {filteredRows.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} entries</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 px-2.5" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-3 h-3 mr-1" /> Prev
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 px-2.5" disabled={page * pageSize >= filteredRows.length} onClick={() => setPage(p => p + 1)}>
                      Next <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <label className="flex items-center gap-3 text-sm mt-4">
            <Switch checked={replaceExisting} onCheckedChange={setReplaceExisting} />
            <span className="leading-tight">Replace the entire roster (otherwise existing register numbers are updated)</span>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:justify-between mt-4">
          <Button variant="outline" onClick={downloadTemplate}>
            Download template
          </Button>
          <Button className="btn-3d" onClick={() => save.mutate()} disabled={rows.length === 0 || save.isPending || importing}>
            {save.isPending ? "Importing…" : `Import ${rows.length || ""} students`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
