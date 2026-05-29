"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, ChevronRight, Check, Sun, Moon } from "lucide-react";
import { dsaData, Topic } from "@/lib/data";
import Image from "next/image";

export default function DSATracker() {
  const [activeTopic, setActiveTopic] = useState<Topic>(dsaData[0].topics[0]);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Load completed problems
    const saved = localStorage.getItem("dsa_completed");
    if (saved) {
      setCompleted(new Set(JSON.parse(saved)));
    }

    // Load theme preference or fallback to system preference
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

  const toggleProblem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCompleted = new Set(completed);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompleted(newCompleted);
    localStorage.setItem(
      "dsa_completed",
      JSON.stringify(Array.from(newCompleted)),
    );
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

  if (!isClient) return null;

  const progress =
    activeTopic.problems.length > 0
      ? Math.round(
          (activeTopic.problems.filter((p) => completed.has(p.id)).length /
            activeTopic.problems.length) *
            100,
        )
      : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-creamy-border dark:border-matte-border bg-creamy-bg dark:bg-matte-bg flex flex-col pt-8 relative">
        <div className="px-6 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl tracking-widest font-bold">O(1)</h1>
            {/*<Image
              src='/O(1)_icon.png'
              alt="O(1)"
              width={200}
              height={100}
              // Force the width, let height adjust automatically, and prevent flex shrinking
              className="w-[200px] h-auto flex-shrink-0 object-contain" 
            />*/}
            <p className="font-sans text-xs text-gray-500 dark:text-matte-muted uppercase tracking-wider mt-2">
              DSA & CP Blueprint
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-20 space-y-8">
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
                      onClick={() => setActiveTopic(topic)}
                      className={`w-full text-left px-2 py-2 rounded-md font-sans text-sm transition-all duration-200 flex items-center justify-between group cursor-pointer ${
                        activeTopic.id === topic.id
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

        {/* Theme Toggle Button at the bottom of the sidebar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-creamy-border dark:border-matte-border bg-creamy-bg dark:bg-matte-bg ">
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
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-matte-bg relative">
        <header className="px-10 pt-12 pb-6 w-[80%] mx-auto">
          <motion.div
            key={activeTopic.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <h2 className="text-5xl mb-2">{activeTopic.name}</h2>
            <div className="flex items-center gap-4 font-sans text-sm text-gray-500 dark:text-matte-muted">
              <span>{activeTopic.problems.length} Problems</span>
              <span>•</span>
              <span>{progress}% Completed</span>
            </div>
          </motion.div>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-4 ">
          <div className="max-w-7xl mx-auto relative border border-matte-muted/20">
            {/* Left Tactile Border */}
            <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-20 pattern-vertical-stripes border-x border-creamy-border dark:border-matte-border/50 opacity-60 pointer-events-none"></div>

            {/* Right Tactile Border */}
            <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-20 pattern-vertical-stripes border-x border-creamy-border dark:border-matte-border/50 opacity-60 pointer-events-none"></div>
            <div className="max-w-5xl mx-auto px-12 sm:px-16 py-2">
              <AnimatePresence mode="popLayout">
                {activeTopic.problems.map((problem, idx) => {
                  const isDone = completed.has(problem.id);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      key={problem.id}
                      className="group"
                    >
                      <div className="flex items-center gap-8 py-3 border-b border-creamy-border dark:border-matte-border/50 transition-all duration-150 ease-out hover:py-7">
                        <button
                          onClick={(e) => toggleProblem(problem.id, e)}
                          className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                            isDone
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
                          className={`flex-1 flex items-center justify-between transition-all duration-300 ${
                            isDone
                              ? "opacity-40"
                              : "opacity-100 hover:opacity-70"
                          }`}
                        >
                          <span
                            className={`text-2xl tracking-tight relative ${
                              isDone
                                ? "line-through decoration-1 decoration-gray-500"
                                : ""
                            }`}
                          >
                            {problem.title}
                          </span>

                          <div className="flex items-center gap-3 font-sans">
                            <span
                              className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm border ${
                                problem.difficulty === "easy"
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
    </div>
  );
}
