import { z } from "zod";

export const DURATIONS = { internal: 90, semester: 180 } as const;

export const examSchema = z.object({
  name: z.string().trim().min(2).max(120),
  exam_type: z.enum(["internal", "semester"]),
  exam_date: z.string().min(8),
  start_time: z.string().min(4),
  room_ids: z.array(z.string().min(1)).min(1),
  students_per_room: z.number().int().min(1).max(200),
  department: z.string().trim().min(1).max(80).default("General"),
});

export const settingsSchema = z.object({
  reporting_minutes: z.number().int().min(0).max(120),
  attendance_window_minutes: z.number().int().min(0).max(120),
  max_duties: z.number().int().min(1).max(60),
  standby_percentage: z.number().int().min(0).max(100),
  two_invigilator_threshold: z.number().int().min(1).max(500),
});

export const teacherSchema = z.object({
  id: z.string().optional(),
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  department: z.string().trim().min(1).max(80),
  designation: z.string().trim().min(1).max(80),
  is_senior: z.boolean(),
  max_duties: z.number().int().min(1).max(60),
  block: z.string().trim().max(12).default("A"),
  password: z.string().trim().min(1).max(255).optional(),
});

export const studentImportSchema = z.object({
  replaceExisting: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        serial_no: z.number().int().min(1).max(100000).optional(),
        register_no: z.string().trim().min(1).max(60),
        full_name: z.string().trim().min(1).max(160),
        department: z.string().trim().max(80).optional(),
        semester: z.number().int().min(1).max(12).optional(),
      }),
    )
    .min(1)
    .max(5000),
});

export const staffImportSchema = z.object({
  replaceExisting: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        full_name: z.string().trim().min(2).max(120),
        email: z.string().trim().email().max(255).optional(),
        department: z.string().trim().max(80).optional(),
        designation: z.string().trim().max(80).optional(),
        block: z.string().trim().max(12).optional(),
        is_senior: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(5000),
});

export const reassignSchema = z.object({
  allocationId: z.string().min(1),
  teacherId: z.string().min(1),
});

export const roomImportSchema = z.object({
  deactivateMissing: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        room_number: z.string().trim().min(1).max(24),
        floor: z.number().int().min(0).max(60),
        block: z.string().trim().min(1).max(12),
        capacity: z.number().int().min(1).max(500),
      }),
    )
    .min(1)
    .max(1000),
});

export const allocationIdSchema = z.object({ allocationId: z.string().min(1) });

export const teacherActiveSchema = z.object({
  teacherId: z.string().min(1),
  active: z.boolean(),
});

export const examIdSchema = z.object({ examId: z.string().min(1) });

export const emergencyRaiseSchema = z.object({
  allocationId: z.string().min(1),
  reason: z.string().trim().min(3).max(300),
});

export const emergencyResolveSchema = z.object({
  requestId: z.string().min(1),
  replacementTeacherId: z.string().min(1).optional(),
  action: z.enum(["resolve", "cancel"]),
});

export const staffRequestSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  department: z.string().trim().min(1).max(80),
  designation: z.string().trim().min(1).max(80),
  staff_type: z.enum(["teaching", "non_teaching"]),
  is_senior: z.boolean(),
  max_duties: z.number().int().min(1).max(60),
  reason: z.string().trim().min(3).max(300),
});

export const staffReviewSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(300).optional(),
});

export const markReadSchema = z.object({
  emergencyIds: z.array(z.string().min(1)).max(200).default([]),
  staffRequestIds: z.array(z.string().min(1)).max(200).default([]),
});

/** Shared admin-role guard used by every privileged server function. */
export async function assertAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<void> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: { role: string }) => r.role);
  if (!roles.includes("admin") && !roles.includes("super_admin")) {
    throw new Error("Only administrators can perform this action");
  }
}

/** Non-throwing admin check for read paths that widen results for admins. */
export async function isAdminUser(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<boolean> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: { role: string }) => r.role);
  return roles.includes("admin") || roles.includes("super_admin");
}

export const createNoticeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
});

export const deleteNoticeSchema = z.object({
  noticeId: z.string().min(1),
});

export const createStudentSchema = z.object({
  register_no: z.string().trim().min(1).max(60),
  full_name: z.string().trim().min(1).max(160),
  department: z.string().trim().max(80).default("General"),
  section: z.string().trim().max(10).default("A"),
  semester: z.number().int().min(1).max(12).default(1),
});

export const updateStudentSchema = z.object({
  id: z.string().min(1),
  register_no: z.string().trim().min(1).max(60),
  full_name: z.string().trim().min(1).max(160),
  department: z.string().trim().max(80).default("General"),
  section: z.string().trim().max(10).default("A"),
  semester: z.number().int().min(1).max(12).default(1),
});

export const deleteStudentSchema = z.object({
  studentId: z.string().min(1),
});
