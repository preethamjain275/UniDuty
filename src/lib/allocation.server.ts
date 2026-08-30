export type Teacher = {
  id: string;
  full_name: string;
  employee_id: string | null;
  department: string;
  is_senior: boolean;
  max_duties: number;
  block?: string;
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
  floor?: number | null;
  teacherId: string;
  teacherName: string;
  department: string;
  dutyRole: "primary" | "secondary" | "standby" | "relief";
  cross_dept_fallback?: boolean;
};

export type AllocationPlan = {
  duties: PlannedDuty[];
  conflicts: string[];
  reliefByFloor: Record<number, PlannedDuty[]>; // floor -> relief duties
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
 * Deterministic allocation engine — department-aware with fallback.
 *
 * Rules:
 *  - Eligible pool = all faculty EXCLUDING exam's own department.
 *  - Fallback: if pool is too small, pull from own-dept (lowest duty_count first),
 *    flagging those assignments as cross_dept_fallback: true.
 *  - Fairest workload first (duty_count ascending), prefer nearby floors.
 *  - Senior faculty preferred for primary slots.
 *  - For exams ≥ 180 min: one Relief Invigilator per floor, assigned AFTER primary slots.
 */
export function buildAllocationPlan(params: {
  slots: RoomSlot[];
  teachers: Teacher[];
  dutyCounts: Record<string, number>;
  unavailable: Record<string, string>;
  standbyPercentage: number;
  examDept?: string;         // exam's own department — excluded from primary pool
  durationMinutes?: number;  // used to determine if relief invigilator is needed
}): AllocationPlan {
  const { slots, teachers, dutyCounts, unavailable, standbyPercentage, examDept, durationMinutes } = params;
  const conflicts: string[] = [];
  const needsRelief = (durationMinutes ?? 0) >= 180;

  // Build primary eligible pool (exclude exam dept)
  const primaryPool: Candidate[] = [];
  const fallbackPool: Candidate[] = []; // own-dept — used only if primary pool is too small

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
    const candidate: Candidate = { ...t, duties, lastFloor: null };
    if (examDept && t.department === examDept) {
      fallbackPool.push(candidate);
    } else {
      primaryPool.push(candidate);
    }
  }

  const ordered = [...slots].sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber));
  const required = ordered.reduce((sum, s) => sum + s.required, 0);

  // Check if primary pool is large enough; if not, blend in fallback candidates
  const assignedIds = new Set<string>();
  const duties: PlannedDuty[] = [];

  const sortByFairness = (pool: Candidate[], slot: RoomSlot) =>
    [...pool].sort(
      (a, b) =>
        a.duties - b.duties ||
        Math.abs((a.lastFloor ?? slot.floor) - slot.floor) -
          Math.abs((b.lastFloor ?? slot.floor) - slot.floor) ||
        a.full_name.localeCompare(b.full_name),
    );

  const pick = (
    slot: RoomSlot,
    needSenior: boolean,
    allowFallback: boolean,
    roomAssignedIds?: Set<string>,
  ): { candidate: Candidate; isFallback: boolean } | null => {
    const avail = primaryPool.filter((c) => !assignedIds.has(c.id) && !roomAssignedIds?.has(c.id));
    const seniorAvail = needSenior ? avail.filter((c) => c.is_senior) : [];
    const from = seniorAvail.length > 0 ? seniorAvail : avail;
    const picked = sortByFairness(from, slot)[0];
    if (picked) return { candidate: picked, isFallback: false };

    // Fallback: use own-dept candidate (excluding candidates already assigned in this room)
    if (allowFallback) {
      const fbAvail = fallbackPool.filter((c) => !assignedIds.has(c.id) && !roomAssignedIds?.has(c.id));
      const fbPicked = sortByFairness(fbAvail, slot)[0];
      if (fbPicked) {
        conflicts.push(
          `⚠ Shortage fallback: ${fbPicked.full_name} (${fbPicked.department}) used for ${slot.roomNumber || "standby"}`,
        );
        return { candidate: fbPicked, isFallback: true };
      }
    }
    return null;
  };

  // --- Primary & Secondary slot assignment ---
  for (const slot of ordered) {
    const roomAssignedIds = new Set<string>();
    for (let i = 0; i < slot.required; i++) {
      const result = pick(slot, i === 0 && slot.required > 1, true, roomAssignedIds);
      if (!result) {
        conflicts.push(`No invigilator available for ${slot.roomNumber} (slot ${i + 1})`);
        continue;
      }
      const { candidate, isFallback } = result;
      assignedIds.add(candidate.id);
      roomAssignedIds.add(candidate.id);
      candidate.duties += 1;
      candidate.lastFloor = slot.floor;
      duties.push({
        roomId: slot.roomId,
        roomNumber: slot.roomNumber,
        floor: slot.floor,
        teacherId: candidate.id,
        teacherName: candidate.full_name,
        department: candidate.department,
        dutyRole: i === 0 ? "primary" : "secondary",
        cross_dept_fallback: isFallback || undefined,
      });
    }
  }

  // --- Standby assignment ---
  const standbyTarget = Math.max(
    ordered.length > 0 ? 1 : 0,
    Math.ceil((ordered.length * standbyPercentage) / 100),
  );
  let standbyCount = 0;
  for (let i = 0; i < standbyTarget; i++) {
    const result = pick(
      { roomId: "", roomNumber: "", floor: 1, block: "A", students: 0, required: 1 },
      false,
      true,
    );
    if (!result) {
      conflicts.push("Not enough staff left to reserve all standby invigilators");
      break;
    }
    const { candidate, isFallback } = result;
    assignedIds.add(candidate.id);
    candidate.duties += 1;
    standbyCount += 1;
    duties.push({
      roomId: null,
      roomNumber: null,
      floor: null,
      teacherId: candidate.id,
      teacherName: candidate.full_name,
      department: candidate.department,
      dutyRole: "standby",
      cross_dept_fallback: isFallback || undefined,
    });
  }

  // --- Relief invigilator assignment (one per floor, only if exam ≥ 180 min) ---
  const reliefByFloor: Record<number, PlannedDuty[]> = {};

  if (needsRelief) {
    const floors = Array.from(new Set(ordered.map((s) => s.floor))).sort();
    for (const floor of floors) {
      // Pick from primary pool first (those not yet assigned to THIS exam)
      const avail = [...primaryPool, ...fallbackPool].filter(
        (c) => !assignedIds.has(c.id),
      );
      const dummySlot: RoomSlot = { roomId: "", roomNumber: `Floor ${floor}`, floor, block: "A", students: 0, required: 1 };
      const sorted = sortByFairness(avail, dummySlot);
      const picked = sorted[0] ?? null;
      if (!picked) {
        conflicts.push(`No relief invigilator available for Floor ${floor}`);
        continue;
      }
      const isFallback = examDept ? picked.department === examDept : false;
      assignedIds.add(picked.id);
      picked.duties += 1;
      const reliefDuty: PlannedDuty = {
        roomId: null,
        roomNumber: `Floor ${floor} (Rotation)`,
        floor,
        teacherId: picked.id,
        teacherName: picked.full_name,
        department: picked.department,
        dutyRole: "relief",
        cross_dept_fallback: isFallback || undefined,
      };
      duties.push(reliefDuty);
      if (!reliefByFloor[floor]) reliefByFloor[floor] = [];
      reliefByFloor[floor].push(reliefDuty);
    }
  }

  // Fairness score
  const allCandidates = [...primaryPool, ...fallbackPool];
  const loads = allCandidates.map((c) => c.duties);
  const avg = loads.length ? loads.reduce((a, b) => a + b, 0) / loads.length : 0;
  const spread = loads.length ? Math.max(...loads) - Math.min(...loads) : 0;
  const fairness = loads.length === 0 ? 0 : Math.max(0, Math.round(100 - spread * 20 - (avg > 0 ? 0 : 0)));

  return {
    duties,
    conflicts,
    reliefByFloor,
    stats: {
      rooms: ordered.length,
      required,
      assigned: duties.filter((d) => d.dutyRole !== "standby" && d.dutyRole !== "relief").length,
      standby: standbyCount,
      eligible: allCandidates.length,
      fairness,
    },
  };
}
