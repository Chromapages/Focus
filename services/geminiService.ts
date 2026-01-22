
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Task, PartnerSchedule, DailySchedule, ScheduleBlock, BlockType, Priority } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Define the response schema using the Type enum as per guidelines
const responseSchema = {
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
          }
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

// Generate a daily schedule using the Gemini 3 Pro model for complex reasoning
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
    Tasks: ${tasksJson}
    Context: ${partnerContext}
    Rules:
    1. Total work time MUST be between 8.5 and 10 hours.
    2. Use provided estimates.
    3. 2-3 short breaks (10m) TOTAL.
    4. One long break (30m) for lunch.
    5. Prioritize "dueToday" and "High" priority.
  `;

  // Use gemini-3-pro-preview for complex scheduling tasks
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      systemInstruction: "You are an expert productivity planner. Return JSON."
    },
  });

  // Access .text property directly (getter)
  const data = JSON.parse(response.text || "{}");
  let currentTime = new Date();
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

  return { blocks: processedBlocks, overflowTaskIds: data.overflowTaskIds || [] };
};

// Parse voice transcript into task data using Gemini 3 Flash model
export const parseVoiceInput = async (transcript: string): Promise<Partial<Task>> => {
  const prompt = `Parse this task input into JSON: "${transcript}". 
  Return { title: string, priority: 'Low'|'Medium'|'High', estimatedMinutes: number, isDueToday: boolean }.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });
  // Access .text property directly
  return JSON.parse(response.text || "{}");
};

// Generate audio from text using the dedicated TTS model
export const speakText = async (text: string): Promise<Uint8Array> => {
  const aiTts = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  const response = await aiTts.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned");

  // Use the internal decode function
  return decode(base64Audio);
};

// Helper for decoding base64 audio strings
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper for decoding raw PCM data into an AudioBuffer
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Generate a dynamic daily briefing using Gemini
export const generateBriefingContent = async (
  tasks: Task[],
  appointments: Appointment[],
  userName: string
): Promise<string> => {
  const activeTasks = tasks.filter(t => !t.completed);
  const dueToday = activeTasks.filter(t => t.isDueToday);
  const highPriority = activeTasks.filter(t => t.priority === Priority.High);

  const context = {
    userName,
    totalTasks: activeTasks.length,
    dueTodayCount: dueToday.length,
    highPriCount: highPriority.length,
    appointmentsCount: appointments.length,
    firstAppointment: appointments[0] ? `${appointments[0].title} at ${appointments[0].time}` : "None",
    topTask: highPriority[0]?.title || dueToday[0]?.title || "None defined"
  };

  const prompt = `
    Generate a short, punchy, motivating daily briefing for ${context.userName}.
    Tone: "Jarvis" / Professional Executive Assistant. 
    Strict Limit: 2-3 sentences max.
    
    Data:
    - ${context.dueTodayCount} tasks due today (Top priority: ${context.topTask})
    - ${context.appointmentsCount} appointments (Next: ${context.firstAppointment})
    
    Example Output: "Good morning, Boss. You have 5 tasks on the slate today, starting with the high-priority client review. Your first meeting is at 10 AM, so let's get moving."
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
    });
    return response.text || "I'm ready to help you organize your day, Boss.";
  } catch (e) {
    console.error("Briefing Generation Failed", e);
    return `You have ${context.dueTodayCount} tasks due today. Let's get to work.`;
  }
};

// Helper for encoding binary data into a base64 string
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
