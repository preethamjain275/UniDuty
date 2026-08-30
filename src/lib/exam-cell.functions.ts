// @ts-nocheck
// =========================================================================
// EXAM CELL MODULES: Duties, Swap, Seating, Forms (A, B, Tenancy)
// =========================================================================
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStateStudents } from "./invigilation.functions";

const todayStr2 = new Date().toISOString().slice(0, 10);

// =========================================================================
// ALL FACULTY & TEACHERS DIRECTORY
// =========================================================================

export let stateFacultyTenancy = [
  { id: "fac-1", sl_no: 1, full_name: "Ms. Vinaya DS", department: "AI & DS", mobile: "7483020473", reporting_cell: "A-307", duties_dates: "8,11,13", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-2", sl_no: 2, full_name: "Mr. Kalaiah J B", department: "AI & DS", mobile: "8217529557", reporting_cell: "A-202", duties_dates: "11,13,18", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-3", sl_no: 3, full_name: "Mr. Iranna Amargol", department: "AI & DS", mobile: "9380199395", reporting_cell: "A-203", duties_dates: "11,13,18", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-4", sl_no: 4, full_name: "Mrs. Shashi Rekha G", department: "AI & DS", mobile: "7975627017", reporting_cell: "A-307", duties_dates: "8,11,13", duty_type: "Frisking Duty", role: "Frisking Officer" },
  { id: "fac-5", sl_no: 5, full_name: "Ms. Shailaja DS", department: "AI & DS", mobile: "8618435199", reporting_cell: "A-307", duties_dates: "8,11,13", duty_type: "Frisking Duty", role: "Frisking Officer" },
  { id: "fac-6", sl_no: 6, full_name: "Mr. Yogesh Gowda V", department: "AI & DS", mobile: "8197430414", reporting_cell: "1st Floor Squad", duties_dates: "6,8,18", duty_type: "Floor Squad", role: "Squad Member" },
  { id: "fac-7", sl_no: 7, full_name: "Ms. Usha M", department: "AI & DS", mobile: "8495078785", reporting_cell: "1st Floor Squad", duties_dates: "6,8,18", duty_type: "Floor Squad", role: "Squad Member" },
  { id: "fac-8", sl_no: 8, full_name: "Mrs. S Ramya", department: "AI & DS", mobile: "9944157661", reporting_cell: "2nd Floor Squad", duties_dates: "6,8,18", duty_type: "Floor Squad", role: "Squad Member" },
  { id: "fac-9", sl_no: 9, full_name: "Mr. Swamy M S", department: "AI & DS", mobile: "8088993317", reporting_cell: "2nd Floor Squad", duties_dates: "6,8,18", duty_type: "Floor Squad", role: "Squad Member" },
  { id: "fac-10", sl_no: 10, full_name: "Ms. Varalakshmi SS", department: "AI & DS", mobile: "9738758626", reporting_cell: "3rd Floor Squad", duties_dates: "6,8,18", duty_type: "Floor Squad", role: "Squad Member" },
  { id: "fac-11", sl_no: 11, full_name: "Ms. Kavya RS", department: "AI & DS", mobile: "7022128067", reporting_cell: "A-307", duties_dates: "6,18", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-12", sl_no: 12, full_name: "Dr. Aarav Sharma", department: "Computer Science", mobile: "9845012345", reporting_cell: "A-209", duties_dates: "8,13", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-13", sl_no: 13, full_name: "Dr. Amit Patel", department: "Electrical", mobile: "9845023456", reporting_cell: "A-210", duties_dates: "11,18", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-14", sl_no: 14, full_name: "Dr. Arjun Rao", department: "Electronics", mobile: "9845034567", reporting_cell: "A-212", duties_dates: "8,11", duty_type: "Room Invigilation", role: "Invigilator" },
  { id: "fac-15", sl_no: 15, full_name: "Dr. Bhavya Singh", department: "Mechanical", mobile: "9845045678", reporting_cell: "A-219", duties_dates: "13,18", duty_type: "Room Invigilation", role: "Invigilator" },
];

export const ROOMS2 = [
  { id: "room-1", room_number: "A202", floor: 2, block: "Block A", capacity: 30 },
  { id: "room-2", room_number: "A203", floor: 2, block: "Block A", capacity: 29 },
  { id: "room-3", room_number: "A209", floor: 2, block: "Block A", capacity: 30 },
  { id: "room-4", room_number: "A210", floor: 2, block: "Block A", capacity: 30 },
  { id: "room-5", room_number: "A212", floor: 2, block: "Block A", capacity: 30 },
  { id: "room-6", room_number: "A219", floor: 2, block: "Block A", capacity: 29 },
  { id: "room-7", room_number: "A225", floor: 2, block: "Block A", capacity: 30 },
  { id: "room-8", room_number: "A301", floor: 3, block: "Block A", capacity: 30 },
  { id: "room-9", room_number: "A303", floor: 3, block: "Block A", capacity: 29 },
  { id: "room-10", room_number: "A304", floor: 3, block: "Block A", capacity: 29 },
  { id: "room-11", room_number: "A307", floor: 3, block: "Block A", capacity: 30 },
  { id: "room-12", room_number: "A308", floor: 3, block: "Block A", capacity: 30 },
  { id: "room-13", room_number: "A310", floor: 3, block: "Block A", capacity: 30 },
  { id: "room-14", room_number: "A312", floor: 3, block: "Block A", capacity: 30 },
  { id: "room-15", room_number: "A401", floor: 4, block: "Block A", capacity: 30 },
];

export const EXAMS2 = [
  { id: "exam-1", name: "Mathematics II (25BEELY201)", exam_date: "2026-05-13", start_time: "01:45 PM", end_time: "03:15 PM", session: "Afternoon", term: "II - IA-I", ay: "AY - 2025-26", dept: "Department Of Computer Science and Engineering" },
  { id: "exam-2", name: "August 2026 Internal Assessment", exam_date: "2026-08-08", start_time: "01:30 PM", end_time: "04:30 PM", session: "Afternoon", term: "III - IA-I", ay: "AY - 2026-27", dept: "Department Of AI & DS" },
  { id: "exam-3", name: "August 2026 Semester Examination", exam_date: "2026-08-11", start_time: "01:30 PM", end_time: "04:30 PM", session: "Afternoon", term: "III - Semester", ay: "AY - 2026-27", dept: "Department Of Computer Science and Engineering" },
  { id: "exam-4", name: "August 2026 Backlog Examination", exam_date: "2026-08-13", start_time: "01:30 PM", end_time: "04:30 PM", session: "Afternoon", term: "II - Backlog", ay: "AY - 2026-27", dept: "Department Of Computer Science and Engineering" },
  { id: "exam-5", name: "August 2026 Theory Exam", exam_date: "2026-08-18", start_time: "01:30 PM", end_time: "04:30 PM", session: "Afternoon", term: "III - Theory", ay: "AY - 2026-27", dept: "Department Of AI & DS" },
];

// =========================================================================
// DUTIES STATE (Daily Rotating Room Allotment for All Teachers)
// =========================================================================

export let stateDuties: any[] = [
  { id: "duty-1", exam_id: "exam-1", exam_name: "Mathematics II (25BEELY201)", exam_date: "2026-05-13", session: "Afternoon", start_time: "01:45 PM", end_time: "03:15 PM", room_id: "room-1", room_number: "A202", floor: 2, teacher_id: "fac-1", teacher_name: "Ms. Vinaya DS", department: "AI & DS", reporting_time: "01:15 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-2", exam_id: "exam-1", exam_name: "Mathematics II (25BEELY201)", exam_date: "2026-05-13", session: "Afternoon", start_time: "01:45 PM", end_time: "03:15 PM", room_id: "room-2", room_number: "A203", floor: 2, teacher_id: "fac-2", teacher_name: "Mr. Kalaiah J B", department: "AI & DS", reporting_time: "01:15 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-3", exam_id: "exam-2", exam_name: "August 2026 Internal Assessment", exam_date: "2026-08-08", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-3", room_number: "A209", floor: 2, teacher_id: "fac-3", teacher_name: "Mr. Iranna Amargol", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-4", exam_id: "exam-2", exam_name: "August 2026 Internal Assessment", exam_date: "2026-08-08", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-4", room_number: "A210", floor: 2, teacher_id: "fac-4", teacher_name: "Mrs. Shashi Rekha G", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Frisking Duty", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-5", exam_id: "exam-2", exam_name: "August 2026 Internal Assessment", exam_date: "2026-08-08", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-5", room_number: "A212", floor: 2, teacher_id: "fac-5", teacher_name: "Ms. Shailaja DS", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Frisking Duty", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-6", exam_id: "exam-3", exam_name: "August 2026 Semester Examination", exam_date: "2026-08-11", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-6", room_number: "A219", floor: 2, teacher_id: "fac-6", teacher_name: "Mr. Yogesh Gowda V", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Floor Squad", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "accepted" },
  { id: "duty-7", exam_id: "exam-3", exam_name: "August 2026 Semester Examination", exam_date: "2026-08-11", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-7", room_number: "A225", floor: 2, teacher_id: "fac-7", teacher_name: "Ms. Usha M", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Floor Squad", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "accepted" },
  { id: "duty-8", exam_id: "exam-3", exam_name: "August 2026 Semester Examination", exam_date: "2026-08-11", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-8", room_number: "A301", floor: 3, teacher_id: "fac-8", teacher_name: "Mrs. S Ramya", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Floor Squad", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "accepted" },
  { id: "duty-9", exam_id: "exam-4", exam_name: "August 2026 Backlog Examination", exam_date: "2026-08-13", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-9", room_number: "A303", floor: 3, teacher_id: "fac-9", teacher_name: "Mr. Swamy M S", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Floor Squad", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-10", exam_id: "exam-4", exam_name: "August 2026 Backlog Examination", exam_date: "2026-08-13", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-10", room_number: "A304", floor: 3, teacher_id: "fac-10", teacher_name: "Ms. Varalakshmi SS", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Floor Squad", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-11", exam_id: "exam-5", exam_name: "August 2026 Theory Exam", exam_date: "2026-08-18", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-11", room_number: "A307", floor: 3, teacher_id: "fac-11", teacher_name: "Ms. Kavya RS", department: "AI & DS", reporting_time: "12:55 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-12", exam_id: "exam-5", exam_name: "August 2026 Theory Exam", exam_date: "2026-08-18", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-12", room_number: "A308", floor: 3, teacher_id: "fac-12", teacher_name: "Dr. Aarav Sharma", department: "Computer Science", reporting_time: "12:55 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-13", exam_id: "exam-5", exam_name: "August 2026 Theory Exam", exam_date: "2026-08-18", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-13", room_number: "A310", floor: 3, teacher_id: "fac-13", teacher_name: "Dr. Amit Patel", department: "Electrical", reporting_time: "12:55 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-14", exam_id: "exam-5", exam_name: "August 2026 Theory Exam", exam_date: "2026-08-18", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-14", room_number: "A312", floor: 3, teacher_id: "fac-14", teacher_name: "Dr. Arjun Rao", department: "Electronics", reporting_time: "12:55 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
  { id: "duty-15", exam_id: "exam-5", exam_name: "August 2026 Theory Exam", exam_date: "2026-08-18", session: "Afternoon", start_time: "01:30 PM", end_time: "04:30 PM", room_id: "room-15", room_number: "A401", floor: 4, teacher_id: "fac-15", teacher_name: "Dr. Bhavya Singh", department: "Mechanical", reporting_time: "12:55 PM", duty_role: "Room Invigilation", booklets_issued: null, booklets_used: null, booklets_returned: null, status: "assigned" },
];

function computeDutyGaps(duties: any[]) {
  return duties.map((duty) => {
    const facultyDuties = duties
      .filter((d) => d.teacher_id === duty.teacher_id && d.id !== duty.id)
      .map((d) => new Date(d.exam_date).getTime());
    const currentDate = new Date(duty.exam_date).getTime();
    const hasTightGap = facultyDuties.some((t) => {
      const diffDays = Math.abs(currentDate - t) / (1000 * 3600 * 24);
      return diffDays > 0 && diffDays < 2;
    });
    return { ...duty, gap_warning: hasTightGap };
  });
}

// =========================================================================
// SWAP STATE
// =========================================================================

export let stateSwapRequests: any[] = [
  {
    id: "swap-1",
    requester_id: "fac-1", requester_name: "Ms. Vinaya DS", requester_dept: "AI & DS",
    target_id: "fac-2", target_name: "Mr. Kalaiah J B", target_dept: "AI & DS",
    duty_id: "duty-1", exam_name: "Mathematics II (25BEELY201)", exam_date: "2026-05-13",
    room_number: "A202", session: "Afternoon",
    reason: "Attending university conference presentation", remarks: "Please approve swap",
    status: "pending", target_response: null, admin_remarks: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

// =========================================================================
// SEATING STATE (Official Institutional PDF Format Data)
// =========================================================================

export const OFFICIAL_PDF_SEATING = [
  { room_number: "A202", capacity: 30, srn_list: "25SUUBECS0001, 0002, 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0011, 0012, 0013, 0014, 0015, 0016, 0017, 0018, 0019, 0020, 0021, 0022, 0023, 0024, 0025, 0026, 0027, 0029, 0030, 0031" },
  { room_number: "A203", capacity: 29, srn_list: "25SUUBECS0032, 0033, 0034, 0035, 0036, 0037, 0038, 0039, 0040, 0041, 0042, 0043, 0044, 0045, 0046, 0047, 0048, 0049, 0050, 0051, 0052, 0053, 0054, 0055, 0056, 0057, 0058, 0059, 24SUUBECS0534" },
  { room_number: "A209", capacity: 30, srn_list: "25SUUBECS0060, 0061, 0062, 0063, 0064, 0065, 0066, 0067, 0068, 0069, 0070, 0071, 0072, 0073, 0074, 0075, 0076, 0077, 0078, 0079, 0080, 0081, 0082, 0083, 0084, 0085, 0086, 0087, 0088, 0089" },
  { room_number: "A210", capacity: 30, srn_list: "25SUUBECS0090, 0091, 0092, 0093, 0094, 0095, 0096, 0097, 0099, 0100, 0101, 0102, 0103, 0104, 0105, 0106, 0107, 0108, 0109, 0110, 0111, 0112, 0113, 0114, 0115, 0116, 0117, 0118, 0119, 24SUUBECS1057" },
  { room_number: "A212", capacity: 30, srn_list: "25SUUBECS0120, 0121, 0122, 0123, 0124, 0125, 0126, 0127, 0128, 0129, 0130, 0131, 0132, 0133, 0134, 0135, 0136, 0137, 0138, 0139, 0140, 0141, 0142, 0143, 0144, 0145, 0146, 0147, 0148, 0149" },
  { room_number: "A219", capacity: 29, srn_list: "25SUUBECS0150, 0151, 0152, 0153, 0154, 0155, 0156, 0157, 0158, 0159, 0161, 0162, 0163, 0164, 0165, 0166, 0167, 0168, 0169, 0171, 0172, 0173, 0174, 0175, 0176, 0177, 0178, 0179, 0180" },
  { room_number: "A225", capacity: 30, srn_list: "25SUUBECS0181, 0182, 0183, 0184, 0185, 0186, 0187, 0188, 0189, 0190, 0191, 0192, 0193, 0194, 0195, 0196, 0197, 0198, 0199, 0200, 0201, 0202, 0203, 0204, 0205, 0206, 0207, 0208, 0209, 0210" },
  { room_number: "A301", capacity: 30, srn_list: "25SUUBECS0211, 0212, 0213, 0214, 0215, 0216, 0217, 0218, 0219, 0220, 0221, 0222, 0223, 0224, 0225, 0226, 0227, 0228, 0229, 0230, 0231, 0232, 0233, 0234, 0235, 0236, 0237, 0238, 0239, 24SUUBECS1287" },
  { room_number: "A303", capacity: 29, srn_list: "25SUUBECS0240, 0241, 0242, 0243, 0244, 0245, 0246, 0247, 0248, 0249, 0250, 0251, 0252, 0253, 0254, 0255, 0256, 0257, 0258, 0259, 0260, 0261, 0262, 0263, 0264, 0265, 0266, 0267, 0268" },
  { room_number: "A304", capacity: 29, srn_list: "25SUUBECS0270, 0271, 0272, 0273, 0274, 0275, 0276, 0277, 0278, 0279, 0280, 0281, 0282, 0283, 0284, 0285, 0286, 0288, 0289, 0290, 0291, 0293, 0294, 0295, 0296, 0297, 0298, 0299, 0300" },
  { room_number: "A308", capacity: 30, srn_list: "25SUUBECS0301, 0302, 0303, 0304, 0305, 0306, 0307, 0308, 0309, 0310, 0311, 0312, 0313, 0314, 0315, 0316, 0317, 0318, 0319, 0320, 0321, 0322, 0323, 0324, 0325, 0326, 0327, 0328, 0329, 0330" },
  { room_number: "A310", capacity: 30, srn_list: "25SUUBECS0331, 0332, 0333, 0334, 0335, 0336, 0337, 0338, 0339, 0340, 0341, 0342, 0343, 0344, 0345, 0346, 0347, 0348, 0349, 0350, 0351, 0352, 0353, 0354, 0355, 0356, 0357, 0358, 0359, 0360" },
  { room_number: "A312", capacity: 30, srn_list: "25SUUBECS0361, 0362, 0363, 0364, 0365, 0366, 0367, 0368, 0369, 0370, 0371, 0372, 0373, 0374, 0375, 0376, 0377, 0378, 0379, 0380, 0381, 0382, 0383, 0384, 0385, 0386, 0387, 0388, 0389, 0390" },
  { room_number: "A319", capacity: 30, srn_list: "25SUUBECS0391, 0392, 0393, 0394, 0395, 0396, 0397, 0398, 0399, 0400, 0401, 0402, 0403, 0404, 0405, 0406, 0407, 0408, 0409, 0410, 0411, 0412, 0413, 0414, 0415, 0416, 0417, 0418, 0419, 0420" },
  { room_number: "A325", capacity: 30, srn_list: "25SUUBECS0421, 0422, 0423, 0424, 0425, 0426, 0427, 0428, 0429, 0430, 0431, 0432, 0433, 0434, 0435, 0436, 0437, 0438, 0439, 0440, 0441, 0442, 0443, 0444, 0445, 0446, 0447, 0448, 0449, 0450" },
  { room_number: "A401", capacity: 30, srn_list: "25SUUBECS0451, 0452, 0453, 0454, 0455, 0456, 0457, 0458, 0459, 0460, 0461, 0462, 0463, 0464, 0465, 0466, 0467, 0468, 0469, 0470, 0471, 0472, 0473, 0474, 0475, 0476, 0477, 0478, 0479, 0480" },
];

const STUDENT_NAMES_POOL = [
  "Aarav Sharma", "Aditi Roy", "Ananya Bhat", "Bhavya Singh", "Chetan Kumar",
  "Deepika P", "Divya N", "Gautam V", "Harshita M", "Kavya R",
  "Manjunath K", "Nikhil S", "Pooja G", "Rahul M", "Rohan S",
  "Sanjana P", "Shreya R", "Siddharth N", "Spoorthi V", "Tarun K",
  "Varun M", "Yashwanth B", "Abhinav R", "Bhumika T", "Chandan S",
  "Dhanush K", "Esha M", "Farhan A", "Gowri P", "Hemant L"
];

export let stateSeating: any[] = [];

export function buildSeatingRows() {
  const currentStudents = getStateStudents();

  return OFFICIAL_PDF_SEATING.map((item, rIdx) => {
    const hallMatch = currentStudents.filter(
      (s: any) => s.hall === item.room_number || s.hall === `Block A-H-${item.room_number}`
    );

    const slice = hallMatch.length >= 5
      ? hallMatch
      : currentStudents.slice(rIdx * 30, (rIdx + 1) * 30);

    const invig = stateFacultyTenancy[rIdx % stateFacultyTenancy.length];

    const mappedStudents = slice.map((st: any, idx: number) => ({
      sr_no: idx + 1,
      srn: st.register_no,
      name: st.full_name,
      department: st.department || "CSE",
      booklet_no: st.booklet_no ?? `BK${String(rIdx * 30 + idx + 1).padStart(4, "0")}`,
      presence: st.presence || "present",
    }));

    const srnListFormatted = mappedStudents.map((st: any) => st.srn).join(", ");

    return {
      id: `seating-${item.room_number}`,
      exam_id: "exam-1",
      exam_name: "Mathematics II (25BEELY201)",
      exam_date: "2026-05-13",
      session: "Afternoon",
      room_number: item.room_number,
      capacity: item.capacity,
      seated: mappedStudents.length,
      invigilator_name: invig.full_name,
      invigilator_dept: invig.department,
      srn_list_formatted: srnListFormatted || item.srn_list,
      students: mappedStudents,
    };
  });
}

// =========================================================================
// SERVER FUNCTIONS — DUTIES & SCHEDULE
// =========================================================================

export const listDuties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => computeDutyGaps(stateDuties));

export const createDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const exam = EXAMS2.find((e) => e.id === data.exam_id) ?? EXAMS2[0];
    const teacher = stateFacultyTenancy.find((t) => t.id === data.teacher_id) ?? stateFacultyTenancy[0];
    const newDuty = {
      id: `duty-${Date.now()}`,
      exam_id: data.exam_id, exam_name: exam.name,
      exam_date: data.exam_date ?? exam.exam_date,
      session: data.session ?? "Afternoon",
      start_time: data.start_time ?? "01:30 PM",
      end_time: data.end_time ?? "04:30 PM",
      room_id: `room-${Date.now()}`, room_number: data.room_number ?? "A202",
      floor: Number(data.floor ?? 2),
      teacher_id: data.teacher_id, teacher_name: teacher.full_name,
      department: teacher.department,
      reporting_time: data.reporting_time ?? "12:55 PM",
      duty_role: data.duty_role ?? "Room Invigilation",
      booklets_issued: null,
      booklets_used: null,
      booklets_returned: null,
      status: "assigned",
      created_at: new Date().toISOString(),
    };
    stateDuties.unshift(newDuty);
    return { id: newDuty.id, ok: true };
  });

export const updateDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const d = stateDuties.find((item) => item.id === data.dutyId);
    if (d) {
      if (data.room_number) d.room_number = data.room_number;
      if (data.teacher_id) {
        const t = stateFacultyTenancy.find((fac) => fac.id === data.teacher_id);
        if (t) {
          d.teacher_id = t.id;
          d.teacher_name = t.full_name;
          d.department = t.department;
        }
      }
      if (data.duty_role) d.duty_role = data.duty_role;
      if (data.booklets_issued !== undefined) d.booklets_issued = data.booklets_issued ? Number(data.booklets_issued) : null;
      if (data.booklets_used !== undefined) d.booklets_used = data.booklets_used ? Number(data.booklets_used) : null;
      if (data.booklets_returned !== undefined) d.booklets_returned = data.booklets_returned ? Number(data.booklets_returned) : null;
    }
    return { ok: true };
  });

