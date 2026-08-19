// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, CheckCircle2, XCircle } from "lucide-react";

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
import { listTeachers, requestStaff, setTeacherActive } from "@/lib/invigilation.functions";

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
  const { data } = useQuery({ queryKey: ["teachers"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"teaching" | "non_teaching">("teaching");
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
  const rows = allStaff.filter((t: any) => (t.staff_type ?? "teaching") === tab);

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
            <DialogContent className="glass-strong">
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
        </div>
      }
    >
      {/* Official Print Header */}
      <div className="print-header">
        <h2 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0 }}>EXAMINATION CELL — OFFICIAL STAFF DIRECTORY</h2>
        <p style={{ fontSize: "11pt", margin: "4px 0" }}>Invigilation Faculty & Non-Teaching Support Staff Roster</p>
        <p style={{ fontSize: "9pt", color: "#555" }}>Date: {new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "teaching" | "non_teaching")} className="mb-4">
        <TabsList className="glass">
          <TabsTrigger value="teaching">
            Teaching faculty ({allStaff.filter((t) => (t.staff_type ?? "teaching") === "teaching").length})
          </TabsTrigger>
          <TabsTrigger value="non_teaching">
            Non-teaching staff ({allStaff.filter((t) => t.staff_type === "non_teaching").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="card-3d overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Assigned Duties</TableHead>
              <TableHead>Duty Cap</TableHead>
              <TableHead className="text-right">Actions & Roster Status</TableHead>
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
                  <TableCell>{t.department || "Computer Science"}</TableCell>
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
    </AppShell>
  );
}