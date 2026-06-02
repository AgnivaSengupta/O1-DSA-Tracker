"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Coffee,
  RotateCcw,
  Settings as SettingsIcon,
  X,
  ChevronRight,
  ChevronLeft,
  Plus,
  Minus,
  Bell,
  BellOff
} from "lucide-react";

type TimerMode = "focus" | "short_break" | "long_break";
type ActiveScreen = "timer" | "settings" | "adjust";
type SettingKey = "focus" | "short_break" | "long_break" | "session_count";

interface Durations {
  focus: number;       // in minutes
  short_break: number; // in minutes
  long_break: number;  // in minutes
  session_count: number; // number of focus sessions before long break
}

export default function Pomodoro() {
  // --- Persistent States (loaded from LocalStorage) ---
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // default 25 min in seconds
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const [durations, setDurations] = useState<Durations>({
    focus: 25,
    short_break: 5,
    long_break: 15,
    session_count: 4,
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // --- UI Screen States ---
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>("timer");
  const [selectedSetting, setSelectedSetting] = useState<SettingKey>("focus");
  const [settingsTab, setSettingsTab] = useState<"duration" | "notifications">("duration");

  // --- Internal Refs for Precise Timing ---
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  // --- Drag Boundaries ---
  const [dragBounds, setDragBounds] = useState({ left: 0, right: 0, top: 0, bottom: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Define total duration in seconds for progress bar
  const totalDuration =
    mode === "focus"
      ? durations.focus * 60
      : mode === "short_break"
        ? durations.short_break * 60
        : durations.long_break * 60;

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / totalDuration) * 100));

  // --- Synthesize High-End Alarm Chime (Web Audio API) ---
  const playAlarmSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const playChimeNode = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);

        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.25, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      // Beautiful high-end double bell chime
      playChimeNode(now, 987.77, 0.4); // B5
      playChimeNode(now + 0.18, 1318.51, 0.6); // E6
    } catch (err) {
      console.warn("Audio Context playback failed (user interaction required):", err);
    }
  };

  // --- Trigger OS Notification ---
  const triggerNotification = (title: string, body: string) => {
    if (!notificationsEnabled) return;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    }
  };

  // Request notification permissions
  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  // --- Load Initial State from LocalStorage ---
  useEffect(() => {
    const savedDurations = localStorage.getItem("pomo_durations");
    const savedSound = localStorage.getItem("pomo_sound");
    const savedNotifs = localStorage.getItem("pomo_notifs");
    const savedSessions = localStorage.getItem("pomo_sessions_completed");
    const savedMode = localStorage.getItem("pomo_mode") as TimerMode;
    const savedIsActive = localStorage.getItem("pomo_is_active") === "true";
    const savedEndTime = localStorage.getItem("pomo_end_time");

    if (savedDurations) setDurations(JSON.parse(savedDurations));
    if (savedSound) setSoundEnabled(savedSound === "true");
    if (savedNotifs) setNotificationsEnabled(savedNotifs === "true");
    if (savedSessions) setSessionsCompleted(parseInt(savedSessions, 10));
    if (savedMode) setMode(savedMode);

    // Timing Recovery
    if (savedIsActive && savedEndTime) {
      const endTime = parseInt(savedEndTime, 10);
      const now = Date.now();
      if (endTime > now) {
        setIsActive(true);
        setTimeLeft(Math.ceil((endTime - now) / 1000));
        endTimeRef.current = endTime;
      } else {
        // Completed while offline
        setIsActive(false);
        setTimeLeft(0);
        handleTimerEnd(savedMode || "focus", JSON.parse(savedDurations || "{}"));
      }
    } else {
      const savedTimeLeft = localStorage.getItem("pomo_time_left");
      if (savedTimeLeft) {
        setTimeLeft(parseInt(savedTimeLeft, 10));
      } else if (savedDurations) {
        const parsed = JSON.parse(savedDurations) as Durations;
        const currentMode = savedMode || "focus";
        setTimeLeft(parsed[currentMode === "short_break" ? "short_break" : currentMode === "long_break" ? "long_break" : "focus"] * 60);
      }
    }
  }, []);

  // --- Save settings to LocalStorage on Change ---
  useEffect(() => {
    localStorage.setItem("pomo_durations", JSON.stringify(durations));
  }, [durations]);

  useEffect(() => {
    localStorage.setItem("pomo_sound", String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("pomo_notifs", String(notificationsEnabled));
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem("pomo_sessions_completed", String(sessionsCompleted));
  }, [sessionsCompleted]);

  useEffect(() => {
    localStorage.setItem("pomo_mode", mode);
  }, [mode]);

  // --- Drag Boundary Calculation ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const calculateBounds = () => {
      const padding = 24; // safety margin from viewport edges
      const width = isCollapsed ? 56 : 320;
      const height = isCollapsed ? 56 : 340;
      setDragBounds({
        left: -window.innerWidth + width + padding * 2,
        right: 0,
        top: -window.innerHeight + height + padding * 2,
        bottom: 0,
      });
    };
    calculateBounds();
    window.addEventListener("resize", calculateBounds);
    return () => window.removeEventListener("resize", calculateBounds);
  }, [isCollapsed]);

  // --- Handle Timer Completion & Mode Transitions ---
  const handleTimerEnd = (completedMode: TimerMode, currentDurations = durations) => {
    playAlarmSound();

    let nextMode: TimerMode = "focus";
    let nextSessions = sessionsCompleted;

    if (completedMode === "focus") {
      nextSessions += 1;
      setSessionsCompleted(nextSessions);
      triggerNotification("Focus Session Finished!", "Time to take a break.");

      if (nextSessions >= currentDurations.session_count) {
        nextMode = "long_break";
      } else {
        nextMode = "short_break";
      }
    } else {
      triggerNotification("Break Finished!", "Ready to focus again?");
      if (completedMode === "long_break") {
        nextSessions = 0;
        setSessionsCompleted(0);
      }
      nextMode = "focus";
    }

    setMode(nextMode);
    setIsActive(false);

    // Set next duration
    const targetMin =
      nextMode === "focus"
        ? currentDurations.focus
        : nextMode === "short_break"
          ? currentDurations.short_break
          : currentDurations.long_break;

    setTimeLeft(targetMin * 60);

    localStorage.setItem("pomo_is_active", "false");
    localStorage.setItem("pomo_time_left", String(targetMin * 60));
    localStorage.removeItem("pomo_end_time");
  };

  // --- Core Timer Loop ---
  useEffect(() => {
    if (isActive) {
      // Setup background-drift proof interval
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
        localStorage.setItem("pomo_end_time", String(endTimeRef.current));
      }
      localStorage.setItem("pomo_is_active", "true");

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil(((endTimeRef.current || 0) - now) / 1000);

        if (diff <= 0) {
          clearInterval(intervalRef.current!);
          endTimeRef.current = null;
          handleTimerEnd(mode);
        } else {
          setTimeLeft(diff);
          localStorage.setItem("pomo_time_left", String(diff));
        }
      }, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      localStorage.setItem("pomo_is_active", "false");
      localStorage.setItem("pomo_time_left", String(timeLeft));
      localStorage.removeItem("pomo_end_time");
      endTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, mode]);

  // --- Reset Current Timer ---
  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(false);
    const targetMin =
      mode === "focus"
        ? durations.focus
        : mode === "short_break"
          ? durations.short_break
          : durations.long_break;

    setTimeLeft(targetMin * 60);
    endTimeRef.current = null;
    localStorage.removeItem("pomo_end_time");
    localStorage.setItem("pomo_time_left", String(targetMin * 60));
  };

  // --- Toggle Play/Pause ---
  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      setIsActive(false);
    } else {
      // Calculate and set end time immediately to start ticking
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setIsActive(true);
    }
  };

  // --- Set Settings Values ---
  const updateDuration = (key: SettingKey, value: number) => {
    const updated = { ...durations, [key]: Math.max(1, value) };
    setDurations(updated);

    // If updating duration of the CURRENT mode, apply immediately (if not active)
    if (!isActive) {
      if (key === "focus" && mode === "focus") {
        setTimeLeft(updated.focus * 60);
      } else if (key === "short_break" && mode === "short_break") {
        setTimeLeft(updated.short_break * 60);
      } else if (key === "long_break" && mode === "long_break") {
        setTimeLeft(updated.long_break * 60);
      }
    }
  };

  // --- Display Utils ---
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getSettingLabel = (key: SettingKey) => {
    switch (key) {
      case "focus": return "Focus Session";
      case "short_break": return "Short break";
      case "long_break": return "Long break";
      case "session_count": return "Long break after";
    }
  };

  const getSettingUnit = (key: SettingKey) => {
    return key === "session_count" ? "Sess." : "min";
  };

  // --- Toggle Collapse/Expand ---
  const handleWidgetClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  // Prevent drag from firing as click
  const dragStartPos = useRef({ x: 0, y: 0 });
  const handleDragStart = (e: any) => {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    dragStartPos.current = { x: clientX, y: clientY };
  };

  const handleDragEnd = (e: any, info: any) => {
    const threshold = 5;
    const deltaX = Math.abs(info.offset.x);
    const deltaY = Math.abs(info.offset.y);

    // If moved less than threshold, treat as click
    if (deltaX < threshold && deltaY < threshold) {
      handleWidgetClick();
    }
  };

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0.05}
      dragConstraints={dragBounds}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}
      onTap={() => {
        if (isCollapsed) {
          setIsCollapsed(false);
        }
      }}
      layout
      className={`fixed bottom-6 right-6 z-[9990] select-none bg-creamy-bg/95 dark:bg-matte-surface/95 backdrop-blur-lg border border-creamy-border dark:border-matte-border shadow-[0_15px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] font-sans overflow-hidden transition-colors duration-300 ${isCollapsed
        ? "w-14 h-14 rounded-full cursor-pointer flex items-center justify-center"
        : "w-[320px] h-[345px] rounded-[12px] cursor-default"
        }`}
    >
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          // ==================== COLLAPSED WIDGET ====================
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="relative w-full h-full flex items-center justify-center group pointer-events-none"
          >
            {/* Circular Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 p-0.5" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="16.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-creamy-border dark:text-matte-border"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="16.5"
                fill="none"
                stroke="url(#collapsedGradient)"
                strokeWidth="2"
                strokeDasharray="103.67"
                strokeDashoffset={103.67 - (progressPercent / 100) * 103.67}
                strokeLinecap="round"
                transition={{ duration: 0.3 }}
              />
              <defs>
                <linearGradient id="collapsedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* Glowing active indicator */}
            {isActive && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
            )}

            {/* Core Icon Display */}
            <div className="z-10 text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-neutral-200 transition-colors">
              {mode === "focus" ? (
                <Timer size={18} className={isActive ? "animate-pulse text-orange-600 dark:text-orange-500" : ""} />
              ) : (
                <Coffee size={18} className={isActive ? "animate-pulse text-emerald-700 dark:text-emerald-400" : ""} />
              )}
            </div>
          </motion.div>
        ) : (
          // ==================== EXPANDED WIDGET CARD ====================
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full h-full p-6 pt-8 relative flex flex-col justify-between text-black dark:text-neutral-200 cursor-default"
            onPointerDown={(e) => {
              // Only drag when clicking direct background, preventing conflict on buttons/inputs
              const target = e.target as HTMLElement;
              if (target.closest("button") || target.closest("a") || target.closest("svg")) {
                e.stopPropagation();
              }
            }}
          >
            {/* Editorial Tactile Top Bar Accent */}
            {/* <div className="absolute top-0 left-0 right-0 h-2.5 pattern-vertical-stripes border-b border-creamy-border dark:border-matte-border/50 opacity-40 dark:opacity-60" /> */}
            {/* Ambient Background Gradient Glow */}
            <div className="absolute top-0 left-0 right-0 h-40 bg-radial-gradient from-orange-500/10 via-transparent to-transparent pointer-events-none blur-xl" />
            <AnimatePresence mode="wait">
              {/* SCREEN 1: TIMER SCREEN */}
              {activeScreen === "timer" && (
                <motion.div
                  key="timer-screen"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col justify-between h-full relative"
                >
                  {/* Top bar with Collapse button */}
                  <div className="flex justify-end items-center h-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCollapsed(true);
                      }}
                      className="text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-neutral-300 transition-colors p-1 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Circular visual container */}
                  <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-1">
                    {/* SVG progress display */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                      {/* Track */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-creamy-border dark:text-matte-border"
                      />
                      {/* Active Ring */}
                      <motion.circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#expandedGradient)"
                        strokeWidth="3.5"
                        strokeDasharray="282.7"
                        strokeDashoffset={282.7 - (progressPercent / 100) * 282.7}
                        strokeLinecap="round"
                        transition={{ duration: 0.2, ease: "linear" }}
                      />
                      <defs>
                        <linearGradient id="expandedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f97316" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Clock Details Inside Circle */}
                    <div className="flex flex-col items-center justify-center z-10">
                      {/* State Icon */}
                      <div className="mb-1 text-neutral-500">
                        {mode === "focus" ? (
                          <Timer size={20} className={isActive ? "text-orange-600 dark:text-orange-500 animate-pulse" : ""} />
                        ) : (
                          <Coffee size={20} className={isActive ? "text-emerald-700 dark:text-emerald-400 animate-pulse" : ""} />
                        )}
                      </div>

                      {/* Giant Clock Numbers */}
                      <span className="text-5xl font-serif font-medium tracking-tight tabular-nums text-black dark:text-white">
                        {formatTime(timeLeft)}
                      </span>

                      {/* Active Dot Indicators */}
                      <div className="flex gap-1.5 mt-2 mb-1">
                        {Array.from({ length: durations.session_count }).map((_, i) => {
                          const isCompleted = i < sessionsCompleted;
                          const isCurrent = i === sessionsCompleted && isActive && mode === "focus";
                          return (
                            <div
                              key={i}
                              className={`h-1.5 rounded-full transition-all duration-300 ${isCompleted
                                ? "w-4 bg-black dark:bg-white"
                                : isCurrent
                                  ? "w-4 bg-black/40 dark:bg-white/40 animate-pulse"
                                  : "w-2 bg-creamy-border dark:bg-matte-border"
                                }`}
                            />
                          );
                        })}
                      </div>

                      {/* Small State Label */}
                      <span className="text-[9px] font-medium tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">
                        {mode === "focus"
                          ? "Focus"
                          : mode === "short_break"
                            ? "Short Break"
                            : "Long Break"
                        }
                      </span>
                    </div>
                  </div>

                  {/* Actions / Buttons footer */}
                  <div className="flex items-center justify-between mt-2">
                    <button
                      onClick={handleReset}
                      className="w-10 h-10 rounded-full bg-creamy-hover dark:bg-matte-bg border border-creamy-border dark:border-matte-border flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-creamy-border dark:hover:bg-matte-surface transition-all cursor-pointer"
                      title="Reset Session"
                    >
                      <RotateCcw size={16} />
                    </button>

                    <button
                      onClick={toggleTimer}
                      className="px-8 py-2.5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-90 active:scale-95 transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
                    >
                      {isActive ? "Pause" : "Start"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveScreen("settings");
                      }}
                      className="w-10 h-10 rounded-full bg-creamy-hover dark:bg-matte-bg border border-creamy-border dark:border-matte-border flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-creamy-border dark:hover:bg-matte-surface transition-all cursor-pointer"
                      title="Open Settings"
                    >
                      <SettingsIcon size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* SCREEN 2: SETTINGS SCREEN */}
              {activeScreen === "settings" && (
                <motion.div
                  key="settings-screen"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col h-full"
                >
                  {/* Settings Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-base font-serif font-medium tracking-wide text-black dark:text-neutral-100">Settings</h2>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveScreen("timer");
                      }}
                      className="text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-neutral-300 transition-colors p-1 cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Settings Menu Tabs */}
                  <div className="flex bg-creamy-hover dark:bg-matte-bg border border-creamy-border dark:border-matte-border rounded-full p-1 mb-5 max-w-[240px] mx-auto w-full">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSettingsTab("duration"); }}
                      className={`flex-1 py-1 px-3 text-[10px] font-semibold tracking-wider rounded-full transition-all cursor-pointer uppercase ${settingsTab === "duration"
                        ? "bg-white text-black dark:bg-matte-surface dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        }`}
                    >
                      Duration
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSettingsTab("notifications"); }}
                      className={`flex-1 py-1 px-3 text-[10px] font-semibold tracking-wider rounded-full transition-all cursor-pointer uppercase ${settingsTab === "notifications"
                        ? "bg-white text-black dark:bg-matte-surface dark:text-white shadow-sm"
                        : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                        }`}
                    >
                      Alerts
                    </button>
                  </div>

                  {/* Settings Panel Content */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {settingsTab === "duration" ? (
                      // DURATION TABS
                      <div className="space-y-1">
                        {(["focus", "short_break", "long_break", "session_count"] as SettingKey[]).map((key) => (
                          <button
                            key={key}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSetting(key);
                              setActiveScreen("adjust");
                            }}
                            className="w-full flex items-center justify-between py-2 px-3 hover:bg-creamy-hover/60 dark:hover:bg-matte-surface/40 rounded-xl transition-all cursor-pointer group text-left"
                          >
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-neutral-200 transition-colors">
                              {getSettingLabel(key)}
                            </span>
                            <div className="flex items-center gap-1.5 text-neutral-400">
                              <span className="text-xs font-medium text-black dark:text-neutral-100 tabular-nums">
                                {durations[key].toString().padStart(2, "0")} <span className="text-[10px] text-neutral-500">{getSettingUnit(key)}</span>
                              </span>
                              <ChevronRight size={14} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      // NOTIFICATION / ALERT CONTROLS
                      <div className="space-y-2.5 px-1 mt-2 text-black dark:text-neutral-200">
                        {/* Audio Chime toggle */}
                        <div className="flex items-center justify-between py-1.5">
                          <div className="flex flex-col">
                            <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">Sound Alarm</span>
                            <span className="text-[10px] text-neutral-500">Play a soft bell chime upon completion</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSoundEnabled(!soundEnabled);
                            }}
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${soundEnabled
                              ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                              : "bg-creamy-hover dark:bg-matte-bg border-creamy-border dark:border-matte-border text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400"
                              }`}
                          >
                            {soundEnabled ? <Bell size={15} /> : <BellOff size={15} />}
                          </button>
                        </div>

                        {/* Push Notifications toggle */}
                        <div className="flex items-center justify-between py-1.5">
                          <div className="flex flex-col">
                            <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium">System Alert</span>
                            <span className="text-[10px] text-neutral-500">Show desktop push notifications</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!notificationsEnabled) {
                                requestNotificationPermission();
                              } else {
                                setNotificationsEnabled(false);
                              }
                            }}
                            className={`px-4 py-1.5 rounded-full border text-[10px] font-semibold tracking-wider uppercase transition-all cursor-pointer ${notificationsEnabled
                              ? "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                              : "bg-creamy-hover dark:bg-matte-bg border-creamy-border dark:border-matte-border text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400"
                              }`}
                          >
                            {notificationsEnabled ? "Enabled" : "Enable"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SCREEN 3: ADJUSTMENT VIEW */}
              {activeScreen === "adjust" && (
                <motion.div
                  key="adjust-screen"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col h-full"
                >
                  {/* Adjustment Header */}
                  <div className="flex items-center mb-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveScreen("settings");
                      }}
                      className="text-neutral-400 dark:text-neutral-500 hover:text-black dark:hover:text-white transition-colors p-1 mr-2 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-sm font-serif font-medium text-black dark:text-neutral-100">
                      {getSettingLabel(selectedSetting)}
                    </h2>
                  </div>

                  {/* Center adjuster controls */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="flex items-center justify-center gap-6 mb-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDuration(selectedSetting, durations[selectedSetting] - 1);
                        }}
                        disabled={durations[selectedSetting] <= 1}
                        className="w-11 h-11 rounded-full bg-creamy-hover dark:bg-matte-bg border border-creamy-border dark:border-matte-border hover:bg-creamy-border dark:hover:bg-matte-surface text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:hover:bg-creamy-hover cursor-pointer"
                      >
                        <Minus size={16} />
                      </button>

                      <span className="text-6xl font-serif font-medium tracking-tight tabular-nums text-black dark:text-white min-w-[80px] text-center">
                        {durations[selectedSetting]}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateDuration(selectedSetting, durations[selectedSetting] + 1);
                        }}
                        className="w-11 h-11 rounded-full bg-creamy-hover dark:bg-matte-bg border border-creamy-border dark:border-matte-border hover:bg-creamy-border dark:hover:bg-matte-surface text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500">
                      {getSettingUnit(selectedSetting)}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