export const deleteDuty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    stateDuties = stateDuties.filter((d) => d.id !== data.dutyId);
    return { ok: true };
  });

// =========================================================================
// SERVER FUNCTIONS — SWAP REQUESTS
// =========================================================================

export const listSwapRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => stateSwapRequests);

export const createSwapRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const duty = stateDuties.find((d) => d.id === data.duty_id) ?? stateDuties[0];
    const requester = stateFacultyTenancy.find((t) => t.id === data.requester_id) ?? stateFacultyTenancy[0];
    const target = stateFacultyTenancy.find((t) => t.id === data.target_id) ?? stateFacultyTenancy[1];
    const newReq = {
      id: `swap-${Date.now()}`,
      requester_id: data.requester_id, requester_name: requester.full_name,
      requester_dept: requester.department,
      target_id: data.target_id, target_name: target.full_name,
      target_dept: target.department,
      duty_id: data.duty_id, exam_name: duty.exam_name,
      exam_date: duty.exam_date, room_number: duty.room_number,
      session: duty.session,
      reason: data.reason, remarks: data.remarks ?? "",
      status: "pending", target_response: null, admin_remarks: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    stateSwapRequests.unshift(newReq);
    return { id: newReq.id, ok: true };
  });

export const respondToSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const req = stateSwapRequests.find((r) => r.id === data.requestId);
    if (req) {
      req.target_response = data.response;
      req.status = data.response === "accept" ? "target_accepted" : "target_rejected";
      req.updated_at = new Date().toISOString();
    }
    return { ok: true };
  });

