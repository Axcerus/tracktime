"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import ReportsView from "@/components/ReportsView";
import ProfileView from "@/components/ProfileView";
import UserAvatar from "@/components/UserAvatar";
import { ChevronRight, ChevronDown, ChevronUp } from "lucide-react";

interface ActiveEntry {
  id: string;
  userId: string;
  description: string | null;
  startTime: number;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
}

interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  isWorkingNow: boolean;
  startTime: number | null;
  description: string | null;
  completedTodayMs: number;
  currentSessionMs: number;
  totalDurationWorkedMs: number;
  isMe: boolean;
}

function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

function formatClockTime(diffMs: number): string {
  if (diffMs < 0) diffMs = 0;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatStartTime(timestamp: number): string {
  const date = new Date(timestamp);
  let hours = date.getHours();
  const minutes = pad(date.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${pad(hours)}:${minutes} ${ampm}`;
}

function formatShortDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

// Format duration for cards without seconds
function formatCardDuration(ms: number, isWorking: boolean): string {
  if (ms <= 0) return isWorking ? "< 1m" : "0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  if (totalMinutes === 0) return isWorking ? "< 1m" : "0m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function getDailyProgress(ms: number) {
  const TARGET_DAILY_MS = 3 * 3600 * 1000;
  const percent = Math.min(100, Math.round((ms / TARGET_DAILY_MS) * 100));
  const remainingMs = Math.max(0, TARGET_DAILY_MS - ms);
  const isGoalReached = ms >= TARGET_DAILY_MS;

  return {
    percent,
    remainingMs,
    isGoalReached,
  };
}

export default function AppSPA() {
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Inline login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // SPA Navigation Tab
  const [activeTab, setActiveTab] = useState<"timer" | "reports" | "profile">(() => {
    if (typeof window === "undefined") return "timer";
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    if (path === "/reports" || searchParams.get("tab") === "reports") return "reports";
    if (path === "/profile" || searchParams.get("tab") === "profile" || searchParams.get("member")) return "profile";
    return "timer";
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("member");
  });
  const [previousTab, setPreviousTab] = useState<"timer" | "reports">("timer");

  // Timer state
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(null);
  const [todayTotalMs, setTodayTotalMs] = useState<number>(0);
  const [descriptionInput, setDescriptionInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ticker for running timer
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  const elapsedMs = activeEntry ? Math.max(0, nowMs - activeEntry.startTime) : 0;

  // Team members list
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [showOffline, setShowOffline] = useState(false);

  // SPA Browser URL Synchronization
  const syncFromLocation = useCallback(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const memberParam = searchParams.get("member");

    if (path === "/reports" || searchParams.get("tab") === "reports") {
      setActiveTab("reports");
      setSelectedMemberId(null);
    } else if (path === "/profile" || searchParams.get("tab") === "profile" || memberParam) {
      setActiveTab("profile");
      if (memberParam) {
        setSelectedMemberId(memberParam);
      } else if (user?.id) {
        setSelectedMemberId(user.id);
      }
    } else {
      setActiveTab("timer");
      setSelectedMemberId(null);
    }
  }, [user]);

  useEffect(() => {
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, [syncFromLocation]);

  // Navigate tab with zero reload & clean URL pushState
  const navigateToTab = useCallback(
    (tab: "timer" | "reports" | "profile", memberId?: string) => {
      if (tab === "profile") {
        const targetId = memberId || user?.id || null;
        if (activeTab !== "profile") {
          setPreviousTab(activeTab);
        }
        setSelectedMemberId(targetId);
        setActiveTab("profile");
        const url = targetId && targetId !== user?.id ? `/profile?member=${targetId}` : "/profile";
        window.history.pushState(null, "", url);
      } else if (tab === "reports") {
        setActiveTab("reports");
        setSelectedMemberId(null);
        window.history.pushState(null, "", "/reports");
      } else {
        setActiveTab("timer");
        setSelectedMemberId(null);
        window.history.pushState(null, "", "/");
      }
    },
    [activeTab, user?.id]
  );

  // 1. Check Authentication
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          const searchParams = new URLSearchParams(window.location.search);
          if ((path === "/profile" || searchParams.get("tab") === "profile") && !searchParams.get("member")) {
            setSelectedMemberId(data.user.id);
          }
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // 2. Fetch Timer State
  const fetchTimerState = useCallback(async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/timer?tzOffset=${tzOffset}`);
      if (res.ok) {
        const data = await res.json();
        setActiveEntry(data.activeEntry);
        setTodayTotalMs(data.todayTotalMs || 0);
      }
    } catch (err) {
      console.error("Error fetching timer state:", err);
    }
  }, []);

  // 3. Fetch All Team Members with Worked Durations
  const fetchTeamMembers = useCallback(async () => {
    try {
      const tzOffset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/team?tzOffset=${tzOffset}`);
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
        setActiveCount(data.activeCount || 0);
      }
    } catch (err) {
      console.error("Error fetching team:", err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await checkAuth();
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    async function loadState() {
      if (!ignore) {
        await Promise.all([fetchTimerState(), fetchTeamMembers()]);
      }
    }
    loadState();

    const interval = setInterval(() => {
      fetchTeamMembers();
      fetchTimerState();
    }, 15000);

    const onFocus = () => {
      fetchTeamMembers();
      fetchTimerState();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      ignore = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, fetchTimerState, fetchTeamMembers]);

  // Synchronize browser tab title with running timer
  useEffect(() => {
    if (activeEntry) {
      const clockStr = formatClockTime(elapsedMs);
      const desc = descriptionInput.trim() || activeEntry.description;
      document.title = desc ? `${clockStr} · ${desc} - Axcerus Track` : `${clockStr} - Axcerus Track`;
    } else {
      document.title = "Axcerus Track";
    }
  }, [activeEntry, elapsedMs, descriptionInput]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      setUser(data.user);
      navigateToTab("timer");
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setActiveEntry(null);
      navigateToTab("timer");
    }
  };

  // Timer Controls
  const handleStartWorking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          description: descriptionInput.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveEntry(data.entry);
        setDescriptionInput("");
        fetchTeamMembers();
      }
    } catch (err) {
      console.error("Failed to start timer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopWorking = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });

      if (res.ok) {
        setActiveEntry(null);
        fetchTimerState();
        fetchTeamMembers();
      }
    } catch (err) {
      console.error("Failed to stop timer:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center">
        <div className="text-[14px] text-[#797167]">Loading Team Clock...</div>
      </div>
    );
  }

  // Inline Login View
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#fbf9f5]">
        <div className="w-full max-w-85">
          <div className="flex items-center gap-1.5 mb-2">
            <Image
              src="/axcerus-logo.png"
              alt="Axcerus logo"
              width={28}
              height={28}
              unoptimized
              className="h-7 w-auto object-contain shrink-0"
            />
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#26201b] leading-none">
              Track
            </h1>
          </div>
          <p className="text-[14px] text-[#797167] mb-7">
            Sign in to clock in.
          </p>

          {loginError && (
            <div className="mb-4 p-3 bg-[#fdf2f2] border border-[#f0c2c2] text-[#b91c1c] text-xs font-medium rounded-xl">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13.5px] font-medium text-[#26201b] mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoFocus
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full h-11.5 px-3.5 bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[13.5px] font-medium text-[#26201b] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full h-11.5 px-3.5 bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11.5 mt-2 bg-[#26201b] hover:bg-[#3d352e] text-white text-[14px] font-semibold rounded-xl transition duration-150 cursor-pointer disabled:opacity-50"
            >
              {isLoggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-5 text-[13.5px] text-[#797167]">
            <span>Need an account? </span>
            <span className="text-[#26201b] font-medium">Contact your team admin</span>
          </div>
        </div>
      </div>
    );
  }

  const isWorking = Boolean(activeEntry);
  const effectiveProfileMemberId = selectedMemberId || user?.id || null;

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col">
      {/* Universal SPA Header */}
      <Header
        userName={user.name}
        avatarUrl={user.avatarUrl}
        activeTab={activeTab}
        onTabChange={(tab) => navigateToTab(tab)}
        isWorking={isWorking}
      />

      {/* Main Content Container - Responsive max-w-160 (640px) */}
      <main className="flex-1 max-w-160 w-full mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 pb-24 sm:pb-16 flex flex-col">
        <div
          key={activeTab === "profile" ? `profile-${effectiveProfileMemberId}` : activeTab}
          className="page-transition w-full flex-1 flex flex-col"
        >
          {/* VIEW 1: LIVE TIMER */}
          {activeTab === "timer" && (
            <div className="w-full flex flex-col items-center">
            {/* Main Central Timer Card */}
            <div
              className={`w-full rounded-3xl sm:rounded-[28px] px-4 py-7 sm:px-8 sm:pt-10 sm:pb-9 transition-all duration-200 flex flex-col items-center text-center ${
                isWorking
                  ? "bg-[#e8f2eb] border-[1.5px] border-[#6ab382]"
                  : "bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8]"
              }`}
            >
              <div className="mb-2">
                {isWorking ? (
                  <span className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#3d7751]">
                    WORKING SINCE {formatStartTime(activeEntry!.startTime)}
                  </span>
                ) : (
                  <span className="text-[11px] sm:text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#797167]">
                    NOT WORKING
                  </span>
                )}
              </div>

              <div
                className={`font-clock text-[52px] xs:text-[64px] sm:text-[76px] font-bold leading-none tracking-tight my-3 sm:my-4 select-none ${
                  isWorking ? "text-[#26201b]" : "text-[#595147]"
                }`}
              >
                {formatClockTime(elapsedMs)}
              </div>

              {isWorking ? (
                <div className="mb-6 max-w-95">
                  <p className="text-[14.5px] text-[#595147] font-medium wrap-break-word">
                    {activeEntry?.description || "Work session in progress"}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleStartWorking} className="w-full max-w-90 mb-3.5">
                  <input
                    type="text"
                    placeholder="What are you working on? (optional)"
                    value={descriptionInput}
                    onChange={(e) => setDescriptionInput(e.target.value)}
                    className="w-full h-10.5 px-4 bg-transparent border-[1.5px] border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] text-center focus:outline-none focus:border-[#26201b] transition-colors"
                  />
                </form>
              )}

              <div className="w-full max-w-90 flex justify-center">
                {isWorking ? (
                  <button
                    onClick={handleStopWorking}
                    disabled={isSubmitting}
                    className="h-11 px-8 bg-[#c03636] hover:bg-[#a82b2b] text-white text-[14px] font-semibold rounded-xl transition duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Stopping..." : "Stop working"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartWorking()}
                    disabled={isSubmitting}
                    className="w-full h-11 bg-[#26201b] hover:bg-[#3d352e] text-white text-[14px] font-semibold rounded-xl transition duration-150 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Starting..." : "Start working"}
                  </button>
                )}
              </div>

              {/* Daily Progress */}
              {(() => {
                const currentTodayTotalMs = todayTotalMs + (isWorking ? elapsedMs : 0);
                const { percent, remainingMs, isGoalReached } = getDailyProgress(currentTodayTotalMs);

                return (
                  <div className="w-full mt-6 pt-5 border-t border-[#e5e0d8]/80 text-left">
                    {/* Header Row: Clean & Intuitive */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167]">
                        Daily Goal
                      </span>
                      <span className="text-[13px] font-semibold text-[#26201b] font-clock">
                        {formatShortDuration(currentTodayTotalMs)}{" "}
                        <span className="text-[#8c857b] font-normal font-sans text-[12px]">
                          / 3h
                        </span>
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 bg-[#ede8df] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${
                          isGoalReached
                            ? "bg-[#4ea86d]"
                            : isWorking
                            ? "bg-[#5eb57c]"
                            : "bg-[#62ba80]"
                        }`}
                        style={{
                          width: `${percent}%`,
                        }}
                      />
                    </div>

                    {/* Subtext Row: Minimal, No Redundancy */}
                    <div className="flex items-center justify-between mt-2 text-[12px] text-[#797167]">
                      <span>
                        {isGoalReached
                          ? "Goal reached"
                          : `${formatShortDuration(remainingMs)} remaining`}
                      </span>
                      <span className="font-medium text-[#26201b] font-clock">
                        {percent}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* TEAM ACTIVITY SECTION: Compact & Intuitive */}
            <div className="w-full mt-8 text-left">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167]">
                  Working Now · Team Activity
                </h2>
                {activeCount > 0 ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#e8f2eb] border border-[#a3d9b4] text-[#2f7543] rounded-full text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2f7543] animate-pulse" />
                    <span>{activeCount} active now</span>
                  </span>
                ) : (
                  <span className="text-[12px] text-[#8c857b]">All offline</span>
                )}
              </div>

              {/* Single Unified Container */}
              <div className="bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-[22px] overflow-hidden divide-y divide-[#e5e0d8]/70">
                {/* 1. Active Members */}
                {teamMembers.filter((m) => m.isWorkingNow).length === 0 ? (
                  <div className="px-4 py-3 text-center text-[13px] text-[#8c857b]">
                    No teammates currently clocked in.
                  </div>
                ) : (
                  teamMembers
                    .filter((m) => m.isWorkingNow)
                    .map((member) => {
                      const isCurrentActiveUser = member.isMe && isWorking;
                      const displayDurationMs = isCurrentActiveUser
                        ? member.completedTodayMs + elapsedMs
                        : member.totalDurationWorkedMs;

                      return (
                        <button
                          key={member.id}
                          onClick={() => navigateToTab("profile", member.id)}
                          className="w-full text-left px-4 py-2.5 bg-[#f4f9f6]/90 hover:bg-[#ebf5ee] transition-all flex items-center justify-between gap-3 group cursor-pointer"
                          title="View member profile"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <UserAvatar
                              name={member.name}
                              avatarUrl={member.avatarUrl}
                              size="md"
                              showOnlineDot
                              isOnline
                            />

                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5 leading-tight">
                                <span className="font-semibold text-[13.5px] text-[#26201b] group-hover:underline truncate">
                                  {member.name}
                                </span>
                                {member.isMe && (
                                  <span className="text-[10.5px] font-medium px-1.5 py-0.2 bg-[#ede8df] text-[#544e46] rounded-md shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[12.5px] text-[#797167] mt-0.5 leading-tight flex items-center min-w-0">
                                <span
                                  className="truncate text-[#544e46] min-w-0"
                                  title={member.description || "Clocked in"}
                                >
                                  {member.description || "Clocked in"}
                                </span>
                                {member.startTime && (
                                  <span className="text-[#8c857b] shrink-0 whitespace-nowrap ml-1.5">
                                    · since {formatStartTime(member.startTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="font-clock text-[14.5px] font-bold text-[#2f7543]">
                              {formatCardDuration(displayDurationMs, true)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-[#8c857b] group-hover:text-[#26201b] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </button>
                      );
                    })
                )}

                {/* 2. Offline Teammates Bar / Collapsible List */}
                {teamMembers.filter((m) => !m.isWorkingNow).length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowOffline(!showOffline)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-[#fbf9f5] hover:bg-[#ede8df]/40 text-[12.5px] font-medium text-[#797167] hover:text-[#26201b] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {teamMembers
                            .filter((m) => !m.isWorkingNow)
                            .slice(0, 4)
                            .map((m) => (
                              <UserAvatar
                                key={m.id}
                                name={m.name}
                                avatarUrl={m.avatarUrl}
                                size="xs"
                                className="border-2 border-[#fbf9f5]"
                              />
                            ))}
                        </div>
                        <span>
                          {teamMembers.filter((m) => !m.isWorkingNow).length} offline teammate
                          {teamMembers.filter((m) => !m.isWorkingNow).length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[11.5px] text-[#8c857b]">
                        <span>{showOffline ? "Hide" : "Show list"}</span>
                        {showOffline ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>

                    {showOffline && (
                      <div className="divide-y divide-[#e5e0d8]/50 bg-[#faf8f4]">
                        {teamMembers
                          .filter((m) => !m.isWorkingNow)
                          .map((member) => {
                            return (
                              <button
                                key={member.id}
                                onClick={() => navigateToTab("profile", member.id)}
                                className="w-full text-left px-4 py-2 hover:bg-[#f2eee6] transition-all flex items-center justify-between gap-3 group cursor-pointer"
                                title="View member profile"
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  <UserAvatar
                                    name={member.name}
                                    avatarUrl={member.avatarUrl}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1.5 leading-tight">
                                      <span className="font-semibold text-[13px] text-[#26201b] group-hover:underline truncate">
                                        {member.name}
                                      </span>
                                      {member.isMe && (
                                        <span className="text-[10px] font-medium px-1.5 py-0.2 bg-[#ede8df] text-[#544e46] rounded-md shrink-0">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11.5px] text-[#8c857b] truncate mt-0.5 leading-tight">
                                      Offline
                                      {member.totalDurationWorkedMs > 0 && (
                                        <span>
                                          {" "}· logged {formatCardDuration(member.totalDurationWorkedMs, false)} earlier
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                  <span className="font-clock text-[13.5px] font-bold text-[#26201b]">
                                    {member.totalDurationWorkedMs > 0
                                      ? formatCardDuration(member.totalDurationWorkedMs, false)
                                      : "0m"}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-[#c4bdb2] group-hover:text-[#26201b] group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: REPORTS */}
        {activeTab === "reports" && (
          <ReportsView onOpenMemberProfile={(id) => navigateToTab("profile", id)} />
        )}

        {/* VIEW 3: MEMBER PROFILE */}
        {activeTab === "profile" && effectiveProfileMemberId && (
          <ProfileView
            memberId={effectiveProfileMemberId}
            onBack={() => {
              navigateToTab(previousTab);
            }}
            onUserUpdated={(newName, newAvatarUrl) => {
              setUser((prev) =>
                prev
                  ? {
                      ...prev,
                      name: newName,
                      avatarUrl:
                        newAvatarUrl !== undefined
                          ? newAvatarUrl
                          : prev.avatarUrl,
                    }
                  : prev
              );
              fetchTeamMembers();
            }}
            onSignOut={handleSignOut}
          />
        )}
        </div>
      </main>
    </div>
  );
}
