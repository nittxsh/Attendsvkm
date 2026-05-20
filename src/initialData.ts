import { User, Course, AttendanceSession, LeaveRequest } from "./types";

export const DEFAULT_USERS: User[] = [
  {
    uid: "teacher_turing",
    name: "Dr. Alan Turing",
    email: "alan.turing@college.edu",
    role: "teacher",
    department: "Computer Science",
    createdAt: new Date("2026-01-10").toISOString()
  },
  {
    uid: "teacher_curie",
    name: "Dr. Marie Curie",
    email: "marie.curie@college.edu",
    role: "teacher",
    department: "Physics & Astronomy",
    createdAt: new Date("2026-01-11").toISOString()
  },
  {
    uid: "student_neumann",
    name: "John von Neumann",
    email: "john.neumann@student.edu",
    role: "student",
    studentId: "CS-2026-001",
    department: "Computer Science",
    createdAt: new Date("2026-01-15").toISOString()
  },
  {
    uid: "student_hopper",
    name: "Grace Hopper",
    email: "grace.hopper@student.edu",
    role: "student",
    studentId: "CS-2026-002",
    department: "Computer Science",
    createdAt: new Date("2026-01-15").toISOString()
  },
  {
    uid: "student_lovelace",
    name: "Ada Lovelace",
    email: "ada.lovelace@student.edu",
    role: "student",
    studentId: "CS-2026-003",
    department: "Computer Science",
    createdAt: new Date("2026-01-15").toISOString()
  },
  {
    uid: "student_feynman",
    name: "Richard Feynman",
    email: "richard.feynman@student.edu",
    role: "student",
    studentId: "PHYS-2026-004",
    department: "Physics",
    createdAt: new Date("2026-01-15").toISOString()
  },
  {
    uid: "student_hawking",
    name: "Stephen Hawking",
    email: "stephen.hawking@student.edu",
    role: "student",
    studentId: "PHYS-2026-005",
    department: "Physics",
    createdAt: new Date("2026-01-15").toISOString()
  },
  {
    uid: "student_johnson",
    name: "Katherine Johnson",
    email: "katherine.johnson@student.edu",
    role: "student",
    studentId: "MATH-2026-006",
    department: "Mathematics",
    createdAt: new Date("2026-01-15").toISOString()
  }
];

export const DEFAULT_COURSES: Course[] = [
  {
    id: "course_cs101",
    code: "CS-101",
    name: "Introduction to Computer Systems & Algorithmic Design",
    department: "Computer Science",
    semester: "Semester 1",
    instructorId: "teacher_turing",
    studentIds: ["student_neumann", "student_hopper", "student_lovelace", "student_johnson"]
  },
  {
    id: "course_math202",
    code: "MATH-202",
    name: "Linear Algebra & Computational Mathematics",
    department: "Mathematics",
    semester: "Semester 3",
    instructorId: "teacher_turing",
    studentIds: ["student_neumann", "student_johnson", "student_hopper"]
  },
  {
    id: "course_phys103",
    code: "PHYS-103",
    name: "Quantum Mechanics & Statistical Physics I",
    department: "Physics",
    semester: "Semester 1",
    instructorId: "teacher_curie",
    studentIds: ["student_feynman", "student_hawking", "student_neumann"]
  }
];

export const DEFAULT_ATTENDANCE_SESSIONS: AttendanceSession[] = [
  {
    id: "session_cs1",
    courseId: "course_cs101",
    date: "2026-05-10",
    sessionName: "Lecture 1: Intro to Von Neumann Architecture",
    markedBy: "teacher_turing",
    records: {
      "student_neumann": "present",
      "student_hopper": "present",
      "student_lovelace": "present",
      "student_johnson": "present"
    },
    createdAt: new Date("2026-05-10T10:00:00Z").toISOString(),
    aiNotes: "All systems functional. Manual check matched 100% of physical classroom count."
  },
  {
    id: "session_cs2",
    courseId: "course_cs101",
    date: "2026-05-12",
    sessionName: "Lecture 2: Compiler Design Foundations",
    markedBy: "teacher_turing",
    records: {
      "student_neumann": "present",
      "student_hopper": "present",
      "student_lovelace": "absent",
      "student_johnson": "present"
    },
    createdAt: new Date("2026-05-12T10:00:00Z").toISOString()
  },
  {
    id: "session_cs3",
    courseId: "course_cs101",
    date: "2026-05-15",
    sessionName: "Lecture 3: Turing Computability & Decidability",
    markedBy: "teacher_turing",
    records: {
      "student_neumann": "present",
      "student_hopper": "late",
      "student_lovelace": "absent",
      "student_johnson": "absent"
    },
    createdAt: new Date("2026-05-15T10:00:00Z").toISOString(),
    aiNotes: "Teacher executed voice-scanning trigger. Hopper marked late due to 15-minute train delay notification."
  },
  {
    id: "session_phys1",
    courseId: "course_phys103",
    date: "2026-05-11",
    sessionName: "Lecture 1: Double-Slit Experiment",
    markedBy: "teacher_curie",
    records: {
      "student_feynman": "present",
      "student_hawking": "present",
      "student_neumann": "absent"
    },
    createdAt: new Date("2026-05-11T14:00:00Z").toISOString()
  },
  {
    id: "session_phys2",
    courseId: "course_phys103",
    date: "2026-05-14",
    sessionName: "Lecture 2: Photoelectric Effect Principles",
    markedBy: "teacher_curie",
    records: {
      "student_feynman": "present",
      "student_hawking": "absent",
      "student_neumann": "present"
    },
    createdAt: new Date("2026-05-14T14:00:00Z").toISOString()
  }
];

export const DEFAULT_LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "leave_feynman1",
    studentId: "student_feynman",
    studentName: "Richard Feynman",
    courseId: "course_phys103",
    courseName: "Quantum Mechanics & Statistical Physics I",
    startDate: "2026-05-19",
    endDate: "2026-05-20",
    reason: "Requested leave to attend the Solvay Physics Conference to present path-integral formulations.",
    status: "approved",
    notes: "Approved. Please coordinate lecture note recovery from Stephen.",
    createdAt: new Date("2026-05-18T08:00:00Z").toISOString()
  },
  {
    id: "leave_hawking1",
    studentId: "student_hawking",
    studentName: "Stephen Hawking",
    courseId: "course_phys103",
    courseName: "Quantum Mechanics & Statistical Physics I",
    startDate: "2026-05-21",
    endDate: "2026-05-22",
    reason: "Scheduled specialist hospital consultation.",
    status: "pending",
    createdAt: new Date("2026-05-19T09:12:00Z").toISOString()
  },
  {
    id: "leave_lovelace1",
    studentId: "student_lovelace",
    studentName: "Ada Lovelace",
    courseId: "course_cs101",
    courseName: "Introduction to Computer Systems & Algorithmic Design",
    startDate: "2026-05-22",
    endDate: "2026-05-22",
    reason: "Presenting Analytical Engine mechanics to board of regents.",
    status: "pending",
    createdAt: new Date("2026-05-20T10:30:00Z").toISOString()
  }
];