export const adminReviewSwap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const req = stateSwapRequests.find((r) => r.id === data.requestId);
    if (req) {
      req.status = data.action === "approve" ? "approved" : "rejected";
      req.admin_remarks = data.remarks ?? null;
      req.updated_at = new Date().toISOString();
      if (data.action === "approve") {
        const duty = stateDuties.find((d) => d.id === req.duty_id);
        if (duty) {
          duty.teacher_id = req.target_id;
          duty.teacher_name = req.target_name;
          duty.department = req.target_dept;
        }
      }
    }
    return { ok: true };
  });

// =========================================================================
// SERVER FUNCTIONS — TENANCY FORM & FACULTY DIRECTORY
// =========================================================================

export const getTenancyDirectory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      monthYear: "August - 2026",
      timings: "1.30PM-4.30PM | 12.55PM-1.45PM Reporting",
      duties: stateFacultyTenancy,
    };
  });

export const updateTenancyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const fac = stateFacultyTenancy.find((f) => f.id === data.facultyId);
    if (fac) {
      if (data.mobile) fac.mobile = data.mobile;
      if (data.reporting_cell) fac.reporting_cell = data.reporting_cell;
      if (data.duties_dates) fac.duties_dates = data.duties_dates;
      if (data.duty_type) fac.duty_type = data.duty_type;
    }
    return { ok: true };
  });

