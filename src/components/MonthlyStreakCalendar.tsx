"use client";

import { ChevronLeft, ChevronRight, Star, Flame, Target } from "lucide-react";

export interface CalendarDay {
  dayNumber: number;
  dateKey: string;
  durationMs: number;
  targetMet: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface MemberCalendar {
  monthOffset: number;
  monthLabel: string;
  year: number;
  month: number;
  leadingBlankDays: number;
  totalDays: number;
  days: CalendarDay[];
  stats: {
    starredDaysCount: number;
    currentStreak: number;
    targetDailyMs: number;
  };
}

interface MonthlyStreakCalendarProps {
  calendar: MemberCalendar;
  monthOffset: number;
  onMonthOffsetChange: (newOffset: number) => void;
  selectedDateKey?: string | null;
  onSelectDateKey?: (dateKey: string | null) => void;
}

function formatDayDuration(ms: number): string {
  if (ms <= 0) return "-";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

export default function MonthlyStreakCalendar({
  calendar,
  monthOffset,
  onMonthOffsetChange,
  selectedDateKey,
  onSelectDateKey,
}: MonthlyStreakCalendarProps) {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 text-left">
      {/* Calendar Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <span className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#797167]">
            Activity & Streak Calendar
          </span>
          <div className="flex items-center space-x-1.5 sm:space-x-2 mt-0.5">
            <h2 className="text-[17px] sm:text-[18px] font-bold text-[#26201b] font-clock">
              {calendar.monthLabel}
            </h2>
            {monthOffset === 0 ? (
              <span className="text-[10px] sm:text-[10.5px] font-medium text-[#797167] bg-[#ede8df] px-2 py-0.5 rounded-full select-none">
                This Month
              </span>
            ) : (
              <button
                onClick={() => onMonthOffsetChange(0)}
                className="text-[10px] sm:text-[10.5px] font-medium text-[#797167] hover:text-[#26201b] bg-[#ede8df] hover:bg-[#e2dcd2] px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                title="Return to current month"
              >
                Jump to today ↩
              </button>
            )}
          </div>
        </div>

        {/* Month Switcher Controls */}
        <div className="flex items-center border border-[#e5e0d8] rounded-lg overflow-hidden bg-white/60">
          <button
            onClick={() => onMonthOffsetChange(monthOffset - 1)}
            className="p-1.5 hover:bg-[#ede8df] text-[#595147] hover:text-[#26201b] transition-colors cursor-pointer border-r border-[#e5e0d8]"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMonthOffsetChange(monthOffset + 1)}
            disabled={monthOffset >= 0}
            className={`p-1.5 transition-colors ${
              monthOffset >= 0
                ? "opacity-30 cursor-not-allowed text-[#a8a196]"
                : "hover:bg-[#ede8df] text-[#595147] hover:text-[#26201b] cursor-pointer"
            }`}
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Streak & Target Ribbon */}
      <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1.5 mb-3 sm:mb-3.5 bg-white/70 border border-[#e5e0d8] rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-[12px]">
        <div className="flex items-center space-x-1.5">
          <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500 shrink-0" />
          <span className="text-[#797167]">Streak:</span>
          <span className="font-clock font-bold text-[#26201b]">
            {calendar.stats.currentStreak}{" "}
            <span className="text-[10px] sm:text-[11px] font-medium text-[#797167]">
              {calendar.stats.currentStreak === 1 ? "day" : "days"}
            </span>
          </span>
        </div>

        <div className="w-px h-3 bg-[#e5e0d8] hidden sm:block" />

        <div className="flex items-center space-x-1.5">
          <Star className="w-3 h-3 fill-amber-400 text-amber-500 shrink-0" />
          <span className="text-[#797167]">Starred:</span>
          <span className="font-clock font-bold text-[#b45309]">
            {calendar.stats.starredDaysCount}{" "}
            <span className="text-[10px] sm:text-[11px] font-medium text-[#797167]">
              {calendar.stats.starredDaysCount === 1 ? "day" : "days"}
            </span>
          </span>
        </div>

        <div className="w-px h-3 bg-[#e5e0d8] hidden sm:block" />

        <div className="flex items-center space-x-1.5">
          <Target className="w-3.5 h-3.5 text-[#2f7543] shrink-0" />
          <span className="text-[#797167]">Daily Goal:</span>
          <span className="font-clock font-bold text-[#2f7543]">
            3 hours
          </span>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1 text-center">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-[10px] font-bold uppercase tracking-wider text-[#8c857b] py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Monthly Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {/* Leading empty placeholder cells */}
        {Array.from({ length: calendar.leadingBlankDays }).map((_, idx) => (
          <div
            key={`blank-${idx}`}
            className="min-h-9.5 xs:min-h-[42px] sm:min-h-11.5 rounded-lg sm:rounded-xl bg-transparent border border-transparent"
          />
        ))}

        {/* Days of the month */}
        {calendar.days.map((day) => {
          const isSelected = selectedDateKey === day.dateKey;

          return (
            <button
              key={day.dateKey}
              onClick={() => {
                if (day.isFuture) return;
                if (onSelectDateKey) {
                  onSelectDateKey(isSelected ? null : day.dateKey);
                }
              }}
              disabled={day.isFuture}
              className={`min-h-9.5 xs:min-h-[42px] sm:min-h-11.5 p-1 sm:p-2 rounded-lg sm:rounded-xl flex flex-col justify-between transition-all relative border text-left cursor-pointer ${
                day.isFuture
                  ? "opacity-25 border-transparent bg-transparent cursor-default"
                  : isSelected
                  ? "ring-2 ring-[#26201b] border-transparent shadow-xs scale-[1.02]"
                  : day.targetMet
                  ? "bg-linear-to-b from-[#fffdf5] to-[#fef8e7] border-[#fde68a] hover:border-[#f59e0b] shadow-xs"
                  : day.durationMs > 0
                  ? "bg-white/85 border-[#e5e0d8] hover:border-[#c5beb4]"
                  : "bg-[#fbf9f5]/40 border-dashed border-[#e5e0d8]/60 hover:border-[#d5cec4]"
              } ${day.isToday && !isSelected ? "ring-1.5 ring-[#26201b]" : ""}`}
            >
              {/* Top: Day number & Golden Star badge */}
              <div className="flex items-center justify-between w-full leading-none">
                <span
                  className={`text-[10px] sm:text-[11px] font-clock ${
                    day.targetMet
                      ? "font-bold text-[#92400e]"
                      : day.isToday
                      ? "font-bold text-[#26201b]"
                      : day.durationMs > 0
                      ? "font-semibold text-[#26201b]"
                      : "text-[#8c857b]"
                  }`}
                >
                  {day.dayNumber}
                </span>

                {day.targetMet && (
                  <span title="3h Goal Reached!" className="shrink-0">
                    <Star className="w-2.5 sm:w-3 h-2.5 sm:h-3 fill-amber-400 text-amber-500 drop-shadow-xs" />
                  </span>
                )}
              </div>

              {/* Bottom: Duration */}
              <div className="leading-none mt-1">
                {day.isFuture ? null : day.durationMs > 0 ? (
                  <div
                    className={`font-clock text-[8.5px] sm:text-[10px] truncate ${
                      day.targetMet
                        ? "font-bold text-[#b45309]"
                        : "font-medium text-[#797167]"
                    }`}
                  >
                    {formatDayDuration(day.durationMs)}
                  </div>
                ) : (
                  <div className="text-[8.5px] sm:text-[9px] text-[#c4bdb2] font-mono leading-none">
                    -
                  </div>
                )}
              </div>

              {/* "Today" dot/pill indicator */}
              {day.isToday && (
                <div className="absolute -top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#26201b] pointer-events-none" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
