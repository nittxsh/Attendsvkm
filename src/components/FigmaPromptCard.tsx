import React, { useState } from "react";
import { Copy, Sparkles, Check, Figma } from "lucide-react";

interface PromptTemplate {
  featureName: string;
  shortDesc: string;
  promptText: string;
}

export default function FigmaPromptCard() {
  const [copied, setCopied] = useState<number | null>(null);
  const [customKeyword, setCustomKeyword] = useState("");

  const templates: PromptTemplate[] = [
    {
      featureName: "AI Face Recognition Roll-Call",
      shortDesc: "Camera-only classroom scan with seat mapping and emotion engagement metrics.",
      promptText: `Create a high-fidelity modern dashboard UI/UX in Figma for a "Biometric AI Face Attendance" college app. 
Design a tablet/PC layout using Inter and Space Grotesk fonts.
Light theme, off-white background (#F8FAFC) with charcoal and slate accents. 
Key elements:
1. Active camera scan view showing a grid of students' camera feeds with green bounding box indicators and name overlays saying "Authenticated (98.9% match) - Seat 4A [Engagement: Active]".
2. Attendance stat card showing: "Total class count: 48", "Biometric matches: 45", "Unknown detections: 3 (high alert flag)".
3. Interactive classroom canvas displaying a virtual seating plan colored by attendance status (Present: Emerald green, Late: Amber, Absent: Coral grey).
4. Modern clean visual details: thin subtle borders, soft minimalist drop-shadows, and a clean professional side panel.`
    },
    {
      featureName: "Geofenced Dynamic QR Check-In",
      shortDesc: "GPS-tied short-lived rolling security QR codes preventing proxy attendance.",
      promptText: `Design a mobile interface (iOS and Android) for "GeoPass College Attendance" in Figma.
Include visual highlights such as heavy dark typography paired with custom geometric elements.
Key elements:
1. Dynamic animated rolling QR code card with an active progress dial showing "Refreshes in 12s".
2. GPS status bar with green beacon icon: "Location verified: Central Engineering Hall (Range < 15m)".
3. "Check-In" action button styled with crisp, high-contrast borders and subtle outer glassmorphic glows.
4. History list detailing student's check-in metrics: "Punctuality Rating: 94%", "Active Zone: CS Lab 1"."`
    },
    {
      featureName: "Leave Approval / Sick Certificate Scanner",
      shortDesc: "Document uploads with automatic AI translation of sick-leaves into calendar approvals.",
      promptText: `Design a desktop Figma dashboard for "College Attendance Academic registrar - Medical Leave Hub".
Modern minimalist layout, ample negative space.
Key components:
1. Double column split grid. Column 1: Master inbox of medical/leave request items with status pills ('Medical Sick', 'Unverified Document', 'College Representative Activity').
2. Column 2: Document viewer showing a scanned doctor paper with highlighted bounding boxes labeled by AI: 'Patient Name: Richard Feynman - Valid Range: May 19-21'.
3. Real-time calendar schedule block on the side forecasting active impact: "Approval will update 3 missed lectures in PHYS-103 to 'Excused'".
4. Clear actions: "Approve - Auto-Adjust Roster (Fill Primary Color #111827)", "Request Medical Verification (Border Accent)"`
    }
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2500);
  };

  const getCustomPrompt = () => {
    return `Design a highly polished full-stack College Attendance System web dashboard in Figma centered on the theme of "${customKeyword || "Interactive Blockchain roll-calls and smart schedules"}". Use a clean visual system, premium typography pairing ("Inter" for utility texts, "Space Grotesk" for large metrics), thin 1px slate boundaries, and a subtle off-white professional backdrop. Represent high-level statistics, daily lecture calendars, student tracking sidebars, and custom floating alert notifications for low attendance threshold warning.`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm overflow-hidden" id="figma-companion">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
          <Figma className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            Figma UI Prompt Generator
            <span className="text-xs bg-slate-100 text-slate-600 font-normal px-2 py-0.5 rounded-full">Special Feature</span>
          </h2>
          <p className="text-xs text-slate-500">Copy high-fidelity prompts to generate attendance dashboard concepts in AI UI builders or Figma</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {templates.map((tmpl, idx) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-100 relative group">
            <div className="flex justify-between items-start gap-3 mb-1">
              <span className="text-xs font-semibold text-slate-800">{tmpl.featureName}</span>
              <button
                onClick={() => handleCopy(tmpl.promptText, idx)}
                className="text-slate-400 hover:text-slate-700 transition"
                title="Copy Prompt text"
              >
                {copied === idx ? (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <Check className="w-3.5 h-3.5" /> Copied!
                  </span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">{tmpl.shortDesc}</p>
            <div className="bg-white p-2.5 rounded border border-slate-200 text-[10px] text-slate-600 font-mono line-clamp-3 leading-relaxed">
              {tmpl.promptText}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200/80 pt-4">
        <label className="block text-xs font-medium text-slate-700 mb-2">
          Generate Custom Prompt
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. RFID badge tracking, Geofenced Beacon, Slack integrations"
            value={customKeyword}
            onChange={(e) => setCustomKeyword(e.target.value)}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-slate-400 focus:bg-white"
          />
          <button
            onClick={() => handleCopy(getCustomPrompt(), 99)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
          >
            {copied === 99 ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            Copy Prompts
          </button>
        </div>
      </div>
    </div>
  );
}