// =========================================================================
// SERVER FUNCTIONS — A FORM & B FORM (Admin Only with Add/Edit/Delete)
// =========================================================================

export const getAFormData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const selectedFloor = data?.floor ?? "all";
    let filteredDuties = stateDuties;
    if (selectedFloor !== "all") {
      filteredDuties = stateDuties.filter((d) => String(d.floor) === String(selectedFloor));
    }

    return {
      institutionHeader: "SNPSU",
      universityName: "Sapthagiri NPS University",
      formTitle: "A-Form — Invigilators & Faculty Inside Exam Cell",
      subtitle: selectedFloor === "all" ? "for all floors" : `floor wise (${selectedFloor}${selectedFloor === "1" ? "st" : selectedFloor === "2" ? "nd" : "rd"} Floor)`,
      selectedFloor,
      rows: filteredDuties.map((d, idx) => ({
        id: d.id,
        sl_no: idx + 1,
        floor: d.floor ?? 2,
        room_no: d.room_number,
        faculty_name: d.teacher_name,
        teacher_id: d.teacher_id,
        booklets_issued: d.booklets_issued ?? "", // Blank space for manual entry
        signature: "",
        booklets_used: d.booklets_used ?? "",     // Blank space for manual entry
        booklets_returned: d.booklets_returned ?? "", // Blank space for manual entry
        remarks: d.duty_role ?? "",
        presence: d.presence ?? "present",
      })),
    };
  });

