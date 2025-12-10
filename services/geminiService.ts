import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Task, PartnerSchedule, DailySchedule, ScheduleBlock, BlockType, Priority } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["work", "break"] },
          durationMinutes: { type: Type.INTEGER },
          label: { type: Type.STRING },
          assignedTaskIds: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          },
          reasoning: { type: Type.STRING }
        },
        required: ["type", "durationMinutes", "label", "assignedTaskIds"]
      }
    },
    overflowTaskIds: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["blocks", "overflowTaskIds"]
};

export const generateDailySchedule = async (
  tasks: Task[],
  partnerSchedule: PartnerSchedule,
  startTime: string
): Promise<DailySchedule> => {
  
  const tasksJson = JSON.stringify(tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    estimate: t.estimatedMinutes,
    dueToday: t.isDueToday
  })));

  const partnerContext = partnerSchedule.isWorking
    ? `My partner is working today from ${partnerSchedule.startTime} to ${partnerSchedule.endTime}. Try to align my heavy focus blocks with her work time if possible.`
    : "My partner is not working today.";

  const prompt = `
    I need a daily schedule plan starting at ${startTime}.
    
    Here are my tasks:
    ${tasksJson}

    Context:
    ${partnerContext}

    Rules:
    1. Total work time (sum of 'work' blocks) MUST be between 8.5 and 10 hours. Do not exceed 10 hours.
    2. One task = One Block. IMPORTANT: Use the 'estimate' provided in the task (e.g., 10 or 90 minutes) as the duration for its block.
    3. BREAK LOGIC: Do NOT put a break after every block. Only schedule 2-3 short breaks (10m) TOTAL for the whole day. Place them strategically (e.g., after every 2 blocks or 3 hours of work).
    4. Insert ONE long break (30m) for lunch/rest roughly halfway through the day.
    5. Prioritize "dueToday" tasks and "High" priority tasks first.
    6. If the sum of blocks exceeds the 10-hour limit, you MUST move the lowest priority or non-due-today tasks to 'overflowTaskIds'.
    7. Return a structured JSON response.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are an expert productivity planner using time-blocking techniques. You optimize for flow state and realistic energy levels."
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    // Post-process to add start/end times based on durations
    let currentTime = new Date();
    // Parse start time "HH:MM"
    const [startH, startM] = startTime.split(':').map(Number);
    currentTime.setHours(startH, startM, 0, 0);

    const processedBlocks: ScheduleBlock[] = (data.blocks || []).map((b: any, index: number) => {
      const blockStart = new Date(currentTime);
      const duration = b.durationMinutes || 90;
      currentTime.setMinutes(currentTime.getMinutes() + duration);
      const blockEnd = new Date(currentTime);

      return {
        id: `block-${index}-${Date.now()}`,
        type: b.type === 'work' ? BlockType.Work : BlockType.Break,
        startTime: blockStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        endTime: blockEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        durationMinutes: duration,
        taskIds: b.assignedTaskIds || [],
        label: b.label || (b.type === 'work' ? "Focus Block" : "Break"),
        completed: false
      };
    });

    return {
      blocks: processedBlocks,
      overflowTaskIds: data.overflowTaskIds || []
    };

  } catch (error) {
    console.error("AI Scheduling failed:", error);
    throw new Error("Failed to generate schedule.");
  }
};

export const parseVoiceInput = async (transcript: string): Promise<Partial<Task>> => {
  const prompt = `Parse this task input into JSON: "${transcript}". 
  Return { title: string, priority: 'Low'|'Medium'|'High', estimatedMinutes: number, isDueToday: boolean }.
  Logic:
  - Default estimatedMinutes: 90.
  - If words like "quick", "short", "meeting", "check" are used, set estimatedMinutes: 10.
  - Default priority: Medium.
  - Default due: Today.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { title: transcript, priority: Priority.Medium, estimatedMinutes: 90, isDueToday: true };
  }
};