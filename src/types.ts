/**
 * College Attendance Management Shared Types and Interfaces
 */

export type UserRole = "teacher" | "student";

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string; // Roll number e.g. "SD-2026-089"
  department?: string; // e.g. "Computer Science"
  createdAt: string;
}

export interface Course {
  id: string;
  code: string; // e.g. "CS101", "MATH202"
  name: string; // e.g. "Introduction to Computer Science"
  department: string;
  semester: string; // e.g. "Semester 3"
  instructorId: string; // teacher uid
  studentIds: string[]; // uids of students enrolled
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceSession {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  sessionName: string; // e.g. "Lecture 4 - Databases"
  markedBy: string; // teacher uid
  records: Record<string, AttendanceStatus>; // maps student uid -> attendance status
  aiNotes?: string; // Notes parsed by AI image/logger scanner
  createdAt: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  notes?: string; // reviewer's feedack
  createdAt: string;
}

// AI Analysis and Insights response
export interface RiskStudentAnalysis {
  name: string;
  studentId: string;
  attendanceRate: number;
  explanation: string;
  parentWarningDraft: string;
}

export interface AIInsightsResponse {
  riskStudents: RiskStudentAnalysis[];
  classSummary: string;
  teacherActionSteps: string[];
  isSimulated?: boolean;
}
