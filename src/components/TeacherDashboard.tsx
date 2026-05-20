import React, { useState } from "react";
import { 
  User, 
  Course, 
  AttendanceSession, 
  LeaveRequest, 
  AttendanceStatus,
  AIInsightsResponse
} from "../types";
import Classroom3D from "./Classroom3D";
import { 
  Plus, 
  Users, 
  Check, 
  X, 
  Sparkles, 
  PlusCircle, 
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Cpu,
  Mail,
  Copy,
  FolderPlus,
  ArrowRight,
  TrendingUp,
  Brain,
  BadgeAlert,
  Settings,
  HelpCircle
} from "lucide-react";

interface TeacherDashboardProps {
  teacher: User;
  courses: Course[];
  students: User[];
  sessions: AttendanceSession[];
  leaveRequests: LeaveRequest[];
  onMarkAttendance: (courseId: string, date: string, sessionName: string, records: Record<string, AttendanceStatus>, aiNotes?: string) => void;
  onApproveLeave: (leaveId: string, status: "approved" | "rejected", notes: string) => void;
  onCreateCourse: (code: string, name: string, department: string, semester: string) => void;
}

export default function TeacherDashboard({
  teacher,
  courses,
  students,
  sessions,
  leaveRequests,
  onMarkAttendance,
  onApproveLeave,
  onCreateCourse
}: TeacherDashboardProps) {

  // Active Screen Sub-Tabs: "marker" | "scanner" | "risk" | "leaves" | "courses"
  const [activeTab, setActiveTab] = useState<"marker" | "scanner" | "risk" | "leaves" | "courses">("marker");

  // Selection states
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [sessionName, setSessionName] = useState("Lecture 4 - Advanced Algorithms");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Attendance Sheet marking record
  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const enrolledStudents = students.filter(s => currentCourse?.studentIds.includes(s.uid));
  
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});

  // Reset records upon course change
  React.useEffect(() => {
    if (currentCourse) {
      const initial: Record<string, AttendanceStatus> = {};
      currentCourse.studentIds.forEach(id => {
        initial[id] = "present"; // default to present
      });
      setAttendanceRecords(initial);
    }
  }, [selectedCourseId, currentCourse]);

  // Leaf approval state
  const [adminLeaveNotes, setAdminLeaveNotes] = useState<Record<string, string>>({});

  // 1. Mark attendance form submission
  const handleMarkAttendanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !sessionDate || !sessionName) return;
    
    onMarkAttendance(selectedCourseId, sessionDate, sessionName, attendanceRecords);
    alert("Attendance logged and synchronized successfully!");
  };

  // 2. AI Scanner tab states
  const [scanning, setScanning] = useState(false);
  const [scanText, setScanText] = useState("");
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scannerResult, setScannerResult] = useState<{ records: any[]; summary: string } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScanImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIScan = async () => {
    if (!scanText && !scanImageBase64) {
      alert("Please provide either copy-pasted textual logs or upload an image file.");
      return;
    }

    setScanning(true);
    setScannerResult(null);

    try {
      const payload = {
        imageBase64: scanImageBase64,
        mimeType: "image/jpeg",
        textData: scanText,
        expectedStudents: enrolledStudents.map(e => ({ name: e.name, studentId: e.studentId }))
      };

      const res = await fetch("/api/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setScannerResult({
          records: data.records,
          summary: data.summary
        });

        // Sync scanner results directly to currently viewed attendance state
        const updatedRecords = { ...attendanceRecords };
        data.records.forEach((rec: any) => {
          // Find matching student by name or ID
          const matchedSt = enrolledStudents.find(
            s => s.name?.toLowerCase() === rec.name?.toLowerCase() || s.studentId === rec.studentId
          );
          if (matchedSt) {
            updatedRecords[matchedSt.uid] = rec.status as AttendanceStatus;
          }
        });
        setAttendanceRecords(updatedRecords);
      } else {
        alert("Error from AI Service: " + data.error);
      }
    } catch (err: any) {
      alert("Could not complete AI Session: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  // 3. AI Predictive Insights tab state
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [copiedDraftIndex, setCopiedDraftIndex] = useState<number | null>(null);

  const fetchAIInsights = async () => {
    if (!selectedCourseId) return;
    setLoadingInsights(true);
    setInsights(null);

    // Calculate current average metrics for each student in the course
    const courseSessions = sessions.filter(s => s.courseId === selectedCourseId);
    const studentsMetric = enrolledStudents.map(student => {
      let attended = 0;
      courseSessions.forEach(ses => {
        if (ses.records[student.uid] === "present" || ses.records[student.uid] === "late") {
          attended++;
        }
      });
      const attendanceRate = courseSessions.length > 0 
        ? Math.round((attended / courseSessions.length) * 100) 
        : 100;

      return {
        name: student.name,
        studentId: student.studentId || "N/A",
        attendanceRate
      };
    });

    try {
      const res = await fetch("/api/attendance/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: currentCourse?.name,
          students: studentsMetric,
          history: courseSessions.map(cs => ({ date: cs.date, name: cs.sessionName, counts: Object.values(cs.records).length }))
        })
      });

      const data = await res.json();
      setInsights(data);
    } catch (err: any) {
      alert("Could not compile AI Insights: " + err.message);
    } finally {
      setLoadingInsights(false);
    }
  };

  // 4. Course creation state
  const [courseCode, setCourseCode] = useState("");
  const [courseNameInp, setCourseNameInp] = useState("");
  const [courseDept, setCourseDept] = useState("Computer Science");
  const [courseSem, setCourseSem] = useState("Semester 1");
  const [courseCreatedMsg, setCourseCreatedMsg] = useState(false);

  const handleCreateCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode || !courseNameInp) return;

    onCreateCourse(courseCode, courseNameInp, courseDept, courseSem);
    setCourseCode("");
    setCourseNameInp("");
    setCourseCreatedMsg(true);
    setTimeout(() => setCourseCreatedMsg(false), 3000);
  };

  // Compute student leave alerts count
  const pendingLeaves = leaveRequests.filter(l => l.status === "pending" && courses.some(c=>c.id === l.courseId && c.instructorId === teacher.uid));

  return (
    <div className="space-y-6">
      {/* Teacher Stats Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-xs bg-brand-slate text-brand-primary border border-slate-200 uppercase tracking-widest font-bold px-2.5 py-0.5 rounded">
              Academic Instructor Port
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">{teacher.name}</h1>
            <p className="text-xs text-slate-500">
              Department: <span className="font-semibold">{teacher.department}</span> • Assigned Classes: <span className="font-semibold text-brand-primary">{courses.length}</span>
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveTab("marker"); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "marker" ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Roll Call Desk
            </button>
            <button
              onClick={() => { setActiveTab("scanner"); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "scanner" ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-sky-500" /> AI Image Scan
            </button>
            <button
              onClick={() => { setActiveTab("risk"); fetchAIInsights(); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "risk" ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-500" /> AI Predictive Risk
            </button>
            <button
              onClick={() => { setActiveTab("leaves"); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition relative flex items-center gap-1.5 ${
                activeTab === "leaves" ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Leaves Applications
              {pendingLeaves.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {pendingLeaves.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("courses"); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "courses" ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              Class Planner
            </button>
          </div>
        </div>
      </div>

      {/* Course Selection Bar */}
      <div className="bg-slate-100 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between border border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Selected Lecture stream:</span>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
            ))}
          </select>
        </div>
        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-slate-400" /> Total Active Enrolled Students: {enrolledStudents.length}
        </div>
      </div>

      {/* TAB CONTENT: ROLL CALL MANUAL MARKER */}
      {activeTab === "marker" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between border-b border-rose-50 pb-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Manual Attendance Roll-Call Sheet</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define topic and toggle student attendance status checkbox</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-wide">
                Interactive Grid Ready
              </span>
            </div>
          </div>

          <form onSubmit={handleMarkAttendanceSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lecture Topic / Notes</label>
                <input
                  type="text"
                  required
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Calendar Schedule Date</label>
                <input
                  type="date"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                />
              </div>
            </div>

            {/* 3D Interactive Seating Plan Map */}
            <div className="my-6">
              <Classroom3D
                students={enrolledStudents}
                attendanceRecords={attendanceRecords}
                onRecordChange={(uid, status) => {
                  setAttendanceRecords(prev => ({
                    ...prev,
                    [uid]: status
                  }));
                }}
                interactive={true}
              />
            </div>

            {/* Student marking grid */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Student ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Form Status Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {enrolledStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">No students enrolled in this course class.</td>
                    </tr>
                  ) : (
                    enrolledStudents.map((st) => (
                      <tr key={st.uid} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{st.studentId || "N/A"}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{st.name}</td>
                        <td className="py-3.5 px-4 text-slate-500">{st.email}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.uid]: "present" }))}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                                attendanceRecords[st.uid] === "present"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                              }`}
                            >
                              P
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.uid]: "late" }))}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                                attendanceRecords[st.uid] === "late"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                              }`}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              onClick={() => setAttendanceRecords(prev => ({ ...prev, [st.uid]: "absent" }))}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${
                                attendanceRecords[st.uid] === "absent"
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent"
                              }`}
                            >
                              A
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-lg text-xs transition tracking-wide flex items-center gap-2 shadow-sm"
              >
                <Check className="w-4 h-4" /> Save Standard Attendance Logs
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: AI IMAGE ROLL CALL SCANNER */}
      {activeTab === "scanner" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-sky-50 text-sky-600 rounded-lg">
                <Cpu className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">AI Intelligent Attendance Scanner</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Perfect college feature: Take a picture of the classroom, snap written rosters, upload attendee spreadsheets, or copy-paste chat log blocks. Gemini automatically parses, extracts student IDs, and structures attendance states.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Side */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Option A: Snap / Upload Photo of Roster or Classroom
                </label>
                <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 text-center hover:bg-slate-100/50 transition relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {scanImageBase64 ? (
                    <div className="space-y-2">
                      <img
                        src={scanImageBase64}
                        alt="Roster preview"
                        className="max-h-32 mx-auto rounded object-cover shadow-sm border"
                      />
                      <button
                        type="button"
                        onClick={() => setScanImageBase64(null)}
                        className="text-[10px] text-rose-600 font-bold hover:underline"
                      >
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-medium text-slate-600">Select Image File</p>
                      <p className="text-[10px] text-slate-400">supports JPEG, PNG, or Camera Roll Snaps</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Option B: Paste Chat log Text List of attendees
                </label>
                <textarea
                  rows={4}
                  value={scanText}
                  onChange={(e) => setScanText(e.target.value)}
                  placeholder="e.g. &#10;John von Neumann present &#10;Grace Hopper was here&#10;Leave out Lovelace since she was absent today."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800 focus:bg-white resize-none font-mono"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 gap-2 flex items-start text-[11px] text-amber-800">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  The AI compares details against current class catalog (<span className="font-semibold">{enrolledStudents.length} Students</span>). If no Gemini API key is configured, client simulation is activated.
                </span>
              </div>

              <button
                type="button"
                onClick={handleAIScan}
                disabled={scanning}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {scanning ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Compiling with Gemini AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Process Roster with Gemini
                  </>
                )}
              </button>
            </div>

            {/* Result / Output side */}
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-slate-700" />
                  AI Parser Extraction Output
                </h3>

                {!scannerResult ? (
                  <div className="text-center py-12 space-y-2">
                    <Brain className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500 font-medium font-display">No compilation processed yet</p>
                    <p className="text-[10px] text-slate-400">Trigger standard image or chat list to generate automated classifications</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg text-xs italic leading-relaxed">
                      " {scannerResult.summary} "
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {scannerResult.records?.map((rec, i) => (
                        <div key={i} className="flex justify-between items-center p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                          <span className="font-semibold text-slate-900">{rec.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rec.status === "present" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                            rec.status === "late" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {rec.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {scannerResult && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setScannerResult(null)}
                      className="px-3 py-1.5 hover:bg-slate-200 text-slate-700 border border-transparent rounded bg-transparent text-xs transition"
                    >
                      Clear Summary
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("marker");
                        alert("AI-detected attendance profiles applied to active marking grid!");
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition font-semibold"
                    >
                      Apply and Mark Attendance
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI PREDICTIVE RISK ANALYTICS */}
      {activeTab === "risk" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Brain className="w-4 h-4" />
                </span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">AI Attendance Predictive Risk Officer</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Utilize server-side LLM algorithms to evaluate cumulative attendance records and forecast attendance risk levels. Instantly drafts warnings for families.
              </p>
            </div>
            <button
              onClick={fetchAIInsights}
              disabled={loadingInsights}
              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {loadingInsights ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Recompute Risk Stats
            </button>
          </div>

          {loadingInsights ? (
            <div className="py-20 text-center space-y-3">
              <span className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-slate-500 block font-mono">Formulating predictive matrices & letters...</p>
            </div>
          ) : insights ? (
            <div className="space-y-6">
              {/* Class Summary Banner */}
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 p-4 rounded-xl border border-indigo-100 flex gap-3 items-start text-xs text-indigo-950">
                <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-indigo-900 block font-bold font-display uppercase tracking-wider text-[10px] mb-1">Class Executive Brief</strong>
                  {insights.classSummary}
                </div>
              </div>

              {/* Core splits */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Risk student warnings */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 block flex items-center gap-1.5">
                    <BadgeAlert className="w-4 h-4 text-rose-600" />
                    Students at Absenteeism Risk (&lt; 75%)
                  </h3>

                  {insights.riskStudents?.length === 0 ? (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-6 text-center text-xs text-slate-600 space-y-1">
                      <p className="font-semibold text-emerald-800">Perfect Class Punctuality!</p>
                      <p className="text-slate-500">Every student matches academic regulations requirements.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {insights.riskStudents?.map((student, idx) => (
                        <div key={idx} className="bg-white hover:bg-slate-50/50 transition border border-slate-200 rounded-xl p-4 space-y-3 text-left">
                          <div className="flex justify-between items-start gap-3">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{student.name}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">ID: {student.studentId}</p>
                            </div>
                            <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                              {student.attendanceRate}% Rate
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 italic">" {student.explanation} "</p>

                          <div className="pt-2 border-t border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Automated Warning Notice Draft</span>
                            <div className="bg-slate-50 p-2 text-[10px] text-slate-600 rounded border border-slate-200 whitespace-pre-line max-h-24 overflow-y-auto font-mono">
                              {student.parentWarningDraft}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(student.parentWarningDraft);
                                setCopiedDraftIndex(idx);
                                setTimeout(() => setCopiedDraftIndex(null), 2000);
                              }}
                              className="text-[9px] font-bold text-indigo-600 hover:underline mt-2 flex items-center gap-1"
                            >
                              {copiedDraftIndex === idx ? "Draft Copy Success!" : <><Copy className="w-3 h-3" /> Copy Warning Letter</>}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recomended Instructor Interventions */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 block flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-slate-700" />
                    AI Action Intervention Playbook
                  </h3>

                  <ul className="space-y-3">
                    {insights.teacherActionSteps?.map((step, sidx) => (
                      <li key={sidx} className="flex gap-3 items-start text-xs text-slate-700 font-medium">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {sidx + 1}
                        </span>
                        <p className="pt-0.5 leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ul>

                  <div className="p-4 bg-indigo-900 text-indigo-100 rounded-xl mt-6 space-y-2 border border-indigo-800">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Classroom Optimization Tip</h4>
                    <p className="text-[10px] leading-relaxed">
                      Statistically, introducing micro-credits for class attendance during Monday Lectures reduces overall class skipping rates by over 12%. Integrate this in your syllabus goals.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium mt-2">Trigger predictive reports scan above</p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: LEAVE APPLICATIONS FLOW approvals */}
      {activeTab === "leaves" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Student Absence Leave Approvals Desk</h2>
            <p className="text-xs text-slate-500">Review student applications, write feedback notes, and approve or reject submissions</p>
          </div>

          {leaveRequests.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No leave applications registered on file.</p>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map(req => {
                const reqCourse = courses.find(c => c.id === req.courseId);
                const isMyClass = reqCourse?.instructorId === teacher.uid;
                
                // Show only applications matching teacher's assigned subjects
                if (!isMyClass) return null;

                return (
                  <div key={req.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-left">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold uppercase tracking-wider font-display">
                          {req.courseName}
                        </span>
                        <h3 className="text-xs font-extrabold text-slate-950 mt-1">{req.studentName}</h3>
                        <p className="text-[11px] text-slate-500">Scheduled: <span className="font-mono text-slate-700">{req.startDate} to {req.endDate}</span></p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        req.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                        req.status === "pending" ? "bg-amber-100 text-amber-850" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 bg-white p-3 rounded border border-slate-150 leading-relaxed italic">
                      " {req.reason} "
                    </p>

                    {req.status === "pending" ? (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 uppercase mb-1">Response Feedback / Reviewer Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Excused. Be sure to submit assignments beforehand."
                            value={adminLeaveNotes[req.id] || ""}
                            onChange={(e) => setAdminLeaveNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-800"
                          />
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => onApproveLeave(req.id, "rejected", adminLeaveNotes[req.id] || "Rejected due to overlap with critical exam dates.")}
                            className="px-3 py-1.5 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs transition"
                          >
                            Reject Leave
                          </button>
                          <button
                            type="button"
                            onClick={() => onApproveLeave(req.id, "approved", adminLeaveNotes[req.id] || "Excused absence approved.")}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs transition font-semibold"
                          >
                            Approve & Update Roster
                          </button>
                        </div>
                      </div>
                    ) : (
                      req.notes && (
                        <p className="text-[11px] text-slate-500">
                          <strong className="text-slate-700">Review Notes:</strong> {req.notes}
                        </p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: COURSE CLASS PLANNER */}
      {activeTab === "courses" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Courses & Classroom Manager</h2>
            <p className="text-xs text-slate-500">Establish and coordinate academic catalog lists assigned to Dr. Turing</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Class designer */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Create Academic Class</h3>
              
              {courseCreatedMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Subject Course created and deployed on system registry successfully!</span>
                </div>
              )}

              <form onSubmit={handleCreateCourseSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subject Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CS-409"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Trimester/Semester</label>
                    <select
                      value={courseSem}
                      onChange={(e) => setCourseSem(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                    >
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Semester 3">Semester 3</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Operating Systems"
                    value={courseNameInp}
                    onChange={(e) => setCourseNameInp(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Academic Department</label>
                  <select
                    value={courseDept}
                    onChange={(e) => setCourseDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 border border-transparent rounded hover:bg-slate-800 text-white font-medium text-xs transition"
                >
                  Confirm Class Creation
                </button>
              </form>
            </div>

            {/* List of active courses */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Class registries catalog</h3>
              
              <div className="space-y-3">
                {courses.map(c => (
                  <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[9px] bg-slate-200 font-mono text-slate-800 px-1.5 py-0.2 rounded font-bold">
                          {c.code}
                        </span>
                        <h4 className="text-xs font-semibold text-slate-950 mt-1">{c.name}</h4>
                        <p className="text-[10px] text-slate-500">{c.semester} • {c.department}</p>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                        {c.studentIds.length} Enrolls
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
