"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ArrowLeft, Check, Plus, Edit2, Trash2, Camera, Upload, Loader2 } from "lucide-react";
import ManualEntryModal from "@/components/ManualEntryModal";
import EditEntryModal from "@/components/EditEntryModal";
import DailyBarChart, { DailyStat } from "@/components/DailyBarChart";
import MonthlyStreakCalendar, { MemberCalendar } from "@/components/MonthlyStreakCalendar";
import UserAvatar from "@/components/UserAvatar";

interface MemberStats {
  totalAllTimeMs: number;
  totalMonthMs: number;
  totalWeekMs: number;
  totalTodayMs: number;
  completedSessionCount: number;
}

interface RecentSession {
  id: string;
  description: string | null;
  startTime: number;
  endTime: number | null;
  durationMs: number;
  isActive: boolean;
}

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: number;
  isWorkingNow: boolean;
  isMe: boolean;
  stats: MemberStats;
  dailyStats?: DailyStat[];
  calendar?: MemberCalendar;
  weekOffset?: number;
  weekLabel?: string;
  timeBoundaries?: {
    startOfTodayMs: number;
    startOfWeekMs: number;
    startOfMonthMs: number;
    selectedWeekStartMs?: number;
    selectedWeekEndMs?: number;
  };
  recentEntries: RecentSession[];
}

interface ProfileViewProps {
  memberId: string;
  onBack: () => void;
  onUserUpdated?: (name: string, avatarUrl?: string | null) => void;
  onSignOut?: () => void;
}

function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