export const updateAFRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const d = stateDuties.find((item) => item.id === data.dutyId);
    if (d) {
      if (data.room_no) d.room_number = data.room_no;
      if (data.floor) d.floor = Number(data.floor);
      if (data.faculty_name) d.teacher_name = data.faculty_name;
      if (data.booklets_issued !== undefined) d.booklets_issued = data.booklets_issued;
      if (data.booklets_used !== undefined) d.booklets_used = data.booklets_used;
      if (data.booklets_returned !== undefined) d.booklets_returned = data.booklets_returned;
      if (data.remarks) d.duty_role = data.remarks;
      if (data.presence !== undefined) d.presence = data.presence;
    }
    return { ok: true };
  });

export const getBFormData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    const seatingList = buildSeatingRows();
    
    // Preserve presence state if already set in stateSeating
    if (stateSeating.length > 0) {
      for (const room of seatingList) {
        const oldRoom = stateSeating.find((r: any) => r.room_number === room.room_number);
        if (oldRoom) {
          for (const st of room.students) {
            const oldSt = oldRoom.students.find((s: any) => s.srn === st.srn);
            if (oldSt) {
              if (oldSt.presence) st.presence = oldSt.presence;
              if (oldSt.booklet_no) st.booklet_no = oldSt.booklet_no;
            }
          }
        }
      }
    }
    stateSeating = seatingList;

    const roomSeating = seatingList.find(
      (s: any) => s.room_number === data?.roomNumber || s.id === data?.seatingId
    ) ?? seatingList[0];

    const totalCount = roomSeating.students.length;
    const absenteesCount = roomSeating.students.filter((st: any) => st.presence === "absent").length;
    const presentCount = totalCount - absenteesCount;

    return {
      formTitle: "B-forms — individual Rooms (only for exams)",
      room_no: roomSeating.room_number,
      exam_name: roomSeating.exam_name,
      exam_date: roomSeating.exam_date,
      session: roomSeating.session,
      invigilator_name: roomSeating.invigilator_name,
      students: roomSeating.students,
      total_count: totalCount,
      absentees_count: absenteesCount,
      present_count: presentCount,
    };
  });

