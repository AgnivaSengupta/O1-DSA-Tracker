"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronRight, Check, Sun, Moon, LogOut, Loader2, User, Mail, Lock, Menu, X } from "lucide-react";
import { dsaData, Topic } from "@/lib/data";
import { getSolvedProblems, toggleProblemSolved } from "@/app/actions";
import { authClient } from "@/lib/auth-client";
import Pomodoro from "@/components/pomodoro";

export default function DSATracker() {
  const [activeTopic, setActiveTopic] = useState<Topic>(dsaData[0].topics[0]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!session || !session.user) {
      setCompleted(new Set());
      return;
    }

    const userId = session.user.id;

    async function loadData() {
      try {
        const dbSolved = await getSolvedProblems();
        setCompleted(new Set(dbSolved));

        localStorage.setItem(`dsa_completed_${userId}`, JSON.stringify(dbSolved));
      } catch (error) {
        console.error("Failed to load solved problems from DB:", error);
        const cached = localStorage.getItem(`dsa_completed_${userId}`);
        if (cached) {
          setCompleted(new Set(JSON.parse(cached)));
        }
      }
    }

    loadData();
  }, [session]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (authMode === "signin") {
        await authClient.signIn.email({
          email,
          password,
        }, {
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to sign in. Please check your credentials.");
          }
        });
      } else {
        await authClient.signUp.email({
          email,
          password,
          name,
        }, {
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to create account.");
          }
        });
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const toggleProblem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session || !session.user) return;

    const userId = session.user.id;
    const cacheKey = `dsa_completed_${userId}`;

    // Optimistic UI Update
    const newCompleted = new Set(completed);
    const wasCompleted = newCompleted.has(id);
    if (wasCompleted) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
    localStorage.setItem(cacheKey, JSON.stringify(Array.from(newCompleted)));

    try {
      await toggleProblemSolved(id);
    } catch (error) {
      console.error("Failed to toggle problem status in DB:", error);
      const reverted = new Set(completed);
      if (wasCompleted) {
        reverted.add(id);
      } else {
        reverted.delete(id);
      }
      setCompleted(reverted);
      localStorage.setItem(cacheKey, JSON.stringify(Array.from(reverted)));
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (!isClient || isSessionPending) {
    return (
      <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-creamy-bg dark:bg-matte-bg">
        <Loader2 className="animate-spin text-black dark:text-white" size={32} />
        <p className="font-sans text-xs text-gray-500 dark:text-matte-muted uppercase tracking-widest mt-4">
          Loading Blueprint...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-[100dvh] w-screen flex flex-col items-center justify-center bg-creamy-bg dark:bg-matte-bg relative overflow-hidden px-4">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-neutral-400/10 dark:bg-neutral-800/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-neutral-300/10 dark:bg-neutral-700/20 blur-3xl pointer-events-none"></div>

        <div className="absolute left-12 top-0 bottom-0 w-[1px] bg-creamy-border dark:bg-matte-border/30 pattern-vertical-stripes opacity-40 hidden md:block"></div>
        <div className="absolute right-12 top-0 bottom-0 w-[1px] bg-creamy-border dark:bg-matte-border/30 pattern-vertical-stripes opacity-40 hidden md:block"></div>

        <div className="w-full max-w-md z-10 space-y-8">
          <div className="text-center space-y-2">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-6xl tracking-widest font-bold"
            >
              O(1)
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-sans text-xs text-gray-500 dark:text-matte-muted uppercase tracking-widest"
            >
              DSA & CP Blueprint
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="bg-white/80 dark:bg-matte-surface/60 backdrop-blur-xl border border-creamy-border dark:border-matte-border p-8 rounded-lg shadow-xl space-y-6"
          >
            {/* Tab Selector */}
            <div className="flex border-b border-creamy-border dark:border-matte-border pb-3">
              <button
                type="button"
                onClick={() => { setAuthMode("signin"); setError(""); }}
                className={`flex-1 text-center font-sans text-sm tracking-wider uppercase pb-2 transition-colors relative cursor-pointer ${authMode === "signin"
                    ? "font-semibold text-black dark:text-white"
                    : "text-gray-400 hover:text-gray-600 dark:text-matte-muted dark:hover:text-gray-300"
                  }`}
              >
                Sign In
                {authMode === "signin" && (
                  <motion.div layoutId="auth-tab-bar" className="absolute bottom-[-3px] left-0 right-0 h-[2px] bg-black dark:bg-white" />
                )}
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("signup"); setError(""); }}
                className={`flex-1 text-center font-sans text-sm tracking-wider uppercase pb-2 transition-colors relative cursor-pointer ${authMode === "signup"
                    ? "font-semibold text-black dark:text-white"
                    : "text-gray-400 hover:text-gray-600 dark:text-matte-muted dark:hover:text-gray-300"
                  }`}
              >
                Register
                {authMode === "signup" && (
                  <motion.div layoutId="auth-tab-bar" className="absolute bottom-[-3px] left-0 right-0 h-[2px] bg-black dark:bg-white" />
                )}
              </button>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <AnimatePresence mode="wait">
                {authMode === "signup" && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    <label className="font-sans text-[10px] text-gray-500 dark:text-matte-muted uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-2 bg-creamy-bg/50 dark:bg-matte-bg/30 border border-creamy-border dark:border-matte-border rounded-md font-sans text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="font-sans text-[10px] text-gray-500 dark:text-matte-muted uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2 bg-creamy-bg/50 dark:bg-matte-bg/30 border border-creamy-border dark:border-matte-border rounded-md font-sans text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-sans text-[10px] text-gray-500 dark:text-matte-muted uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-creamy-bg/50 dark:bg-matte-bg/30 border border-creamy-border dark:border-matte-border rounded-md font-sans text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-sans text-xs text-rose-500 border border-rose-500/20 bg-rose-500/5 p-3 rounded-md"
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-md font-sans text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin animate-duration-1000" size={16} />
                ) : authMode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          </motion.div>
        </div>
        <Pomodoro />
      </div>
    );
  }

  const progress =
    activeTopic.problems.length > 0
      ? Math.round(
        (activeTopic.problems.filter((p) => completed.has(p.id)).length /
          activeTopic.problems.length) *
        100,
      )
      : 0;

  // Main Dashboard UI
  return (
    <div className="flex h-[100dvh] overflow-hidden relative">
      {/* Sidebar Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`w-72 flex-shrink-0 border-r border-creamy-border dark:border-matte-border bg-creamy-bg dark:bg-matte-bg flex flex-col pt-8 fixed lg:relative inset-y-0 left-0 z-30 h-[100dvh] lg:h-auto transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-black dark:text-matte-muted dark:hover:text-white p-1 hover:bg-creamy-hover dark:hover:bg-matte-surface rounded-md cursor-pointer animate-none"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl tracking-widest font-bold">O(1)</h1>
            <p className="font-sans text-xs text-gray-500 dark:text-matte-muted uppercase tracking-wider mt-2">
              DSA & CP Blueprint
            </p>
          </div>
        </div>

        {/* Sidebar Topics List */}
        <div className="flex-1 overflow-y-auto px-4 pb-36 space-y-8">
          {dsaData.map((tier) => (
            <div key={tier.id}>
              <div className="px-2 mb-2 flex items-center justify-between">
                <h2 className="font-sans text-xs font-semibold text-gray-400 dark:text-matte-muted uppercase tracking-wider">
                  Tier {tier.id}: {tier.name}
                </h2>
              </div>
              <ul className="space-y-0.5">
                {tier.topics.map((topic) => (
                  <li key={topic.id}>
                    <button
                      onClick={() => {
                        setActiveTopic(topic);
                        setIsSidebarOpen(false); // Close sidebar on mobile selection
                      }}
                      className={`w-full text-left px-2 py-2 rounded-md font-sans text-sm transition-colors duration-200 flex items-center justify-between group cursor-pointer ${activeTopic.id === topic.id
                          ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                          : "text-gray-700 dark:text-gray-400 hover:bg-creamy-hover dark:hover:bg-matte-surface"
                        }`}
                    >
                      <span className="truncate">{topic.name}</span>
                      {activeTopic.id === topic.id && (
                        <ChevronRight size={14} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Profile Card & Theme Toggle in Sidebar footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-creamy-border dark:border-matte-border bg-creamy-bg dark:bg-matte-bg space-y-2">
          {session?.user && (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-creamy-hover dark:bg-matte-surface border border-creamy-border dark:border-matte-border/50">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-sans text-[10px] font-semibold flex-shrink-0">
                  {session.user.name ? session.user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U"}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-sans text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                    {session.user.name}
                  </span>
                  <span className="font-sans text-[9px] text-gray-500 dark:text-matte-muted truncate">
                    {session.user.email}
                  </span>
                </div>
              </div>
              <button
                onClick={async () => {
                  await authClient.signOut();
                }}
                title="Sign Out"
                className="text-gray-500 hover:text-black dark:text-matte-muted dark:hover:text-white transition-colors cursor-pointer p-1"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-sans text-gray-600 dark:text-gray-400 hover:bg-creamy-hover dark:hover:bg-matte-surface rounded-md transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-matte-bg relative overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-creamy-border dark:border-matte-border bg-creamy-bg dark:bg-matte-bg z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-700 dark:text-gray-300 p-1.5 hover:bg-creamy-hover dark:hover:bg-matte-surface rounded-md cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <span className="font-serif text-xl font-bold tracking-wider">O(1)</span>
          </div>
          <div className="font-sans text-[10px] uppercase tracking-widest text-gray-500 dark:text-matte-muted">
            {progress}% Done
          </div>
        </header>

        <header className="px-6 lg:px-10 pt-4 lg:pt-12 pb-2 lg:pb-6 w-full lg:w-[80%] mx-auto">
          <motion.div
            key={activeTopic.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h2 className="text-3xl lg:text-5xl mb-2">{activeTopic.name}</h2>
            <div className="flex items-center gap-3 lg:gap-4 font-sans text-xs lg:text-sm text-gray-500 dark:text-matte-muted">
              <span>{activeTopic.problems.length} Problems</span>
              <span>•</span>
              <span>{progress}% Completed</span>
            </div>
          </motion.div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-2 lg:py-4">
          <div className="max-w-7xl mx-auto relative border border-matte-muted/10 lg:border-matte-muted/20">
            {/* Left Tactile Border */}
            <div className="absolute left-0 top-0 bottom-0 w-4 lg:w-10 2xl:w-20 pattern-vertical-stripes border-x border-creamy-border dark:border-matte-border/50 opacity-40 lg:opacity-60 pointer-events-none"></div>

            {/* Right Tactile Border */}
            <div className="absolute right-0 top-0 bottom-0 w-4 lg:w-10 2xl:w-20 pattern-vertical-stripes border-x border-creamy-border dark:border-matte-border/50 opacity-40 lg:opacity-60 pointer-events-none"></div>

            <div className="max-w-5xl mx-auto px-8 lg:px-16 py-2">
              <AnimatePresence mode="popLayout">
                {activeTopic.problems.map((problem, idx) => {
                  const isDone = completed.has(problem.id);
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      key={problem.id}
                      className="group"
                    >
                      <div className="flex items-center gap-4 xl:gap-8 py-3 border-b border-creamy-border dark:border-matte-border/50 transition-all duration-150 ease-out hover:py-5 lg:hover:py-7">
                        <button
                          onClick={(e) => toggleProblem(problem.id, e)}
                          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 ${isDone
                              ? "bg-black border-black dark:bg-white dark:border-white"
                              : "border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-white"
                            }`}
                        >
                          {isDone && (
                            <Check
                              size={12}
                              className="text-white dark:text-black stroke-[3]"
                            />
                          )}
                        </button>

                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 flex items-center justify-between transition-opacity duration-300 ${isDone
                              ? "opacity-40"
                              : "opacity-100 hover:opacity-70"
                            }`}
                        >
                          <span
                            className={`text-base md:text-lg lg:text-xl 2xl:text-2xl tracking-tight relative ${isDone
                                ? "line-through decoration-1 decoration-gray-500"
                                : ""
                              }`}
                          >
                            {problem.title}
                          </span>

                          <div className="flex items-center gap-3 font-sans">
                            <span
                              className={`text-[8px] md:text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border ${problem.difficulty === "easy"
                                  ? "border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-400"
                                  : problem.difficulty === "medium"
                                    ? "border-amber-200 text-amber-700 dark:border-amber-900/50 dark:text-amber-400"
                                    : "border-rose-200 text-rose-700 dark:border-rose-900/50 dark:text-rose-400"
                                }`}
                            >
                              {problem.difficulty}
                            </span>
                            <ExternalLink
                              size={16}
                              className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </div>
                        </a>
                      </div>
                    </motion.div>
                  );
                })}

                {activeTopic.problems.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-12 text-center text-gray-400 dark:text-matte-muted font-sans text-sm italic"
                  >
                    Questions for this topic are currently being curated.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
      <Pomodoro />
    </div>
  );
}
