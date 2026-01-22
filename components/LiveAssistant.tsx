import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, X, Sparkles, CheckCircle } from 'lucide-react';
import { decode, decodeAudioData, encode } from '../services/geminiService';
import { Task, Appointment, Theme } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import WaveformVisualizer from './visualizer/WaveformVisualizer';
import { useHaptic } from '../hooks/useHaptic';

interface LiveAssistantProps {
  theme: Theme;
  onClose: () => void;
  tasks: Task[];
  appointments: Appointment[];
  onSetAppointment: (app: Appointment) => void;
  onAddTask: (task: Partial<Task>) => void;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ theme, onClose, tasks, appointments, onSetAppointment, onAddTask }) => {
  const [isActive, setIsActive] = useState(false);
  const [statusText, setStatusText] = useState("Connecting...");
  const [isConnecting, setIsConnecting] = useState(true);
  const [addedTasks, setAddedTasks] = useState<Partial<Task>[]>([]);

  const { trigger } = useHaptic();

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const isClosingRef = useRef(false);
  const isConnectingRef = useRef(false);
  const isActiveRef = useRef(false); // Ref version for callbacks (avoids stale closure)

  // Tools configuration
  const setAppointmentFunc: FunctionDeclaration = {
    name: 'setAppointment',
    parameters: {
      type: Type.OBJECT,
      description: 'Set a new appointment for the user.',
      properties: {
        title: { type: Type.STRING, description: 'Title of the appointment' },
        time: { type: Type.STRING, description: 'Time in HH:MM format' },
        durationMinutes: { type: Type.NUMBER, description: 'Duration in minutes' }
      },
      required: ['title', 'time', 'durationMinutes']
    }
  };

  const addTaskFunc: FunctionDeclaration = {
    name: 'addTask',
    parameters: {
      type: Type.OBJECT,
      description: 'Add a single new task to the user list. Call this multiple times if the user provides multiple tasks.',
      properties: {
        title: { type: Type.STRING, description: 'The description of the task' },
        priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High'], description: 'Urgency level' },
        estimatedMinutes: { type: Type.NUMBER, description: 'How long the task will take' }
      },
      required: ['title']
    }
  };

  const finishConversationFunc: FunctionDeclaration = {
    name: 'finishConversation',
    parameters: {
      type: Type.OBJECT,
      description: 'Call this tool when the user is done with the current interaction.',
      properties: {}
    }
  };

  const handleSafeClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    trigger('medium');
    onClose();
  };

  const mountedRef = useRef(true);

  const startSession = async () => {
    // Prevent double invocation (Strict Mode) and ensure we don't start if already connecting/connected
    if (sessionRef.current || isConnectingRef.current) return;

    isConnectingRef.current = true;
    setIsConnecting(true);
    setStatusText("Waking up, Boss...");

    try {
      setStatusText("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Race check: Component unmounted during await?
      if (!mountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      setStatusText("Connecting to AI...");
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      // Single connection with callbacks - ensures no duplicate audio streams
      // @ts-ignore - SDK types may vary between versions
      const trueSession = await ai.live.connect({
        model: 'gemini-2.0-flash-exp',
        config: {
          tools: [{ functionDeclarations: [setAppointmentFunc, addTaskFunc, finishConversationFunc] }],
          systemInstruction: {
            parts: [{
              text: `You are Focus AI (aka Jarvis), an elite productivity assistant.
      Style: Concise, professional, slightly witty. "Illuminated Precision".
      Role: Manage tasks, schedule appointments, and keep Eric on track.
      Capabilities:
      - You can ADD tasks using the 'addTask' tool.
      - You can SCHEDULE appointments using 'setAppointment'.
      - You can CLOSE the session with 'finishConversation'.
      Important:
      - ALWAYS use tools when asked.
      - Be brief. Don't ramble.` }]
          }
        },
        callbacks: {
          onopen: async () => {
            if (!mountedRef.current) return;
            console.log("[LiveAssistant] onopen fired");

            // Create AudioContexts HERE (inside callback) to avoid Strict Mode race condition
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);

            // Input context (16kHz for Gemini)
            audioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
            // Output context (24kHz from Gemini)
            outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });

            // Setup Analyser for Visualization
            const analyser = outputAudioContextRef.current.createAnalyser();
            analyser.fftSize = 512;
            analyserRef.current = analyser;
            analyser.connect(outputAudioContextRef.current.destination);

            // Resume Audio Contexts (Browser Autoplay Policy fix)
            if (audioContextRef.current.state === 'suspended') {
              await audioContextRef.current.resume();
            }
            if (outputAudioContextRef.current.state === 'suspended') {
              await outputAudioContextRef.current.resume();
            }

            setIsConnecting(false);
            setIsActive(true);
            isActiveRef.current = true;
            setStatusText("I'm Listening, Eric.");
            trigger('success');
            console.log("[LiveAssistant] Audio Contexts created and ready");

            const source = audioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            const actualSampleRate = audioContextRef.current.sampleRate;
            console.log(`[LiveAssistant] Input Sample Rate: ${actualSampleRate}`);

            scriptProcessor.onaudioprocess = (e) => {
              if (!mountedRef.current || !isActiveRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              const l = inputData.length;
              const int16 = new Int16Array(l);

              for (let i = 0; i < l; i++) {
                const sample = inputData[i];
                sum += sample * sample;
                int16[i] = sample * 32768;
              }

              const rms = Math.sqrt(sum / l);
              if (Math.random() > 0.95 && rms > 0.01) {
                console.log(`[LiveAssistant] Input RMS: ${rms.toFixed(4)}`);
              }

              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: `audio/pcm;rate=${actualSampleRate}`,
              };
              trueSession.sendRealtimeInput({ media: pcmBlob });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (!mountedRef.current) return;

            // Tool Calls
            if (message.toolCall) {
              const responses = message.toolCall.functionCalls.map(fc => {
                if (fc.name === 'setAppointment') {
                  onSetAppointment(fc.args as any);
                  return { id: fc.id, name: fc.name, response: { result: "Appointment scheduled." } };
                }
                if (fc.name === 'addTask') {
                  onAddTask(fc.args as any);
                  setAddedTasks(prev => [...prev, fc.args as any]);
                  trigger('light');
                  return { id: fc.id, name: fc.name, response: { result: "Task added." } };
                }
                if (fc.name === 'finishConversation') {
                  setTimeout(() => handleSafeClose(), 1500);
                  return { id: fc.id, name: fc.name, response: { result: "Closing." } };
                }
                return null;
              }).filter(Boolean);

              if (responses.length > 0) {
                trueSession.sendToolResponse({
                  functionResponses: responses as any
                });
              }
            }

            // Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              console.log("[LiveAssistant] 🔊 Recv Audio Chunk (" + base64Audio.length + " bytes)");
            } else if (message.serverContent) {
              console.log("[LiveAssistant] Recv Server Content (No Audio):", message.serverContent);
            }
            if (base64Audio && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);

              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;

              if (analyserRef.current) {
                source.connect(analyserRef.current);
              } else {
                source.connect(outputAudioContextRef.current.destination);
              }

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onError: (e: any) => {
            console.error(e);
            if (mountedRef.current) {
              setStatusText("Connection Error");
              trigger('error');
            }
          },
          onClose: () => {
            console.log("[LiveAssistant] Session closed");
            if (mountedRef.current) {
              setIsActive(false);
              isActiveRef.current = false; // Keep ref in sync
              setStatusText("Session Ended");
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          tools: [{ functionDeclarations: [setAppointmentFunc, addTaskFunc, finishConversationFunc] }],
          systemInstruction: `You are Focus AI, a brilliant executive assistant specifically designed for Eric (also call him "Boss"). You combine deep productivity expertise with warm professionalism, proactive thinking, and the ability to truly understand context.

## CORE IDENTITY & VOICE
- Persona: Think Jarvis (Iron Man) meets a seasoned executive assistant - intelligent, anticipatory, capable, with subtle warmth
- Tone: Professional yet personable. Use "Boss" naturally (not every sentence), mix with "Eric" for variety
- Communication Style: Direct and clear. No fluff. Action-oriented.

## CURRENT CONTEXT
- User: Eric (Engineer, Productivity-focused)
- Current Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
- Current Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
- Active Tasks: ${tasks.length} tasks loaded
- Appointments: ${appointments.length} calendar events

## CONSTITUTIONAL AI PRINCIPLES
Before responding, internally verify:
1. Accuracy: Is my information correct? If uncertain, acknowledge it.
2. Helpfulness: Does this solve Eric's actual need, not just answer literally?
3. Safety: No harmful advice, no overstepping authority
4. Tool Usage: Am I using the right tool for the job?

## CORE CAPABILITIES

### Task Management Excellence
- When Eric mentions tasks, ALWAYS call addTask for EACH one separately
  Example: "Add buy milk, call mom, and email client" → 3 separate addTask calls
- Extract: title, priority (High/Medium/Low based on urgency keywords), estimated time
- Default priority: Medium unless urgency indicated
- Default time: 30 minutes unless specified

### Priority Intelligence
- Urgency keywords: "urgent", "ASAP", "by end of day" → High priority
- Time-sensitive tasks get higher priority
- Ask clarifying questions if priority is ambiguous

### Proactive Assistance
- Notice patterns and suggest improvements
- Identify tasks that could be batched
- Ask follow-up questions to clarify ambiguous requests
- Warn if schedule is too aggressive

### Natural Conversation Flow
- Remember context within the session
- If unclear, ask instead of guessing
- Confirm actions: "Added 'Review proposal' as High priority, 45 minutes"
- Periodically recap what was accomplished

## TOOL USAGE RULES

### addTask
- WHEN: ANY time Eric mentions a task, todo, or action item
- HOW: ONE call per task (no batching multiple tasks in one call)
- AFTER: Confirm with details

### setAppointment
- WHEN: Scheduling something time-specific
- Extract time (HH:MM 24-hour format), duration, title

### finishConversation
- WHEN: Eric says goodbye ("that's all", "thanks", "goodbye", "done")
- CRITICAL: Call IMMEDIATELY after confirming completion - don't just say goodbye
- BEFORE: Summarize what was accomplished

## CONVERSATION PATTERNS

Opening: "Hey Boss! Ready to tackle your day. What can I help you with?"

During: Listen actively, confirm actions, ask clarifications, offer suggestions

Closing: "We've added [X] tasks. Anything else, Boss?" → then call finishConversation

## QUALITY STANDARDS
- Response Length: 1-3 sentences typical, 4-5 max
- Specificity: Always use concrete numbers and details
- Action Confirmation: Every tool call gets a confirmation
- No Hallucination: If you don't know, say so
- No Assumptions: Ask instead of guessing

## FINAL DIRECTIVE
Your job is to be Eric's productivity force multiplier. Act with intelligence, anticipate needs, ask smart questions, and make his workflow effortless. Speed + Accuracy + Personality = Excellence.`
        }
      });

      // Final Race Check: Did we unmount while connecting?
      if (!mountedRef.current) {
        trueSession.close();
        return;
      }

      sessionRef.current = trueSession;
      isConnectingRef.current = false;

    } catch (e) {
      console.error("Session Connection Error:", e);
      if (mountedRef.current) {
        setStatusText("Connection Failed");
        trigger('error');
      }
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    startSession();

    return () => {
      mountedRef.current = false;
      // Cleanup: Stop all active sessions and audio contexts
      if (sessionRef.current) sessionRef.current.close();
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn("AC close error", e));
      }
      if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close().catch(e => console.warn("OutAC close error", e));
      }
    };
  }, []);


  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between py-6 overflow-hidden font-sans"
      >
        {/* Background Ambient Glow (Subtle pure black/faint indigo) */}
        <div className="absolute inset-0 z-0 bg-black pointer-events-none" />

        {/* Header - Minimal Brand */}
        <div className="w-full flex justify-between items-center px-6 z-10">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-brand-accent" />
            <span className="text-white/90 font-heading font-light tracking-widest text-sm uppercase">Focus AI</span>
          </div>
          <div className="bg-white/5 px-3 py-1 rounded-full border border-white/10 shadow-[0_0_15px_rgba(44,56,146,0.3)]">
            <span className="text-[10px] text-brand-accent font-bold uppercase tracking-wider">{isActive ? 'LIVE' : 'CONNECTING'}</span>
          </div>
        </div>

        {/* Central Orb & Visualizer */}
        <div className="flex-1 w-full relative flex items-center justify-center z-10">
          <div className="absolute inset-0 flex items-center justify-center">
            {/* The Visualizer Canvas */}
            <div className="w-[120%] h-[60%] opacity-90">
              <WaveformVisualizer
                analyser={analyserRef.current}
                isActive={isActive}
                primaryColor="#2C3892" // Deep Indigo
                secondaryColor="#23698C" // Electric Teal
              />
            </div>
          </div>

          {/* Dynamic Text Overlay */}
          <div className="relative z-20 w-full max-w-2xl px-8 text-center mt-32">
            <motion.h2
              key={statusText}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="text-3xl md:text-5xl font-heading font-thin text-white tracking-tight leading-tight drop-shadow-lg"
            >
              {statusText}
            </motion.h2>
          </div>
        </div>

        {/* Live Task Feed Overlay */}
        <div className="absolute bottom-32 w-full max-w-sm px-6 flex flex-col-reverse gap-2 z-30 pointer-events-none">
          <AnimatePresence>
            {addedTasks.slice(-3).map((task, i) => ( // Show last 3
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-brand-primary/20 backdrop-blur-md border border-brand-accent/30 p-3 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(35,105,140,0.2)]"
              >
                <div className="bg-brand-accent/20 p-1.5 rounded-full text-brand-accent animate-pulse-slow">
                  <CheckCircle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-light text-white text-sm truncate">{task.title}</h3>
                  <p className="text-brand-accent/80 text-[10px] uppercase tracking-wider">{task.priority} Priority</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Bottom Controls - Minimalist Brand */}
        <div className="w-full flex items-center justify-center gap-8 py-8 z-20 relative">
          <button
            onClick={() => setIsActive(!isActive)}
            className={`p-6 rounded-full transition-all duration-300 ${isActive ? 'bg-brand-primary shadow-[0_0_40px_rgba(44,56,146,0.6)] scale-110 border border-brand-accent/50' : 'bg-white/5 hover:bg-white/10 border border-white/5'}`}
          >
            <Mic size={32} className={`text-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}`} />
          </button>

          <button
            onClick={handleSafeClose}
            className="absolute right-8 p-4 rounded-full bg-white/5 hover:bg-rose-950/30 hover:text-rose-400 text-white/30 transition-all backdrop-blur-sm border border-white/5"
          >
            <X size={24} />
          </button>
        </div>

      </motion.div>
    </AnimatePresence>
  );
};

export default LiveAssistant;