export const updateBStudentPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    if (stateSeating.length === 0) stateSeating = buildSeatingRows();
    const roomSeating = stateSeating.find(
      (s: any) => s.room_number === data?.roomNumber
    );
    if (roomSeating && roomSeating.students) {
      const student = roomSeating.students.find(
        (st: any) => st.srn === data.studentSrn || st.sr_no === data.studentSrNo
      );
      if (student) {
        student.presence = data.presence;
      }
    }
    const currentStudents = getStateStudents();
    const stInState = currentStudents.find((s: any) => s.register_no === data.studentSrn);
    if (stInState) {
      stInState.presence = data.presence;
    }
    return { ok: true };
  });

export const updateBStudentBooklet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    if (stateSeating.length === 0) stateSeating = buildSeatingRows();
    const roomSeating = stateSeating.find(
      (s: any) => s.room_number === data?.roomNumber
    );
    if (roomSeating && roomSeating.students) {
      const student = roomSeating.students.find(
        (st: any) => st.srn === data.studentSrn || st.sr_no === data.studentSrNo
      );
      if (student) {
        student.booklet_no = data.bookletNo;
      }
    }
    const currentStudents = getStateStudents();
    const stInState = currentStudents.find((s: any) => s.register_no === data.studentSrn);
    if (stInState) {
      stInState.booklet_no = data.bookletNo;
    }
    return { ok: true };
  });

