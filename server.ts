import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up body parsers with limits for handling photo/document uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for Gemini client to prevent crashing on startup when KEY is absent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI features will fallback to mock mock-analysis.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// -----------------------------------------------------------------------------
// Endpoint: AI-Powered attendance scanner (Parsing chats, photos, roster sheets)
// -----------------------------------------------------------------------------
app.post("/api/attendance/scan", async (req, res) => {
  try {
    const { imageBase64, mimeType, textData, expectedStudents } = req.body;
    
    const formattedExpectations = Array.isArray(expectedStudents) 
      ? expectedStudents.map(s => `${s.name} (ID: ${s.studentId || ""})`).join(", ")
      : "No list specified";

    const prompt = `
      You are an elite academic attendance automation AI. Your goal is to process the uploaded source (either a camera photo of the students/roster, a handwritten list image, a screenshot of video call participants, or a copy-pasted textual chat log / list).
      
      Compare it against this official roster matching class enrollment:
      Expected Students: ${formattedExpectations}
      
      Output attendance statuses using exactly the names or studentIds in the Expected Students roster above.
      For each student listed in 'Expected Students', determine if they are 'present', 'absent', or 'late'.
      If a student is clearly shown, mentioned, or visible, mark them 'present' (or 'late' if explicitly stated). Otherwise, mark them 'absent'.
      Provide a highly summarized educational recap explaining your detections (e.g., "Identified 18 students from chat transcript. Marked Bob absent since his name was not mentioned.").
    `;

    // Check if API key is mock/offline
    if (!process.env.GEMINI_API_KEY) {
      // Return beautiful mock simulation so the user can test the flows immediately
      const mockResult = simulateAIParsing(expectedStudents, textData);
      return res.json(mockResult);
    }

    const ai = getGeminiClient();
    let contents: any[] = [];

    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64,
        }
      });
    }

    if (textData) {
      contents.push({ text: `Source text to scan: "${textData}"` });
    }

    contents.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            records: {
              type: Type.ARRAY,
              description: "The list of status changes extracted for each official student",
              items: {
                type: Type.OBJECT,
                properties: {
                  studentId: { type: Type.STRING, description: "Official studentId being marked" },
                  name: { type: Type.STRING, description: "Official name of the student" },
                  status: { type: Type.STRING, enum: ["present", "absent", "late"] }
                },
                required: ["name", "status"]
              }
            },
            summary: { type: Type.STRING, description: "A high-level sentence summarizing what was processed." }
          },
          required: ["records", "summary"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No output content received from Gemini.");
    }

    const parseData = JSON.parse(textOutput.trim());
    return res.json({
      success: true,
      records: parseData.records || [],
      summary: parseData.summary || "Scanned successfully.",
      isSimulated: false
    });

  } catch (error: any) {
    console.error("AI Scan Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "An error occurred while running AI Scanner." 
    });
  }
});

// Helper simulation function when API key is missing
function simulateAIParsing(expectedStudents: any[], textData?: string) {
  const records = (expectedStudents || []).map((student: any) => {
    // Generate a random-looking but mock matching present/absent status
    let status = "present";
    if (textData) {
      const normTxt = textData.toLowerCase();
      const normName = student.name.toLowerCase();
      // If student name mentioned in text, they're probably present
      if (normTxt.includes(normName)) {
        status = "present";
      } else {
        // otherwise semi-random
        status = student.id && parseInt(student.id.at(-1) || "1", 10) % 4 === 0 ? "absent" : "present";
      }
    } else {
      status = Math.random() > 0.15 ? "present" : (Math.random() > 0.5 ? "late" : "absent");
    }
    return {
      studentId: student.id || student.studentId || "",
      name: student.name,
      status
    };
  });

  return {
    success: true,
    records,
    summary: "Simulated AI scan: Analyzed participant logs and auto-assigned attendance rosters representing optimal classifications.",
    isSimulated: true
  };
}

