import React, { useState } from "react";
import { 
  User, 
  Course, 
  AttendanceSession, 
  LeaveRequest, 
  AttendanceStatus 
} from "../types";
import Classroom3D from "./Classroom3D";
import { 
  Calendar, 
  AlertTriangle, 
  FileText, 
  Plus, 
  CheckCircle, 
  Clock, 
  XSquare, 
  BookmarkCheck,
  Send,
  UserCheck
} from "lucide-react";

interface StudentDashboardProps {
  student: User;
  courses: Course[];
  students: User[];
  sessions: AttendanceSession[];
  leaveRequests: LeaveRequest[];
  onApplyLeave: (courseId: string, startDate: string, endDate: string, reason: string) => void;
  onCancelLeave: (leaveId: string) => void;
}

export default function StudentDashboard({
  student,
  courses,
  students,
  sessions,
  leaveRequests,
  onApplyLeave,
  onCancelLeave
}: StudentDashboardProps) {
  
  // Local form state
  const [selectedCourse, setSelectedCourse] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [sumbittedToast, setSubmittedToast] = useState(false);

  // Filter courses enrolled by this student
  const studentCourses = courses.filter(c => c.studentIds.includes(student.uid));

  // State for selected 3D class map view
  const [seatingCourseId, setSeatingCourseId] = useState(studentCourses[0]?.id || "");

  // Resolve active seating classroom course structure
  const activeSeatingCourse = studentCourses.find(c => c.id === seatingCourseId) || studentCourses[0];

  // Resolve enrolled classmates matching specific indices
  const enrolledClassmates = students.filter(s => activeSeatingCourse?.studentIds.includes(s.uid));

  // Identify latest lecture records logged on server
  const courseSessionsOnly = sessions.filter(s => s.courseId === activeSeatingCourse?.id);
  const latestSession = courseSessionsOnly[0]; // sorted latest first

  const liveAttendanceRecords: Record<string, AttendanceStatus> = {};
  if (activeSeatingCourse) {
    activeSeatingCourse.studentIds.forEach(uid => {
      liveAttendanceRecords[uid] = latestSession?.records[uid] || "present";
    });
  }

  // Compute stats per course
  const courseStats = studentCourses.map(course => {
    const courseSessions = sessions.filter(s => s.courseId === course.id);
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let totalSessions = courseSessions.length;

    courseSessions.forEach(session => {
      const status = session.records[student.uid];
      if (status === "present") presentCount++;
      else if (status === "late") lateCount++;
      else if (status === "absent") absentCount++;
    });

    // Count present + half of late as present for academic standards or count late as present for simple formula
    const attended = presentCount + lateCount;
    const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;

    return {
      course,
      presentCount,
      lateCount,
      absentCount,
      totalSessions,
      rate
    };
  });

  // Total statistics averages
  const totalSessions = courseStats.reduce((sum, cs) => sum + cs.totalSessions, 0);
  const totalAttended = courseStats.reduce((sum, cs) => sum + cs.presentCount + cs.lateCount, 0);
  const overallRate = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 100;

  // Filter leave requests for student
  const studentLeaves = leaveRequests.filter(l => l.studentId === student.uid)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Submit leave form helper
  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !startDate || !endDate || !reason.trim()) return;

    onApplyLeave(selectedCourse, startDate, endDate, reason);
    
    // reset form
    setSelectedCourse("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setSubmittedToast(true);
    setTimeout(() => setSubmittedToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-sm relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center pr-6 overflow-hidden pointer-events-none">
          <UserCheck className="w-64 h-64 translate-y-12 translate-x-12" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-slate-700/80 text-sky-300 font-semibold px-2.5 py-0.5 rounded-full border border-slate-600">
              Student Sandbox Portal
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">{student.name}</h1>
          <p className="text-xs text-slate-300">
            ID: <span className="font-mono text-white font-medium">{student.studentId}</span> • Department: <span className="text-white font-medium">{student.department}</span>
          </p>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Cumulative Attendance</span>
          <div className="flex items-end gap-3">
            <span className={`text-4xl font-extrabold tracking-tight ${overallRate >= 75 ? "text-slate-900" : "text-rose-600"}`}>
              {overallRate}%
            </span>
            <span className="text-xs text-slate-500 pb-1">
              Minimum required: 75%
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${overallRate >= 80 ? "bg-emerald-500" : overallRate >= 75 ? "bg-amber-400" : "bg-rose-500"}`} 
              style={{ width: `${overallRate}%` }}
            />
          </div>
          {overallRate < 75 && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-rose-50 text-rose-700 text-xs rounded border border-rose-100">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Attendance below threshold. You are at risk of final exam bar!</span>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Enrolled Courses</span>
          <span className="text-3xl font-extrabold text-slate-900 block">{studentCourses.length} Classes</span>
          <p className="text-[11px] text-slate-500 mt-2">Active syllabus allocations in linear semester</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">Leave Request Approvals</span>
          <div className="flex gap-4 mt-1">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">{studentLeaves.filter(l=>l.status === 'pending').length}</span>
              <span className="text-[10px] text-slate-500">Pending</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-2xl font-bold text-emerald-600 block">{studentLeaves.filter(l=>l.status === 'approved').length}</span>
              <span className="text-[10px] text-slate-500">Approved</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-2xl font-bold text-slate-500 block">{studentLeaves.filter(l=>l.status === 'rejected').length}</span>
              <span className="text-[10px] text-slate-500">Rejected</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Classroom Seating Location Finder */}
      {studentCourses.length > 0 && (
        <div className="space-y-4 my-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">3D Interactive Classroom View:</span>
              <select
                value={seatingCourseId}
                onChange={(e) => setSeatingCourseId(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none"
              >
                {studentCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Highlighted Desk: <span className="text-sky-500 font-bold">YOUR SEAT</span>
            </p>
          </div>

          <Classroom3D
            students={enrolledClassmates}
            attendanceRecords={liveAttendanceRecords}
            onRecordChange={() => {}} // Read-only for student view dashboard
            interactive={false}
            highlightedStudentId={student.uid}
          />
        </div>
      )}

      {/* Course Breakdown Selections */}
      <h2 className="text-base font-bold text-slate-900 mt-6 tracking-tight">Active Academic Courses Attendance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courseStats.map(({ course, presentCount, lateCount, absentCount, totalSessions, rate }) => (
          <div key={course.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {course.code}
                </span>
                <h3 className="text-sm font-semibold text-slate-950 mt-1 line-clamp-1">{course.name}</h3>
                <span className="text-[11px] text-slate-500">{course.semester} • {course.department}</span>
              </div>
              <div className="text-right">
                <span className={`text-xl font-extrabold ${rate >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                  {rate}%
                </span>
                <span className="text-[9px] text-slate-400 block uppercase">Attendance Rate</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${rate >= 80 ? "bg-emerald-500" : rate >= 75 ? "bg-amber-400" : "bg-rose-500"}`} 
                style={{ width: `${rate}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-slate-600">Total lectures: <span className="font-semibold text-slate-900">{totalSessions}</span></span>
              <div className="flex gap-2">
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">P: {presentCount}</span>
                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">L: {lateCount}</span>
                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-medium">A: {absentCount}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab: Self Attendance Logs & Apply Leave requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Course attendance sessions timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-7">
          <h2 className="text-sm font-bold text-slate-900 mb-4 tracking-tight uppercase">Recent Roll-Call Sessions Logs</h2>
          
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No attendance sessions registered in the academic year.</p>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {sessions.map(session => {
                const myStatus = session.records[student.uid] || "Not Marked";
                const course = courses.find(c => c.id === session.courseId);
                
                return (
                  <div key={session.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100/80 gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 shrink-0">
                        <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-semibold text-ellipsis overflow-hidden whitespace-nowrap">
                          {course ? course.code : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {session.date}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-950 truncate">{session.sessionName}</h4>
                      {session.aiNotes && (
                        <p className="text-[9px] text-slate-500 italic truncate mt-0.5">AI Check: {session.aiNotes}</p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 uppercase ${
                        myStatus === "present" ? "bg-emerald-100 text-emerald-800" :
                        myStatus === "late" ? "bg-amber-100 text-amber-800" :
                        myStatus === "absent" ? "bg-rose-100 text-rose-800" :
                        "bg-slate-100 text-slate-800"
                      }`}>
                        {myStatus === "present" && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                        {myStatus === "late" && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                        {myStatus === "absent" && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                        {myStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Apply for Leave Form Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-4 tracking-tight uppercase flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              Apply Leave Absences
            </h2>

            {sumbittedToast && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Leave application submitted to instructor. Approval queue synced!</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Enrolled Class</label>
                <select
                  required
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                >
                  <option value="">-- Choose Subject Course --</option>
                  {studentCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Absence</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Scheduled doctor checkups, sudden dental pain, representative sports match."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-slate-800 focus:bg-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Submit Leave Application
              </button>
            </form>
          </div>

          {/* Active Leave History Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold text-slate-900 mb-3 tracking-tight uppercase">Submitted Applications</h2>
            {studentLeaves.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-3 text-center">No leave requests logged yet.</p>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {studentLeaves.map(leave => (
                  <div key={leave.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-left">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-[10px] font-semibold text-slate-800 truncate block max-w-[140px]">{leave.courseName}</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                        leave.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                        leave.status === "pending" ? "bg-amber-100 text-amber-800" :
                        "bg-red-50 text-red-600 border border-red-100"
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 mb-1">Dates: {leave.startDate} to {leave.endDate}</p>
                    <p className="text-[10px] text-slate-600 line-clamp-2 italic mb-1">" {leave.reason} "</p>
                    
                    {leave.notes && (
                      <div className="text-[9px] bg-white p-1 rounded border border-slate-200 text-slate-700 mt-1">
                        <strong className="text-slate-900">Professor Feedback:</strong> {leave.notes}
                      </div>
                    )}

                    {leave.status === "pending" && (
                      <button
                        onClick={() => onCancelLeave(leave.id)}
                        className="text-[9px] text-rose-600 hover:underline mt-2 font-medium"
                      >
                        Cancel Application
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
