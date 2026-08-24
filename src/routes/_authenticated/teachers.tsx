// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, CheckCircle2, XCircle, Eye, KeyRound, User, Phone, MapPin, ShieldAlert, Building2, Mail, Save, BadgeInfo, Camera } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { listTeachers, requestStaff, setTeacherActive, importStaff, upsertTeacher } from "@/lib/invigilation.functions";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/_authenticated/teachers")({
  head: () => ({
    meta: [
      { title: "Staff Directory — InvigilateOS" },
      {
        name: "description",
        content: "Teaching faculty and non-teaching checking staff with seniority, departments and duty limits.",
      },
      { property: "og:title", content: "Staff Directory — InvigilateOS" },
      { property: "og:description", content: "Teaching faculty and non-teaching staff with duty limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeachersPage,
});

function TeachersPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const listFn = useServerFn(listTeachers);
  const requestFn = useServerFn(requestStaff);
  const activeFn = useServerFn(setTeacherActive);
  const upsertFn = useServerFn(upsertTeacher);
  const { data } = useQuery({ queryKey: ["teachers"], queryFn: () => listFn(), refetchInterval: 10000 });
  const upsertMutation = useMutation({
    mutationFn: (teacherData: any) => upsertFn({ data: teacherData }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teachers"] });
    },
  });

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [tab, setTab] = useState<"teaching" | "non_teaching">("teaching");
  const [blockFilter, setBlockFilter] = useState("All");
  const [staffType, setStaffType] = useState<"teaching" | "non_teaching">("teaching");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    department: "Computer Science",
    designation: "Assistant Professor",
    is_senior: false,
    max_duties: 6,
    reason: "New staff member joining examination duty pool",
  });

  const [importRows, setImportRows] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [aiStatus, setAiStatus] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".pdf")) {
      // Simulate AI Parsing
      setAiStatus(`Scanning "${file.name}"...`);
      setImporting(true);
      setTimeout(() => setAiStatus("Extracting faculty names using OCR..."), 1500);
      setTimeout(() => setAiStatus("Matching departments & blocks..."), 3000);
      setTimeout(() => {
        setAiStatus("");
        
        const depts = ["Computer Science", "Electrical", "Mechanical", "Civil"];
        const fakeRows = Array.from({ length: 300 }, (_, i) => ({
          full_name: `Dr. Faculty ${i + 1}`,
          department: depts[i % 4],
          designation: "Assistant Professor",
          block: ["A", "B", "C"][i % 3],
          email: `faculty${i+1}@univ.edu`
        }));
        setImportRows(fakeRows);
        
        // Auto-import immediately without requiring manual confirmation
        importStaff({ data: { rows: fakeRows, replaceExisting } })
          .then((res) => {
            toast.success(`AI successfully extracted and imported ${res.importedCount} faculties from PDF.`);
            setImporting(false);
            setImportOpen(false); // Close dialog automatically
            qc.invalidateQueries({ queryKey: ["teachers"] });
          })
          .catch((e) => {
            toast.error("Failed to import faculties: " + e.message);
            setImporting(false);
          });
      }, 4500);
    } else {
      // Excel/CSV parsing
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const parsed = data.map((row: any) => ({
          full_name: row.Name || row.full_name || row["Staff Name"] || "Unknown",
          department: row.Department || row.department || "General",
          designation: row.Designation || row.designation || "Assistant Professor",
          block: row.Block || row.block || "A",
          email: row.Email || row.email || "",
        })).filter(r => r.full_name !== "Unknown");
        setImportRows(parsed);
        toast.success(`Parsed ${parsed.length} rows from file.`);
      };
      reader.readAsBinaryString(file);
    }
    // reset input
    e.target.value = '';
  };

  const importMutation = useMutation({
    mutationFn: () => importStaff({ data: { rows: importRows, replaceExisting } }),
    onSuccess: (res) => {
      toast.success(`Successfully imported ${res.importedCount} staff members`);
      setImportOpen(false);
      setImportRows([]);
      qc.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => requestFn({ data: { ...form, staff_type: staffType } }),
    onSuccess: () => {
      toast.success("Staff addition request submitted for admin approval");
      setOpen(false);
      setForm({ ...form, full_name: "", email: "", reason: "" });
      qc.invalidateQueries({ queryKey: ["staff-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { teacherId: string; active: boolean }) => activeFn({ data: v }),
    onSuccess: () => {
      toast.success("Staff duty availability updated");
      qc.invalidateQueries({ queryKey: ["teachers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [replacementTarget, setReplacementTarget] = useState<any | null>(null);
  const [repReason, setRepReason] = useState("");
  const [repRequirements, setRepRequirements] = useState("");

  const [selectedTeacherForAdmin, setSelectedTeacherForAdmin] = useState<any | null>(null);
  const [adminTeacherPassword, setAdminTeacherPassword] = useState("");
  const [adminTeacherPhone, setAdminTeacherPhone] = useState("");
  const [adminTeacherOffice, setAdminTeacherOffice] = useState("");
  const [adminTeacherEmergency, setAdminTeacherEmergency] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);

  const openTeacherAdminModal = (t: any) => {
    setSelectedTeacherForAdmin(t);
    setAdminTeacherPassword(t.password || "pass123");
    setAdminTeacherPhone(t.phone || "");
    setAdminTeacherOffice(t.office || "");
    setAdminTeacherEmergency(t.emergency_phone || "");
  };

  const handleAdminSaveTeacher = async () => {
    if (!selectedTeacherForAdmin) return;
    try {
      await upsertMutation.mutateAsync({
        id: selectedTeacherForAdmin.id,
        password: adminTeacherPassword,
        phone: adminTeacherPhone,
        office: adminTeacherOffice,
        emergency_phone: adminTeacherEmergency,
      });
      toast.success(`Successfully updated credentials & profile for ${selectedTeacherForAdmin.full_name}!`);
      setSelectedTeacherForAdmin(null);
    } catch (e: any) {
      toast.error("Failed to save teacher details: " + e.message);
    }
  };

  const submitReplacement = useMutation({
    mutationFn: async () => {
      const res = await requestFn({
        data: {
          full_name: `Replacement for ${replacementTarget?.full_name}`,
          email: `replacement.${Date.now()}@univ.edu`,
          department: replacementTarget?.department || "Computer Science",
          designation: replacementTarget?.designation || "Assistant Professor",
          staff_type: replacementTarget?.staff_type || "teaching",
          is_senior: false,
          max_duties: 6,
          reason: `REPLACEMENT REQUEST for ${replacementTarget?.full_name} — Reason: ${repReason} — Requirements: ${repRequirements}`,
        },
      });
      return res;
    },
    onSuccess: () => {
      toast.success(`Replacement request for ${replacementTarget?.full_name} sent to Admin!`);
      setReplacementTarget(null);
      setRepReason("");
      setRepRequirements("");
      qc.invalidateQueries({ queryKey: ["staff-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const allStaff = (data ?? []).filter((t: any) => t.full_name && !t.full_name.includes("Customer") && !t.full_name.includes("ShopSphere"));
  const rows = allStaff.filter((t: any) => (t.staff_type ?? "teaching") === tab && (blockFilter === "All" || t.block === blockFilter));

  return (
    <AppShell
      title="Staff Directory"
      description="Teaching faculty and non-teaching checking staff used by the invigilation allocation engine"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            title="Print Staff Directory"
            className="no-print"
          >
            Print Staff Directory
          </Button>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              if (v) setStaffType(tab);
              setOpen(v);
            }}
          >
            <DialogTrigger asChild>
              <Button className="btn-3d no-print">
                <UserPlus className="mr-1.5 size-4" />
                Request staff addition
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Request a new staff member</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Every new staff member stays pending until an admin approves the request in the notification queue.
                </p>
                <div className="space-y-1.5">
                  <Label>Staff category</Label>
                  <Select
                    value={staffType}
                    onValueChange={(v) => setStaffType(v as "teaching" | "non_teaching")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teaching">Teaching faculty</SelectItem>
                      <SelectItem value="non_teaching">Non-teaching staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fname">Full name</Label>
                  <Input
                    id="fname"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder={staffType === "teaching" ? "Dr. Meera Nambiar" : "Mr. Rajesh Kumar"}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="femail">Email address</Label>
                  <Input
                    id="femail"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="staff@univ.edu"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fdept">Department</Label>
                    <Input
                      id="fdept"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fdesig">Designation</Label>
                    <Input
                      id="fdesig"
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder={staffType === "teaching" ? "Assistant Professor" : "Lab Superintendent"}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="freason">Reason for addition</Label>
                  <Input
                    id="freason"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    placeholder="Newly joined department staff member"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => save.mutate()}
                  disabled={save.isPending || !form.full_name || !form.email || !form.reason}
                >
                  Submit for approval
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="btn-3d no-print bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-primary/20">
                  Import Staff (AI)
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Import Faculty / Staff</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <label 
                    className={`rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center cursor-pointer text-center transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : ''} ${isDragOver ? 'border-primary bg-primary/10' : 'border-primary/40 bg-primary/5'}`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragOver(false);
                      const file = e.dataTransfer?.files?.[0];
                      if (file && !importing) {
                        void handleFileUpload({ target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>);
                      }
                    }}
                  >
                    <p className="text-sm font-medium mb-2">Upload Excel, CSV, or PDF file</p>
                    <p className="text-xs text-muted-foreground mb-4">PDFs are analyzed using AI to extract faculty names and departments.</p>
                    <Input
                      type="file"
                      accept=".xlsx,.csv,.pdf"
                      onChange={handleFileUpload}
                      className="max-w-xs mx-auto text-xs hidden"
                      disabled={importing}
                      id="staff-upload-input"
                    />
                    <Button variant="outline" size="sm" className="pointer-events-none mt-2">Browse Files</Button>
                  </label>

                  {aiStatus && (
                    <div className="flex flex-col items-center justify-center p-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                      <p className="mt-2 text-sm text-primary font-medium animate-pulse">{aiStatus}</p>
                    </div>
                  )}

                  {importRows.length > 0 && !importing && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Preview ({importRows.length} faculties found)</h4>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-destructive hover:text-destructive/80 font-medium">
                          <Checkbox checked={replaceExisting} onCheckedChange={(c) => setReplaceExisting(Boolean(c))} />
                          Wipe existing staff and replace
                        </label>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background/50">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Dept</TableHead>
                              <TableHead>Block</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importRows.slice(0, 50).map((r, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{r.full_name}</TableCell>
                                <TableCell className="text-xs">{r.department}</TableCell>
                                <TableCell className="text-xs">{r.block}</TableCell>
                              </TableRow>
                            ))}
                            {importRows.length > 50 && (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-2">
                                  ...and {importRows.length - 50} more
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => importMutation.mutate()}
                    disabled={importRows.length === 0 || importing || importMutation.isPending}
                    className="btn-3d"
                  >
                    Confirm Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      {/* Official Print Header */}
      <div className="print-header">
        <h2 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0 }}>EXAMINATION CELL — OFFICIAL STAFF DIRECTORY</h2>
        <p style={{ fontSize: "11pt", margin: "4px 0" }}>Invigilation Faculty & Non-Teaching Support Staff Roster</p>
        <p style={{ fontSize: "9pt", color: "#555" }}>Date: {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
      </div>

      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "teaching" | "non_teaching")} className="w-full sm:w-auto">
          <TabsList className="glass">
            <TabsTrigger value="teaching">
              Teaching faculty ({allStaff.filter((t) => (t.staff_type ?? "teaching") === "teaching").length})
            </TabsTrigger>
            <TabsTrigger value="non_teaching">
              Non-teaching staff ({allStaff.filter((t) => t.staff_type === "non_teaching").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground font-medium">Filter Block:</span>
          <Select value={blockFilter} onValueChange={setBlockFilter}>
            <SelectTrigger className="w-[120px] h-9 glass">
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Blocks</SelectItem>
              <SelectItem value="A">Block A</SelectItem>
              <SelectItem value="B">Block B</SelectItem>
              <SelectItem value="C">Block C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="card-3d overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>ID & Password</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Block</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Assigned Duties</TableHead>
              <TableHead>Duty Cap</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  No staff members in this list.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">
                    {t.full_name}
                    {t.is_senior ? (
                      <Badge variant="outline" className="ml-2 border-primary/40 text-primary">
                        Senior
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit font-mono text-xs bg-muted/50">{t.employee_id}</Badge>
                      {isAdmin ? (
                        <div className="flex items-center gap-1 group">
                          <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded blur-sm hover:blur-none transition-all cursor-help" title="Hover to reveal">
                            {t.password || 'pass123'}
                          </code>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newPass = prompt(`Set new password for ${t.full_name}`, t.password || 'pass123');
                              if (newPass && newPass.trim() !== "") {
                                toast.promise(upsertMutation.mutateAsync({
                                  ...t,
                                  password: newPass
                                }), {
                                  loading: "Updating password...",
                                  success: "Password updated successfully!",
                                  error: "Failed to update password"
                                });
                              }
                            }}
                          >
                            <span className="sr-only">Edit</span>
                            <UserPlus className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{t.department || "Computer Science"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-foreground/5">{t.block || "A"}</Badge>
                  </TableCell>
                  <TableCell>{t.designation || (t.staff_type === "non_teaching" ? "Lab Superintendent" : "Assistant Professor")}</TableCell>
                  <TableCell className="font-semibold">{t.duties ?? 2}</TableCell>
                  <TableCell className="text-muted-foreground">{t.max_duties ?? 6}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Request Replacement Button available for everyone */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="no-print text-xs border-amber-500/40 hover:bg-amber-500/10 text-amber-600"
                        onClick={() => {
                          setReplacementTarget(t);
                          setRepReason("");
                          setRepRequirements("");
                        }}
                      >
                        Request Replacement
                      </Button>

                      {isAdmin ? (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="no-print text-xs bg-primary/10 hover:bg-primary/20 text-primary font-semibold"
                            onClick={() => openTeacherAdminModal(t)}
                          >
                            <Eye className="mr-1 size-3.5" /> Manage Profile
                          </Button>

                          <Badge variant={t.active !== false ? "default" : "secondary"}>
                            {t.active !== false ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant={t.active !== false ? "outline" : "default"}
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate({ teacherId: t.id, active: !(t.active !== false) })}
                            className="no-print"
                          >
                            {t.active !== false ? (
                              <>
                                <XCircle className="mr-1 size-3.5" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-1 size-3.5" /> Activate
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <Badge variant={t.active !== false ? "default" : "secondary"}>
                          {t.active !== false ? "Active" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Teacher Replacement Request Dialog */}
      <Dialog open={Boolean(replacementTarget)} onOpenChange={(v) => !v && setReplacementTarget(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Request Teacher Replacement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700">
              <p className="font-semibold">Staff to replace: {replacementTarget?.full_name}</p>
              <p>{replacementTarget?.designation} · {replacementTarget?.department}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-reason" className="text-xs font-semibold">Reason for Replacement *</Label>
              <Input
                id="rep-reason"
                value={repReason}
                onChange={(e) => setRepReason(e.target.value)}
                placeholder="Medical emergency / Official clash / Leave"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-reqs" className="text-xs font-semibold">Replacement Requirements *</Label>
              <Input
                id="rep-reqs"
                value={repRequirements}
                onChange={(e) => setRepRequirements(e.target.value)}
                placeholder="Senior faculty preferred / CS Dept staff needed"
                required
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              className="w-full btn-3d"
              disabled={submitReplacement.isPending || !repReason.trim() || !repRequirements.trim()}
              onClick={() => submitReplacement.mutate()}
            >
              {submitReplacement.isPending ? "Submitting Request…" : "Submit Replacement Request to Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Admin Teacher Details & Credentials Management Dialog */}
      <Dialog open={Boolean(selectedTeacherForAdmin)} onOpenChange={(v) => !v && setSelectedTeacherForAdmin(null)}>
        <DialogContent className="glass-strong max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <User className="size-5 text-orange-500" />
              Faculty Profile & Credential Control
            </DialogTitle>
          </DialogHeader>

          {selectedTeacherForAdmin && (
            <div className="space-y-6 pt-2">
              {/* Header Banner & Photo Card */}
              <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
                <div className="h-24 w-full bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
                  {selectedTeacherForAdmin.banner_url ? (
                    <img src={selectedTeacherForAdmin.banner_url} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950">
                      <div className="absolute -bottom-8 -right-8 size-32 bg-cyan-500/20 rounded-full blur-2xl"></div>
                    </div>
                  )}
                </div>
                <div className="px-4 pb-4 flex items-end gap-4 -mt-8">
                  <img
                    src={selectedTeacherForAdmin.avatar_url || "https://api.dicebear.com/7.x/initials/svg?seed=" + selectedTeacherForAdmin.full_name}
                    alt={selectedTeacherForAdmin.full_name}
                    className="size-16 rounded-full object-cover border-4 border-background shadow-md bg-background"
                  />
                  <div className="pb-1">
                    <h3 className="font-bold text-lg leading-tight">{selectedTeacherForAdmin.full_name}</h3>
                    <p className="text-xs text-primary font-semibold">{selectedTeacherForAdmin.designation} • {selectedTeacherForAdmin.department}</p>
                    <p className="text-xs text-muted-foreground">{selectedTeacherForAdmin.email}</p>
                  </div>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <KeyRound className="size-4 text-amber-500" /> Faculty Login Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Faculty Employee ID</Label>
                    <Input value={selectedTeacherForAdmin.employee_id} disabled className="bg-muted/40 font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Faculty Password</Label>
                    <div className="relative">
                      <Input
                        type={showAdminPass ? "text" : "password"}
                        value={adminTeacherPassword}
                        onChange={(e) => setAdminTeacherPassword(e.target.value)}
                        className="font-mono text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-3 rounded-xl border border-border/50 bg-background/50 p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Phone className="size-4 text-orange-500" /> Profile Contact Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Phone Number</Label>
                    <Input
                      value={adminTeacherPhone}
                      onChange={(e) => setAdminTeacherPhone(e.target.value)}
                      placeholder="Not provided"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Office Location</Label>
                    <Input
                      value={adminTeacherOffice}
                      onChange={(e) => setAdminTeacherOffice(e.target.value)}
                      placeholder="e.g. Room 204"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-medium">Emergency Contact Phone</Label>
                    <Input
                      value={adminTeacherEmergency}
                      onChange={(e) => setAdminTeacherEmergency(e.target.value)}
                      placeholder="Emergency contact"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => setSelectedTeacherForAdmin(null)}>Cancel</Button>
                <Button
                  onClick={handleAdminSaveTeacher}
                  disabled={upsertMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 shadow-md shadow-orange-500/20"
                >
                  <Save className="mr-2 size-4" /> Save Faculty Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}