function formatSessionDuration(ms: number, isActive: boolean): string {
  if (ms <= 0) return isActive ? "< 1m" : "0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  if (totalMinutes === 0) return "< 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

function formatSessionRange(startMs: number, endMs: number | null): string {
  const start = new Date(startMs);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[start.getDay()];
  const monthName = months[start.getMonth()];
  const dateNum = start.getDate();

  const formatTime = (d: Date) => {
    let h = d.getHours();
    const m = pad(d.getMinutes());
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${pad(h)}:${m} ${ampm}`;
  };

  const startTimeStr = formatTime(start);
  if (!endMs) {
    return `${dayName}, ${monthName} ${dateNum} · ${startTimeStr} — Running`;
  }
  const endTimeStr = formatTime(new Date(endMs));
  return `${dayName}, ${monthName} ${dateNum} · ${startTimeStr} — ${endTimeStr}`;
}

export default function ProfileView({
  memberId,
  onBack,
  onUserUpdated,
  onSignOut,
}: ProfileViewProps) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Edit profile info state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select a valid image file (PNG, JPG, WebP, GIF).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAvatarError("File size exceeds the 10MB limit.");
      return;
    }

    setAvatarError("");
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      setMember((prev) => (prev ? { ...prev, avatarUrl: data.avatarUrl } : null));
      if (onUserUpdated && member) {
        onUserUpdated(member.name, data.avatarUrl);
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) return;
    setAvatarError("");
    setIsUploadingAvatar(true);

    try {
      const res = await fetch("/api/avatar/upload", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove avatar");
      }

      setMember((prev) => (prev ? { ...prev, avatarUrl: null } : null));
      if (onUserUpdated && member) {
        onUserUpdated(member.name, null);
      }
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Failed to remove avatar");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Session management modals state
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RecentSession | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Week navigation, month navigation, and session filtering state
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [sessionFilter, setSessionFilter] = useState<"all" | "today" | "week" | "month">("today");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const fetchMember = useCallback(async () => {
    const tzOffset = new Date().getTimezoneOffset();
    try {
      const res = await fetch(
        `/api/members/${memberId}?weekOffset=${weekOffset}&monthOffset=${monthOffset}&tzOffset=${tzOffset}`
      );
      if (res.ok) {
        const data = await res.json();
        setMember(data.member);
        setEditName(data.member.name);
      }
    } catch (err) {
      console.error("Failed to load member profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [memberId, weekOffset, monthOffset]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      if (!ignore) {
        await fetchMember();
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [fetchMember]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/members/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setEditSuccess("Profile updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      if (onUserUpdated && editName.trim()) {
        onUserUpdated(editName.trim());
      }
      fetchMember();
      setTimeout(() => {
        setIsEditing(false);
        setEditSuccess("");
      }, 1500);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      const res = await fetch(`/api/entries/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        fetchMember();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  if (isLoading && !member) {
    return (
      <div className="space-y-6 tab-content animate-pulse">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center space-x-1.5 text-[13.5px] font-medium text-[#797167] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </div>

        {/* Profile Card Skeleton */}
        <div className="w-full h-26 bg-[#ede8df]/50 border-[1.5px] border-[#e5e0d8] rounded-3xl" />

        {/* 4 Cards Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-23 bg-[#ede8df]/40 border-[1.5px] border-[#e5e0d8] rounded-[20px]" />
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="w-full h-65 bg-[#ede8df]/30 border-[1.5px] border-[#e5e0d8] rounded-3xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-16 text-center tab-content">
        <p className="text-[14px] text-[#797167] mb-4">Member not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#26201b] text-white text-xs font-semibold rounded-xl cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  const filteredEntries = (member.recentEntries || []).filter((session) => {
    if (selectedCalendarDate) {
      const tzOffset = new Date().getTimezoneOffset();
      const sessionDateLocal = new Date(session.startTime - tzOffset * 60 * 1000);
      const sessionKey = `${sessionDateLocal.getUTCFullYear()}-${pad(sessionDateLocal.getUTCMonth() + 1)}-${pad(sessionDateLocal.getUTCDate())}`;
      return sessionKey === selectedCalendarDate;
    }
    if (sessionFilter === "all") return true;
    const boundaries = member.timeBoundaries;
    if (!boundaries) return true;
    if (sessionFilter === "today") return session.startTime >= boundaries.startOfTodayMs;
    if (sessionFilter === "week") {
      if (boundaries.selectedWeekStartMs && boundaries.selectedWeekEndMs) {
        return (
          session.startTime >= boundaries.selectedWeekStartMs &&
          session.startTime <= boundaries.selectedWeekEndMs
        );
      }
      return session.startTime >= boundaries.startOfWeekMs;
    }
    if (sessionFilter === "month") return session.startTime >= boundaries.startOfMonthMs;
    return true;
  });

  const filterLabel = selectedCalendarDate
    ? `Date (${selectedCalendarDate})`
    : sessionFilter === "today"
    ? "Today"
    : sessionFilter === "week"
    ? member.weekLabel || "This Week"
    : sessionFilter === "month"
    ? "This Month"
    : "Total";

  return (
    <div className="space-y-6 tab-content">
      {/* Back button & Action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-[13px] sm:text-[13.5px] font-medium text-[#797167] hover:text-[#26201b] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {member.isMe && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-transparent hover:bg-[#f0ece3] border-[1.5px] border-[#e5e0d8] text-[11.5px] sm:text-[12px] font-semibold text-[#26201b] rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log missed time</span>
            </button>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-2.5 sm:px-3 py-1.5 text-[11.5px] sm:text-[12px] font-medium border border-[#e5e0d8] hover:border-[#26201b] rounded-xl text-[#26201b] transition cursor-pointer"
            >
              {isEditing ? "Close edit" : "Edit profile"}
            </button>

            {onSignOut && (
              <button
                onClick={onSignOut}
                className="px-2.5 sm:px-3 py-1.5 text-[11.5px] sm:text-[12px] font-medium border border-[#e5e0d8] hover:border-red-300 hover:text-red-600 rounded-xl text-[#797167] transition cursor-pointer"
              >
                Sign out
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input for Avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {/* Main Profile Info Card */}
      <div className="w-full bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-[18px] sm:rounded-[20px] px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="relative group shrink-0">
            <UserAvatar
              name={member.name}
              avatarUrl={member.avatarUrl}
              size="lg"
              showOnlineDot
              isOnline={member.isWorkingNow}
            />
            {member.isMe && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                title="Change profile picture"
                className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 drop-shadow-sm" />
                )}
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-[17px] font-bold text-[#26201b] leading-tight">
                {member.name}
              </h1>
              {member.isMe && (
                <span className="text-[10.5px] font-medium px-1.5 py-0.2 bg-[#ede8df] text-[#544e46] rounded-md">
                  You
                </span>
              )}
            </div>
            <p className="text-[12.5px] text-[#797167] mt-0.5">{member.email}</p>
          </div>
        </div>

        <div className="hidden sm:block">
          {member.isWorkingNow ? (
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-[#e8f2eb] border border-[#6ab382] text-[#3d7751] rounded-full text-[11.5px] font-semibold">
              <span className="online-dot" />
              <span>Online</span>
            </div>
          ) : (
            <span className="text-[12px] text-[#8c857b] px-2.5 py-0.5 bg-[#ede8df] rounded-full font-medium">
              Offline
            </span>
          )}
        </div>
      </div>

      {/* Edit Form (if toggled on for own profile) */}
      {isEditing && (
        <div className="w-full bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-3xl p-6 space-y-5">
          <h2 className="text-[14px] font-bold uppercase tracking-widest text-[#797167]">
            Edit Your Profile
          </h2>

          {avatarError && (
            <div className="p-3 bg-[#fdf2f2] border border-[#f0c2c2] text-[#b91c1c] text-xs font-medium rounded-xl">
              {avatarError}
            </div>
          )}

          {editError && (
            <div className="p-3 bg-[#fdf2f2] border border-[#f0c2c2] text-[#b91c1c] text-xs font-medium rounded-xl">
              {editError}
            </div>
          )}

          {editSuccess && (
            <div className="p-3 bg-[#e8f2eb] border border-[#6ab382] text-[#3d7751] text-xs font-medium rounded-xl flex items-center space-x-1.5">
              <Check className="w-4 h-4" />
              <span>{editSuccess}</span>
            </div>
          )}

          {/* Profile Photo Section */}
          <div className="p-4 bg-white/60 border border-[#e5e0d8] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <UserAvatar
                name={member.name}
                avatarUrl={member.avatarUrl}
                size="lg"
              />
              <div>
                <p className="text-[13px] font-semibold text-[#26201b]">Profile Photo</p>
                <p className="text-[11.5px] text-[#797167] mt-0.5">
                  JPG, PNG, WebP up to 10MB.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#26201b] hover:bg-[#3d342c] text-white text-[12px] font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploadingAvatar ? "Uploading..." : "Upload photo"}</span>
              </button>

              {member.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-3.5">
            <div>
              <label className="block text-[12px] font-semibold text-[#797167] mb-1">
                Display Name
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-10 px-3.5 bg-transparent border border-[#e5e0d8] rounded-xl text-[14px] text-[#26201b] focus:outline-none focus:border-[#26201b]"
              />
            </div>

            <div className="pt-2 border-t border-[#e5e0d8]">
              <span className="text-[12px] font-bold text-[#797167]">
                Change Password (Optional)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#797167] mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Leave empty if not changing"
                  className="w-full h-10 px-3 bg-transparent border border-[#e5e0d8] rounded-xl text-[13px] text-[#26201b] focus:outline-none focus:border-[#26201b]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#797167] mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full h-10 px-3 bg-transparent border border-[#e5e0d8] rounded-xl text-[13px] text-[#26201b] focus:outline-none focus:border-[#26201b]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-[#26201b] hover:bg-[#3d352e] text-white text-[13px] font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4 Interactive Period Switching Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167]">
            Logged Time Overview
          </h2>
          {sessionFilter !== "all" && (
            <button
              onClick={() => setSessionFilter("all")}
              className="text-[11.5px] font-medium text-[#797167] hover:text-[#26201b] underline underline-offset-2 transition cursor-pointer"
            >
              Show all time
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {([
            { id: "today", label: "Today", value: member.stats.totalTodayMs },
            { id: "week", label: "This Week", value: member.stats.totalWeekMs },
            { id: "month", label: "This Month", value: member.stats.totalMonthMs },
            { id: "all", label: "All Time", value: member.stats.totalAllTimeMs },
          ] as const).map((card) => {
            const isSelected = sessionFilter === card.id;
            return (
              <button
                key={card.id}
                onClick={() => {
                  setSessionFilter(card.id);
                  setSelectedCalendarDate(null);
                }}
                title={`Filter sessions by ${card.label}`}
                className={`border-[1.5px] rounded-[18px] sm:rounded-[20px] p-3 sm:p-4 text-center transition-all cursor-pointer ${
                  isSelected && !selectedCalendarDate
                    ? "bg-[#26201b] text-white border-[#26201b] shadow-xs"
                    : "bg-[#fbf9f5] border-[#e5e0d8] hover:border-[#26201b]/40 text-[#26201b]"
                }`}
              >
                <div
                  className={`text-[10.5px] sm:text-[11px] font-bold uppercase tracking-widest mb-1 ${
                    isSelected && !selectedCalendarDate ? "text-white/75" : "text-[#797167]"
                  }`}
                >
                  {card.label}
                </div>
                <div className="text-[19px] sm:text-[22px] font-bold font-clock">
                  {formatDuration(card.value)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Work Hours Bar Chart with Week Slider */}
      {member.dailyStats && (
        <DailyBarChart
          dailyStats={member.dailyStats}
          isMe={member.isMe}
          weekOffset={weekOffset}
          weekLabel={member.weekLabel}
          onWeekOffsetChange={(newOffset) => {
            setWeekOffset(newOffset);
            setSessionFilter("week");
            setSelectedCalendarDate(null);
          }}
        />
      )}

      {/* Monthly Streak & Activity Calendar */}
      {member.calendar && (
        <MonthlyStreakCalendar
          calendar={member.calendar}
          monthOffset={monthOffset}
          onMonthOffsetChange={(newOffset) => {
            setMonthOffset(newOffset);
          }}
          selectedDateKey={selectedCalendarDate}
          onSelectDateKey={(dateKey) => {
            setSelectedCalendarDate(dateKey);
          }}
        />
      )}

      {/* Work Sessions Timeline */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167]">
            Work Sessions ({filteredEntries.length} {filterLabel.toUpperCase()})
          </h2>
          {sessionFilter !== "all" && (
            <span className="text-[11.5px] text-[#8c857b]">
              Showing {filterLabel.toLowerCase()}
            </span>
          )}
        </div>

            <div className="space-y-2.5">
              {filteredEntries.length === 0 ? (
                <div className="p-6 text-center border-[1.5px] border-[#e5e0d8] rounded-[20px] text-[13.5px] text-[#797167]">
                  No work sessions recorded for {filterLabel.toLowerCase()}.
                </div>
              ) : (
                filteredEntries.map((session) => {
                  const isRunning = session.endTime === null || session.isActive;
                  const currentDuration = isRunning
                    ? Math.max(0, nowMs - session.startTime)
                    : session.durationMs;

                  return (
                    <div
                      key={session.id}
                      className={`group border-[1.5px] rounded-2xl sm:rounded-[18px] px-3.5 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4 transition-colors ${
                        isRunning
                          ? "bg-[#e8f2eb]/60 border-[#6ab382] hover:bg-[#e8f2eb]/80"
                          : "bg-[#fbf9f5] hover:bg-[#f6f2ea] border-[#e5e0d8]"
                      }`}
                    >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <span className="text-[12.5px] sm:text-[13.5px] font-semibold text-[#26201b] truncate">
                        {formatSessionRange(session.startTime, session.endTime)}
                      </span>
                      {isRunning && (
                        <span className="inline-flex items-center space-x-1 px-1.5 sm:px-2 py-0.5 bg-[#e8f2eb] border border-[#6ab382] text-[#3d7751] rounded-full text-[10px] sm:text-[11px] font-bold shrink-0">
                          <span className="online-dot w-1.5 h-1.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] sm:text-[13px] text-[#797167] truncate">
                      {session.description || "Work session"}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                    <div className="text-right">
                      <div
                        className={`font-clock text-[14px] font-bold ${
                          isRunning ? "text-[#2f7543]" : "text-[#26201b]"
                        }`}
                      >
                        {formatSessionDuration(currentDuration, isRunning)}
                      </div>
                      <div className="text-[11px] text-[#8c857b]">
                        {isRunning ? "active now" : "completed"}
                      </div>
                    </div>

                    {/* Actions for current user - always visible with soft contrast */}
                    {member.isMe && (
                      <div className="flex items-center space-x-0.5 border-l border-[#e5e0d8] pl-2 ml-0.5">
                        <button
                          onClick={() => setEditingEntry(session)}
                          title="Edit session"
                          className="p-1.5 text-[#8c857b] hover:text-[#26201b] hover:bg-[#ede8df] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          title="Delete session"
                          className="p-1.5 text-[#8c857b] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals for personal logging & editing */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSuccess={fetchMember}
      />

      <EditEntryModal
        key={editingEntry?.id}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={fetchMember}
      />
    </div>
  );
}
