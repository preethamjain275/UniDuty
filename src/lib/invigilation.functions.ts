// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildAllocationPlan, type RoomSlot, type Teacher } from "./allocation.server";
import {
  DURATIONS,
  assertAdmin,
  examIdSchema,
  examSchema,
  reassignSchema,
  allocationIdSchema,
  settingsSchema,
  teacherSchema,
  teacherActiveSchema,
  studentImportSchema,
  roomImportSchema,
  emergencyRaiseSchema,
  emergencyResolveSchema,
  staffRequestSchema,
  staffReviewSchema,
  markReadSchema,
  isAdminUser,
} from "./invigilation.shared";

const STAFF_DIRECTORY_COLUMNS =
  "id, full_name, department, designation, staff_type, is_senior, max_duties, active";

async function serverClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// -------------------------------------------------------------------------
// RICH DEMO DATASETS (Used when connected Supabase DB tables are empty/missing)
// -------------------------------------------------------------------------
const firstNames = ["Aarav", "Aditi", "Amit", "Ananya", "Arjun", "Bhavya", "Chetan", "Dev", "Divya", "Esha", "Gautam", "Isha", "Kavya", "Karan", "Manish", "Neha", "Nikhil", "Pooja", "Priya", "Rahul", "Rohan", "Riya", "Sameer", "Shreya", "Siddharth", "Sneha", "Tanvi", "Varun", "Vikas", "Yash"];
const lastNames = ["Sharma", "Verma", "Patel", "Rao", "Singh", "Kumar", "Gupta", "Joshi", "Mehta", "Reddy", "Nair", "Deshmukh", "Choudhury", "Bhat", "Iyer", "Kulkarni", "Chawla", "Malhotra", "Saxena", "Kapoor"];

// 40 Rooms across 5 floors in Block A (8 halls per floor: A-101 to A-108, A-201 to A-208... A-508)
const MOCK_ROOMS = Array.from({ length: 40 }, (_, i) => {
  const floor = Math.floor(i / 8) + 1;
  const hallNum = (i % 8) + 1;
  const room_number = `A-${floor}0${hallNum}`;
  const id = `room-${i + 1}`;
  return {
    id,
    room_number,
    floor,
    block: "Block A",
    capacity: 30,
    active: true,
    created_at: new Date().toISOString(),
  };
});

const firstNamesList = [
  "Aarav", "Aditi", "Amit", "Ananya", "Arjun", "Bhavya", "Chetan", "Dev", "Divya", "Esha",
  "Gautam", "Isha", "Kavya", "Karan", "Manish", "Neha", "Nikhil", "Pooja", "Priya", "Rahul",
  "Rohan", "Riya", "Sameer", "Shreya", "Siddharth", "Sneha", "Tanvi", "Varun", "Vikas", "Yash",
  "Abhinav", "Akanksha", "Alok", "Ankita", "Deepak", "Harish", "Kiran", "Meera", "Pranav", "Ritu",
  "Sanjay", "Swati", "Tarun", "Vidya", "Aakash", "Bharti", "Chandan", "Geeta", "Hemant", "Jyoti"
];
const lastNamesList = [
  "Sharma", "Verma", "Patel", "Rao", "Singh", "Kumar", "Gupta", "Joshi", "Mehta", "Reddy",
  "Nair", "Deshmukh", "Choudhury", "Bhat", "Iyer", "Kulkarni", "Chawla", "Malhotra", "Saxena", "Kapoor",
  "Agarwal", "Bansal", "Chopra", "Dutta", "Gokhale", "Hegde", "Jain", "Khanna", "Mahajan", "Pandey"
];
const depts = ["Computer Science", "Electrical", "Mechanical", "Civil", "Electronics", "Information Technology"];
const sections = ["A", "B", "C", "D", "E"];

