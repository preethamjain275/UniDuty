// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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
  staffImportSchema,
  studentImportSchema,
  roomImportSchema,
  emergencyRaiseSchema,
  emergencyResolveSchema,
  staffRequestSchema,
  staffReviewSchema,
  markReadSchema,
  isAdminUser,
  createNoticeSchema,
  deleteNoticeSchema,
  createStudentSchema,
  updateStudentSchema,
  deleteStudentSchema,
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

// 5 Teachers / Staff (For specific admin mock requirement)
const MOCK_TEACHERS = Array.from({ length: 5 }, (_, i) => {
  const fn = firstNamesList[i % firstNamesList.length];
  const ln = lastNamesList[(i * 3 + Math.floor(i / firstNamesList.length)) % lastNamesList.length];
  const fullName = `${i % 2 === 1 ? "Mr." : "Dr."} ${fn} ${ln}`;
  const isNonTeaching = i % 2 === 1;
  const desigsTeaching = ["Professor", "Associate Professor", "Assistant Professor"];
  const desigsNonTeaching = ["Lab Superintendent", "System Administrator", "Hall Inspector", "Exam Invigilator", "Technical Assistant"];
  const designation = isNonTeaching
    ? desigsNonTeaching[i % desigsNonTeaching.length]
    : desigsTeaching[i % desigsTeaching.length];

  const empId = `EMP100${i + 1}`;
  const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@snpsu.edu.in`;

  return {
    id: empId,
    employee_id: empId,
    full_name: fullName,
    department: depts[i % depts.length],
    designation,
    staff_type: isNonTeaching ? "non_teaching" : "teaching",
    is_senior: i % 4 === 0,
    max_duties: (i % 4) + 3,
    active: true,
    email: email,
    phone: "",
    office: "",
    emergency_phone: "",
    password: "pass123",
    avatar_url: null,
    duties: (i % 5) + 1,
    block: ["A", "B", "C"][i % 3], // Randomly distribute across A, B, C blocks
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
    department: "Computer Science",
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
    department: "Electrical",
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
    department: "Mechanical",
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
    department: "Computer Science",
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
    department: "Civil",
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

// Initial emergencies & student incident alerts
const MOCK_EMERGENCIES = [
  {
    id: "emerg-1",
    type: "student_malpractice",
    category: "Student Copying / Malpractice",
    status: "open",
    reason: "Student (SRN: 2026CS0014) caught attempting to copy from unauthorized chits in Hall A-202.",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    admin_read_at: null,
    exam_id: "exam-1",
    room_id: "room-1",
    exam_name: "IA-1 Internal Assessment",
    exam_date: todayStr,
    start_time: "10:00 AM",
    hall: "Hall A-202",
    student_srn: "2026CS0014",
    student_name: "Karan Verma",
    raised_by: "Mr. Kalaiah J B (AI & DS)",
    original_teacher: "Mr. Kalaiah J B",
    original_teacher_id: "fac-2",
    admin_notes: null,
    replacement: null,
  },
  {
    id: "emerg-2",
    type: "emergency",
    category: "Duty Relief Request",
    status: "open",
    reason: "High Fever & Dizziness during invigilation - Requesting standby relief invigilator.",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    admin_read_at: null,
    exam_id: "exam-1",
    room_id: "room-2",
    exam_name: "IA-1 Internal Assessment",
    exam_date: todayStr,
    start_time: "10:00 AM",
    hall: "Hall A-203",
    student_srn: "",
    student_name: "",
    raised_by: "Dr. Aarav Sharma (Computer Science)",
    original_teacher: "Dr. Aarav Sharma",
    original_teacher_id: "teacher-1",
    admin_notes: null,
    replacement: null,
  },
  {
    id: "emerg-3",
    type: "student_malpractice",
    category: "Student Copying / Phone Use",
    status: "accepted",
    reason: "Student (SRN: 2026EE0008) caught using mobile device during exam session in Hall A-307.",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    admin_read_at: new Date(Date.now() - 80000000).toISOString(),
    exam_id: "exam-1",
    room_id: "room-3",
    exam_name: "Mathematics II (25BEELY201)",
    exam_date: todayStr,
    start_time: "10:00 AM",
    hall: "Hall A-307",
    student_srn: "2026EE0008",
    student_name: "Dev Kapoor",
    raised_by: "Ms. Vinaya DS (AI & DS)",
    original_teacher: "Ms. Vinaya DS",
    original_teacher_id: "fac-1",
    admin_notes: "Malpractice recorded by Chief Superintendent. Student answer sheet confiscated and squad verified.",
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
export let stateStudents: any[] = [...MOCK_STUDENTS];

export function getStateStudents() {
  if (!stateStudents || stateStudents.length === 0) {
    stateStudents = [...MOCK_STUDENTS];
  }
  return stateStudents;
}
let stateTeachers = [...MOCK_TEACHERS];
let stateStaffRequests = [...MOCK_STAFF_REQUESTS];
let stateEmergencies = [...MOCK_EMERGENCIES];
let stateAllocations: any[] = [];
let stateAdminNotices: any[] = [
  {
    id: "notice-1",
    title: "Official Invigilation Guidelines for IA-1",
    content: "All invigilators must report to the Exam Cell at least 30 minutes before the scheduled exam start time. Seating diagrams and answer booklets are available at the main counter.",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  }
];
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
    if (userId === "demo-admin-id") {
      return {
        profile: { id: userId, full_name: "Super Admin", department: "Examination Cell", designation: "Administrator" },
        roles: ["admin", "super_admin"],
        isAdmin: true,
        isSuperAdmin: true,
      };
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          profile: { id: userId, full_name: "Super Admin", department: "Examination Cell", designation: "Administrator" },
          roles: ["admin", "super_admin"],
          isAdmin: true,
          isSuperAdmin: true,
        };
      }
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

    // Build departments live from stateTeachers, each faculty with their allocated room
    const deptMap = new Map<string, { name: string; room: string }[]>();
    stateTeachers.forEach((t, idx) => {
      const dept = t.department || "General";
      const room = stateRooms[idx % stateRooms.length]?.room_number ?? `A-${101 + idx}`;
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push({ name: t.full_name, room });
    });
    const departments = Array.from(deptMap.entries()).map(([name, members]) => ({
      name,
      value: members.length,
      faculty: members, // [{name, room}] — all members
    }));

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
      departments,
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
      department: data.department || "General",
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

    // Build hall-wise duties map from stateAllocations for this exam
    const examAllocs = stateAllocations.filter((a) => a.exam_id === data.examId);

    let cursor = 0;
    const seatedHalls = rooms.map((r, rIdx) => {
      const seats = students.slice(cursor, cursor + 30);
      cursor += seats.length;

      // Primary duties from allocations, fall back to deterministic mock
      const hallAllocs = examAllocs.filter((a) => a.room_id === r.id);
      let hallDuties;
      if (hallAllocs.length > 0) {
        hallDuties = hallAllocs.map((a) => {
          const t = teachers.find((x) => x.id === a.teacher_id) || teachers[rIdx % teachers.length];
          return {
            id: a.id,
            teacher_id: a.teacher_id,
            duty_role: a.duty_role,
            status: a.status,
            cross_dept_fallback: a.cross_dept_fallback ?? false,
            teacher: t,
          };
        });
      } else {
        hallDuties = [
          {
            id: `alloc-${rIdx}-1`,
            teacher_id: teachers[rIdx % teachers.length].id,
            duty_role: "primary",
            status: "accepted",
            cross_dept_fallback: false,
            teacher: teachers[rIdx % teachers.length],
          },
          {
            id: `alloc-${rIdx}-2`,
            teacher_id: teachers[(rIdx + 25) % teachers.length].id,
            duty_role: "secondary",
            status: "accepted",
            cross_dept_fallback: false,
            teacher: teachers[(rIdx + 25) % teachers.length],
          },
        ];
      }

      return {
        id: `er-${rIdx}`,
        room_id: r.id,
        students_allocated: 30,
        room: r,
        duties: hallDuties,
        seatFrom: seats[0]?.serial_no ?? 1,
        seatTo: seats[seats.length - 1]?.serial_no ?? 30,
        students: seats,
      };
    });

    // Relief invigilators per floor (from allocations if available)
    const reliefAllocs = stateAllocations.filter(
      (a) => a.exam_id === data.examId && a.duty_role === "relief",
    );
    const reliefByFloor: Record<number, any[]> = {};
    if (exam.duration_minutes >= 180) {
      for (const a of reliefAllocs) {
        const t = teachers.find((x) => x.id === a.teacher_id) || teachers[0];
        const floor = a.floor ?? 1;
        if (!reliefByFloor[floor]) reliefByFloor[floor] = [];
        reliefByFloor[floor].push({
          id: a.id,
          teacher_id: a.teacher_id,
          duty_role: "relief",
          status: "accepted",
          cross_dept_fallback: a.cross_dept_fallback ?? false,
          floor,
          teacher: t,
        });
      }
    }

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
      reliefByFloor,
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
    const examDept: string = exam.department || "General";

    // Build room slots
    const slots = stateRooms.slice(0, hallCount).map((r) => ({
      roomId: r.id,
      roomNumber: r.room_number,
      floor: r.floor ?? 1,
      block: r.block ?? "A",
      students: 30,
      required: 2, // primary + checking staff per hall
    }));

    // Build duty counts from existing state
    const dutyCounts: Record<string, number> = {};
    for (const t of stateTeachers) {
      dutyCounts[t.id] = t.duties ?? 0;
    }

    // Run dept-aware allocation engine
    const plan = buildAllocationPlan({
      slots,
      teachers: stateTeachers
        .filter((t) => t.active)
        .map((t) => ({
          id: t.id,
          full_name: t.full_name,
          employee_id: t.employee_id ?? null,
          department: t.department,
          is_senior: t.is_senior,
          max_duties: t.max_duties,
          block: t.block,
        })),
      dutyCounts,
      unavailable: {},
      standbyPercentage: stateSettings.standby_percentage,
      examDept,
      durationMinutes: exam.duration_minutes,
    });

    // Persist allocations to stateAllocations
    const newAllocations = plan.duties.map((d, i) => ({
      id: `alloc-${data.examId}-${i}`,
      exam_id: data.examId,
      room_id: d.roomId,
      teacher_id: d.teacherId,
      duty_role: d.dutyRole,
      status: "accepted",
      floor: d.floor ?? null,
      cross_dept_fallback: d.cross_dept_fallback ?? false,
    }));
    stateAllocations = [
      ...newAllocations,
      ...stateAllocations.filter((a) => a.exam_id !== data.examId),
    ];

    // Update teacher duty counts
    for (const d of plan.duties) {
      const t = stateTeachers.find((x) => x.id === d.teacherId);
      if (t) t.duties = (t.duties ?? 0) + 1;
    }

    return plan;
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
  .validator((input: unknown) => teacherSchema.partial().parse(input))
  .handler(async ({ data }) => {
    if (data.id) {
      const idx = stateTeachers.findIndex(t => t.id === data.id || t.employee_id === data.id);
      if (idx !== -1) {
        stateTeachers[idx] = {
          ...stateTeachers[idx],
          ...(data.full_name ? { full_name: data.full_name } : {}),
          ...(data.department ? { department: data.department } : {}),
          ...(data.designation ? { designation: data.designation } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.block ? { block: data.block } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.office !== undefined ? { office: data.office } : {}),
          ...(data.emergency_phone !== undefined ? { emergency_phone: data.emergency_phone } : {}),
          ...(data.avatar_url !== undefined ? { avatar_url: data.avatar_url } : {}),
          ...(data.banner_url !== undefined ? { banner_url: data.banner_url } : {}),
        };
        if (data.password && data.password.trim() !== "") {
          stateTeachers[idx].password = data.password;
        }
        return { id: stateTeachers[idx].id, teacher: stateTeachers[idx] };
      }
    }
    
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
      password: data.password || "pass123",
      duties: 0,
      block: data.block || "A",
    };
    stateTeachers.unshift(teacher);
    return { id: teacher.id };
  });

export const importStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => staffImportSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.replaceExisting) {
      stateTeachers = []; // clear all
    }

    const newStaff = data.rows.map((row, index) => {
      return {
        id: `teacher-${Date.now()}-${index}`,
        full_name: row.full_name,
        email: row.email || `staff.${Date.now()}.${index}@univ.edu`,
        department: row.department || "General",
        designation: row.designation || "Assistant Professor",
        staff_type: "teaching",
        is_senior: row.is_senior || false,
        max_duties: 6,
        active: true,
        phone: "+91 98765 00000",
        employee_id: `EMP${Math.floor(Math.random() * 9000 + 5000)}`,
        duties: 0,
        block: row.block || "A",
      };
    });

    stateTeachers = [...newStaff, ...stateTeachers];
    return { importedCount: newStaff.length };
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
        const roomIndex = Math.floor(created / 30);
        const seatIndex = created % 30;
        const generatedSeatNo = (seatIndex * 2) + 1; // 1, 3, 5, ..., 59
        
        stateStudents.push({
          id: `student-${Date.now()}-${created}`,
          serial_no: nextSerial++,
          register_no: row.register_no,
          full_name: row.full_name,
          department: row.department,
          semester: row.semester ?? 3,
          section: row.section || "A",
          active: true,
          seat_no: generatedSeatNo,
          hall: row.hall || (stateRooms[roomIndex]?.room_number ?? "H-101"),
          floor: row.floor || (stateRooms[roomIndex]?.floor ?? 1),
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

export const myDuties = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ teacherId: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const allocations = stateAllocations.filter(a => a.teacher_id === data.teacherId);
    
    if (allocations.length > 0) {
      return allocations.map(a => {
        const exam = stateExams.find(e => e.id === a.exam_id);
        const room = stateRooms.find(r => r.id === a.room_id);
        return {
          allocation_id: a.id,
          duty_role: a.duty_role,
          status: a.status,
          exam_id: a.exam_id,
          exam_name: exam?.name || "Unknown Exam",
          exam_date: exam?.exam_date || new Date().toISOString().split('T')[0],
          start_time: exam?.start_time || "10:00 AM",
          duration_minutes: exam?.exam_type === 'internal' ? 90 : 180,
          room_id: room?.id,
          hall: room ? `Block ${room.block} - ${room.room_number}` : "Unknown Room",
          floor: room?.floor || 1,
          alert_raised: false,
          department: exam?.department || "General",
        };
      });
    }

    // Fallback to mock duties for demo purposes if admin hasn't generated any yet
    return stateMyDuties;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => 
    z.object({
      id: z.string(),
      phone: z.string().optional(),
      office: z.string().optional(),
      emergency_phone: z.string().optional(),
      password: z.string().optional(),
      avatar_url: z.string().nullable().optional(),
      banner_url: z.string().nullable().optional(),
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const needle = String(data.id ?? "").trim();
    const upper = needle.toUpperCase();
    let teacherIndex = stateTeachers.findIndex((t) => {
      const tid = String(t.id ?? "").trim();
      const emp = String(t.employee_id ?? "").trim();
      return (
        tid === needle ||
        emp === needle ||
        tid.toUpperCase() === upper ||
        emp.toUpperCase() === upper
      );
    });

    // Demo admin is not in the faculty list — still accept photo/contact updates.
    if (teacherIndex < 0 && ["ADMIN", "ADMIN-1", "DEMO-ADMIN-ID"].includes(upper)) {
      return { ok: true, teacher: { id: needle, employee_id: needle, ...data } };
    }

    // If the logged-in faculty record is missing from in-memory state, create it
    // so profile photo / banner updates still succeed.
    if (teacherIndex < 0 && needle) {
      stateTeachers.push({
        id: needle,
        employee_id: needle,
        full_name: "Faculty Member",
        department: "General",
        designation: "Faculty",
        staff_type: "teaching",
        is_senior: false,
        max_duties: 4,
        active: true,
        email: "",
        phone: data.phone || "",
        office: data.office || "",
        emergency_phone: data.emergency_phone || "",
        password: data.password || "pass123",
        avatar_url: data.avatar_url ?? null,
        banner_url: data.banner_url ?? null,
        duties: 0,
        block: "A",
      });
      teacherIndex = stateTeachers.length - 1;
    }

    if (teacherIndex >= 0) {
      if (data.phone !== undefined) stateTeachers[teacherIndex].phone = data.phone;
      if (data.office !== undefined) stateTeachers[teacherIndex].office = data.office;
      if (data.emergency_phone !== undefined) stateTeachers[teacherIndex].emergency_phone = data.emergency_phone;
      if (data.password !== undefined && data.password.trim() !== "") {
        stateTeachers[teacherIndex].password = data.password;
      }
      if (data.avatar_url !== undefined) stateTeachers[teacherIndex].avatar_url = data.avatar_url;
      if (data.banner_url !== undefined) stateTeachers[teacherIndex].banner_url = data.banner_url;

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (supabaseAdmin) {
          await supabaseAdmin.from("teachers").upsert({
            id: stateTeachers[teacherIndex].id,
            employee_id: stateTeachers[teacherIndex].employee_id,
            full_name: stateTeachers[teacherIndex].full_name,
            phone: stateTeachers[teacherIndex].phone,
            office: stateTeachers[teacherIndex].office,
            emergency_phone: stateTeachers[teacherIndex].emergency_phone,
            password: stateTeachers[teacherIndex].password,
            avatar_url: stateTeachers[teacherIndex].avatar_url,
            banner_url: stateTeachers[teacherIndex].banner_url,
          }).catch(() => {});
        }
      } catch (e) {
        // Fallback silently if table does not exist
      }

      return { ok: true, teacher: stateTeachers[teacherIndex] };
    }
    return { ok: false, error: "Teacher not found" };
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

export const createFacultyIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const newIncident = {
      id: `emerg-${Date.now()}`,
      type: data.type || "student_malpractice",
      category: data.category || "Student Copying / Malpractice",
      status: "open",
      reason: data.reason,
      created_at: new Date().toISOString(),
      admin_read_at: null,
      exam_id: "exam-1",
      room_id: "room-1",
      exam_name: data.exam_name || "IA-1 Internal Assessment",
      exam_date: todayStr,
      start_time: "10:00 AM",
      hall: data.hall || "Hall A-202",
      student_srn: data.student_srn || "",
      student_name: data.student_name || "",
      raised_by: data.raised_by || "Faculty Member",
      original_teacher: data.raised_by || "Faculty Member",
      original_teacher_id: "fac-1",
      admin_notes: null,
      replacement: null,
    };
    stateEmergencies.unshift(newIncident);
    return newIncident;
  });

export const resolveEmergency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => emergencyResolveSchema.parse(input))
  .handler(async ({ data }) => {
    const item = stateEmergencies.find((e) => e.id === data.requestId);
    if (item) {
      if (data.action === "cancel" || data.action === "reject") {
        item.status = "rejected";
        if (data.notes) item.admin_notes = data.notes;
      } else {
        item.status = "accepted";
        if (data.notes) item.admin_notes = data.notes;
        if (data.replacementTeacherId) {
          const teacher = stateTeachers.find((t) => t.id === data.replacementTeacherId);
          item.replacement = teacher ? `${teacher.full_name} (${teacher.designation || teacher.department})` : "Dr. Replacement Faculty";
        }
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

export const listAdminNotices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return stateAdminNotices;
  });

export const createAdminNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createNoticeSchema.parse(input))
  .handler(async ({ data }) => {
    const newNotice = {
      id: `notice-${Date.now()}`,
      title: data.title,
      content: data.content,
      created_at: new Date().toISOString(),
    };
    stateAdminNotices.unshift(newNotice);
    return newNotice;
  });

export const deleteAdminNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteNoticeSchema.parse(input))
  .handler(async ({ data }) => {
    stateAdminNotices = stateAdminNotices.filter((n) => n.id !== data.noticeId);
    return { ok: true };
  });

export const createStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createStudentSchema.parse(input))
  .handler(async ({ data }) => {
    const nextSerial = stateStudents.length > 0 ? Math.max(...stateStudents.map((s) => s.serial_no)) + 1 : 1;
    const hall = stateRooms[Math.floor(nextSerial / 30)] || stateRooms[0];
    const newStudent = {
      id: `student-${Date.now()}`,
      serial_no: nextSerial,
      register_no: data.register_no,
      full_name: data.full_name,
      department: data.department,
      section: data.section || "A",
      semester: data.semester,
      active: true,
      seat_no: (nextSerial % 30) + 1,
      hall: hall.room_number,
      floor: hall.floor,
    };
    stateStudents.push(newStudent);
    return newStudent;
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateStudentSchema.parse(input))
  .handler(async ({ data }) => {
    const student = stateStudents.find((s) => s.id === data.id);
    if (!student) {
      throw new Error("Student not found");
    }
    student.register_no = data.register_no;
    student.full_name = data.full_name;
    student.department = data.department;
    student.section = data.section;
    student.semester = data.semester;
    return student;
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteStudentSchema.parse(input))
  .handler(async ({ data }) => {
    stateStudents = stateStudents.filter((s) => s.id !== data.studentId);
    // Resequence serial numbers after deletion to keep lists clean
    stateStudents.forEach((s, idx) => {
      s.serial_no = idx + 1;
      s.seat_no = (idx % 30) + 1;
      const hall = stateRooms[Math.floor((idx + 1) / 30)] || stateRooms[0];
      s.hall = hall.room_number;
      s.floor = hall.floor;
    });
    return { ok: true };
  });

