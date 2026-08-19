// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Trash2, ExternalLink, PlusCircle } from "lucide-react";

import { AppShell, useMe } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExam, deleteExam, listExams, listRooms, publishAllocation } from "@/lib/invigilation.functions";

export const Route = createFileRoute("/_authenticated/exams/")({
  head: () => ({
    meta: [
      { title: "Examinations — InvigilateOS" },
      {
        name: "description",
        content: "Schedule examinations, assign halls and generate invigilation duty allocations.",
      },
      { property: "og:title", content: "Examinations — InvigilateOS" },
      { property: "og:description", content: "Schedule exams and generate invigilation duties." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamsPage,
});

function ExamsPage() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const isAdmin = Boolean(me?.isAdmin);
  const listFn = useServerFn(listExams);
  const roomsFn = useServerFn(listRooms);
  const createFn = useServerFn(createExam);
  const deleteFn = useServerFn(deleteExam);
  const publishFn = useServerFn(publishAllocation);

  const exams = useQuery({ queryKey: ["exams"], queryFn: () => listFn() });
  const rooms = useQuery({ queryKey: ["rooms"], queryFn: () => roomsFn() });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [examType, setExamType] = useState<"internal" | "semester">("internal");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [perRoom, setPerRoom] = useState(30);
  const [selected, setSelected] = useState<string[]>([]);
  const [blockFilter, setBlockFilter] = useState("all");

  const availableRooms = (rooms.data ?? []).filter((r) => r.active);
  const blocks = Array.from(new Set(availableRooms.map((r) => r.block))).sort();
  const visibleRooms =
    blockFilter === "all" ? availableRooms : availableRooms.filter((r) => r.block === blockFilter);

  const toggleRoom = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectShown = () => {
    const ids = visibleRooms.map((r) => r.id);
    setSelected((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name,
          exam_type: examType,
          exam_date: examDate,
          start_time: startTime,
          room_ids: selected,
          students_per_room: perRoom,
        },
      }),
    onSuccess: () => {
      toast.success("Examination scheduled");
      setOpen(false);
      setName("");
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (examId: string) => deleteFn({ data: { examId } }),
    onSuccess: () => {
      toast.success("Examination deleted");
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: (examId: string) => publishFn({ data: { examId } }),
    onSuccess: () => {
      toast.success("Exam status updated");
      qc.invalidateQueries({ queryKey: ["exams"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="Examinations"
      description="Internal sessions run 90 minutes, semester sessions run 180 minutes · All admin options unlocked"
      actions={
        !isAdmin ? (
          <Badge variant="secondary">View only · admin schedules exams</Badge>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="btn-3d">
                <PlusCircle className="mr-1.5 size-4" />
                Schedule examination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule an examination</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ename">Examination name</Label>
                  <Input
                    id="ename"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Internal Assessment II — CSE"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={examType} onValueChange={(v) => setExamType(v as "internal" | "semester")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="internal">Internal (90 min)</SelectItem>
                        <SelectItem value="semester">Semester (180 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edate">Date</Label>
                    <Input id="edate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="etime">Start time</Label>
                    <Input id="etime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="eper">Students / hall</Label>
                    <Input
                      id="eper"
                      type="number"
                      value={perRoom}
                      onChange={(e) => setPerRoom(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Halls ({selected.length} selected)</Label>
                    <div className="flex items-center gap-2">
                      <Select value={blockFilter} onValueChange={setBlockFilter}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue placeholder="Block" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All blocks</SelectItem>
                          {blocks.map((b) => (
                            <SelectItem key={b} value={b}>
                              Block {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={selectShown}>
                        Select shown
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected([])}>
                        Clear
                      </Button>
                    </div>
                  </div>

                  <div className="grid max-h-48 gap-2 overflow-y-auto rounded-xl border border-border p-3 sm:grid-cols-3">
                    {visibleRooms.map((r) => (
                      <label
                        key={r.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-sm hover:bg-foreground/5"
                      >
                        <Checkbox
                          checked={selected.includes(r.id)}
                          onCheckedChange={() => toggleRoom(r.id)}
                        />
                        <span>{r.room_number}</span>
                        <span className="text-xs text-muted-foreground">({r.capacity})</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => create.mutate()}
                  disabled={create.isPending || !name || !examDate || selected.length === 0}
                >
                  Schedule Exam
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="glass overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Examination</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date & time</TableHead>
              <TableHead>Halls</TableHead>
              <TableHead>Duties</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(exams.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No examinations scheduled yet.
                </TableCell>
              </TableRow>
            ) : (
              (exams.data ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <Link to="/exams/$examId" params={{ examId: e.id }} className="flex items-center gap-1.5 text-primary hover:underline">
                      <Calendar className="size-4" />
                      {e.name}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{e.exam_type}</TableCell>
                  <TableCell>
                    {e.exam_date} · {String(e.start_time).slice(0, 5)} ({e.duration_minutes} min)
                  </TableCell>
                  <TableCell>{e.rooms}</TableCell>
                  <TableCell>{e.duties}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "published" ? "default" : "secondary"}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="default" asChild>
                          <Link to="/exams/$examId" params={{ examId: e.id }}>
                            <ExternalLink className="mr-1 size-3.5" /> Manage & Allocate
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus.mutate(e.id)}
                          disabled={toggleStatus.isPending}
                        >
                          {e.status === "published" ? "Set Draft" : "Publish"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove.mutate(e.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/exams/$examId" params={{ examId: e.id }}>
                          View
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