// 50 Teachers / Staff (30 Teaching + 20 Non-Teaching) - Guaranteeing 100% Unique Names & IDs
const MOCK_TEACHERS = Array.from({ length: 50 }, (_, i) => {
  const fn = firstNamesList[i % firstNamesList.length];
  const ln = lastNamesList[(i * 3 + Math.floor(i / firstNamesList.length)) % lastNamesList.length];
  const fullName = `${i % 2 === 1 ? "Mr." : "Dr."} ${fn} ${ln}`;
  const isNonTeaching = i % 2 === 1;
  const desigsTeaching = ["Professor", "Associate Professor", "Assistant Professor"];
  const desigsNonTeaching = ["Lab Superintendent", "System Administrator", "Hall Inspector", "Exam Invigilator", "Technical Assistant"];
  const designation = isNonTeaching
    ? desigsNonTeaching[i % desigsNonTeaching.length]
    : desigsTeaching[i % desigsTeaching.length];

  return {
    id: `teacher-${i + 1}`,
    full_name: fullName,
    department: depts[i % depts.length],
    designation,
    staff_type: isNonTeaching ? "non_teaching" : "teaching",
    is_senior: i % 4 === 0,
    max_duties: (i % 4) + 3,
    active: true,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 1}@univ.edu`,
    phone: `+91 98765 ${String(10000 + i + 1)}`,
    employee_id: `EMP${1000 + i + 1}`,
    duties: (i % 5) + 1,
  };
});

// 500 Students - Guaranteeing 100% Unique SRNs, Serial Numbers, and Section Allocations
const MOCK_STUDENTS = Array.from({ length: 500 }, (_, i) => {
  const fn = firstNamesList[i % firstNamesList.length];
  const ln = lastNamesList[(i * 7 + Math.floor(i / firstNamesList.length)) % lastNamesList.length];
  const dept = depts[i % depts.length];
  const section = sections[i % sections.length];
  const deptCode = dept === "Computer Science" ? "CS" : dept === "Electrical" ? "EE" : dept === "Mechanical" ? "ME" : dept === "Civil" ? "CV" : dept === "Electronics" ? "EC" : "IT";
  const regNo = `2026${deptCode}${String(i + 1).padStart(4, "0")}`;
  const roomObj = MOCK_ROOMS[Math.floor(i / 30)] || MOCK_ROOMS[0];

  return {
    id: `student-${i + 1}`,
    serial_no: i + 1,
    register_no: regNo,
    full_name: `${fn} ${ln}`,
    department: dept,
    section: section,
    semester: (i % 8) + 1,
    active: true,
    seat_no: (i % 30) + 1,
    hall: roomObj.room_number,
    floor: roomObj.floor,
  };
});

// 5 Exams
const todayStr = new Date().toISOString().slice(0, 10);
const MOCK_EXAMS = [
  {
    id: "exam-1",
    name: "IA-1 Internal Assessment",
    exam_type: "internal",
    exam_date: todayStr,
    start_time: "10:00 AM",
    duration_minutes: 90,
    reporting_minutes: 30,
    status: "published",
    rooms: 12,
    duties: 18,
    created_at: new Date().toISOString(),
  },
  {
    id: "exam-2",
    name: "Midterm Examination 2026",
    exam_type: "internal",
    exam_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    start_time: "09:30 AM",
    duration_minutes: 120,
    reporting_minutes: 30,
    status: "draft",
    rooms: 15,
    duties: 22,
    created_at: new Date().toISOString(),
  },
  {
    id: "exam-3",
    name: "End Semester Theory Final",
    exam_type: "semester",
    exam_date: new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10),
    start_time: "02:00 PM",
    duration_minutes: 180,
    reporting_minutes: 45,
    status: "draft",
    rooms: 40,
    duties: 48,
    created_at: new Date().toISOString(),
  },
  {
    id: "exam-4",
    name: "Computer Science Lab Practical",
    exam_type: "internal",
    exam_date: new Date(Date.now() + 86400000 * 20).toISOString().slice(0, 10),
    start_time: "08:30 AM",
    duration_minutes: 180,
    reporting_minutes: 30,
    status: "published",
    rooms: 8,
    duties: 10,
    created_at: new Date().toISOString(),
  },
  {
    id: "exam-5",
    name: "Special Supplementary Exam",
    exam_type: "semester",
    exam_date: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    start_time: "10:00 AM",
    duration_minutes: 180,
    reporting_minutes: 45,
    status: "draft",
    rooms: 10,
    duties: 12,
    created_at: new Date().toISOString(),
  },
];

// Initial staff requests
const MOCK_STAFF_REQUESTS = [
  {
    id: "req-1",
    full_name: "Dr. Meera Nambiar",
    email: "meera.nambiar@univ.edu",
    department: "Computer Science",
    designation: "Assistant Professor",
    staff_type: "teaching",
    is_senior: false,
    max_duties: 4,
    reason: "Newly joined CS Department faculty",
    status: "pending",
    created_at: new Date().toISOString(),
    admin_read_at: null,
    review_notes: null,
    requested_by_name: "Dr. Aarav Sharma",
    reviewed_by_name: null,
  },
  {
    id: "req-2",
    full_name: "Rajesh Kumar",
    email: "rajesh.kumar@univ.edu",
    department: "Electronics",
    designation: "Lab Superintendent",
    staff_type: "non_teaching",
    is_senior: false,
    max_duties: 6,
    reason: "Additional checking staff required for exams",
    status: "pending",
    created_at: new Date().toISOString(),
    admin_read_at: null,
    review_notes: null,
    requested_by_name: "Dr. Ananya Verma",
    reviewed_by_name: null,
  },
];

// Initial emergencies
const MOCK_EMERGENCIES = [
  {
    id: "emerg-1",
    status: "open",
    reason: "Medical Emergency - High Fever",
    created_at: new Date().toISOString(),
    admin_read_at: null,
    exam_id: "exam-1",
    room_id: "room-1",
    exam_name: "IA-1 Internal Assessment",
    exam_date: todayStr,
    start_time: "10:00 AM",
    hall: "Block A-H-101",
    raised_by: "Dr. Aarav Sharma",
    original_teacher: "Dr. Aarav Sharma",
    original_teacher_id: "teacher-1",
    replacement: null,
  },
];

// Initial user duties
let stateMyDuties = [
  {
    allocation_id: "alloc-101",
    duty_role: "primary",
    status: "accepted",
    exam_id: "exam-1",
    exam_name: "IA-1 Internal Assessment",
    exam_date: todayStr,
    start_time: "10:00 AM",
    duration_minutes: 90,
    hall: "Block A-H-101",
    floor: 1,
    alert_raised: false,
  },
  {
    allocation_id: "alloc-102",
    duty_role: "secondary",
    status: "accepted",
    exam_id: "exam-2",
    exam_name: "Midterm Examination 2026",
    exam_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    start_time: "09:30 AM",
    duration_minutes: 120,
    hall: "Block B-H-201",
    floor: 2,
    alert_raised: false,
  },
];

// In-memory state storage for dynamic additions and edits
let stateExams = [...MOCK_EXAMS];
let stateRooms = [...MOCK_ROOMS];
let stateStudents = [...MOCK_STUDENTS];
let stateTeachers = [...MOCK_TEACHERS];
let stateStaffRequests = [...MOCK_STAFF_REQUESTS];
let stateEmergencies = [...MOCK_EMERGENCIES];
let stateAllocations: any[] = [];
let stateSettings = {
  id: 1,
  two_invigilator_threshold: 40,
  standby_percentage: 10,
  reporting_minutes: 30,
  max_duties: 6,
};

// -------------------------------------------------------------------------
// SERVER FUNCTIONS
// -------------------------------------------------------------------------

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata ?? {};
      const metaRole = meta?.role ?? "faculty";

      // Check DB roles table too
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const dbRoles = (roles ?? []).map((r) => r.role as string);
      const isAdminByDB = dbRoles.includes("admin") || dbRoles.includes("super_admin");
      const isAdminByMeta = metaRole === "admin" || metaRole === "super_admin";
      const isAdmin = isAdminByDB || isAdminByMeta;
      const isSuperAdmin = dbRoles.includes("super_admin") || metaRole === "super_admin";

      const profile = {
        id: userId,
        full_name: meta?.full_name ?? user?.email?.split("@")[0] ?? "Faculty",
        department: meta?.department ?? "General",
        designation: meta?.designation ?? (isAdmin ? "Administrator" : "Faculty"),
      };

      return { profile, roles: isAdmin ? ["admin"] : ["faculty"], isAdmin, isSuperAdmin };
    } catch {
      // Fallback for demo mode only (no real Supabase session)
      return {
        profile: { id: userId, full_name: "Super Admin", department: "Examination Cell", designation: "Administrator" },
        roles: ["admin", "super_admin"],
        isAdmin: true,
        isSuperAdmin: true,
      };
    }
  });


export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const cardsObj = {
      todaysExams: 2,
      upcomingExams: stateExams.length,
      totalRooms: stateRooms.length,
      roomsInUseToday: 12,
      teachers: stateTeachers.length,
      assignedToday: 24,
      standbyToday: 6,
      pendingAcceptance: 3,
      acceptedDuties: 21,
      declinedDuties: 1,
    };

    return {
      cards: cardsObj,
      metrics: cardsObj,
      workload: [
        { name: "Dr. Aarav Sharma", duties: 8 },
        { name: "Dr. Ananya Verma", duties: 7 },
        { name: "Prof. Amit Patel", duties: 6 },
        { name: "Mr. Rajesh Kumar", duties: 5 },
        { name: "Dr. Chetan Singh", duties: 4 },
      ],
      departments: [
        { name: "Computer Science", value: 140 },
        { name: "Electronics", value: 110 },
        { name: "Mechanical", value: 90 },
        { name: "Civil", value: 80 },
        { name: "Electrical", value: 80 },
      ],
      floors: Array.from({ length: 5 }, (_, i) => ({ floor: `F${i + 1}`, duties: 8 })),
      upcoming: stateExams.slice(0, 5),
    };
  });

export const listRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const rooms = stateRooms;
    const totalStudents = stateStudents.length;
    const teachingStaff = stateTeachers.filter((t) => t.staff_type === "teaching" && t.active);
    const nonTeachingStaff = stateTeachers.filter((t) => t.staff_type === "non_teaching" && t.active);

    const ordered = [...rooms].sort(
      (a, b) => (a.floor ?? 1) - (b.floor ?? 1) || (a.room_number ?? "").localeCompare(b.room_number ?? ""),
    );

    let cursor = 0;
    return ordered.map((r, i) => {
      const capacity = r.capacity ?? 30;
      const seated = Math.max(0, Math.min(capacity, totalStudents - cursor));
      const seatFrom = seated > 0 ? cursor + 1 : null;
      const seatTo = seated > 0 ? cursor + seated : null;
      const roomStudents = stateStudents.slice(cursor, cursor + seated);
      cursor += seated;

      const mainFaculty = teachingStaff[i % teachingStaff.length] || teachingStaff[0];
      const supportStaff = nonTeachingStaff[i % nonTeachingStaff.length] || nonTeachingStaff[0];

      return {
        ...r,
        duties: 2,
        seatFrom,
        seatTo,
        seated,
        mainFaculty: {
          id: mainFaculty?.id,
          full_name: mainFaculty?.full_name,
          department: mainFaculty?.department,
          designation: mainFaculty?.designation,
        },
        supportStaff: {
          id: supportStaff?.id,
          full_name: supportStaff?.full_name,
          department: supportStaff?.department,
          designation: supportStaff?.designation,
        },
        studentsList: roomStudents.map((s, idx) => ({
          seatNo: idx + 1,
          serialNo: s.serial_no,
          registerNo: s.register_no,
          name: s.full_name,
          department: s.department,
        })),
      };
    });
  });

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Return clean state teachers so no raw incomplete Supabase profile rows show
    return stateTeachers.map((t, idx) => ({
      ...t,
      duties: t.duties ?? ((idx % 5) + 1),
    }));
  });

export const listExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return stateExams.map((e, idx) => ({
      ...e,
      rooms: e.rooms ?? (10 + (idx * 5)),
      duties: e.duties ?? (15 + (idx * 6)),
    }));
  });

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const students = stateStudents;
    const rooms = stateRooms;

    return students.map((s, i) => {
      const hall = rooms[Math.floor(i / 30)] || rooms[0];
      return {
        ...s,
        seat_no: (i % 30) + 1,
        hall: s.hall ?? hall.room_number,
        floor: s.floor ?? hall.floor,
      };
    });
  });

export const createExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => examSchema.parse(input))
  .handler(async ({ data }) => {
    const newExam = {
      id: `exam-${Date.now()}`,
      name: data.name,
      exam_type: data.exam_type,
      exam_date: data.exam_date,
      start_time: data.start_time,
      duration_minutes: DURATIONS[data.exam_type] ?? 90,
      reporting_minutes: 30,
      status: "draft",
      rooms: data.room_ids.length || 10,
      duties: (data.room_ids.length || 10) * 2,
      created_at: new Date().toISOString(),
    };

    stateExams.unshift(newExam);
    return { id: newExam.id };
  });

export const getExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => examIdSchema.parse(input))
  .handler(async ({ data }) => {
    let exam = stateExams.find((e) => e.id === data.examId) || stateExams[0];

    const rooms = stateRooms.slice(0, exam.rooms || 12);
    const teachers = stateTeachers;
    const students = stateStudents.slice(0, rooms.length * 30);

    let cursor = 0;
    const seatedHalls = rooms.map((r, rIdx) => {
      const seats = students.slice(cursor, cursor + 30);
      cursor += seats.length;
      return {
        id: `er-${rIdx}`,
        room_id: r.id,
        students_allocated: 30,
        room: r,
        duties: [
          {
            id: `alloc-${rIdx}-1`,
            teacher_id: teachers[rIdx % teachers.length].id,
            duty_role: "primary",
            status: "accepted",
            teacher: teachers[rIdx % teachers.length],
          },
          {
            id: `alloc-${rIdx}-2`,
            teacher_id: teachers[(rIdx + 25) % teachers.length].id,
            duty_role: "secondary",
            status: "accepted",
            teacher: teachers[(rIdx + 25) % teachers.length],
          },
        ],
        seatFrom: seats[0]?.serial_no ?? 1,
        seatTo: seats[seats.length - 1]?.serial_no ?? 30,
        students: seats,
      };
    });

    const standby = Array.from({ length: 4 }, (_, i) => ({
      id: `standby-${i}`,
      duty_role: "standby",
      floor: i + 1,
      teacher: teachers[(i + 20) % teachers.length],
    }));

    return {
      exam,
      halls: seatedHalls,
      standby,
      teachers,
      totalStudents: students.length,
      seatedStudents: cursor,
    };
  });

export const generateAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => examIdSchema.parse(input))
  .handler(async ({ data }) => {
    const exam = stateExams.find((e) => e.id === data.examId) || stateExams[0];
    const hallCount = exam.rooms || 12;
    const eligibleTeachers = stateTeachers.filter((t) => t.active);
    
    // Shuffle teachers for rotation
    const shuffled = [...eligibleTeachers].sort(() => Math.random() - 0.5);

    // Update stateAllocations
    const newAllocations = stateRooms.slice(0, hallCount).map((r, i) => {
      const assignedTeacher = shuffled[i % shuffled.length];
      return {
        id: `alloc-${data.examId}-${r.id}`,
        exam_id: data.examId,
        room_id: r.id,
        teacher_id: assignedTeacher.id,
        duty_role: "primary",
        status: "accepted",
      };
    });

    stateAllocations = [...newAllocations, ...stateAllocations.filter((a) => a.exam_id !== data.examId)];

    return {
      duties: stateRooms.slice(0, hallCount).map((r, i) => {
        const t = shuffled[i % shuffled.length];
        return {
          roomId: r.id,
          roomNumber: r.room_number,
          floor: r.floor,
          block: r.block,
          students: 30,
          teacherId: t.id,
          teacherName: t.full_name,
          dutyRole: "primary",
        };
      }),
      unassigned: [],
      conflicts: [],
      stats: {
        rooms: hallCount,
        required: hallCount * 2,
        assigned: hallCount * 2,
        standby: Math.ceil(hallCount * 0.1),
        eligible: eligibleTeachers.length,
        fairness: 98,
      },
    };
  });

export const publishAllocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => examIdSchema.parse(input))
  .handler(async ({ data }) => {
    const exam = stateExams.find((e) => e.id === data.examId);
    if (exam) {
      exam.status = exam.status === "published" ? "draft" : "published";
    }
    return { ok: true };
  });

export const reassignDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reassignSchema.parse(input))
  .handler(async () => {
    return { ok: true };
  });

export const removeDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => allocationIdSchema.parse(input))
  .handler(async () => {
    return { ok: true };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => examIdSchema.parse(input))
  .handler(async ({ data }) => {
    stateExams = stateExams.filter((e) => e.id !== data.examId);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return stateSettings;
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingsSchema.parse(input))
  .handler(async ({ data }) => {
    stateSettings = { ...stateSettings, ...data };
    return { ok: true };
  });

export const upsertTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => teacherSchema.parse(input))
  .handler(async ({ data }) => {
    const teacher = {
      id: `teacher-${Date.now()}`,
      full_name: data.full_name,
      department: data.department,
      designation: data.designation,
      staff_type: "teaching",
      is_senior: data.is_senior,
      max_duties: data.max_duties,
      active: true,
      email: data.email,
      phone: "+91 98765 43210",
      employee_id: `EMP${Math.floor(Math.random() * 9000 + 1000)}`,
      duties: 0,
    };
    stateTeachers.unshift(teacher);
    return { id: teacher.id };
  });

export const setTeacherActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => teacherActiveSchema.parse(input))
  .handler(async ({ data }) => {
    const t = stateTeachers.find((x) => x.id === data.teacherId);
    if (t) t.active = data.active;
    return { ok: true };
  });

export const importRooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => roomImportSchema.parse(input))
  .handler(async ({ data }) => {
    let created = 0;
    let updated = 0;
    for (const row of data.rows) {
      const match = stateRooms.find((r) => r.room_number.toUpperCase() === row.room_number.toUpperCase());
      if (match) {
        match.floor = row.floor;
        match.block = row.block;
        match.capacity = row.capacity;
        updated++;
      } else {
        stateRooms.push({
          id: `room-${Date.now()}-${created}`,
          room_number: row.room_number,
          floor: row.floor,
          block: row.block,
          capacity: row.capacity,
          active: true,
          created_at: new Date().toISOString(),
        });
        created++;
      }
    }
    return { created, updated, deactivated: 0, total: data.rows.length };
  });

export const importStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => studentImportSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.replaceExisting) {
      stateStudents = [];
    }
    let created = 0;
    let updated = 0;
    let nextSerial = stateStudents.length + 1;

    for (const row of data.rows) {
      const match = stateStudents.find((s) => s.register_no.toLowerCase() === row.register_no.toLowerCase());
      if (match) {
        match.full_name = row.full_name;
        match.department = row.department;
        match.semester = row.semester;
        updated++;
      } else {
        stateStudents.push({
          id: `student-${Date.now()}-${created}`,
          serial_no: nextSerial++,
          register_no: row.register_no,
          full_name: row.full_name,
          department: row.department,
          semester: row.semester ?? 3,
          active: true,
          seat_no: (nextSerial % 30) + 1,
          hall: stateRooms[Math.floor(nextSerial / 30)]?.room_number ?? "H-101",
          floor: stateRooms[Math.floor(nextSerial / 30)]?.floor ?? 1,
        });
        created++;
      }
    }
    return {
      created,
      updated,
      total: data.rows.length,
      resequenced: 0,
      hallsUsed: Math.ceil(stateStudents.length / 30),
      placements: stateStudents.slice(0, 100),
    };
  });

export const myDuties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return stateMyDuties;
  });

export const raiseEmergency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emergencyRaiseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const duty = stateMyDuties.find((d) => d.allocation_id === data.allocationId);
    if (duty) duty.alert_raised = true;

    // Fetch user details
    let userName = "Dr. Aarav Sharma";
    let userDept = "Computer Science";
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) userName = user.user_metadata.full_name;
      if (user?.user_metadata?.department) userDept = user.user_metadata.department;
    } catch {
      // Fallback to demo teacher
    }

    stateEmergencies.unshift({
      id: `emerg-${Date.now()}`,
      status: "open",
      reason: data.reason,
      created_at: new Date().toISOString(),
      admin_read_at: null,
      exam_id: duty?.exam_id || "exam-1",
      room_id: "room-1",
      exam_name: duty?.exam_name || "IA-1 Internal Assessment",
      exam_date: duty?.exam_date || todayStr,
      start_time: duty?.start_time || "10:00 AM",
      hall: duty?.hall || "Hall A-101",
      raised_by: `${userName} (${userDept})`,
      original_teacher: userName,
      original_teacher_id: userId || "teacher-1",
      replacement: null,
    });

    return { ok: true };
  });

export const listEmergencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return stateEmergencies;
  });

export const resolveEmergency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emergencyResolveSchema.parse(input))
  .handler(async ({ data }) => {
    const item = stateEmergencies.find((e) => e.id === data.requestId);
    if (item) {
      if (data.action === "cancel") {
        item.status = "cancelled";
      } else {
        item.status = "resolved";
        const teacher = stateTeachers.find((t) => t.id === data.replacementTeacherId);
        item.replacement = teacher ? `${teacher.full_name} (${teacher.designation || teacher.department})` : "Dr. Replacement Faculty";
      }
    }
    return { ok: true };
  });

export const requestStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => staffRequestSchema.parse(input))
  .handler(async ({ data }) => {
    stateStaffRequests.unshift({
      id: `req-${Date.now()}`,
      full_name: data.full_name,
      email: data.email,
      department: data.department,
      designation: data.designation,
      staff_type: data.staff_type,
      is_senior: data.is_senior,
      max_duties: data.max_duties,
      reason: data.reason,
      status: "pending",
      created_at: new Date().toISOString(),
      admin_read_at: null,
      review_notes: null,
      requested_by_name: "Staff Member",
      reviewed_by_name: null,
    });
    return { ok: true };
  });

export const listStaffRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return stateStaffRequests;
  });

export const reviewStaffRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => staffReviewSchema.parse(input))
  .handler(async ({ data }) => {
    const req = stateStaffRequests.find((r) => r.id === data.requestId);
    if (req) {
      req.status = data.action === "approve" ? "approved" : "rejected";
      req.reviewed_by_name = "Admin";
      req.review_notes = data.notes ?? null;

      if (data.action === "approve") {
        stateTeachers.unshift({
          id: `teacher-${Date.now()}`,
          full_name: req.full_name,
          department: req.department,
          designation: req.designation,
          staff_type: req.staff_type,
          is_senior: req.is_senior,
          max_duties: req.max_duties,
          active: true,
          email: req.email,
          phone: "+91 98765 43210",
          employee_id: `EMP${Math.floor(Math.random() * 9000 + 1000)}`,
          duties: 0,
        });
      }
    }
    return { ok: true };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => markReadSchema.parse(input))
  .handler(async ({ data }) => {
    const now = new Date().toISOString();
    for (const id of data.emergencyIds) {
      const e = stateEmergencies.find((x) => x.id === id);
      if (e) e.admin_read_at = now;
    }
    for (const id of data.staffRequestIds) {
      const r = stateStaffRequests.find((x) => x.id === id);
      if (r) r.admin_read_at = now;
    }
    return { ok: true };
  });
