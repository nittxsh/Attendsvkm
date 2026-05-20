/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { dbService } from "./lib/db";
import { User, Course, AttendanceSession, LeaveRequest, AttendanceStatus, UserRole } from "./types";
import { DEFAULT_USERS } from "./initialData";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import FigmaPromptCard from "./components/FigmaPromptCard";
import { 
  Building2, 
  Users, 
  Database, 
  Sparkles, 
  RotateCcw,
  BookOpen,
  CalendarCheck2,
  CheckCircle,
  HelpCircle,
  HelpCircle as QuestionIcon
} from "lucide-react";

export default function App() {
  // Sandbox persona switcher states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>("teacher");
  const [loading, setLoading] = useState(true);

  // Status banner states
  const [dbMode, setDbMode] = useState<"Cloud (Firebase)" | "Sandbox LocalStorage">("Sandbox LocalStorage");

  // Load and refresh state registries
  const loadRegistries = async () => {
    try {
      const isCloud = dbService.isCloud();
      setDbMode(isCloud ? "Cloud (Firebase)" : "Sandbox LocalStorage");

      // Obtain users profiles
      const teachers = await dbService.getAllUsersByRole("teacher");
      const students = await dbService.getAllUsersByRole("student");
      const allUsers = [...teachers, ...students];
      setAvailableUsers(allUsers);

      // Set initial active profile for simulation
      if (allUsers.length > 0 && !currentUser) {
        // Default initially to Dr Alan Turing
        const defaultProf = allUsers.find(u => u.uid === "teacher_turing");
        setCurrentUser(defaultProf || allUsers[0]);
        setCurrentRole(defaultProf ? "teacher" : allUsers[0].role);
      }

      // Obtain courses
      const loadedCourses = await dbService.getCourses();
      setCourses(loadedCourses);

      // Obtain attendance sessions
      const loadedSessions = await dbService.getAttendanceSessions();
      // sort latest sessions first
      setSessions(loadedSessions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

      // Obtain Leave requests
      const loadedLeaves = await dbService.getLeaveRequests();
      setLeaveRequests(loadedLeaves);

    } catch (err) {
      console.error("Failed to fetch initial college registries dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistries();
  }, []);

  // Sync profile when profile picker is switched
  const handleUserProfileSwitch = (userId: string) => {
    const selected = availableUsers.find(u => u.uid === userId);
    if (selected) {
      setCurrentUser(selected);
      setCurrentRole(selected.role);
    }
  };

  // 1. MARK DAILY ATTENDANCE (Teacher flow)
  const handleMarkAttendance = async (
    courseId: string, 
    date: string, 
    sessionName: string, 
    records: Record<string, AttendanceStatus>
  ) => {
    if (!currentUser) return;

    const newSession: AttendanceSession = {
      id: "session_" + Math.random().toString(36).substring(3, 11),
      courseId,
      date,
      sessionName,
      markedBy: currentUser.uid,
      records,
      createdAt: new Date().toISOString()
    };

    await dbService.saveAttendanceSession(newSession);
    await loadRegistries();
  };

  // 2. SUBMIT LEAVE APPLICATION (Student flow)
  const handleApplyLeave = async (
    courseId: string, 
    startDate: string, 
    endDate: string, 
    reason: string
  ) => {
    if (!currentUser) return;
    const matchingCourse = courses.find(c => c.id === courseId);

    const newRequest: LeaveRequest = {
      id: "leave_" + Math.random().toString(36).substring(3, 11),
      studentId: currentUser.uid,
      studentName: currentUser.name,
      courseId,
      courseName: matchingCourse ? `${matchingCourse.code} — ${matchingCourse.name}` : "Unknown Course",
      startDate,
      endDate,
      reason,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    await dbService.saveLeaveRequest(newRequest);
    await loadRegistries();
  };

  // 3. CANCEL SICK LEAVE REQUEST (Student flow)
  const handleCancelLeave = async (leaveId: string) => {
    const matching = leaveRequests.find(l => l.id === leaveId);
    if (matching && matching.status === "pending") {
      // For local storage, delete directly. In firestore, set status deleted or remove.
      // Simply filter and save
      const leftLeaves = leaveRequests.filter(l => l.id !== leaveId);
      // Save remains
      localStorage.setItem("colg_attn_leaveRequests", JSON.stringify(leftLeaves));
      await loadRegistries();
    }
  };

  // 4. APPROVE OR REJECT SICK LEAVE (Teacher flow)
  const handleApproveLeave = async (leaveId: string, status: "approved" | "rejected", notes: string) => {
    const currentReq = leaveRequests.find(r => r.id === leaveId);
    if (!currentReq) return;

    const updated: LeaveRequest = {
      ...currentReq,
      status,
      notes
    };

    await dbService.saveLeaveRequest(updated);

    // AI Super feature: If approved, automatically update the matching attendance check logs to mark present/excused!
    if (status === "approved" && sessions.length > 0) {
      // Find matching course sessions that fall within the sick leave startDate & endDate range
      const sessionDateStart = new Date(currentReq.startDate);
      const sessionDateEnd = new Date(currentReq.endDate);

      for (const ses of sessions) {
        if (ses.courseId === currentReq.courseId) {
          const sesDate = new Date(ses.date);
          if (sesDate >= sessionDateStart && sesDate <= sessionDateEnd) {
            // Update student records to present
            const updatedRecords = { ...ses.records, [currentReq.studentId]: "present" as AttendanceStatus };
            await dbService.saveAttendanceSession({
              ...ses,
              records: updatedRecords,
              aiNotes: (ses.aiNotes || "") + ` [Auto approved due to Sick Leave #${leaveId.substr(0,5)}]`
            });
          }
        }
      }
    }

    await loadRegistries();
  };

  // 5. COURSE GENERATION CLASS DESIGNER (Teacher flow)
  const handleCreateCourse = async (code: string, name: string, department: string, semester: string) => {
    if (!currentUser) return;

    // Pick 3-4 random student profiles from available lists to enroll them to the course
    const allStudents = availableUsers.filter(u => u.role === "student");
    const shuffled = [...allStudents].sort(() => 0.5 - Math.random());
    const randomEnrolledStudentIds = shuffled.slice(0, 4).map(s => s.uid);

    const newCourse: Course = {
      id: "course_" + Math.random().toString(36).substring(3, 11),
      code,
      name,
      department,
      semester,
      instructorId: currentUser.uid,
      studentIds: randomEnrolledStudentIds
    };

    await dbService.saveCourse(newCourse);
    await loadRegistries();
  };

  // State reset to defaults for sandbox
  const handleResetSandbox = () => {
    if (confirm("Are you sure you want to reset all data simulation back to factory default?")) {
      dbService.resetToDefaults();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <span className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin inline-block" />
          <p className="text-xs text-slate-500 font-mono">Initializing college academic registries database files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      
      {/* Platform Banner Alert */}
      <div className="bg-brand-primary text-slate-350 text-[10px] py-2 px-4 border-b border-slate-800 text-center flex flex-col md:flex-row items-center justify-center gap-2 tracking-wide font-mono z-50">
        <span className="flex items-center gap-1.5 justify-center">
          <Database className="w-3.5 h-3.5 text-sky-400" /> Connection Status: 
          <span className="text-white font-bold">{dbMode}</span>
        </span>
        <span className="hidden md:inline text-slate-500">•</span>
        <span className="text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> AI Systems Ready via Gemini 3.5 Flash
        </span>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* College Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-900 text-white rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none flex items-center gap-1">
                E-Colg Attendance AI
              </h1>
              <span className="text-[10px] text-slate-500 font-medium">College Management & AI Roll-Call Portal</span>
            </div>
          </div>

          {/* Persona Swapping Dropdown Dashboard Simulator */}
          <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-1 shrink-0 px-1">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Sandbox Profile Simulator:
              </label>
            </div>
            <select
              value={currentUser?.uid || ""}
              onChange={(e) => handleUserProfileSwitch(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
            >
              <optgroup label="Professors (Teachers)">
                {availableUsers.filter(u => u.role === "teacher").map(u => (
                  <option key={u.uid} value={u.uid}>{u.name} (Dr. Board)</option>
                ))}
              </optgroup>
              <optgroup label="Academic Students">
                {availableUsers.filter(u => u.role === "student").map(u => (
                  <option key={u.uid} value={u.uid}>{u.name} (ID: {u.studentId})</option>
                ))}
              </optgroup>
            </select>
            <button
              onClick={handleResetSandbox}
              title="Reset Sandbox back to defaults"
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dashboard Panels router */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Dashboard contents span */}
          <main className="lg:col-span-8 space-y-6">
            {currentUser && currentRole === "teacher" ? (
              <TeacherDashboard
                teacher={currentUser}
                courses={courses}
                students={availableUsers.filter(u => u.role === "student")}
                sessions={sessions}
                leaveRequests={leaveRequests}
                onMarkAttendance={handleMarkAttendance}
                onApproveLeave={handleApproveLeave}
                onCreateCourse={handleCreateCourse}
              />
            ) : currentUser ? (
              <StudentDashboard
                student={currentUser}
                courses={courses}
                students={availableUsers.filter(u => u.role === "student")}
                sessions={sessions}
                leaveRequests={leaveRequests}
                onApplyLeave={handleApplyLeave}
                onCancelLeave={handleCancelLeave}
              />
            ) : (
              <div className="bg-white rounded-xl p-10 text-center border">
                <p className="text-xs text-slate-500">Please choose a simulator profile from the list.</p>
              </div>
            )}
          </main>

          {/* Sidebar: Figma and informational guidelines */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* FIGMA PROMPT CARD CARD */}
            <FigmaPromptCard />

            {/* Quick documentation guidelines card */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm text-left relative overflow-hidden" id="system-info">
              <span className="text-[9px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded absolute right-4 top-4">
                Docs
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block">Roster Scan Guidance</h3>
              <div className="text-[11px] text-slate-600 space-y-3 leading-relaxed">
                <p>
                  Our unique <span className="font-semibold text-slate-900">Gemini LLM scan core</span> allows uploading unstructured inputs to log academic rosters.
                </p>
                <p className="font-bold text-slate-900 border-l border-brand-primary pl-2 mb-1">
                  Try this Copy-Paste Text block:
                </p>
                <div className="bg-slate-50 p-2 border rounded font-mono text-[10px] space-y-1 block max-h-32 overflow-y-auto">
                  "Dr. Turing, attending class today are John von Neumann and Katherine Johnson. Richard Feynman sent word he is attending physics Solvay representals. Ada Lovelace is absent, missed her bus."
                </div>
                <p>
                  Toggle your viewpoint to <span className="font-semibold text-slate-900">Dr. Alan Turing</span>, enter the <span className="font-semibold text-slate-900">AI Image Scan</span> sub-tab and paste the block above to test real-time parsing extraction!
                </p>
              </div>
            </div>

          </aside>

        </div>

      </div>

    </div>
  );
}