// -----------------------------------------------------------------------------
// Endpoint: AI College Attendance Predictive Analytics & Parent Mail Drafts
// -----------------------------------------------------------------------------
app.post("/api/attendance/insights", async (req, res) => {
  try {
    const { courseName, students, history } = req.body;

    const dataPrompt = `
      You are an expert college academic risk officer. Analyze this college course attendance data:
      Course Name: "${courseName}"
      Students Roster & Attendance stats:
      ${JSON.stringify(students)}

      Historical class logs:
      ${JSON.stringify(history)}

      Please generate a state analysis in JSON format containing:
      1. An array of "riskStudents" who have critical attendance (< 75% attendance threshold) and might be barred from finals or failing.
         For each, give:
         - name
         - studentId
         - explanation: a detailed analysis of their trend (e.g. "Missed 3 out of last 4 Friday sessions").
         - parentWarningDraft: A highly professional, polite but firm letter draft warning the student of low performance.
      2. Comprehensive "classSummary": overall statistics, average rate, active roster health evaluation.
      3. Practical "teacherActionSteps": 3 actions the teacher can take to improve motivation or address chronic absenteeism.
    `;

    if (!process.env.GEMINI_API_KEY) {
      // Simulate beautiful insights
      const mockInsights = simulateAIInsights(courseName, students);
      return res.json(mockInsights);
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: dataPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskStudents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  studentId: { type: Type.STRING },
                  attendanceRate: { type: Type.NUMBER },
                  explanation: { type: Type.STRING },
                  parentWarningDraft: { type: Type.STRING }
                },
                required: ["name", "attendanceRate", "explanation", "parentWarningDraft"]
              }
            },
            classSummary: { type: Type.STRING },
            teacherActionSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["riskStudents", "classSummary", "teacherActionSteps"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output received for insights");
    }

    return res.json(JSON.parse(outputText.trim()));

  } catch (error: any) {
    console.error("AI Insights Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "An error occurred while compiling AI insights." 
    });
  }
});

function simulateAIInsights(courseName: string, students: any[]) {
  const processedStudents = students || [];
  const riskStudents = processedStudents
    .filter((s: any) => (s.attendanceRate || 100) < 75)
    .map((s: any) => ({
      name: s.name,
      studentId: s.studentId || s.id || "N/A",
      attendanceRate: s.attendanceRate || 68,
      explanation: `${s.name}'s attendance has fallen to ${s.attendanceRate || 68}%. They missed multiple critical lecture hours recently, showing a concerning downward trend especially in morning classes.`,
      parentWarningDraft: `Dear Parent/Guardian,\n\nWe are writing to bring to your attention that your student, ${s.name} (ID: ${s.studentId || s.id || "N/A"}), has dropped below the minimum required attendance threshold of 75% for the class "${courseName}". Currently, their attendance is at ${s.attendanceRate || 68}%.\n\nAcademic success is directly tied to active engagement. Please ensure they attend all future sessions to qualify for final trimester evaluations.\n\nSincerely,\nCollege Academic Board`
    }));

  return {
    success: true,
    riskStudents,
    classSummary: `The "${courseName}" class has an average attendance rate of ${(processedStudents.reduce((sum, s) => sum + (s.attendanceRate || 100), 0) / Math.max(1, processedStudents.length)).toFixed(1)}%. Real-time activity tracks general engagement well; however, ${riskStudents.length} student(s) require intervention due to attendance levels dropping below 75%.`,
    teacherActionSteps: [
      "Schedule a brief 5-minute feedback check-in with low-attendance students before next lecture.",
      "Incorporate digital micro-quizzes in the first 10 minutes of class to incentivize punctual arrivals.",
      "Ensure leave applications are verified promptly to clear sick leaves and college activities from absenteeism stats."
    ],
    isSimulated: true
  };
}

// -----------------------------------------------------------------------------
// Serve static client-side files
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
