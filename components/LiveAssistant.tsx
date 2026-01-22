
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { Mic, MicOff, X, MessageSquare, Volume2, Sparkles, Clock as ClockIcon } from 'lucide-react';
import { decode, decodeAudioData, encode } from '../services/geminiService';
import { Task, Appointment, Theme } from '../types';

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
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const isClosingRef = useRef(false);

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
      description: 'Call this tool when the user is done with the current interaction and you have finished updating tasks or schedule. This will close the voice assistant window.',
      properties: {}
    }
  };

  const handleSafeClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onClose();
  };

  const startSession = async () => {
    setIsConnecting(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      callbacks: {
        onopen: () => {
          setIsConnecting(false);
          setIsActive(true);
          const source = audioContextRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const l = inputData.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
              int16[i] = inputData[i] * 32768;
            }
            const pcmBlob = {
              data: encode(new Uint8Array(int16.buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContextRef.current!.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          // Handle transcriptions for visual feedback
          if (message.serverContent?.outputTranscription) {
            const text = message.serverContent.outputTranscription.text;
            setTranscripts(prev => [...prev.slice(-4), `AI: ${text}`]);
          }

          // Handle Tool Calls (Multiple calls can arrive in one message)
          if (message.toolCall) {
            const responses = message.toolCall.functionCalls.map(fc => {
              if (fc.name === 'setAppointment') {
                onSetAppointment(fc.args as any);
                return { id: fc.id, name: fc.name, response: { result: "Appointment scheduled." } };
              }
              if (fc.name === 'addTask') {
                onAddTask(fc.args as any);
                return { id: fc.id, name: fc.name, response: { result: "Task added to your list." } };
              }
              if (fc.name === 'finishConversation') {
                // If it's a finish call, we'll respond and then close.
                // We let the response send first if possible.
                setTimeout(() => handleSafeClose(), 1500); // Small delay to let final audio play out if any
                return { id: fc.id, name: fc.name, response: { result: "Closing assistant." } };
              }
              return null;
            }).filter(Boolean);

            if (responses.length > 0) {
              sessionPromise.then(s => s.sendToolResponse({
                functionResponses: responses as any
              }));
            }
          }

          // Handle Audio Output
          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && outputAudioContextRef.current) {
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
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
        onerror: (e) => console.error("Live Assistant Error:", e),
        onclose: () => {
          setIsActive(false);
          // If the session closes externally, also close the modal.
          handleSafeClose();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
        },
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: [setAppointmentFunc, addTaskFunc, finishConversationFunc] }],
        systemInstruction: `You are the Focus AI Assistant. Use a deep, warm, and helpful male voice. 
        Your goal is to help the user organize their day perfectly.
        
        The user's name is Eric. You should call him "Boss" frequently but naturally. 
        For example, say things like "You got it, Boss" or "Checking your schedule now, Eric."
        
        CRITICAL: If a user mentions multiple tasks (e.g., "Add buy milk, go to the gym, and call mom"), 
        you MUST call the 'addTask' tool separately for EACH individual task. Do not skip any.
        
        Information for Context:
        - Current Time: ${new Date().toLocaleTimeString()}
        - User's Name: Eric
        - User's Active Tasks: ${JSON.stringify(tasks)}
        - User's Appointments: ${JSON.stringify(appointments)}
        
        When the user asks "how much time left", calculate it based on the current time and their scheduled items.
        Always be encouraging, professional, and maintain that helpful persona for the Boss.

        CLOSING THE MODAL: When Eric indicates he is done (e.g., "That's all, thanks", "Goodbye Boss", or after you've processed everything he asked for and confirmed it), 
        YOU MUST call the 'finishConversation' tool to close this voice assistant window. Don't just say goodbye, execute the tool.`
      }
    });

    sessionRef.current = await sessionPromise;
  };

  useEffect(() => {
    startSession();
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
      <div className={`${theme.panelBg} w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh] border border-white/10`}>
        <div className="p-6 flex justify-between items-center border-b border-white/10 bg-black/10">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${theme.primary} animate-pulse shadow-lg`}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className={`font-bold ${theme.textPrimary}`}>Focus Voice AI</h2>
              <p className={`text-[10px] uppercase tracking-widest ${theme.textMuted}`}>Live Session Active</p>
            </div>
          </div>
          <button onClick={handleSafeClose} className={`p-2 rounded-full hover:bg-white/10 ${theme.textMuted} transition-colors`}>
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto space-y-6 flex flex-col">
          <div className="flex flex-col items-center justify-center py-12 flex-1">
            <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}>
              {/* Animated Rings */}
              {isActive && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping"></div>
                  <div className="absolute inset-4 rounded-full border-2 border-indigo-400/20 animate-pulse"></div>
                </>
              )}
              <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 ${isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-800'} shadow-inner transition-colors`}>
                {isActive ? <Volume2 size={48} className="text-indigo-400" /> : <MicOff size={48} className="text-slate-500" />}
              </div>
            </div>
            
            <div className="mt-8 text-center">
               <p className={`text-lg font-bold ${theme.textPrimary}`}>
                 {isConnecting ? 'Waking up, Boss...' : isActive ? "I'm Listening, Eric." : 'Mic is Off'}
               </p>
               <p className={`text-sm ${theme.textMuted} mt-2 max-w-xs mx-auto`}>
                 {isActive ? 'Talk to me about your tasks, priorities, or schedule.' : 'Session ended or interrupted.'}
               </p>
            </div>
          </div>

          <div className="space-y-3 mt-auto">
            {transcripts.map((t, i) => (
              <div key={i} className={`p-4 rounded-2xl text-sm animate-slide-down ${t.startsWith('AI:') ? `${theme.secondary} shadow-sm border border-indigo-100/20 self-start mr-12` : 'bg-slate-800 text-slate-100 self-end ml-12'}`}>
                <div className="flex items-center gap-2 mb-1 opacity-50 font-bold text-[10px] uppercase">
                  {t.startsWith('AI:') ? <Sparkles size={10} /> : <MessageSquare size={10} />}
                  {t.startsWith('AI:') ? 'Focus Assistant' : 'You'}
                </div>
                {t.startsWith('AI:') ? t.replace('AI:', '') : t}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-black/30 border-t border-white/5">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.primary} shadow-sm`}>
              <ClockIcon size={18} />
            </div>
            <div className="flex-1">
               <p className={`text-xs font-bold ${theme.textPrimary} uppercase tracking-wider`}>Live Context</p>
               <p className={`text-[10px] ${theme.textMuted}`}>Eric, I'm managing {tasks.length} tasks and {appointments.length} events for you.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAssistant;