export const listSeatingArrangements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const seatingList = buildSeatingRows();
    if (stateSeating.length > 0) {
      for (const room of seatingList) {
        const oldRoom = stateSeating.find((r: any) => r.room_number === room.room_number);
        if (oldRoom) {
          for (const st of room.students) {
            const oldSt = oldRoom.students.find((s: any) => s.srn === st.srn);
            if (oldSt && oldSt.presence) {
              st.presence = oldSt.presence;
            }
          }
        }
      }
    }
    stateSeating = seatingList;
    return stateSeating;
  });

export const generateSeating = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data }: any) => {
    // Shuffle faculty assignments across rooms on every regenerate
    const shuffledFaculty = [...stateFacultyTenancy].sort(() => Math.random() - 0.5);
    stateSeating = OFFICIAL_PDF_SEATING.map((item, rIdx) => {
      const srnArray = item.srn_list.split(",").map((s) => s.trim());
      const invig = shuffledFaculty[rIdx % shuffledFaculty.length];
      return {
        id: `seating-${item.room_number}`,
        exam_id: "exam-1",
        exam_name: "Mathematics II (25BEELY201)",
        exam_date: "2026-05-13",
        session: "Afternoon",
        room_number: item.room_number,
        capacity: item.capacity,
        seated: srnArray.length,
        invigilator_name: invig.full_name,
        invigilator_dept: invig.department,
        srn_list_formatted: item.srn_list,
        students: srnArray.map((srn, idx) => ({
          sr_no: idx + 1,
          srn: srn.startsWith("25") || srn.startsWith("24") ? srn : `25SUUBECS${srn}`,
          name: `Student ${idx + 1}`,
          department: "CSE",
          booklet_no: `BK${String(rIdx * 30 + idx + 1).padStart(4, "0")}`,
          present: true,
        })),
      };
    });
    return { generated: stateSeating.length, ok: true };
  });
