import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || "https://nijohqvyjsqrgslafjbq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pam9ocXZ5anNxcmdzbGFmamJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyNTg3MCwiZXhwIjoyMDgzMjAxODcwfQ.5UBod3o6uikC7FQwvNU6dw9316mS3Nvvw4VifbbQCFI";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const firstNames = ["Aarav", "Aditi", "Amit", "Ananya", "Arjun", "Bhavya", "Chetan", "Dev", "Divya", "Esha", "Gautam", "Isha", "Kavya", "Karan", "Manish", "Neha", "Nikhil", "Pooja", "Priya", "Rahul", "Rohan", "Riya", "Sameer", "Shreya", "Siddharth", "Sneha", "Tanvi", "Varun", "Vikas", "Yash"];
const lastNames = ["Sharma", "Verma", "Patel", "Rao", "Singh", "Kumar", "Gupta", "Joshi", "Mehta", "Reddy", "Nair", "Deshmukh", "Choudhury", "Bhat", "Iyer", "Kulkarni", "Chawla", "Malhotra", "Saxena", "Kapoor"];
const departments = ["Computer Science", "Electrical", "Mechanical", "Civil", "Electronics", "Information Technology"];

async function seed() {
  console.log("Beginning Supabase database seeding...");

  // 1. Seed Rooms (40 rooms: 5 floors x 8 halls, 30 capacity each)
  console.log("Seeding 40 rooms...");
  const roomsData = [];
  for (let floor = 1; floor <= 5; floor++) {
    for (let hall = 1; hall <= 8; hall++) {
      const roomNum = `H-${floor}0${hall}`;
      roomsData.push({
        room_number: roomNum,
        floor: floor,
        block: `Block ${String.fromCharCode(65 + Math.floor((hall - 1) / 4))}`,
        capacity: 30,
        active: true,
      });
    }
  }

  const { data: rooms, error: roomErr } = await supabase.from('rooms').upsert(roomsData, { onConflict: 'room_number' }).select();
  if (roomErr) console.error("Room seed error:", roomErr.message);
  else console.log(`Seeded ${rooms?.length || 0} rooms.`);

  // 2. Seed 500 Students
  console.log("Seeding 500 students...");
  const studentsData = [];
  for (let i = 1; i <= 500; i++) {
    const fname = firstNames[i % firstNames.length];
    const lname = lastNames[(i * 3) % lastNames.length];
    const dept = departments[i % departments.length];
    const regNo = `2026${dept.substring(0, 2).toUpperCase()}${String(i).padStart(4, '0')}`;
    studentsData.push({
      serial_no: i,
      register_no: regNo,
      full_name: `${fname} ${lname}`,
      department: dept,
      semester: (i % 8) + 1,
      active: true
    });
  }

  // Batch insert students in chunks of 100
  for (let i = 0; i < studentsData.length; i += 100) {
    const chunk = studentsData.slice(i, i + 100);
    const { error: studErr } = await supabase.from('students').upsert(chunk, { onConflict: 'register_no' });
    if (studErr) console.error(`Student seed chunk ${i} error:`, studErr.message);
  }
  console.log("Seeded 500 students successfully.");

  // 3. Seed Teachers/Profiles (50 staff)
  console.log("Seeding 50 teachers/profiles...");
  const staffTypes = ["teaching", "teaching", "teaching", "non_teaching"];
  const designations = ["Professor", "Associate Professor", "Assistant Professor", "Lab Incharge", "Invigilator"];
  const profilesData = [];
  for (let i = 1; i <= 50; i++) {
    const fname = firstNames[(i * 7) % firstNames.length];
    const lname = lastNames[(i * 5) % lastNames.length];
    const dept = departments[i % departments.length];
    const staffType = staffTypes[i % staffTypes.length];
    const desig = designations[i % designations.length];
    profilesData.push({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      full_name: `Dr. ${fname} ${lname}`,
      department: dept,
      designation: desig,
      staff_type: staffType,
      is_senior: i % 3 === 0,
      max_duties: (i % 4) + 3,
      active: true,
      email: `${fname.toLowerCase()}.${lname.toLowerCase()}@univ.edu`,
      phone: `+91 98765 ${String(10000 + i).substring(1)}`,
      employee_id: `EMP${String(1000 + i)}`
    });
  }

  const { data: teachers, error: profErr } = await supabase.from('profiles').upsert(profilesData, { onConflict: 'id' }).select();
  if (profErr) console.error("Profiles seed error:", profErr.message);
  else console.log(`Seeded ${teachers?.length || 0} teachers/profiles.`);

  // 4. Seed Exams
  console.log("Seeding exams...");
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const nextMonthStr = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const examsData = [
    {
      name: "IA-1 Internal Assessment",
      exam_type: "internal",
      exam_date: todayStr,
      start_time: "10:00:00",
      duration_minutes: 90,
      reporting_minutes: 30
    },
    {
      name: "Midterm Examination 2026",
      exam_type: "internal",
      exam_date: nextWeekStr,
      start_time: "09:30:00",
      duration_minutes: 120,
      reporting_minutes: 30
    },
    {
      name: "End Semester Final Exams",
      exam_type: "semester",
      exam_date: nextMonthStr,
      start_time: "14:00:00",
      duration_minutes: 180,
      reporting_minutes: 45
    }
  ];

  const { data: exams, error: examErr } = await supabase.from('exams').upsert(examsData, { onConflict: 'name' }).select();
  if (examErr) console.error("Exam seed error:", examErr.message);
  else console.log(`Seeded ${exams?.length || 0} exams.`);

  // 5. Link Exam Rooms and Allocations if exams and rooms exist
  if (exams && exams.length > 0 && rooms && rooms.length > 0) {
    console.log("Seeding exam_rooms and allocations...");
    const examRoomsData = [];
    const allocationsData = [];

    for (const exam of exams) {
      // Allocate 10 rooms per exam
      const allocatedRooms = rooms.slice(0, 10);
      for (let rIdx = 0; rIdx < allocatedRooms.length; rIdx++) {
        const room = allocatedRooms[rIdx];
        examRoomsData.push({
          exam_id: exam.id,
          room_id: room.id,
          students_allocated: 30
        });

        // Allocate a teacher to this room
        if (teachers && teachers.length > rIdx) {
          allocationsData.push({
            exam_id: exam.id,
            room_id: room.id,
            teacher_id: teachers[rIdx].id,
            duty_role: rIdx % 5 === 0 ? "standby" : "primary",
            status: "accepted",
            published: true
          });
        }
      }
    }

    const { error: erErr } = await supabase.from('exam_rooms').upsert(examRoomsData);
    if (erErr) console.log("Exam rooms link:", erErr.message);

    const { error: allocErr } = await supabase.from('allocations').upsert(allocationsData);
    if (allocErr) console.log("Allocations link:", allocErr.message);
  }

  console.log("Database seeding finished!");
}

seed().catch(err => console.error("Seeding failed:", err));
