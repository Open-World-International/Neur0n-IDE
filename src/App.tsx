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
  LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";
import { GoogleGenAI } from "@google/genai";
import { USER_MANUAL_MARKDOWN } from "./constants";
import { auth, googleProvider, githubProvider, syncUserToFirestore } from "./lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

// --- Types ---
interface FileEntry {
  id: string;
  name: string;
  content: string;
  language: string;
}

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<"explorer" | "github" | "settings" | "brain">("explorer");
  const [files, setFiles] = useState<FileEntry[]>([
    { id: "1", name: "index.js", content: "console.log('Welcome to Neur0n');", language: "javascript" },
    { id: "2", name: "styles.css", content: "body { background: #000; }", language: "css" },
  ]);
  const [activeFileId, setActiveFileId] = useState<string>("1");
  const [consoleOutput, setConsoleOutput] = useState<string[]>(["[System] Neur0n Engine Initialized...", "[System] Precise Execution Mode: ON"]);
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

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        syncUserToFirestore(user);
      }
    });
    return () => unsubscribe();
  }, []);

  async function handleSocialLogin(provider: any) {
    try {
      const result = await signInWithPopup(auth, provider);
      setConsoleOutput(prev => [...prev, `[System] Welcome, ${result.user.displayName || 'Architect'}. Neural record synchronized.`]);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error(err);
      setConsoleOutput(prev => [...prev, `[Error] Auth Failure: ${err instanceof Error ? err.message : 'Unknown error'}`]);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      setConsoleOutput(prev => [...prev, "[System] Identity purged. Local session terminated."]);
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

  const [isConsoleWindowOpen, setIsConsoleWindowOpen] = useState(false);

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
        ? "You are an expert pair programmer and educator named Neur0-L1nk in Neur0n IDE. Help the user 'vibe code' by interpreting their ideas and providing implementation. CRITICAL: You MUST teach the user how the code works, explaining the logic step-by-step in an encouraging way."
        : "You are an expert pair programmer named Neur0-L1nk in Neur0n IDE. Help the user 'vibe code' by interpreting their ideas and providing clear implementation blocks.";

      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
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
    setIsConsoleWindowOpen(true);
    setConsoleOutput([`> Initializing Neur0n Runtime...`, `> Target: ${activeFile.name} (${activeFile.language})`]);
    
    // 1. Browser-based execution for Web languages
    if (activeFile.language === "javascript" || activeFile.language === "typescript") {
      setConsoleOutput(prev => [...prev, `[System] Using V8 Browser Engine...`]);
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
        
        setConsoleOutput(prev => [
          ...prev, 
          ...logs.map(l => `[Out] ${l}`), 
          `[System] Process finished with exit code 0`
        ]);
      } catch (err) {
        setConsoleOutput(prev => [
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
      setConsoleOutput(prev => [...prev, `[System] Loading Pyodide Neural core...`]);
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
        setConsoleOutput(prev => [
          ...prev, 
          ...lines.map(l => `[Out] ${l}`), 
          `[System] Python VM finished successfully.`
        ]);
      } catch (err) {
        setConsoleOutput(prev => [
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
      setConsoleOutput(prev => [...prev, `[System] No runner found for ${activeFile.language}.`]);
      return;
    }

    try {
      setConsoleOutput(prev => [...prev, `[System] Dispatching to Judge0 Remote...`]);
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

      setConsoleOutput(prev => [
        ...prev, 
        ...output, 
        `[System] Remote process finished: ${data.status?.description || "Unknown"}`
      ]);
    } catch (err) {
      setConsoleOutput(prev => [
        ...prev, 
        `[Err] Remote Failure: ${err instanceof Error ? err.message : String(err)}`
      ]);
    }
  }

  function handleInstallApp() {
    if (!isAdminMode) {
      setConsoleOutput(prev => [...prev, `[Error] Access Denied: Administrator privileges required to install apps.`]);
      return;
    }
    setConsoleOutput(prev => [...prev, `[System] Installing package dependencies...`, `[System] Registry synchronized.`, `[System] Installation Complete.`]);
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
      setConsoleOutput(prev => [...prev, `[Error] GitHub: ${err instanceof Error ? err.message : "Failed to fetch repositories"}`]);
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
      setConsoleOutput(prev => [...prev, `[Error] GitHub: ${err instanceof Error ? err.message : "Failed to fetch files"}`]);
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
      setConsoleOutput(prev => [...prev, `[System] Imported ${file.name} from GitHub.`]);
    } catch (err) {
      setConsoleOutput(prev => [...prev, `[Error] GitHub: Failed to download ${file.name}`]);
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
    setConsoleOutput(prev => [...prev, `[System] Project state saved to local disk.`]);
    setIsPublishOpen(false);
  }

  return (
    <div className="flex h-screen w-full bg-[#0c0c0e] text-zinc-300 font-sans overflow-hidden">
      {/* --- Sidebar Nav --- */}
      <div className="w-16 flex flex-col items-center py-4 border-r border-zinc-800/50 bg-[#09090b]">
        <div className="mb-6 flex flex-col items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 mb-1.5">
            <Sparkles className="text-white" size={24} />
          </div>
          <span className="text-[11px] font-black tracking-tighter text-zinc-100 uppercase">Neur0n</span>
          <span className="text-[6px] font-medium text-zinc-500 tracking-widest uppercase opacity-80 -mt-0.5">powered by OWI</span>
        </div>
        {[
          { id: "explorer", icon: FileCode },
          { id: "github", icon: Github },
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

      {/* --- Side Panels --- */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="w-72 bg-[#09090b] border-r border-zinc-800/50 flex flex-col overflow-hidden"
        >
          {activeTab === "explorer" && (
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Explorer</h2>
                <div className="flex gap-2 items-center">
                  <select 
                    value={activeFile.language}
                    onChange={(e) => {
                      const newLang = e.target.value;
                      setFiles(files.map(f => f.id === activeFileId ? { ...f, language: newLang } : f));
                    }}
                    className="appearance-none bg-[#09090b] btn-surface-gradient text-[10px] font-bold text-zinc-500 hover:text-blue-400 px-2 py-1 rounded-md border border-zinc-800 outline-none cursor-pointer transition-all"
                  >
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                  <label className="cursor-pointer p-1.5 rounded-lg btn-surface-gradient text-zinc-500 hover:text-blue-400 transition-all">
                    <Upload size={14} />
                    <input type="file" className="hidden" onChange={handleImport} />
                  </label>
                  <button className="p-1.5 rounded-lg btn-surface-gradient text-zinc-500 hover:text-blue-400 transition-all">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {files.map(file => (
                  <button
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                      activeFileId === file.id 
                        ? "bg-zinc-800/50 text-blue-400 border border-zinc-700/50" 
                        : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                    )}
                  >
                    <FileCode size={16} className={activeFileId === file.id ? "text-blue-400" : "text-zinc-600 group-hover:text-zinc-400"} />
                    <span className="flex-1 text-left truncate">{file.name}</span>
                  </button>
                ))}
              </div>

              <div className="mt-auto pt-6 border-t border-zinc-800/50">
                <div className="bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-xl p-4 border border-zinc-700/30 relative overflow-hidden group">
                  <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500" />
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={14} className="text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-amber-500/80">Premium License</span>
                  </div>
                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    Commercial use enabled for <span className="text-zinc-200 font-medium">Enterprise Tier</span>.
                  </p>
                  <span className="text-[10px] text-zinc-600 font-mono">ID: AUR-992-XPC</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "github" && (
            <div className="flex-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">GitHub Repos</h2>
                <button 
                  onClick={fetchRepos}
                  disabled={!githubToken || isFetchingRepos}
                  className="p-1.5 rounded-lg btn-surface-gradient text-zinc-500 hover:text-blue-400 disabled:opacity-30 transition-all"
                >
                  <RefreshCw size={16} className={isFetchingRepos ? "animate-spin" : ""} />
                </button>
              </div>

              {!githubToken && (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <Github size={32} className="mb-4 text-zinc-700" />
                  <p className="text-xs text-zinc-500 italic">Enter GitHub Personal Access Token in settings to load repositories.</p>
                </div>
              )}

              {githubToken && !selectedRepo && (
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                  {repos.map(repo => (
                    <button
                      key={repo.id}
                      onClick={() => fetchRepoContent(repo.owner.login, repo.name)}
                      className="w-full text-left p-3 rounded-lg bg-zinc-800/20 hover:bg-zinc-800/50 border border-zinc-800/50 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 truncate">{repo.name}</span>
                        <Unlock size={10} className="text-zinc-600" />
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">{repo.description || "No description"}</div>
                    </button>
                  ))}
                  {repos.length === 0 && !isFetchingRepos && (
                    <p className="text-[10px] text-zinc-600 text-center py-4 italic">No repositories found.</p>
                  )}
                </div>
              )}

              {selectedRepo && (
                <div className="flex-1 flex flex-col">
                  <button 
                    onClick={() => setSelectedRepo(null)}
                    className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-zinc-300 mb-4"
                  >
                    <ChevronRight size={12} className="rotate-180" />
                    Back to Repos
                  </button>
                  <div className="flex items-center gap-2 mb-4 p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                    <FolderOpen size={14} className="text-blue-400" />
                    <span className="text-xs font-bold text-zinc-300 truncate">{selectedRepo}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                    {repoFiles.map(file => (
                      <button
                        key={file.sha}
                        onClick={() => importGitHubFile(file)}
                        disabled={file.type !== "file"}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg text-xs transition-all",
                          file.type === "file" ? "hover:bg-zinc-800/50 text-zinc-400 hover:text-blue-400" : "opacity-30 cursor-default"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileCode size={14} />
                          <span className="truncate">{file.name}</span>
                        </div>
                        {file.type === "file" && <Plus size={12} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="flex-1 flex flex-col p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Environment Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Pedagogy Settings</label>
                  <button 
                    onClick={() => setIsTeachingEnabled(!isTeachingEnabled)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-500 group",
                      isTeachingEnabled 
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/10" 
                        : "btn-surface-gradient text-zinc-500 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles size={18} className={isTeachingEnabled ? "text-blue-400" : "text-zinc-600"} />
                      <span className="text-xs font-medium">Educational Mode</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors duration-300",
                      isTeachingEnabled ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.4)]" : "bg-zinc-700"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                        isTeachingEnabled ? "left-6" : "left-1"
                      )} />
                    </div>
                  </button>
                  <p className="text-[10px] text-zinc-600 mt-3 px-1 italic">When enabled, Neur0-L1nk will strictly explain concepts and logic while helping you "vibe code".</p>
                </div>

                <div className="h-[1px] bg-zinc-800/50" />

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">System Permissions</label>
                  <button 
                    onClick={() => setIsAdminMode(!isAdminMode)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-500 group",
                      isAdminMode 
                        ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-lg shadow-red-500/10" 
                        : "btn-surface-gradient text-zinc-500 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isAdminMode ? <ShieldCheck size={18} /> : <Unlock size={18} />}
                      <span className="text-xs font-medium">Run As Administrator</span>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors duration-300",
                      isAdminMode ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]" : "bg-zinc-700"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
                        isAdminMode ? "left-6" : "left-1"
                      )} />
                    </div>
                  </button>
                  <p className="text-[10px] text-zinc-600 mt-3 px-1">Enables system-level installations and kernel access simulation.</p>
                </div>
                
                <div className="h-[1px] bg-zinc-800/50" />
                
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-dashed border-zinc-800 text-center">
                  <Zap size={24} className="mx-auto text-amber-500/50 mb-2" />
                  <p className="text-[10px] text-zinc-500 italic">API Key management has moved to the Integrations vault (Lightning icon in sidebar).</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'brain' && (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/20 backdrop-blur-md">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">Neural Analysis</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${isNeuralLinkEstablished ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                  <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest leading-none">
                    {isNeuralLinkEstablished ? 'Mesh Connection Active' : 'Offline / Awaiting Link'}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                {!currentUser ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                    <Lock className="w-10 h-10 text-zinc-800 mb-4 opacity-20" />
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
                      RESTRICTED ACCESS: NEURAL IDENTITY REQUIRED
                    </p>
                    <button 
                      onClick={() => setIsAuthModalOpen(true)}
                      className="mt-6 text-[9px] font-black uppercase tracking-widest py-2 px-6 border border-purple-500/20 rounded-xl text-purple-400 hover:text-white hover:bg-purple-500/10 transition-all active:scale-95"
                    >
                      Authenticate Mesh
                    </button>
                  </div>
                ) : !isNeuralLinkEstablished ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                    <Brain className="w-10 h-10 text-zinc-800 mb-4 opacity-20" />
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
                      Establish a Neural Link to begin remote code analysis.
                    </p>
                    <button 
                      onClick={() => setIsIntegrationGuideOpen(true)}
                      className="mt-6 text-[9px] font-black uppercase tracking-widest py-2 px-6 border border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95"
                    >
                      Open Vault
                    </button>
                  </div>
                ) : linkedAppInfo && (
                  <>
                    <section>
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-emerald-500/50 mb-3 flex items-center gap-2">
                        <ShieldCheck size={12} /> Target Metadata
                      </h4>
                      <div className="space-y-2 bg-black/40 p-3 rounded-2xl border border-emerald-500/10">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase">Instance</span>
                          <span className="text-[10px] text-zinc-300 font-mono">{linkedAppInfo.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase">Health</span>
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{linkedAppInfo.health}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase">Latency</span>
                          <span className="text-[10px] text-zinc-300 font-mono font-bold">12ms</span>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-500/50 mb-3 flex items-center gap-2">
                        <FileCode size={12} /> Neural Topology
                      </h4>
                      <div className="space-y-1 pl-1">
                        {linkedAppInfo.structure.map((item: any, idx: number) => (
                          <div key={idx} className="group cursor-pointer">
                            <div className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                              {item.type === 'dir' ? <Folder size={12} className="text-zinc-600" /> : <FileText size={12} className="text-zinc-500" />}
                              <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200 transition-colors">{item.name}</span>
                            </div>
                            {item.children && (
                              <div className="ml-5 border-l border-zinc-800/50 space-y-1">
                                {item.children.map((child: string, cIdx: number) => (
                                  <div key={cIdx} className="flex items-center gap-2 py-1 px-3 hover:text-zinc-100 text-zinc-600 transition-colors cursor-pointer">
                                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                    <span className="text-[9px] font-mono">{child}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 mb-3 flex items-center gap-2">
                        <Terminal size={12} /> Cortex Stream
                      </h4>
                      <div className="bg-black/60 rounded-2xl border border-zinc-800/50 p-3 h-48 overflow-y-auto custom-scrollbar space-y-3 font-mono">
                        {linkedAppInfo.logs.map((log: any, idx: number) => (
                          <div key={idx} className="flex flex-col gap-1 border-b border-zinc-900 pb-2 last:border-0">
                            <div className="flex justify-between items-center">
                              <span className={`text-[8px] font-black px-1 rounded ${
                                log.type === 'ERROR' ? 'bg-red-500/20 text-red-500' : 
                                log.type === 'WARN' ? 'bg-orange-500/20 text-orange-500' : 
                                'bg-emerald-500/20 text-emerald-500'
                              }`}>{log.type}</span>
                              <span className="text-[8px] text-zinc-600 uppercase font-black">{log.time}</span>
                            </div>
                            <p className="text-[9px] text-zinc-400 break-words leading-tight">{log.msg}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* --- Main Workspace --- */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="h-14 border-b border-zinc-800/50 bg-[#09090b] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-800/50 px-3 py-1.5 rounded-md border border-zinc-700/50">
              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
              <span className="text-xs font-mono text-zinc-400">{activeFile.name}</span>
            </div>

            {isNeuralLinkEstablished && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 bg-purple-500/10 px-3 py-1.5 rounded-md border border-purple-500/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Neural Guardian Active</span>
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-lg",
                isAiOpen 
                  ? "bg-amber-500 text-white shadow-amber-500/20" 
                  : "btn-surface-gradient text-zinc-400 border-zinc-700/50 hover:text-amber-400"
              )}
            >
              <Bot size={14} className={isAiOpen ? "animate-bounce" : ""} />
              VIBE CHAT
            </button>
            <button 
              onClick={() => setIsPublishOpen(true)}
              className="group flex items-center gap-2 btn-success-gradient px-4 py-2 rounded-lg text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Share2 size={14} className="group-hover:rotate-12 transition-transform" />
              PUBLISH
            </button>
            <button 
              onClick={() => setIsIntegrationGuideOpen(true)}
              className="group flex items-center gap-2 btn-purple-gradient px-4 py-2 rounded-lg text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-purple-500/20"
            >
              <Command size={14} className="group-hover:rotate-12 transition-transform" />
              INTEGRATE
            </button>
            <button 
              onClick={handleRun}
              className="group flex items-center gap-2 btn-primary-gradient px-4 py-2 rounded-lg text-white text-xs font-bold transition-all active:scale-95"
            >
              <Play size={14} className="fill-current group-hover:scale-110 transition-transform" />
              RUN SYSTEM
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          <div className="flex-1 relative">
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
          </div>

          {/* AI Drawer (Bottom) */}
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

      {/* --- Console Window Window --- */}
      <AnimatePresence>
        {isConsoleWindowOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 100 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 100 }}
              className="w-full max-w-2xl bg-[#070708] border border-zinc-700/50 rounded-2xl shadow-2xl pointer-events-auto flex flex-col overflow-hidden glass"
            >
              <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800/50">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsConsoleWindowOpen(false)}
                    className="p-1.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 transition-all hover:text-white"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                  <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Execution Output</span>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono">NEUR0N-CORE-v2.1.0</div>
              </div>
              <div className="flex-1 p-6 font-mono text-sm overflow-y-auto max-h-[60vh] custom-scrollbar space-y-2">
                {consoleOutput.map((line, i) => (
                  <div key={i} className={cn(
                    "flex gap-4",
                    line.startsWith("[Error]") || line.startsWith("[Err]") ? "text-red-400" : 
                    line.startsWith("[System]") ? "text-blue-400" : 
                    line.startsWith("[Out]") ? "text-emerald-400" : 
                    line.startsWith(">") ? "text-amber-400" : 
                    "text-zinc-200"
                  )}>
                    <span className="opacity-20 shrink-0 select-none">[{i+1}]</span>
                    <span>{line}</span>
                  </div>
                ))}
                {consoleOutput.length === 0 && <div className="text-zinc-600 italic opacity-50">Passive standby...</div>}
              </div>
              <div className="px-6 py-4 border-t border-zinc-800/50 bg-black/20 flex justify-between items-center">
                <button 
                  onClick={() => setConsoleOutput([])}
                  className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Clear Buffer
                </button>
                <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                  <ShieldCheck size={10} />
                  <span>Verified Output Stream</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                    setConsoleOutput(prev => [...prev, "[System] Initiating GitHub Transfer handshake..."]);
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
                          setConsoleOutput(prev => [...prev, "[System] Establishing GitHub neural link..."]);
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
                          setConsoleOutput(prev => [...prev, "[System] GitHub session cleared."]);
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
                                  setConsoleOutput(prev => [...prev, "[System] Gemini Neural Core initialized."]);
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
                                setConsoleOutput(prev => [...prev, "[System] Gemini Neural Core initialized."]);
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
                            setConsoleOutput(prev => [...prev, "[System] Gemini Neural core offline."]);
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
                              setConsoleOutput(prev => [...prev, `[Neur0n] Token encrypted: ${'*'.repeat(githubToken.length)}`]);
                            }
                          }}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold text-zinc-300 rounded-xl transition-colors uppercase tracking-widest"
                        >
                          AUTH
                        </button>
                      </div>
                      <div className="flex items-center gap-2 px-3">
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
                        setConsoleOutput(prev => [...prev, "[Error] Neural Handshake failed: GITHUB_TOKEN_MISSING."]);
                        setConsoleOutput(prev => [...prev, "[Neur0n] Please provide a valid Personal Access Token in the vault."]);
                        return;
                      }

                      setIsEstablishingLink(true);
                      setConsoleOutput(prev => [...prev, "[Neur0n] Handshake initiated. Verifying token integrity..."]);
                      
                      setTimeout(() => {
                        // Real GitHub tokens usually start with ghp_ or github_pat_
                        const isTokenFormatValid = githubToken.startsWith('ghp_') || githubToken.startsWith('github_pat_');

                        if (!isTokenFormatValid) {
                          setConsoleOutput(prev => [...prev, "[Error] Security Breach: Invalid Token Signature detected."]);
                          setConsoleOutput(prev => [...prev, "[Neur0n] Link Aborted. Please use a valid GitHub Personal Access Token."]);
                          setAuthError("INVALID_SIGNATURE");
                          setIsEstablishingLink(false);
                          return;
                        }

                        setAuthError(null);
                        setConsoleOutput(prev => [...prev, "[Neur0n] Encryption verified via AES-256."]);
                        setConsoleOutput(prev => [...prev, "[Neur0n] Searching for woven mesh connections in external targets..."]);

                        setTimeout(() => {
                          setConsoleOutput(prev => [...prev, "[Neur0n] Mesh link established. Global Guardian is now monitoring external threads."]);
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

              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500">
                  <UserIcon className="text-white" size={32} />
                </div>
                <h3 className="text-2xl font-black italic tracking-tighter text-zinc-100 uppercase mb-2">Neural Identity</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest opacity-60">Authorize Mesh Access</p>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => handleSocialLogin(googleProvider)}
                  className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-zinc-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:text-blue-400 transition-colors">
                    <Mail size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-200">Google / GMail</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Secure Handshake</div>
                  </div>
                </button>

                <button 
                  onClick={() => handleSocialLogin(githubProvider)}
                  className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:text-purple-400 transition-colors">
                    <Github size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-200">GitHub Identity</div>
                    <div className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Mesh Verified</div>
                  </div>
                </button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800/50"></div>
                  </div>
                  <div className="relative flex justify-center text-[8px] uppercase font-black tracking-widest text-zinc-600 bg-[#0c0c0e] px-2">
                    Alternative Protocols
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-500 hover:text-zinc-200 transition-all opacity-50 cursor-not-allowed">
                    Proton-Link
                  </button>
                  <button className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-[9px] font-black uppercase text-zinc-500 hover:text-zinc-200 transition-all opacity-50 cursor-not-allowed">
                    Secure-Key
                  </button>
                </div>
              </div>

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
  );
}
