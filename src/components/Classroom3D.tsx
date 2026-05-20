import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, AttendanceStatus } from "../types";
import { 
  Sparkles, 
  Settings, 
  HelpCircle, 
  Layout, 
  Box, 
  UserCheck, 
  UserX, 
  Clock, 
  Square,
  Activity,
  Layers
} from "lucide-react";

interface Classroom3DProps {
  students: User[];
  attendanceRecords: Record<string, AttendanceStatus>;
  onRecordChange: (studentId: string, status: AttendanceStatus) => void;
  interactive?: boolean;
  highlightedStudentId?: string; // used in student dashboard to locate their own seat
}

export default function Classroom3D({
  students,
  attendanceRecords,
  onRecordChange,
  interactive = true,
  highlightedStudentId
}: Classroom3DProps) {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [tiltAngle, setTiltAngle] = useState({ rotateX: 55, rotateY: 0, rotateZ: -35 });
  const [hoveredDesk, setHoveredDesk] = useState<string | null>(null);
  const [showWireframe, setShowWireframe] = useState<boolean>(false);

  // Auto-arrange students in rows of 3
  const colsCount = 3;
  const classroomGrid = students.map((student, index) => {
    const row = Math.floor(index / colsCount);
    const col = index % colsCount;
    return {
      student,
      row,
      col,
      index
    };
  });

  // Calculate live statistics for 3D chart display
  const total = students.length;
  const presentCount = students.filter(s => attendanceRecords[s.uid] === "present").length;
  const lateCount = students.filter(s => attendanceRecords[s.uid] === "late").length;
  const absentCount = students.filter(s => attendanceRecords[s.uid] === "absent").length;

  // Convert status to display background color classes
  const getStatusColors = (status: AttendanceStatus) => {
    switch (status) {
      case "present":
        return {
          top: "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]",
          front: "bg-emerald-600",
          side: "bg-emerald-700",
          border: "border-emerald-400",
          glow: "from-emerald-500/20 to-emerald-500/0",
          text: "text-emerald-100"
        };
      case "late":
        return {
          top: "bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
          front: "bg-amber-500",
          side: "bg-amber-600",
          border: "border-amber-300",
          glow: "from-amber-400/20 to-amber-400/0",
          text: "text-amber-100"
        };
      case "absent":
        return {
          top: "bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
          front: "bg-rose-600",
          side: "bg-rose-700",
          border: "border-rose-400",
          glow: "from-rose-500/20 to-rose-500/0",
          text: "text-rose-100"
        };
      default:
        return {
          top: "bg-slate-400",
          front: "bg-slate-500",
          side: "bg-slate-600",
          border: "border-slate-350",
          glow: "from-slate-400/10 to-slate-400/0",
          text: "text-slate-100"
        };
    }
  };

  // Quick rotation adjuster helper
  const handleRotate = (axis: "x" | "z", val: number) => {
    if (axis === "x") {
      setTiltAngle(prev => ({ ...prev, rotateX: Math.max(30, Math.min(80, prev.rotateX + val)) }));
    } else {
      setTiltAngle(prev => ({ ...prev, rotateZ: prev.rotateZ + val }));
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 relative overflow-hidden shadow-2xl">
      {/* Visual Ambient Background Matrix Rays */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-900/45 to-slate-950 opacity-80 pointer-events-none z-0" />
      
      {/* 3D Scanning Line Effect */}
      {viewMode === "3d" && (
        <div className="absolute left-0 right-0 h-[1.5px] bg-sky-500/15 shadow-[0_0_10px_#0ea5e9] animate-pulse pointer-events-none z-10" style={{
          animationDuration: "4s",
          animationIterationCount: "infinite",
          animationTimingFunction: "ease-in-out",
          top: "30%"
        }} />
      )}

      {/* Control Header Strip */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 bg-indigo-500/15 text-indigo-400 rounded border border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold font-display uppercase tracking-wider text-slate-50">
              Interactive 3D Seating Matrix
            </h3>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Real-time visual simulation of active student desk placements inside the university auditorium
          </p>
        </div>

        {/* View Mode & Grid Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <button
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              viewMode === "3d" ? "bg-sky-500 text-slate-950 font-bold" : "bg-slate-800 hover:bg-slate-755 text-slate-300"
            }`}
          >
            <Box className="w-3.5 h-3.5" /> 3D Isometric Setup
          </button>
          
          <button
            onClick={() => setViewMode("2d")}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              viewMode === "2d" ? "bg-sky-500 text-slate-950 font-bold" : "bg-slate-800 hover:bg-slate-755 text-slate-300"
            }`}
          >
            <Layout className="w-3.5 h-3.5" /> 2D Flat Roster
          </button>

          {viewMode === "3d" && (
            <div className="flex items-center gap-1 border border-slate-800 bg-slate-950/60 p-1 rounded-lg">
              <button 
                onClick={() => handleRotate("x", 5)} 
                title="Tilt Pitch Up"
                className="px-1.5 py-0.5 text-[9px] hover:bg-slate-800 rounded font-bold uppercase shrink-0"
              >
                Pitch+
              </button>
              <button 
                onClick={() => handleRotate("x", -5)} 
                title="Tilt Pitch Down"
                className="px-1.5 py-0.5 text-[9px] hover:bg-slate-800 rounded font-bold uppercase shrink-0"
              >
                Pitch-
              </button>
              <span className="text-[10px] text-slate-600 px-1">|</span>
              <button 
                onClick={() => handleRotate("z", 10)} 
                title="Rotational Angle left"
                className="px-1.5 py-0.5 text-[9px] hover:bg-slate-800 rounded font-bold uppercase shrink-0"
              >
                Yaw+
              </button>
              <button 
                onClick={() => handleRotate("z", -10)} 
                title="Rotational Angle right"
                className="px-1.5 py-0.5 text-[9px] hover:bg-slate-800 rounded font-bold uppercase shrink-0"
              >
                Yaw-
              </button>
              <span className="text-[10px] text-slate-600 px-1">|</span>
              <button 
                onClick={() => setShowWireframe(!showWireframe)} 
                title="Toggle holographic wireframe"
                className={`px-1.5 py-0.5 text-[9px] rounded font-bold uppercase shrink-0 ${
                  showWireframe ? "bg-amber-500/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"
                }`}
              >
                Mesh
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        
        {/* LEFT COLUMN: 3D HOLOGRAPHIC CHALKBOARD & SUMMARY STATUS */}
        <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                Holo Blackboard
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            </div>

            {/* Virtual 3D Chalkboard Monitor */}
            <div className="bg-slate-950 border border-slate-900 rounded-lg p-3 space-y-3 relative overflow-hidden">
               {/* Horizontal glowing lines */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_94%,rgba(14,165,233,0.06)_95%,rgba(14,165,233,0.08)_98%)] bg-[length:100%_12px] opacity-20" />
               
               <p className="text-[10px] text-slate-400 font-mono">STATUS: SIMULATOR_RUNNING</p>
               
               <div className="space-y-2">
                 {/* Present Bar */}
                 <div>
                   <div className="flex justify-between text-[11px] font-mono text-emerald-400">
                     <span>PRESENT (P)</span>
                     <span>{presentCount} / {total}</span>
                   </div>
                   <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                     <motion.div 
                       className="bg-emerald-500 h-full rounded-full" 
                       initial={{ width: 0 }}
                       animate={{ width: `${total > 0 ? (presentCount / total) * 100 : 0}%` }}
                     />
                   </div>
                 </div>

                 {/* Late Bar */}
                 <div>
                   <div className="flex justify-between text-[11px] font-mono text-amber-400">
                     <span>LATE (L)</span>
                     <span>{lateCount} / {total}</span>
                   </div>
                   <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                     <motion.div 
                       className="bg-amber-400 h-full rounded-full" 
                       initial={{ width: 0 }}
                       animate={{ width: `${total > 0 ? (lateCount / total) * 100 : 0}%` }}
                     />
                   </div>
                 </div>

                 {/* Absent Bar */}
                 <div>
                   <div className="flex justify-between text-[11px] font-mono text-rose-400">
                     <span>ABSENT (A)</span>
                     <span>{absentCount} / {total}</span>
                   </div>
                   <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                     <motion.div 
                       className="bg-rose-500 h-full rounded-full" 
                       initial={{ width: 0 }}
                       animate={{ width: `${total > 0 ? (absentCount / total) * 100 : 0}%` }}
                     />
                   </div>
                 </div>
               </div>

               {/* Attendance Performance Score */}
               <div className="pt-2 border-t border-slate-900 text-center">
                 <p className="text-[10px] text-slate-500 font-bold uppercase">Average Session Presence</p>
                 <span className="text-2xl font-extrabold text-white font-mono tracking-tighter">
                   {total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 100}%
                 </span>
               </div>
            </div>

            <div className="text-[11px] text-zinc-400 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-850/50">
              <span className="text-yellow-400 font-bold uppercase text-[9px] block mb-1">
                3D Interactive Map Instruction
              </span>
              {interactive ? (
                <span>
                  Click directly on any extruded 3D Student Desk to cycle their status: <strong className="text-emerald-400">Present (P)</strong> → <strong className="text-amber-400">Late (L)</strong> → <strong className="text-rose-400">Absent (A)</strong>.
                </span>
              ) : (
                <span>
                  This 3D grid maps the classroom attendance instantly. Your seat location is highlighted on the radar screen.
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-900/40 p-2 text-[10px] text-slate-500 rounded font-mono text-center flex items-center justify-center gap-2 border border-slate-850">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>X / Y / Z Grid Coordinates Active</span>
          </div>
        </div>

        {/* RIGHT COLUMN: 3D ISOMETRIC GRID STAGE OR 2D LIST */}
        <div className="lg:col-span-3 min-h-[380px] bg-slate-950/40 border border-slate-850/80 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden select-none">
          
          <AnimatePresence mode="wait">
            {viewMode === "3d" ? (
              <motion.div
                key="isoflow-stage"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col items-center justify-center relative py-6"
              >
                {/* Simulated Whiteboard / Podium Line at the absolute back front of rotated room */}
                <div 
                  className="w-48 h-3 bg-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-full absolute top-4 z-40 border border-zinc-700 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translateY(-20px) rotateX(${tiltAngle.rotateX - 25}deg)`
                  }}
                >
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                    Class lecture whiteboard
                  </span>
                </div>

                {/* Perspective Transformation Container with custom Pitch / Yaw angle settings */}
                <div 
                  className="transition-transform duration-300 relative w-full flex items-center justify-center"
                  style={{
                    transform: `rotateX(${tiltAngle.rotateX}deg) rotateZ(${tiltAngle.rotateZ}deg) rotateY(${tiltAngle.rotateY}deg)`,
                    transformStyle: "preserve-3d",
                    perspective: "1000px"
                  }}
                >
                  
                  {/* Holographic Wireframe Grid Backdrop Panel */}
                  <div className="absolute inset-0 border-2 border-dashed border-sky-500/15 bg-sky-500/[0.01]" style={{
                    transform: "translateZ(-15px)",
                    ...((showWireframe) && { borderColor: "rgba(14,165,233,0.35)", backgroundColor: "rgba(14,165,233,0.03)" })
                  }} />

                  {/* Matrix Seating Grid lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" style={{
                    transform: "translateZ(-14px)"
                  }} />

                  {/* Render Desks Grid */}
                  <div className="grid grid-cols-3 gap-x-12 gap-y-16 w-full max-w-[280px] p-4 font-mono relative" style={{
                    transformStyle: "preserve-3d"
                  }}>
                    {classroomGrid.map(({ student, row, col, index }) => {
                      const status = attendanceRecords[student.uid] || "present";
                      const colors = getStatusColors(status);
                      const isHovered = hoveredDesk === student.uid;
                      const isHighlighted = student.uid === highlightedStudentId;

                      // Desk click handler (interactive state cycles status)
                      const handleDeskClick = () => {
                        if (!interactive) return;
                        const statuses: AttendanceStatus[] = ["present", "late", "absent"];
                        const currInx = statuses.indexOf(status);
                        const nextStatus = statuses[(currInx + 1) % statuses.length];
                        onRecordChange(student.uid, nextStatus);
                      };

                      return (
                        <div
                          key={student.uid}
                          onClick={handleDeskClick}
                          onMouseEnter={() => setHoveredDesk(student.uid)}
                          onMouseLeave={() => setHoveredDesk(null)}
                          className="relative cursor-pointer select-none"
                          style={{
                            transformStyle: "preserve-3d",
                            // Dynamic stacking context to make sure front cards render over top back cards
                            zIndex: 20 + row * 10 - col
                          }}
                        >
                          
                          {/* Radial Glow Matrix underneath the 3D block Desk */}
                          <div className={`absolute -inset-4 rounded-full bg-gradient-to-r ${colors.glow} filter blur-md opacity-70 pointer-events-none transition-all duration-300`} style={{
                            transform: "translateZ(-10px)",
                          }} />

                          {/* Radar scanning outline for highlighted student (the logged-in student) */}
                          {isHighlighted && (
                            <div className="absolute -inset-6 border border-sky-400 rounded-full animate-ping opacity-75 pointer-events-none" style={{
                              transform: "translateZ(-8px)",
                              animationDuration: "3s"
                            }} />
                          )}

                          {/* The 3D Desk Shape Container */}
                          <motion.div
                            animate={{
                              // Elevated floating effect on Hover or if target Highlighted student
                              translateZ: isHovered ? 25 : isHighlighted ? 15 : 0,
                              scale: isHovered ? 1.08 : 1
                            }}
                            transition={{ type: "spring", stiffness: 200, damping: 14 }}
                            style={{
                              transformStyle: "preserve-3d",
                            }}
                            className="relative w-12 h-10 select-none pb-0"
                          >
                            {/* TOP FACE (Visual table top) */}
                            <div className={`absolute inset-0 ${colors.top} border border-white/20 rounded flex flex-col justify-center items-center text-slate-100 font-bold shadow-md transition-colors duration-300 text-center select-none ${
                              isHighlighted ? "ring-2 ring-sky-400" : ""
                            }`} style={{
                              transform: "translateZ(10px)",
                              transformStyle: "preserve-3d"
                            }}>
                              <span className="text-[11px] select-none text-slate-900 font-extrabold tracking-tight">
                                {student.name ? student.name.split(" ").map(w => w[0]).join("").slice(0, 2) : "S"}
                              </span>
                              
                              {/* Display Desk Status Pill Tag inside Top Face */}
                              <span className="text-[7px] select-none opacity-90 block mt-0.5 text-slate-950 font-black">
                                {status === "present" ? "P" : status === "late" ? "L" : "A"}
                              </span>
                            </div>

                            {/* FRONT FACE (Fleshed projection face) */}
                            <div className={`absolute left-0 right-0 h-[10px] ${colors.front} origin-bottom transition-colors duration-300`} style={{
                              bottom: 0,
                              transform: "rotateX(-90deg) translateZ(10px)"
                            }} />

                            {/* SIDE FACE (Left extrusion side) */}
                            <div className={`absolute bottom-0 top-0 w-[10px] ${colors.side} origin-right transition-colors duration-300`} style={{
                              left: 0,
                              transform: "rotateY(-90deg) translateZ(-0px)"
                            }} />

                            {/* BACK FACE DECORATIVE CHAIR BAR */}
                            <div className="absolute bg-zinc-800 w-[2px] h-[16px]" style={{
                              left: "6px",
                              transform: "translateZ(-2px) rotateY(0deg) translateY(-8px)"
                            }} />
                            <div className="absolute bg-zinc-800 w-[2px] h-[16px]" style={{
                              right: "6px",
                              transform: "translateZ(-2px) rotateY(0deg) translateY(-8px)"
                            }} />
                            <div className="absolute bg-zinc-700 w-10 h-3 rounded-[1px] border border-zinc-650" style={{
                              left: "4px",
                              transform: "translateZ(-2px) translateY(-8px)"
                            }} />
                            
                          </motion.div>

                          {/* Float tooltip HUD over hovered student desk */}
                          {isHovered && (
                            <div 
                              className="absolute bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-50 overflow-hidden font-sans pointer-events-none select-none text-center"
                              style={{
                                transform: "rotateZ(35deg) rotateX(-50deg) translate3d(-35px, -110px, 40px)",
                                width: "125px"
                              }}
                            >
                              <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight truncate">
                                {student.name}
                              </p>
                              <p className="text-[8px] text-slate-400 font-mono">
                                ID: {student.studentId}
                              </p>
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <span className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                                  status === "present" ? "bg-emerald-500/20 text-emerald-300" :
                                  status === "late" ? "bg-amber-500/20 text-amber-300" :
                                  "bg-rose-500/20 text-rose-300"
                                }`}>
                                  {status}
                                </span>
                                {isHighlighted && (
                                  <span className="text-[8px] font-bold px-1 bg-sky-500/20 text-sky-300 rounded uppercase">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>

                <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none select-none">
                  <span className="text-[9px] font-bold tracking-widest text-slate-600 uppercase font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                    ISOMETRIC DESK COORDINATE matrix
                  </span>
                </div>
              </motion.div>
            ) : (
              /* ALTERNATE 2D FLAT ROSTER LAYOUT */
              <motion.div
                key="flatgrid-stage"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full space-y-2 py-4"
              >
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                  {students.map(st => {
                    const status = attendanceRecords[st.uid] || "present";
                    return (
                      <div key={st.uid} className="flex justify-between items-center p-3.5 bg-slate-900 border border-slate-850 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            status === "present" ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" :
                            status === "late" ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]" :
                            "bg-rose-500 shadow-[0_0_8px_#ef4444]"
                          }`} />
                          <div>
                            <p className="text-xs font-bold text-slate-100">{st.name}</p>
                            <p className="text-[9px] font-mono text-slate-400">ID: {st.studentId}</p>
                          </div>
                        </div>

                        {interactive && (
                          <div className="flex items-center gap-1.5 leading-none">
                            <button
                              onClick={() => onRecordChange(st.uid, "present")}
                              className={`px-2 py-1 text-[9px] font-bold rounded ${
                                status === "present" ? "bg-emerald-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              PRES
                            </button>
                            <button
                              onClick={() => onRecordChange(st.uid, "late")}
                              className={`px-2 py-1 text-[9px] font-bold rounded ${
                                status === "late" ? "bg-amber-400 text-slate-950 font-black" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                              }`}
                            >
                              LATE
                            </button>
                            <button
                              onClick={() => onRecordChange(st.uid, "absent")}
                              className={`px-2 py-1 text-[9px] font-bold rounded ${
                                status === "absent" ? "bg-rose-500 text-slate-100 font-black" : "bg-slate-800 text-slate-400 hover:bg-slate-705"
                              }`}
                            >
                              ABST
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>

      </div>

    </div>
  );
}
