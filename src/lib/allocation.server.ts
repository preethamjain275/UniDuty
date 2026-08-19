export type Teacher = {
  id: string;
  full_name: string;
  employee_id: string | null;
  department: string;
  is_senior: boolean;
  max_duties: number;
};

export type RoomSlot = {
  roomId: string;
  roomNumber: string;
  floor: number;
  block: string;
  students: number;
  required: number;
};

export type PlannedDuty = {
  roomId: string | null;
  roomNumber: string | null;
  teacherId: string;
  teacherName: string;
  department: string;
  dutyRole: "primary" | "secondary" | "standby";
};

export type AllocationPlan = {
  duties: PlannedDuty[];
  conflicts: string[];
  stats: {
    rooms: number;
    required: number;
    assigned: number;
    standby: number;
    eligible: number;
    fairness: number;
  };
};

type Candidate = Teacher & { duties: number; lastFloor: number | null };

/**
 * Deterministic allocation engine.
 * Rules: never twice in one session, never on leave, never over max duties,
 * fairest workload first, prefer nearby floors, senior faculty for large halls.
 */
export function buildAllocationPlan(params: {
  slots: RoomSlot[];
  teachers: Teacher[];
  dutyCounts: Record<string, number>;
  unavailable: Record<string, string>;
  standbyPercentage: number;
}): AllocationPlan {
  const { slots, teachers, dutyCounts, unavailable, standbyPercentage } = params;
  const conflicts: string[] = [];

  const pool: Candidate[] = [];
  for (const t of teachers) {
    const reason = unavailable[t.id];
    if (reason) {
      conflicts.push(`${t.full_name} skipped — ${reason}`);
      continue;
    }
    const duties = dutyCounts[t.id] ?? 0;
    if (duties >= t.max_duties) {
      conflicts.push(`${t.full_name} skipped — reached maximum duties (${t.max_duties})`);
      continue;
    }
    pool.push({ ...t, duties, lastFloor: null });
  }

  const assignedIds = new Set<string>();
  const duties: PlannedDuty[] = [];
  const ordered = [...slots].sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber));
  const required = ordered.reduce((sum, s) => sum + s.required, 0);

  const pick = (slot: RoomSlot, needSenior: boolean): Candidate | null => {
    const available = pool.filter((c) => !assignedIds.has(c.id));
    if (available.length === 0) return null;
    const seniorPool = needSenior ? available.filter((c) => c.is_senior) : [];
    const from = seniorPool.length > 0 ? seniorPool : available;
    return [...from].sort(
      (a, b) =>
        a.duties - b.duties ||
        Math.abs((a.lastFloor ?? slot.floor) - slot.floor) - Math.abs((b.lastFloor ?? slot.floor) - slot.floor) ||
        a.full_name.localeCompare(b.full_name),
    )[0] ?? null;
  };

  for (const slot of ordered) {
    for (let i = 0; i < slot.required; i++) {
      const candidate = pick(slot, i === 0 && slot.required > 1);
      if (!candidate) {
        conflicts.push(`No invigilator available for ${slot.roomNumber} (slot ${i + 1})`);
        continue;
      }
      assignedIds.add(candidate.id);
      candidate.duties += 1;
      candidate.lastFloor = slot.floor;
      duties.push({
        roomId: slot.roomId,
        roomNumber: slot.roomNumber,
        teacherId: candidate.id,
        teacherName: candidate.full_name,
        department: candidate.department,
        dutyRole: i === 0 ? "primary" : "secondary",
      });
    }
  }

  const standbyTarget = Math.max(
    ordered.length > 0 ? 1 : 0,
    Math.ceil((ordered.length * standbyPercentage) / 100),
  );
  let standbyCount = 0;
  for (let i = 0; i < standbyTarget; i++) {
    const candidate = pick({ roomId: "", roomNumber: "", floor: 1, block: "A", students: 0, required: 1 }, false);
    if (!candidate) {
      conflicts.push("Not enough staff left to reserve all standby invigilators");
      break;
    }
    assignedIds.add(candidate.id);
    candidate.duties += 1;
    standbyCount += 1;
    duties.push({
      roomId: null,
      roomNumber: null,
      teacherId: candidate.id,
      teacherName: candidate.full_name,
      department: candidate.department,
      dutyRole: "standby",
    });
  }

  const loads = pool.map((c) => c.duties);
  const avg = loads.length ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
  const spread = loads.length ? Math.max(...loads) - Math.min(...loads) : 0;
  const fairness = loads.length === 0 ? 0 : Math.max(0, Math.round(100 - spread * 20 - (avg > 0 ? 0 : 0)));

  return {
    duties,
    conflicts,
    stats: {
      rooms: ordered.length,
      required,
      assigned: duties.filter((d) => d.dutyRole !== "standby").length,
      standby: standbyCount,
      eligible: pool.length,
      fairness,
    },
  };
}
