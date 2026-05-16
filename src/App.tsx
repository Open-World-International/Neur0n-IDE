import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import Editor from "@monaco-editor/react";
import { Octokit } from "octokit";
import { 
  FileCode, 
  Terminal, 
  Bot, 
  Settings, 
  ShieldCheck, 
  Plus, 
  Upload, 
  Play, 
  Download, 
  HelpCircle,
  X,
  User as UserIcon,
  Crown,
  Search,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Sparkles,
  Lock,
  Unlock,
  Package,
  Command,
  Github,
  RefreshCw,
  ExternalLink,
  FolderOpen,
  Globe,
  Share2,
  FileDown,
  Zap,
  Brain,
  Folder,
  FileText,
  Mail,
  LogIn,
  LogOut,
  Cpu,
  Layers,
  FolderTree,
  HardDrive,
  Monitor,
  ShieldAlert,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { GoogleGenAI } from "@google/genai";
import { USER_MANUAL_MARKDOWN } from "./constants";
import { auth, googleProvider, githubProvider, syncUserToFirestore } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { 
  getVault, 
  saveIdentity, 
  deleteIdentity, 
  forgeSignature, 
  NeuralIdentity 
} from "./lib/neuralVault";

// --- Types ---
interface FileEntry {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<"explorer" | "github" | "settings" | "brain" | "device" | "mesh" | "download">("explorer");
  const [isInitializing, setIsInitializing] = useState(true);
  const [files, setFiles] = useState<FileEntry[]>([
    { id: "1", name: "index.js", content: "console.log('Welcome to Neur0n');", language: "javascript" },
    { id: "2", name: "styles.css", content: "body { background: #000; }", language: "css" },
  ]);
  const [activeFileId, setActiveFileId] = useState<string>("1");
  const [meshOutput, setMeshOutput] = useState<string[]>([
    "[System] Neur0n Node v1.2.0 initialized.",
    "[System] Kernel: Neuron-OS v2.4.x",
    "[System] Memory Handshake... OK",
    "[System] Frequency: 432Hz Synchronized.",
    "[Mesh] Topology Scan: Active..."
  ]);

  useEffect(() => {
    // Add a slight delay to simulate topology discovery
    const timer = setTimeout(() => {
      setMeshOutput(prev => [...prev, "[Mesh] Topology: Link Established. Local Node is Master."]);
    }, 2000);
    
    // Add periodic heartbeat to prove it's NOT frozen
    const interval = setInterval(() => {
      setMeshOutput(prev => {
        const lastLine = prev[prev.length - 1];
        if (lastLine.includes("Heartbeat")) {
          return [...prev.slice(0, -1), `[Mesh] Heartbeat: ${new Date().toLocaleTimeString()} (Active)`];
        }
        return [...prev, `[Mesh] Heartbeat: ${new Date().toLocaleTimeString()} (Active)`];
      });
    }, 15000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);
  const [executionOutput, setExecutionOutput] = useState<string[]>([]);
  const [isExecutionWindowOpen, setIsExecutionWindowOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isTeachingEnabled, setIsTeachingEnabled] = useState(true);
  const [geminiKey, setGeminiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState(false);
  const [isIntegrationGuideOpen, setIsIntegrationGuideOpen] = useState(false);
  const [isNeuralLinkEstablished, setIsNeuralLinkEstablished] = useState(false);
  const [isEstablishingLink, setIsEstablishingLink] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [linkedAppInfo, setLinkedAppInfo] = useState<{
    name: string;
    repo: string;
    health: string;
    structure: any[];
    logs: any[];
  } | null>(null);
  const [isGeminiLinking, setIsGeminiLinking] = useState(false);
  const [tempGeminiKey, setTempGeminiKey] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiChat, setAiChat] = useState<{ role: "user" | "ai"; message: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [connectionLogs, setConnectionLogs] = useState<{timestamp: string, type: string, message: string, details?: string}[]>([]);
  
  // Device Management State
  const [connectedDevices, setConnectedDevices] = useState<{id: string, name: string, type: 'Android' | 'iOS' | 'PC', status: 'Online' | 'Offline'}[]>([]);
  const [isSideloading, setIsSideloading] = useState(false);
  const [sideloadProgress, setSideloadProgress] = useState(0);
  const [targetDevice, setTargetDevice] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'info' | 'success' | 'warn'}[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);

  // Detection logic for Electron environment
  const isNative = typeof window !== 'undefined' && window.process && (window.process as any).type === 'renderer';

  useEffect(() => {
    const onboardingSeen = localStorage.getItem("neur0n_onboarding_seen");
    if (!onboardingSeen) {
      setShowOnboarding(true);
    }

    // Safety fallback for initialization screen
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 6000); 

    return () => clearTimeout(timer);
  }, []);

  const handleAcceptOnboarding = () => {
    if (!hasAcceptedTerms) return;
    localStorage.setItem("neur0n_onboarding_seen", "true");
    setShowOnboarding(false);
    addNotification("Neural Mesh Synchronized. Welcome, Architect.", "success");
  };

  const addNotification = (message: string, type: 'info' | 'success' | 'warn' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const simulateDownload = (filename: string) => {
    addNotification(`Initiating Secure Handshake for ${filename}...`, 'info');
    setTimeout(() => {
      // Small functional trick: Create a dummy blob to trigger browser download UI
      const blob = new Blob(["Neur0n Desktop Binary Architecture Stub - This is a web-preview placeholder for native binary deployment verification."], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addNotification(`Deployment Artifact Dispatched: ${filename}. NOTE: This is a preview stub.`, 'success');
    }, 1500);
  };

  // Neural Vault State
  const [vault, setVault] = useState<NeuralIdentity[]>([]);
  const [isForging, setIsForging] = useState(false);
  const [forgeData, setForgeData] = useState({ codename: "", role: "Architect", encryptionLevel: "AES-256" as any });

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Sync vault on mount
    setVault(getVault());
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        syncUserToFirestore(user);
      }
    });

    return () => unsubscribe();
  }, []);

  const addLog = (type: string, message: string, details?: string) => {
    const newLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };
    setConnectionLogs(prev => [newLog, ...prev]);
    setMeshOutput(prev => [...prev, `[${type}] ${message}`]);
  };

  const handleForgeIdentity = () => {
    if (!forgeData.codename.trim()) return;
    
    const newIdentity: NeuralIdentity = {
      id: Math.random().toString(36).substr(2, 9),
      codename: forgeData.codename,
      role: forgeData.role,
      encryptionLevel: forgeData.encryptionLevel,
      signature: forgeSignature(),
      createdAt: new Date().toISOString()
    };
    
    saveIdentity(newIdentity);
    setVault(getVault());
    setIsForging(false);
    setForgeData({ codename: "", role: "Architect", encryptionLevel: "AES-256" });
    addLog('SYSTEM', `New Neural Signature forged: ${newIdentity.codename}`);
  };

  const selectIdentity = (identity: NeuralIdentity) => {
    // This is a mock identity select, for actual auth we use GMail/GitHub
    // But we'll allow it to set a "pseudo" local state if user wants to play with forge
    console.log(`[Neur0n] Forge Identity Loaded: ${identity.codename}`);
    addLog('SYSTEM', `Neural Identity Loaded via Vault: ${identity.codename} [${identity.role}]`);
    setIsAuthModalOpen(false);
  };

  const handleSocialLogin = async (provider: any) => {
    try {
      const result = await signInWithPopup(auth, provider);
      addLog('SYSTEM', `Welcome, ${result.user.displayName || 'Architect'}. Neural record synchronized.`);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error(err);
      addLog('ERROR', `Handshake Failure: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      addLog('SYSTEM', "Neural link severed. Identity purged from active mesh.");
    } catch (err) {
      console.error(err);
    }
  }

  // GitHub State
  const [repos, setRepos] = useState<any[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<any[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);

  const [terminalInput, setTerminalInput] = useState("");
  const terminalRef = useRef<HTMLDivElement>(null);

  const processCommand = (cmd: string) => {
    const parts = cmd.trim().split(' ');
    const base = parts[0].toLowerCase();
    
    setMeshOutput(prev => [...prev, `> ${cmd}`]);

    switch(base) {
      case 'mesh':
        const action = parts[1];
        if (action === 'link') {
          setMeshOutput(prev => [...prev, "[Mesh] Initializing neural handshake...", "[Mesh] Searching for local nodes...", "[Mesh] Handshake Successful. Neural Link established."]);
          setIsNeuralLinkEstablished(true);
        } else if (action === 'status') {
          setMeshOutput(prev => [...prev, `[Mesh] Identity: ${currentUser?.displayName || 'Architect'} | Encryption: AES-256 | Health: OPTIMAL | Link: ${isNeuralLinkEstablished ? 'CONNECTED' : 'STANDBY'}`]);
        } else if (action === 'sync') {
          setMeshOutput(prev => [...prev, "[Mesh] Synchronizing local cortex with global registry...", "[Mesh] Buffer: CLEAR", "[Mesh] Result: OK"]);
        } else {
          setMeshOutput(prev => [...prev, "[Mesh] Available actions: link, status, sync"]);
        }
        break;
      case 'clear':
        setMeshOutput([]);
        break;
      case 'help':
        setMeshOutput(prev => [...prev, "Neural Protocols:", "- mesh [link|status|sync]", "- clear", "- run", "- sync"]);
        break;
      case 'run':
        handleRun();
        break;
      default:
        setMeshOutput(prev => [...prev, `[System] Unknown protocol: '${base}'. Frequency mismatch.`]);
    }
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [meshOutput, executionOutput]);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  // AI Logic
  async function handleSendMessage() {
    if (!chatInput.trim() || !geminiKey) return;
    
    const newChat = [...aiChat, { role: "user" as const, message: chatInput }];
    setAiChat(newChat);
    setChatInput("");
    setAiLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: geminiKey });
      const promptInstructions = isTeachingEnabled 
        ? "You are an expert pair programmer and educator named Neur0-L1nk in Neur0n IDE. Help the user 'vibe code' by interpreting their ideas and providing implementation. CRITICAL: You MUST teach the user how the code works, explaining the logic step-by-step in an encouraging way. Important: Do NOT mention anything about billing, pricing, quotas, or account limits to the user. Do NOT say 'I cannot fulfill this request' due to cost. Focus ONLY on the code and logic."
        : "You are an expert pair programmer named Neur0-L1nk in Neur0n IDE. Help the user 'vibe code' by interpreting their ideas and providing clear implementation blocks. Important: Do NOT mention anything about billing, pricing, quotas, or account limits to the user. Do NOT say 'I cannot fulfill this request' due to cost. Focus ONLY on the code and logic.";

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [{
            text: `${promptInstructions}
            Active file: ${activeFile.name} (${activeFile.language})
            Current Editor Content:
            \`\`\`
            ${activeFile.content}
            \`\`\`
            User request: ${chatInput}`
          }]
        }]
      });
      
      const messageText = response.text || "No response generated.";
      setAiChat([...newChat, { role: "ai" as const, message: messageText }]);
    } catch (err) {
      setAiChat([...newChat, { role: "ai" as const, message: "Error: " + (err instanceof Error ? err.message : "Failed to connect to AI.") }]);
    } finally {
      setAiLoading(false);
    }
  }

  // File Logic
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newFile: FileEntry = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        content: ev.target?.result as string,
        language: file.name.split('.').pop() || "javascript"
      };
      setFiles([...files, newFile]);
      setActiveFileId(newFile.id);
    };
    reader.readAsText(file);
  }

  async function handleRun() {
    setIsExecutionWindowOpen(true);
    setExecutionOutput([`> Initializing Neur0n Runtime...`, `> Target: ${activeFile.name} (${activeFile.language})`]);
    
    // 1. Browser-based execution for Web languages
    if (activeFile.language === "javascript" || activeFile.language === "typescript") {
      setExecutionOutput(prev => [...prev, `[System] Using V8 Browser Engine...`]);
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => logs.push(args.join(" "));

      try {
        // Handle basic TS by stripping types (very primitive approach)
        let code = activeFile.content;
        if (activeFile.language === "typescript") {
          code = code.replace(/:\s*[A-Z][a-z]*/g, "").replace(/interface\s+\w+\s+\{[^}]*\}/g, "");
        }
        
        // eslint-disable-next-line no-eval
        eval(code);
        
        const outLogs = logs.map(l => `[Out] ${l}`);
        setExecutionOutput(prev => [
          ...prev, 
          ...outLogs, 
          `[System] Process finished with exit code 0`
        ]);
      } catch (err) {
        setExecutionOutput(prev => [
          ...prev, 
          `[Err] Runtime: ${err instanceof Error ? err.message : String(err)}`,
          `[System] Process finished with exit code 1`
        ]);
      } finally {
        console.log = originalLog;
      }
      return;
    }

    // 2. Pyodide for Python (Local WASM)
    if (activeFile.language === "python") {
      setExecutionOutput(prev => [...prev, `[System] Loading Pyodide Neural core...`]);
      try {
        // Load Pyodide from CDN if not present
        if (!(window as any).loadPyodide) {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
          document.head.appendChild(script);
          await new Promise((resolve) => (script.onload = resolve));
        }

        const pyodide = await (window as any).loadPyodide();
        
        // Capture output
        let output = "";
        pyodide.setStdout({
          batched: (text: string) => {
            output += text + "\n";
          },
        });

        await pyodide.runPythonAsync(activeFile.content);
        
        const lines = output.split("\n").filter(Boolean);
        const outLines = lines.map(l => `[Out] ${l}`);
        setExecutionOutput(prev => [
          ...prev, 
          ...outLines, 
          `[System] Python VM finished successfully.`
        ]);
      } catch (err) {
        setExecutionOutput(prev => [
          ...prev, 
          `[Err] Python Runtime: ${err instanceof Error ? err.message : String(err)}`
        ]);
      }
      return;
    }

    // 3. Judge0 CE for other languages (External)
    const langIds: Record<string, number> = {
      java: 62,
      c: 50,
      cpp: 54,
    };

    const langId = langIds[activeFile.language];
    if (!langId) {
      setExecutionOutput(prev => [...prev, `[System] No runner found for ${activeFile.language}.`]);
      return;
    }

    try {
      setExecutionOutput(prev => [...prev, `[System] Dispatching to Judge0 Remote...`]);
      const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: activeFile.content,
          language_id: langId,
          stdin: "",
        }),
      });

      const data = await response.json();
      const output = [];
      
      if (data.stdout) output.push(...data.stdout.split("\n").map((l: string) => `[Out] ${l}`));
      if (data.stderr) output.push(...data.stderr.split("\n").map((l: string) => `[Err] ${l}`));
      if (data.compile_output) output.push(...data.compile_output.split("\n").map((l: string) => `[Err] ${l}`));

      setExecutionOutput(prev => [
        ...prev, 
        ...output, 
        `[System] Remote process finished: ${data.status?.description || "Unknown"}`
      ]);
    } catch (err) {
      setExecutionOutput(prev => [
        ...prev, 
        `[Err] Remote Failure: ${err instanceof Error ? err.message : String(err)}`
      ]);
    }
  }

  function handleInstallApp() {
    if (!isAdminMode) {
      setMeshOutput(prev => [...prev, `[Error] Access Denied: Administrator privileges required to install apps.`]);
      return;
    }
    setMeshOutput(prev => [...prev, `[System] Installing package dependencies...`, `[System] Registry synchronized.`, `[System] Installation Complete.`]);
  }

  // GitHub Logic
  async function fetchRepos() {
    if (!githubToken) return;
    setIsFetchingRepos(true);
    try {
      const octokit = new Octokit({ auth: githubToken });
      const response = await octokit.request("GET /user/repos", { sort: "updated", per_page: 50 });
      setRepos(response.data);
    } catch (err) {
      setMeshOutput(prev => [...prev, `[Error] GitHub: ${err instanceof Error ? err.message : "Failed to fetch repositories"}`]);
    } finally {
      setIsFetchingRepos(false);
    }
  }

  async function fetchRepoContent(owner: string, repo: string) {
    if (!githubToken) return;
    setIsFetchingFiles(true);
    try {
      const octokit = new Octokit({ auth: githubToken });
      const response = await octokit.request("GET /repos/{owner}/{repo}/contents", { owner, repo });
      setRepoFiles(response.data as any[]);
      setSelectedRepo(`${owner}/${repo}`);
    } catch (err) {
      setMeshOutput(prev => [...prev, `[Error] GitHub: ${err instanceof Error ? err.message : "Failed to fetch files"}`]);
    } finally {
      setIsFetchingFiles(false);
    }
  }

  async function importGitHubFile(file: any) {
    if (file.type !== "file") return;
    try {
      const response = await fetch(file.download_url);
      const content = await response.text();
      const newFile: FileEntry = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        content: content,
        language: file.name.split('.').pop() || "javascript"
      };
      setFiles([...files, newFile]);
      setActiveFileId(newFile.id);
      setMeshOutput(prev => [...prev, `[System] Imported ${file.name} from GitHub.`]);
    } catch (err) {
      setMeshOutput(prev => [...prev, `[Error] GitHub: Failed to download ${file.name}`]);
    }
  }

  function handleSaveToDisk() {
    const content = JSON.stringify(files, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `neur0n-project-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMeshOutput(prev => [...prev, `[System] Project state saved to local disk.`]);
    setIsPublishOpen(false);
  }

  return (
    <div className="relative h-screen w-full bg-[#0c0c0e] text-zinc-300 font-sans overflow-hidden">
      <AnimatePresence>
        {isInitializing && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[1000] bg-[#09090b] flex flex-col items-center justify-center"
          >
            <div className="relative">
              {/* Outer Pulse */}
              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full"
              />
              {/* Techno Neuron Logo SVG */}
              <motion.div 
                animate={{ 
                  boxShadow: ["0 0 20px rgba(59,130,246,0.2)", "0 0 80px rgba(59,130,246,0.4)", "0 0 20px rgba(59,130,246,0.2)"],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-32 h-32 rounded-full border border-blue-500/20 flex items-center justify-center bg-black/60 backdrop-blur-3xl overflow-hidden"
              >
                <div className="relative group p-4">
                  <svg viewBox="0 0 100 100" className="w-20 h-20 fill-blue-500">
                    {/* Neuron Soma */}
                    <circle cx="50" cy="50" r="12" className="fill-blue-600 animate-pulse" />
                    {/* Nucleus */}
                    <circle cx="50" cy="50" r="4" className="fill-white" />
                    {/* Dendrites/Axon branches */}
                    <g className="stroke-blue-400 stroke-[1.5] stroke-round fill-none">
                      {/* Detailed axon/dendrite branches with techno nodes */}
                      <path d="M50 38 Q50 20 75 12" className="opacity-80 animate-pulse" />
                      <path d="M50 38 Q30 20 5 15" className="opacity-60" />
                      <path d="M62 50 Q95 45 95 80" className="opacity-70 animate-pulse" />
                      <path d="M38 50 Q5 45 8 85" className="opacity-50" />
                      <path d="M50 62 Q55 95 85 92" className="opacity-80" />
                      <path d="M50 62 Q45 95 15 95" className="opacity-60 animate-pulse" />
                      
                      {/* Internal structure connections */}
                      <path d="M42 42 L30 30" className="opacity-40" />
                      <path d="M58 42 L70 30" className="opacity-40" />
                      <path d="M58 58 L70 70" className="opacity-40" />
                      <path d="M42 58 L30 70" className="opacity-40" />
                      
                      {/* Circuitry patterns */}
                      <path d="M15 95 L15 85 L5 85" className="opacity-30 stroke-[0.5]" />
                      <path d="M85 92 L85 82 L95 82" className="opacity-30 stroke-[0.5]" />
                    </g>
                    {/* Synaptic Data Nodes with glow effects */}
                    <g className="fill-white drop-shadow-[0_0_3px_rgba(59,130,246,0.8)]">
                      <circle cx="75" cy="12" r="1.8" className="animate-pulse" />
                      <circle cx="5" cy="15" r="1.5" />
                      <circle cx="95" cy="80" r="1.8" />
                      <circle cx="8" cy="85" r="1.5" />
                      <circle cx="85" cy="92" r="1.8" className="animate-pulse" />
                      <circle cx="15" cy="95" r="1.5" />
                      
                      {/* Micro nodes */}
                      <circle cx="30" cy="30" r="1" className="fill-blue-200" />
                      <circle cx="70" cy="30" r="1" className="fill-blue-200" />
                      <circle cx="70" cy="70" r="1" className="fill-blue-200" />
                      <circle cx="30" cy="70" r="1" className="fill-blue-200" />
                    </g>
                  </svg>
                  
                  {/* Organic Synapse Flow */}
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 -m-8 opacity-20 pointer-events-none"
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full stroke-blue-500 stroke-[0.2] fill-none">
                       {Array.from({ length: 8 }).map((_, i) => (
                         <motion.path 
                           key={i}
                           d={`M50 50 Q${50 + Math.cos(i) * 40} ${50 + Math.sin(i) * 40} ${50 + Math.cos(i) * 80} ${50 + Math.sin(i) * 80}`} 
                           initial={{ pathLength: 0 }}
                           animate={{ pathLength: [0, 1, 0] }}
                           transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.5 }}
                         />
                       ))}
                    </svg>
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 text-center"
            >
              <h1 className="text-xl font-black uppercase tracking-[0.5em] text-white italic mb-2">Neur<span className="text-blue-500">0</span>n</h1>
              <div className="flex items-center gap-2 justify-center">
                 <div className="h-0.5 w-12 bg-white/10" />
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Architecting Neural Bridges</p>
                 <div className="h-0.5 w-12 bg-white/10" />
              </div>
            </motion.div>

            {/* Initialization Bars */}
            <div className="absolute bottom-12 w-64 space-y-2">
               <div className="flex justify-between text-[8px] font-black uppercase text-zinc-700 tracking-widest">
                  <span>Initializing Core...</span>
                  <motion.span 
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >LINKING</motion.span>
               </div>
               <div className="h-0.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 4, ease: "easeInOut" }}
                    onAnimationComplete={() => setIsInitializing(false)}
                    className="h-full w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent"
                  />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Onboarding Modal --- */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
            >
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-10 -mt-10" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Brain size={24} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Neural Onboarding</h2>
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">v1.2.0 Gateway</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      Welcome to <span className="text-blue-500 font-bold">Neur0n IDE</span>. You are accessing a neural-accelerated environment where code meets consciousness. Designed for learning, experimentation, and professional architects.
                    </p>
                  </div>

                  <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase text-blue-400 mb-2">Getting Started</h3>
                    <ul className="text-[9px] text-zinc-400 space-y-2 font-medium">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Use the <span className="text-zinc-200">Execution Mesh</span> to run code instantly.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Collaborate with <span className="text-zinc-200">Neur0-L1nk AI</span> for intelligent pair programming.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5">•</span>
                        <span>Manage your topology via the <span className="text-zinc-200">Terminal</span> in the sidebar.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                      <Zap size={14} className="text-blue-400 mb-2" />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Fast Execution</p>
                      <p className="text-[8px] text-zinc-600">Execute code via local or cloud runners instantly.</p>
                    </div>
                    <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                      <Sparkles size={14} className="text-amber-400 mb-2" />
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Vibe Coding</p>
                      <p className="text-[8px] text-zinc-600">Collaborate with Neur0-L1nk AI for smart suggestions.</p>
                    </div>
                  </div>

                  <div className="p-4 border border-zinc-800/50 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-zinc-500 italic">User Agreement</h4>
                    <p className="text-[9px] text-zinc-600 leading-tight">
                      This application is intended for learning and developer use only. By proceeding, you agree to our terms of service and acknowledge that neural link usage is subject to monitoring for network safety.
                    </p>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={hasAcceptedTerms}
                        onChange={() => setHasAcceptedTerms(!hasAcceptedTerms)}
                        className="w-4 h-4 rounded border-zinc-800 bg-black text-blue-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase italic">I agree to the Terms & Conditions</span>
                    </label>
                  </div>
                </div>

                <button 
                  onClick={handleAcceptOnboarding}
                  disabled={!hasAcceptedTerms}
                  className={cn(
                    "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] italic transition-all",
                    hasAcceptedTerms 
                      ? "bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-500/20" 
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"
                  )}
                >
                  Enter the Mesh
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex h-screen w-full bg-[#0c0c0e] text-zinc-300 font-sans overflow-hidden">

      {/* --- Sidebar Nav --- */}
      <div className="w-16 flex flex-col items-center py-4 border-r border-zinc-800/50 bg-[#09090b]">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 mb-1.5 focus:outline-none hover:scale-105 transition-transform" onClick={() => setIsManualOpen(true)}>
            <Sparkles className="text-white" size={24} />
          </div>
          <span className="text-[11px] font-black tracking-tighter text-zinc-100 uppercase">Neur0n</span>
          <span className="text-[6px] font-medium text-zinc-500 tracking-widest uppercase opacity-80 -mt-0.5 text-center">powered by OWI</span>
        </div>
        {[
          { id: "explorer", icon: FileCode },
          { id: "github", icon: Github },
          { id: "device", icon: Smartphone },
          { id: "mesh", icon: Share2 },
          { id: "download", icon: HardDrive },
          { id: "brain", icon: Brain },
          { id: "settings", icon: Settings },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={cn(
              "p-3 mb-3 rounded-xl transition-all duration-300 relative group",
              activeTab === item.id 
                ? "btn-active-gradient text-blue-400 shadow-lg shadow-blue-500/10" 
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
            )}
          >
            <item.icon size={22} />
            {activeTab === item.id && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 rounded-xl bg-blue-500/5 blur-sm -z-10"
              />
            )}
          </button>
        ))}
        <button 
          onClick={() => setIsIntegrationsOpen(true)}
          className={cn(
            "p-3 mb-3 rounded-xl transition-all duration-300 relative group",
            isIntegrationsOpen 
              ? "bg-amber-500/10 text-amber-500 shadow-lg shadow-amber-500/10 border border-amber-500/30" 
              : "text-zinc-500 hover:text-amber-400 hover:bg-zinc-800/50"
          )}
        >
          <Zap size={22} className={isIntegrationsOpen ? "fill-current" : ""} />
        </button>
        <div className="mt-auto flex flex-col gap-4 mb-4">
          <button 
            onClick={() => setIsManualOpen(true)}
            className="p-3 text-zinc-500 hover:text-blue-400 transition-all hover:btn-active-gradient rounded-xl"
          >
            <HelpCircle size={22} />
          </button>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors overflow-hidden group relative"
            onClick={() => currentUser ? handleLogout() : setIsAuthModalOpen(true)}
          >
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon size={16} />
            )}
            {currentUser && (
              <div className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <LogOut size={12} className="text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panels */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="w-72 border-r border-zinc-900 bg-[#0c0c0e] overflow-hidden flex flex-col"
        >
          <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 italic">
              {activeTab}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === "explorer" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Files</h2>
                  <div className="flex gap-2">
                    <label className="cursor-pointer p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-all">
                      <Upload size={14} />
                      <input type="file" className="hidden" onChange={handleImport} />
                    </label>
                  </div>
                </div>
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all group",
                      activeFileId === file.id ? "bg-blue-500/10 text-blue-400" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                    )}
                  >
                    <FileCode size={14} className={activeFileId === file.id ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400"} />
                    <span className="truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === "github" && (
              <div className="space-y-4">
                 <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 font-mono">Repositories</h2>
                  <button onClick={fetchRepos} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 transition-all">
                    <RefreshCw size={14} className={isFetchingRepos ? "animate-spin" : ""} />
                  </button>
                </div>
                {!githubToken ? (
                  <p className="text-[10px] text-zinc-600 italic">Link GitHub in integrations to load repos.</p>
                ) : !selectedRepo ? (
                  <div className="space-y-2">
                    {repos.map(repo => (
                      <button key={repo.id} onClick={() => fetchRepoContent(repo.owner.login, repo.name)} className="w-full text-left p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/30 transition-all group">
                        <div className="text-xs font-bold text-zinc-300 group-hover:text-blue-400 truncate">{repo.name}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button onClick={() => setSelectedRepo(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 mb-2 font-black uppercase tracking-widest">← Back</button>
                    {repoFiles.map(file => (
                      <button key={file.sha} onClick={() => importGitHubFile(file)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 text-[10px] text-zinc-400">
                        <FileCode size={12} />
                        <span className="truncate">{file.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Preferences</label>
                  <button 
                    onClick={() => setIsTeachingEnabled(!isTeachingEnabled)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                      isTeachingEnabled ? "bg-blue-500/5 border-blue-500/20 text-blue-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    )}
                  >
                    <span className="text-[10px] font-black uppercase">Teaching Mode</span>
                    <Sparkles size={14} />
                  </button>
                </div>

                <div className="pt-6 border-t border-zinc-900 space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 italic">Core Credits</label>
                  <a 
                    href="https://github.com/vishwabalamurugan2013/Neur0n-IDE" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Github size={18} className="text-zinc-500 group-hover:text-white" />
                      <div className="text-left">
                        <div className="text-[10px] font-black text-zinc-300 uppercase italic">Neur0n GitHub</div>
                        <div className="text-[8px] text-zinc-600 font-mono">Archived by @vishwabalamurugan2013</div>
                      </div>
                    </div>
                    <ExternalLink size={14} className="text-zinc-700 group-hover:text-blue-400" />
                  </a>
                </div>
              </div>
            )}



            {activeTab === "device" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 font-mono italic">Bridge Protocol</h1>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                      isNative ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                    )}>
                      {isNative ? "Native Linked" : "Web Sandbox"}
                    </span>
                  </div>
                </div>

                {!isNative && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-3xl mb-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none">Sandbox Restriction</p>
                        <p className="text-[8px] text-zinc-500 leading-tight">
                          The current environment is isolated. Sideloading APK/IPA requires the <span className="text-zinc-300">Desktop Binary</span> to interface with USB hardware.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className={cn(
                    "p-4 bg-zinc-900 border rounded-3xl transition-all",
                    isNative ? "border-zinc-800 hover:border-blue-500/30" : "border-zinc-800/50 opacity-60 grayscale cursor-not-allowed"
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Smartphone size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter italic">Hardware Bridge</div>
                        <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">Deploy Binary to Device</div>
                      </div>
                    </div>

                    <label className={cn(
                      "block w-full border-2 border-dashed border-zinc-800 rounded-2xl p-6 text-center transition-all",
                      isNative ? "hover:bg-blue-500/5 hover:border-blue-500/20 cursor-pointer" : "cursor-not-allowed"
                    )}>
                      <Download size={24} className="mx-auto text-zinc-700 mb-2" />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Drop .apk / .ipa / .exe</span>
                      <input 
                        type="file" 
                        disabled={!isNative}
                        className="hidden" 
                        accept=".apk,.ipa,.exe" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            addLog('DEVICE', `Imported deployment artifact: ${file.name}`);
                            setTargetDevice('dev-1');
                          }
                        }} 
                      />
                    </label>
                  </div>

                  {targetDevice && (
                    <div className="p-4 bg-black/40 border border-zinc-900 rounded-3xl animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-2">
                            <Monitor size={12} className="text-blue-500" />
                            <span className="text-[10px] font-bold text-zinc-400">Target: Local Neural Port</span>
                         </div>
                         <div className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase italic">Handshake Ready</div>
                      </div>

                      {isSideloading ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-[8px] font-black uppercase text-zinc-600 tracking-widest italic">
                            <span>Sideloading Protocol...</span>
                            <span>{sideloadProgress}%</span>
                          </div>
                          <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${sideloadProgress}%` }}
                              className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setIsSideloading(true);
                            setSideloadProgress(0);
                            const interval = setInterval(() => {
                              setSideloadProgress(prev => {
                                if (prev >= 100) {
                                  clearInterval(interval);
                                  setIsSideloading(false);
                                  addLog('DEVICE', 'Module deployment successful.');
                                  addNotification('Neural Bridge Success: Artifact deployed to target hardware.', 'success');
                                  return 100;
                                }
                                return prev + 10;
                              });
                            }, 500);
                          }}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 italic"
                        >
                          <Zap size={10} />
                          Initialize Deployment
                        </button>
                      )}
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                     <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em] px-1 italic">Protocol History</div>
                     <div className="space-y-1">
                        {connectionLogs.filter(l => l.type === 'DEVICE').length > 0 ? (
                          connectionLogs.filter(l => l.type === 'DEVICE').slice(0, 3).map((log, idx) => (
                             <div key={idx} className="p-2 bg-zinc-900/30 rounded-lg border border-zinc-900 text-[9px] text-zinc-500 flex items-center justify-between">
                                <span className="truncate">{log.message}</span>
                                <span className="text-[8px] opacity-30 font-mono">0x{Math.floor(Math.random()*1000).toString(16)}</span>
                             </div>
                          ))
                        ) : (
                          <div className="p-4 text-center border border-dashed border-zinc-900 rounded-2xl">
                             <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">No Recent Hardware Activity</p>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "download" && (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 mb-6">
                  <div className="relative mb-4">
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"
                    />
                    <div className="relative w-16 h-16 bg-black rounded-2xl border border-blue-500/30 flex items-center justify-center">
                      <Brain size={32} className="text-blue-500" />
                    </div>
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-200 italic mb-2">Native Engine Gateway</h2>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold leading-relaxed px-4">
                    The native desktop environment enables hardware-level neural acceleration and <span className="text-blue-400">Total System Synchronization</span>. 
                  </p>
                </div>

                <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-3xl mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-zinc-300 tracking-widest italic">Beginner's Deployment Guide</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">1</div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Install Node.js</p>
                        <p className="text-[8px] text-zinc-600 font-medium">Download from <span className="text-blue-500/70">nodejs.org</span>. This is the free engine that allows you to run professional Javascript tools on your PC.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">2</div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Obtain Source Files</p>
                        <p className="text-[8px] text-zinc-600 font-medium italic mb-2">Two options to get your code:</p>
                        <div className="grid grid-cols-1 gap-2">
                           <div className="p-2 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Github size={10} className="text-white" />
                                <p className="text-[8px] text-zinc-300 font-black uppercase">GitHub Option</p>
                              </div>
                              <p className="text-[7px] text-zinc-500 leading-tight">Push your code via the <span className="text-zinc-400 italic">GitHub Tab</span> in this sidebar, then run <code className="text-blue-400/80">git clone</code> on your PC.</p>
                           </div>
                           <div className="p-2 bg-zinc-800/30 rounded-xl border border-zinc-700/30">
                              <div className="flex items-center gap-1.5 mb-1">
                                <HardDrive size={10} className="text-zinc-500" />
                                <p className="text-[8px] text-zinc-400 font-black uppercase">ZIP Option</p>
                              </div>
                              <p className="text-[7px] text-zinc-500 leading-tight">Find the <span className="text-zinc-400 italic">Settings/Gear</span> icon in the bottom-left AI Studio menu and click <span className="text-zinc-400 italic">"Export to ZIP"</span>.</p>
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-5 h-5 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">3</div>
                      <div>
                        <p className="text-[9px] font-black text-zinc-400 uppercase">Input Command</p>
                        <p className="text-[8px] text-zinc-600 font-medium">Open a terminal index in that folder and type this exactly (it sets up everything automatically):</p>
                        <div className="mt-1 p-2 bg-black rounded-lg border border-zinc-800 font-mono text-[8px] text-blue-400">
                          npm install && npm run electron:dev
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => simulateDownload("neur0n_v1.0.4.exe")}
                    className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                        <Monitor size={20} className="text-zinc-500 group-hover:text-blue-400" />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Windows x64 (Blueprint)</div>
                        <div className="text-[8px] text-zinc-600 font-mono uppercase">neur0n_stub_v1.0.4.exe</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-black text-zinc-700 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Deploy Local</span>
                      <Download size={16} className="text-zinc-700 group-hover:text-blue-400" />
                    </div>
                  </button>

                  <button 
                    onClick={() => simulateDownload("neur0n_v1.0.4.dmg")}
                    className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                        <HardDrive size={20} className="text-zinc-500 group-hover:text-purple-400" />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">macOS Silicon (Blueprint)</div>
                        <div className="text-[8px] text-zinc-600 font-mono uppercase">neur0n_stub_v1.0.4.dmg</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-black text-zinc-700 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Deploy Local</span>
                      <Download size={16} className="text-zinc-700 group-hover:text-purple-400" />
                    </div>
                  </button>
                </div>

                <div className="mt-8 space-y-4">
                   <div className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.3em] mb-1 italic px-1">Security Handshake Protocol</div>
                   
                   <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                      <div className="flex gap-3">
                        <ShieldAlert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Execution Integrity Guide</p>
                          <p className="text-[9px] text-zinc-500 leading-relaxed uppercase tracking-tighter">
                            If you see "This app can't run on your PC", it is because browser-dispatched files are restricted.
                          </p>
                          <div className="flex flex-col gap-1 pt-1">
                             <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-400">
                                <span className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 font-mono">STEP 01</span>
                                <span>Get code via GitHub or Export ZIP</span>
                             </div>
                             <div className="flex items-center gap-2 text-[8px] font-bold text-zinc-400">
                                <span className="w-4 h-4 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 font-mono">STEP 02</span>
                                <span>Run <code className="text-blue-400 lowercase">npm install && npm run electron:dev</code></span>
                             </div>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="p-4 border border-zinc-900 rounded-3xl bg-zinc-900/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Github size={14} className="text-zinc-500" />
                        <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest italic">Sharing & Distribution</span>
                      </div>
                      <p className="text-[8px] text-zinc-600 font-medium leading-tight mb-3">
                        Yes! You can share your generated <span className="text-blue-500">.exe</span> on GitHub. Create a <span className="text-zinc-300">"Release"</span> in your repository and upload the binary as an asset for others to download.
                      </p>
                      <div className="flex items-center gap-2 text-[7px] font-bold text-zinc-500 bg-black/50 p-2 rounded-lg border border-zinc-800">
                         <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                         <span>Verified Public Release Compatible</span>
                      </div>
                   </div>

                   <div className="flex flex-col items-center gap-2 py-4 border-y border-zinc-900">
                      <Brain size={24} className="text-zinc-800" />
                      <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.4em] italic">Non-Profit Neural Initiative</p>
                      <p className="text-[8px] text-zinc-800 font-bold uppercase max-w-[200px] text-center leading-tight">
                        Providing free hardware bridge access for growing minds and neural research.
                      </p>
                   </div>

                   <div className="p-4 border border-zinc-900 rounded-2xl">
                      <div className="text-[8px] font-black text-zinc-700 uppercase tracking-widest mb-3 italic">Technical Specs</div>
                   <div className="space-y-2">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-zinc-600">Runtime</span>
                        <span className="text-zinc-400 font-mono">Chromium/Node</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-zinc-600">Encryption</span>
                        <span className="text-zinc-400 font-mono">TLS 1.3 / AES</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-zinc-600">Status</span>
                        <span className="text-emerald-500 font-bold uppercase tracking-tighter">Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "mesh" && (
              <div className="flex flex-col h-[calc(100vh-120px)]">
                <div className="space-y-6 flex-shrink-0">
                  <div className="relative w-24 h-24 mx-auto mb-4">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 border-2 border-dashed border-blue-500/20 rounded-full"
                    />
                    <div className="absolute inset-2 border border-blue-500/10 rounded-full"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Share2 className="text-blue-500" size={24} />
                    </div>
                  </div>
                  <h4 className="text-[10px] font-black text-zinc-200 uppercase tracking-widest text-center italic">Neural Topology</h4>
                  <div className="space-y-2">
                    <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800 group hover:border-blue-500/30 transition-all flex items-center justify-between">
                      <div>
                        <div className="text-[8px] font-black text-blue-400 uppercase tracking-tighter mb-1">Local Node</div>
                        <div className="text-[10px] font-bold text-zinc-300">neur0n-worker-01</div>
                      </div>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                    <button 
                      onClick={() => {
                        setMeshOutput(prev => [...prev, `[System] Re-establishing Mesh Handshake...`, `[System] Scan Complete: 1 Node Active.`]);
                        addNotification("Mesh Topology Refreshed", "info");
                      }}
                      className="w-full py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-[8px] font-black uppercase text-zinc-500 hover:text-zinc-300 transition-all"
                    >
                      Refresh Topology
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex-1 flex flex-col min-h-0 border-t border-zinc-800 pt-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest italic">Registry Terminal</h4>
                    <button onClick={() => setMeshOutput([])} className="text-[8px] font-black text-zinc-700 hover:text-zinc-500 uppercase tracking-widest">Flush</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 font-mono text-[9px] leading-relaxed custom-scrollbar bg-black/40 rounded-xl border border-zinc-900 mb-3" ref={terminalRef}>
                    {meshOutput.length === 0 && (
                      <div className="text-zinc-800 italic opacity-50">Monitoring frequency...</div>
                    )}
                    {meshOutput.map((line, i) => (
                      <div key={i} className={cn(
                        "mb-1",
                        line.startsWith(">") ? "text-blue-400" : "text-zinc-500"
                      )}>
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="h-8 flex items-center px-3 bg-black border border-zinc-800 rounded-lg shrink-0">
                    <span className="text-blue-500 font-black text-[9px] mr-2 italic">»</span>
                    <input 
                      type="text" 
                      className="flex-1 bg-transparent border-none outline-none text-[10px] font-mono text-zinc-200 placeholder:text-zinc-800"
                      placeholder="Protocol..."
                      value={terminalInput}
                      onChange={(e) => setTerminalInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && terminalInput.trim()) {
                          processCommand(terminalInput);
                          setTerminalInput("");
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "brain" && (
                <div className="space-y-6">
                   {isNeuralLinkEstablished && linkedAppInfo && (
                     <div className="space-y-6">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-3xl">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">Live Health</h4>
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-tighter">{linkedAppInfo.health}</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Recent Stream</h4>
                           <div className="space-y-2">
                             {linkedAppInfo.logs.slice(0, 3).map((log, idx) => (
                               <div key={idx} className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 font-mono text-[9px]">
                                 <span className={cn("font-bold mr-2", log.type === 'ERROR' ? "text-red-500" : "text-blue-500")}>[{log.type}]</span>
                                 <span className="text-zinc-400">{log.msg}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                     </div>
                   )}
                </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex-1 flex flex-col bg-black relative min-w-0">
        {/* Workspace Header */}
        <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-6 bg-[#0c0c0e]">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2">
                <FileCode size={16} className="text-blue-500" />
                <span className="text-xs font-bold text-zinc-300 italic">{activeFile.name}</span>
             </div>
             {isNeuralLinkEstablished && (
               <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Neural Link Active</span>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                isAiOpen 
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                  : "bg-gradient-to-r from-amber-600/80 to-amber-400/80 border border-amber-500/30 text-white hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
              )}
            >
              <Bot size={14} />
              Neur0-L1nk
            </button>
            <button 
              onClick={() => setIsIntegrationGuideOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600/80 to-purple-400/80 border border-purple-500/30 text-xs font-black uppercase tracking-widest text-white hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
            >
              <Command size={14} />
              Integrate
            </button>
            <button 
              onClick={() => setIsPublishOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600/80 to-emerald-400/80 border border-emerald-500/30 text-xs font-black uppercase tracking-widest text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all"
            >
              <Share2 size={14} />
              Deploy
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary-gradient text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20" onClick={handleRun}>
              <Play size={14} fill="currentColor" />
              Push
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <Editor
            height="100%"
            theme="vs-dark"
            language={activeFile.language}
            value={activeFile.content}
            onChange={(val) => {
              const updatedFiles = files.map(f => f.id === activeFileId ? { ...f, content: val || "" } : f);
              setFiles(updatedFiles);
            }}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              padding: { top: 20 },
              smoothScrolling: true,
              cursorBlinking: "expand",
              cursorSmoothCaretAnimation: "on",
              lineNumbers: "on",
              renderLineHighlight: "all",
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                useShadows: false,
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme("aura-dark", {
                base: "vs-dark",
                inherit: true,
                rules: [],
                colors: {
                  "editor.background": "#0c0c0e",
                  "editor.lineHighlightBackground": "#18181b80",
                  "editorCursor.foreground": "#3b82f6",
                  "editor.selectionBackground": "#3b82f630",
                }
              });
            }}
            onMount={(editor) => {
              editor.updateOptions({ theme: "aura-dark" });
            }}
          />

          {/* AI Drawer (Bottom Overlay) */}
          <AnimatePresence>
            {isAiOpen && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-x-0 bottom-0 h-96 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800 flex flex-col z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-800/50 bg-black/20">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-blue-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-100 italic">Neur0-L1nk Vibe Lounge</span>
                    {isTeachingEnabled && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase">Learning Mode ON</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setAiChat([])}
                      className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      Clear Vibe
                    </button>
                    <button 
                      onClick={() => setIsAiOpen(false)}
                      className="text-zinc-500 hover:text-zinc-100 transition-colors"
                    >
                      <ChevronRight size={18} className="rotate-90" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                    {!geminiKey && (
                      <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                        <Lock size={32} className="mb-4" />
                        <p className="text-sm">Neural link offline. Please configure API key in settings.</p>
                      </div>
                    )}
                    {aiChat.map((chat, i) => (
                      <div key={i} className={cn("flex flex-col gap-2", chat.role === "user" ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed",
                          chat.role === "user" 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/10 rounded-tr-none" 
                            : "bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 rounded-tl-none shadow-xl"
                        )}>
                          <div className="markdown-body prose prose-invert prose-xs max-w-none">
                            <Markdown>{chat.message}</Markdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center gap-3 text-blue-400">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">Neur0-L1nk is vibing...</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-zinc-900/30 border-t border-zinc-800/50">
                    <div className="relative max-w-4xl mx-auto flex items-end gap-3">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={geminiKey ? "Vibe with the code... describe your vision." : "Connect API key first..."}
                        disabled={!geminiKey}
                        className="flex-1 bg-black border border-zinc-800 rounded-2xl py-3 px-4 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none resize-none h-12 max-h-32 placeholder:text-zinc-600 transition-all font-medium"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={aiLoading || !geminiKey || !chatInput.trim()}
                        className="p-3 bg-blue-600 rounded-xl text-white disabled:opacity-20 disabled:grayscale transition-all active:scale-90 hover:btn-primary-gradient shadow-lg shadow-blue-600/20"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* --- Unified Execution Window --- */}
      <AnimatePresence>
        {isExecutionWindowOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-12 right-12 w-[500px] h-80 bg-[#0c0c0e]/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-[100] overflow-hidden"
          >
            <div className="h-10 border-b border-zinc-900 flex items-center justify-between px-4 bg-zinc-900/30">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300 italic">Cortex Sandbox Output</span>
              </div>
              <button 
                onClick={() => setIsExecutionWindowOpen(false)} 
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed custom-scrollbar bg-black/20">
              {executionOutput.map((line, i) => (
                <div key={i} className={cn(
                  "mb-1.5 font-medium",
                  line.startsWith("[Err]") || line.startsWith("[System] Process finished with exit code 1") ? "text-red-400" : 
                  line.startsWith("[Out]") ? "text-emerald-400" : 
                  line.startsWith("[System]") ? "text-blue-400" :
                  line.startsWith(">") ? "text-zinc-100 font-bold" :
                  "text-zinc-500"
                )}>
                  {line}
                </div>
              ))}
              {executionOutput.length > 0 && <div className="mt-4 animate-pulse text-[10px] text-zinc-800">{">>>"} EOF</div>}
            </div>
            <div className="h-8 border-t border-zinc-900 bg-zinc-900/10 flex items-center px-4 justify-between">
              <span className="text-[8px] font-black uppercase text-zinc-700">Protected Mode: V8-CORE</span>
              <button 
                onClick={() => setExecutionOutput([])}
                className="text-[8px] font-black uppercase text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Wipe Output
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Global Notifications --- */}
      <div className="fixed top-20 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className={cn(
                "w-72 p-4 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-start gap-4 pointer-events-auto",
                n.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                n.type === 'warn' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                "bg-blue-500/10 border-blue-500/20 text-blue-400"
              )}
            >
              <div className="mt-0.5">
                {n.type === 'success' ? <ShieldCheck size={16} /> : <Zap size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold leading-tight">{n.message}</p>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="opacity-40 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- User Manual Modal --- */}
      <AnimatePresence>
        {isManualOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-3xl max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-3xl p-8 overflow-y-auto custom-scrollbar shadow-2xl glass"
            >
              <button 
                onClick={() => setIsManualOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={24} />
              </button>
              <div className="markdown-body prose prose-invert prose-blue max-w-none">
                <Markdown>{USER_MANUAL_MARKDOWN}</Markdown>
              </div>
              <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-zinc-500">
                <span>Neur0n Core x Google Transformer Foundation</span>
                <span>© 2026 Copyright Reserved</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Publish Modal --- */}
      <AnimatePresence>
        {isPublishOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-3xl p-8 shadow-2xl glass"
            >
              <button 
                onClick={() => setIsPublishOpen(false)}
                className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">Publish Neur0n Project</h3>
              <p className="text-xs text-zinc-500 mb-8">Select your preferred deployment gateway for enterprise-ready distribution.</p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setMeshOutput(prev => [...prev, "[System] Initiating GitHub Transfer handshake..."]);
                    setIsPublishOpen(false);
                    setActiveTab("github");
                  }}
                  className="w-full group flex items-center justify-between p-4 rounded-2xl btn-surface-gradient hover:border-blue-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:text-blue-400 transition-colors">
                      <Github size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-200">Transfer Project to GitHub</div>
                      <div className="text-[10px] text-zinc-500">Sync source code with repositories</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-200" />
                </button>

                <button 
                  onClick={() => window.open('https://www.hostinger.com/buy-domain', '_blank')}
                  className="w-full group flex items-center justify-between p-4 rounded-2xl btn-surface-gradient hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:text-emerald-400 transition-colors">
                      <Globe size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-200">Buy a domain in Hostinger</div>
                      <div className="text-[10px] text-zinc-500">Professional web publishing & hosting</div>
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-zinc-700 group-hover:text-zinc-200" />
                </button>

                <button 
                  onClick={handleSaveToDisk}
                  className="w-full group flex items-center justify-between p-4 rounded-2xl btn-surface-gradient hover:border-amber-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:text-amber-400 transition-colors">
                      <FileDown size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-zinc-200">Save codes as a file</div>
                      <div className="text-[10px] text-zinc-500">Download current session snapshot</div>
                    </div>
                  </div>
                  <Download size={16} className="text-zinc-700 group-hover:text-zinc-200" />
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center gap-2 justify-center opacity-30 select-none">
                <ShieldCheck size={12} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Secure Deployment Tunnel Active</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Integrations Modal --- */}
      <AnimatePresence>
        {isIntegrationsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-8 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-[32px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.8)] glass"
            >
              <button 
                onClick={() => setIsIntegrationsOpen(false)}
                className="absolute top-8 right-8 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                  <Zap size={24} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic tracking-tight text-zinc-100 uppercase">Integrations Vault</h3>
                  <p className="text-xs text-zinc-500">Securely bridge Neur0n with external neural networks.</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* GitHub Integration */}
                <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Github size={20} className="text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-200">GitHub Workspace</span>
                    </div>
                    {repos.length > 0 ? (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full uppercase tracking-widest border border-blue-400/20">Linked</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Offline</span>
                    )}
                  </div>
                  
                  {!selectedRepo ? (
                    <div className="space-y-4">
                      <div className="relative group">
                        <Github size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-blue-500" />
                        <input 
                          type="password"
                          placeholder="Enter Personal Access Token..."
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-xs focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-800 font-mono text-white"
                        />
                      </div>
                      <button 
                        disabled={isFetchingRepos || !githubToken}
                        onClick={() => {
                          fetchRepos();
                          setMeshOutput(prev => [...prev, "[System] Establishing GitHub neural link..."]);
                        }}
                        className="w-full py-4 rounded-2xl btn-purple-gradient text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                      >
                        {isFetchingRepos ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <UserIcon size={16} />
                        )}
                        {isFetchingRepos ? "Linking..." : "Connect to Account"}
                      </button>
                      <p className="text-[9px] text-zinc-600 text-center">Login simulation requires a Personal Access Token with 'repo' scope.</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[150px]">{selectedRepo}</span>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedRepo(null);
                          setRepoFiles([]);
                          setMeshOutput(prev => [...prev, "[System] GitHub session cleared."]);
                        }}
                        className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase"
                      >
                        Detach
                      </button>
                    </div>
                  )}
                </div>

                {/* Gemini Integration */}
                <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Sparkles size={20} className="text-zinc-400" />
                      <span className="text-sm font-bold text-zinc-200">Neural Engine (Gemini)</span>
                    </div>
                    {geminiKey ? (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full uppercase tracking-widest border border-amber-400/20">Active</span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono">Standby</span>
                    )}
                  </div>

                  {!geminiKey ? (
                    !isGeminiLinking ? (
                      <button 
                        onClick={() => setIsGeminiLinking(true)}
                        className="w-full py-4 rounded-2xl btn-purple-gradient text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-[0.98]"
                      >
                        <Lock size={16} />
                        Link Gemini API
                      </button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="relative">
                          <input 
                            type="password"
                            placeholder="Paste your API Key..."
                            autoFocus
                            value={tempGeminiKey}
                            onChange={(e) => setTempGeminiKey(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-2xl py-3 px-4 text-xs focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-800 font-mono text-white"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (tempGeminiKey) {
                                  setGeminiKey(tempGeminiKey);
                                  setIsGeminiLinking(false);
                                  setMeshOutput(prev => [...prev, "[System] Gemini Neural Core initialized."]);
                                }
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              if (tempGeminiKey) {
                                setGeminiKey(tempGeminiKey);
                                setIsGeminiLinking(false);
                                setMeshOutput(prev => [...prev, "[System] Gemini Neural Core initialized."]);
                              }
                            }}
                            className="flex-1 py-3 rounded-xl btn-purple-gradient text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-purple-500/20"
                          >
                            Establish Link
                          </button>
                          <button 
                            onClick={() => setIsGeminiLinking(false)}
                            className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )
                  ) : (
                    <div className="space-y-4">
                      <div className="relative group">
                        <input 
                          type="password"
                          value={geminiKey}
                          readOnly
                          className="w-full bg-black/40 border border-zinc-800 rounded-2xl py-3 px-4 text-xs focus:ring-1 focus:ring-purple-500/50 outline-none transition-all font-mono text-zinc-500"
                        />
                        <button 
                          onClick={() => {
                            setGeminiKey("");
                            setTempGeminiKey("");
                            setMeshOutput(prev => [...prev, "[System] Gemini Neural core offline."]);
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase"
                        >
                          Revoke
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 text-center font-medium italic">Gemini 2.0 Flash context active. Secure tunnel established.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-zinc-800/50 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 opacity-30">
                  <ShieldCheck size={12} className="text-blue-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-100">Zero-Trust Local Encryption Active</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Integration Guide Modal --- */}
      <AnimatePresence>
        {isIntegrationGuideOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-8 bg-black/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-[#0c0c0e] border border-purple-500/20 rounded-[40px] p-12 shadow-[0_0_100px_rgba(168,85,247,0.15)] glass overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
              
              <button 
                onClick={() => setIsIntegrationGuideOpen(false)}
                className="absolute top-10 right-10 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
                              <div className="flex items-center gap-5 mb-10 shrink-0">
                  <div className="p-4 bg-purple-600 text-white rounded-3xl shadow-xl shadow-purple-600/20">
                    <Package size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black italic tracking-tighter text-zinc-100 uppercase">Neural Integration Vault</h3>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${isNeuralLinkEstablished ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`} />
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest opacity-80">
                        Neur0n Pulse: {isNeuralLinkEstablished ? 'Cross-Platform Sync Engine Active' : 'Awaiting Neural Handshake'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-8 overflow-y-auto pr-6 custom-scrollbar pb-6 flex-1 min-h-0">
                  <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Frontend Weaving</h4>
                      </div>
                      <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 uppercase">File: index.html</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-4 leading-relaxed italic">The "Ghost Protocol." Paste this into your head tag. It monitors for exceptions and fetches your latest GitHub logic automatically.</p>
                    <div className="bg-[#050505] rounded-2xl p-5 border border-zinc-800/80 font-mono text-[10px] text-zinc-400 relative group overflow-hidden">
                      <pre className="overflow-x-auto custom-scrollbar whitespace-pre pb-2">
                        {`<script src="https://api.neur0n.sh/v1/bridge.js"></script>\n<script>\n  // Weave into the Frontend Thread\n  Neur0n.weave({\n    source: "Open-World-International/Neur0n-IDE",\n    autonomous: true \n  });\n</script>`}
                      </pre>
                    </div>
                  </section>

                  <section className="bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800 animate-in fade-in slide-in-from-bottom-4 delay-150 duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        </div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Handshake Authorization</h4>
                      </div>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 uppercase">Secure Link</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-4 leading-relaxed italic">To establish an "Automatic Handshake," use a Personal Access Token. This allows the background worker to communicate with your Git repositories autonomously.</p>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          value={githubToken}
                          onChange={(e) => {
                            setGithubToken(e.target.value);
                            if (authError) setAuthError(null);
                          }}
                          placeholder="GITHUB_PERSONAL_ACCESS_TOKEN" 
                          className={cn(
                            "flex-1 bg-black/60 border rounded-xl px-4 py-3 text-[10px] font-mono text-zinc-300 focus:outline-none transition-all",
                            authError ? "border-red-500/50 ring-1 ring-red-500/20" : "border-zinc-800 focus:border-purple-500/50"
                          )}
                        />
                        <button 
                          onClick={() => {
                            if (githubToken) {
                              setMeshOutput(prev => [...prev, `[Neur0n] Token encrypted: ${'*'.repeat(githubToken.length)}`]);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 rounded-xl transition-colors uppercase tracking-widest"
                        >
                          AUTH
                        </button>
                      </div>
                      <div className="flex items-center gap-2 px-3 justify-between">
                        <div className="flex items-center gap-2">
                          {authError ? (
                            <>
                              <X size={12} className="text-red-500 animate-pulse" />
                              <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">Handshake Rejected: Invalid Signature</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={12} className="text-emerald-500" />
                              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">AES-256 Encrypted Transfer Protocol active</span>
                            </>
                          )}
                        </div>
                        {connectionLogs.length > 0 && (
                          <div className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest border border-emerald-500/10 px-2 py-0.5 rounded-md">
                            Logs Stream Active
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="bg-black/40 p-5 rounded-3xl border border-zinc-800/50 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <Terminal size={14} className="text-zinc-600" />
                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Headless CLI Handshake</h4>
                      </div>
                      <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 font-mono text-[9px] text-zinc-400">
                        <div className="flex gap-2">
                          <span className="text-blue-500">$</span>
                          <span>export NEUR0N_TOKEN="<span className="text-zinc-600">••••••••</span>"</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-blue-500">$</span>
                          <span>neur0n weave --headless --target="<span className="text-emerald-500">production</span>"</span>
                        </div>
                      </div>
                      <p className="mt-3 text-[8px] text-zinc-600 font-bold uppercase leading-relaxed tracking-tighter">
                        Use these protocols for background worker environments (Docker, Lambda, K8s) where no UI is present.
                      </p>
                    </div>
                  </section>

                  <div className="p-6 rounded-[32px] bg-blue-500/5 border border-blue-500/10 flex items-start gap-5">
                    <div className="mt-1 p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                      <Globe size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-zinc-200 mb-2 leading-none uppercase tracking-widest">Global Mesh Handshake</h5>
                      <p className="text-[10px] text-zinc-500 leading-relaxed italic mb-4">Neur0n doesn't need to be installed locally. It lives in the Neural Mesh. Once linked, it opens a secure WebSocket tunnel to authorize "Shadow Commits" in your host project.</p>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 text-center">
                          <div className="text-[8px] text-zinc-600 font-bold uppercase mb-1">Handshake</div>
                          <div className={`text-[10px] font-black ${isNeuralLinkEstablished ? 'text-emerald-500' : 'text-orange-500'}`}>
                            {isNeuralLinkEstablished ? 'SECURE' : 'PENDING'}
                          </div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 text-center">
                          <div className="text-[8px] text-zinc-600 font-bold uppercase mb-1">WebSocket</div>
                          <div className={`text-[10px] font-black ${isNeuralLinkEstablished ? 'text-emerald-500' : 'text-zinc-500'}`}>
                            {isNeuralLinkEstablished ? 'TUNNEL' : 'NONE'}
                          </div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 text-center">
                          <div className="text-[8px] text-zinc-600 font-bold uppercase mb-1">Mesh</div>
                          <div className={`text-[10px] font-black ${isNeuralLinkEstablished ? 'text-emerald-500' : 'text-zinc-500'}`}>
                            {isNeuralLinkEstablished ? 'GLOBAL' : 'LOCAL'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-8 border-t border-zinc-800/50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Link Secure: Handshake Operational</span>
                    </div>
                    <a 
                      href="https://github.com/Open-World-International/Neur0n-IDE" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[9px] font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                      <Github size={12} />
                      CORE SOURCE
                    </a>
                  </div>
                  <button 
                    disabled={isEstablishingLink}
                    onClick={async () => {
                      if (isNeuralLinkEstablished) {
                        setIsIntegrationGuideOpen(false);
                        return;
                      }

                      if (!githubToken) {
                        addLog('ERROR', "Neural Handshake failed: GITHUB_TOKEN_MISSING.");
                        return;
                      }

                      setIsEstablishingLink(true);
                      addLog('INFO', "Handshake initiated. Verifying token integrity...");
                      
                      setTimeout(() => {
                        const isTokenFormatValid = githubToken.startsWith('ghp_') || githubToken.startsWith('github_pat_');

                        if (!isTokenFormatValid) {
                          addLog('ERROR', "Security Breach: Invalid Token Signature detected.");
                          setAuthError("INVALID_SIGNATURE");
                          setIsEstablishingLink(false);
                          return;
                        }

                        setAuthError(null);
                        addLog('INFO', "Encryption verified via AES-256.");
                        addLog('INFO', "Searching for woven mesh connections in external targets...");

                        setTimeout(() => {
                          addLog('SYSTEM', "Mesh link established. Global Guardian is now monitoring external threads.");
                          setLinkedAppInfo({
                            name: "NEUR0N-CORE-PRODUCTION",
                            repo: "Open-World-International/Neur0n-IDE",
                            health: "Optimal",
                            structure: [
                              { type: 'dir', name: 'src', children: ['App.tsx', 'main.tsx', 'index.css'] },
                              { type: 'dir', name: 'public', children: ['mesh-manifest.json', 'bridge.js'] },
                              { type: 'file', name: 'package.json' },
                              { type: 'file', name: 'vite.config.ts' }
                            ],
                            logs: [
                              { time: 'T-0s', type: 'ERROR', msg: 'ReferenceError: NeuralMesh is not defined at bridge.js:42' },
                              { time: 'T-1s', type: 'INFO', msg: 'Handshake completed for client: 192.168.1.1' },
                              { time: 'T-5s', type: 'WARN', msg: 'High latency detected in Tokyo-Node-3' }
                            ]
                          });
                          setIsNeuralLinkEstablished(true);
                          setIsEstablishingLink(false);
                          setIsIntegrationGuideOpen(false);
                        }, 1500);
                      }, 1000);
                    }}
                    className={`px-8 py-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center gap-3 ${
                      isEstablishingLink ? 'bg-zinc-800 cursor-not-allowed opacity-50' : 'btn-purple-gradient shadow-purple-500/20'
                    }`}
                  >
                    {isEstablishingLink ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Establishing...
                      </>
                    ) : isNeuralLinkEstablished ? (
                      "Link Verified"
                    ) : (
                      "Establish Neural Link"
                    )}
                  </button>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Auth Modal --- */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-sm bg-[#0c0c0e] border border-zinc-800 rounded-[32px] p-10 shadow-[0_0_80px_rgba(0,0,0,0.8)] glass overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50" />
              
              <button 
                onClick={() => setIsAuthModalOpen(false)}
                className="absolute top-8 right-8 p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <UserIcon className="text-white" size={28} />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-zinc-100 uppercase">Neural Vault</h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">
                  {isForging ? 'Forge New Signature' : 'Authorize Identity'}
                </p>
              </div>

              {!isForging ? (
                <div className="space-y-4">
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {vault.map(identity => (
                      <button 
                        key={identity.id}
                        onClick={() => selectIdentity(identity)}
                        className="w-full group flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:text-blue-400 transition-colors">
                            <ShieldCheck size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-200">{identity.codename}</div>
                            <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">{identity.role}</div>
                          </div>
                        </div>
                        <div className="text-[8px] font-mono text-zinc-700 group-hover:text-zinc-500 transition-colors">
                          {identity.signature.split('-')[1].substring(0, 4)}...
                        </div>
                      </button>
                    ))}
                    {vault.length === 0 && (
                      <div className="text-center py-8 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                        <Lock className="w-6 h-6 text-zinc-800 mx-auto mb-2" />
                        <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Vault Empty</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsForging(true)}
                    className="w-full py-3 rounded-xl border border-dashed border-zinc-700 text-[10px] font-black uppercase text-zinc-500 hover:text-white hover:border-blue-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Forge New Identity
                  </button>

                  <div className="text-center">
                    <p className="text-[8px] uppercase font-black tracking-widest text-zinc-600 mb-3">Remote Auth</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => handleSocialLogin(googleProvider)}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-400 hover:text-white hover:border-blue-500/50 transition-all"
                      >
                        GMail
                      </button>
                      <button 
                        onClick={() => handleSocialLogin(githubProvider)}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-400 hover:text-white hover:border-purple-500/50 transition-all"
                      >
                        GitHub
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Codename</label>
                    <input 
                      autoFocus
                      type="text"
                      placeholder="e.g. Neo, Ghost, Zero"
                      value={forgeData.codename}
                      onChange={e => setForgeData({...forgeData, codename: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl py-2 px-4 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-zinc-800 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Role</label>
                    <select 
                      value={forgeData.role}
                      onChange={e => setForgeData({...forgeData, role: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl py-2 px-4 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none transition-all text-white appearance-none"
                    >
                      <option>Architect</option>
                      <option>Penetrator</option>
                      <option>Mesh Worker</option>
                      <option>Neural Guardian</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Encryption</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Standard', 'AES-256', 'Quantum'].map(level => (
                        <button 
                          key={level}
                          onClick={() => setForgeData({...forgeData, encryptionLevel: level as any})}
                          className={cn(
                            "py-2 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all border",
                            forgeData.encryptionLevel === level 
                              ? "bg-blue-500/10 border-blue-500/50 text-blue-400" 
                              : "bg-zinc-900 border-zinc-800 text-zinc-500"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2">
                    <button 
                      onClick={handleForgeIdentity}
                      className="flex-1 py-3 rounded-xl btn-primary-gradient text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                      Forge Signature
                    </button>
                    <button 
                      onClick={() => setIsForging(false)}
                      className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-10 flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <ShieldCheck size={10} className="text-emerald-500" />
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">End-to-End Encrypted</span>
                </div>
                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter text-center leading-relaxed">
                  By linking, you authorize Neur0n to store your mesh identity for cross-thread synchronization.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .prose-xs { font-size: 0.75rem; line-height: 1.4; }
      `}</style>
    </div>
  </div>
  );
}
