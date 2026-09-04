"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DailyStat {
  dateKey: string;
  dayName: string;
  shortDate: string;
  durationMs: number;
  sessionCount: number;
  isToday: boolean;
}

interface DailyBarChartProps {
  dailyStats: DailyStat[];
  isMe?: boolean;
  weekOffset?: number;
  weekLabel?: string;
  onWeekOffsetChange?: (newOffset: number) => void;
}

function formatSummaryDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${Math.max(1, minutes)}m`;
}

export default function DailyBarChart({
  dailyStats,
  isMe = false,
  weekOffset = 0,
  weekLabel = "This week",
  onWeekOffsetChange,
}: DailyBarChartProps) {
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);

  if (!dailyStats || dailyStats.length === 0) return null;

  // Sensible baseline scale of at least 2 hours so smaller durations (e.g. 28m)
  // are visually balanced and proportional rather than shooting to 100% height.
  const minBaselineMs = 2 * 60 * 60 * 1000;
  const maxRecordedMs = Math.max(...dailyStats.map((d) => d.durationMs), 0);
  const scaleMaxMs = Math.max(maxRecordedMs, minBaselineMs);

  const totalWeeklyMs = dailyStats.reduce((acc, d) => acc + d.durationMs, 0);
  const activeDays = dailyStats.filter((d) => d.durationMs > 0).length;
  const avgMs = activeDays > 0 ? Math.floor(totalWeeklyMs / activeDays) : 0;

  return (
    <div className="w-full bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-[20px] sm:rounded-3xl p-4 sm:p-7">
      {/* Chart Header with Optional Week Navigation Slider */}
      <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="min-w-0 pr-1">
          <h2 className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167] truncate">
            {isMe ? "Your Daily Hours" : "Daily Hours"}
          </h2>
          <p className="text-[11.5px] sm:text-[12.5px] text-[#8c857b] mt-0.5 whitespace-nowrap sm:whitespace-normal">
            Total: {formatSummaryDuration(totalWeeklyMs)} · Avg: {formatSummaryDuration(avgMs)}
          </p>
        </div>

        {onWeekOffsetChange && (
          <div className="flex items-center bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-full p-0.5 shadow-xs shrink-0">
            <button
              onClick={() => onWeekOffsetChange(weekOffset - 1)}
              title="Previous 7 days"
              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center hover:bg-[#ede8df] text-[#26201b] transition cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="w-21 sm:w-26 text-[11.5px] sm:text-[13px] font-semibold text-[#26201b] text-center select-none truncate px-0.5">
              {weekLabel}
            </span>
            <button
              onClick={() => onWeekOffsetChange(weekOffset + 1)}
              disabled={weekOffset >= 0}
              title="Next 7 days"
              className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center hover:bg-[#ede8df] text-[#26201b] transition cursor-pointer disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed shrink-0"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Columns Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Reference dashed lines */}
        <div className="absolute inset-x-0 top-6 border-b border-dashed border-[#e5e0d8]/80 pointer-events-none" />
        <div className="absolute inset-x-0 top-24 border-b border-dashed border-[#e5e0d8]/50 pointer-events-none" />

        <div className="h-44 flex items-end justify-between gap-1 sm:gap-3 px-0.5 sm:px-3">
          {dailyStats.map((stat) => {
            const isHovered = hoveredDateKey === stat.dateKey;
            const percentOfScale = (stat.durationMs / scaleMaxMs) * 100;

            // Height scaling: if > 0 ensure minimum height of 8% for visibility
            const barHeight =
              stat.durationMs > 0
                ? Math.min(100, Math.max(8, Math.round(percentOfScale * 0.9)))
                : 3;

            return (
              <div
                key={stat.dateKey}
                onMouseEnter={() => setHoveredDateKey(stat.dateKey)}
                onMouseLeave={() => setHoveredDateKey(null)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                {/* Floating Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 bg-[#26201b] text-white text-[11.5px] py-1.5 px-3 rounded-xl shadow-lg pointer-events-none whitespace-nowrap animate-fadeIn flex flex-col items-center">
                    <span className="font-semibold">
                      {stat.isToday ? "Today" : stat.dayName}, {stat.shortDate}: {formatSummaryDuration(stat.durationMs)}
                    </span>
                    <span className="text-[10px] text-[#dcd6cb]">
                      {stat.sessionCount} session{stat.sessionCount !== 1 ? "s" : ""}
                    </span>
                    <div className="w-2 h-2 bg-[#26201b] rotate-45 absolute -bottom-1" />
                  </div>
                )}

                {/* Duration Label above Bar */}
                <div
                  className={`text-[9.5px] sm:text-[11.5px] font-bold font-clock mb-2 transition-transform select-none ${
                    isHovered
                      ? "scale-110 text-[#26201b]"
                      : stat.durationMs > 0
                      ? "text-[#26201b]"
                      : "text-[#8c857b]"
                  }`}
                >
                  {formatSummaryDuration(stat.durationMs)}
                </div>

                {/* Bar Pill */}
                <div className="w-full max-w-12 h-full flex items-end justify-center">
                  <div
                    style={{ height: `${barHeight}%` }}
                    className={`w-full rounded-t-xl transition-all duration-300 ${
                      stat.durationMs > 0
                        ? isHovered
                          ? "bg-[#453c35]"
                          : "bg-[#26201b]"
                        : "bg-[#ede8df]"
                    }`}
                  />
                </div>

                {/* Day & Date Labels */}
                <div className="mt-2.5 sm:mt-3 text-center flex flex-col items-center justify-start h-8.5 select-none">
                  <span
                    className={`text-[10.5px] sm:text-[12px] leading-tight block ${
                      stat.isToday
                        ? "font-bold text-[#26201b]"
                        : "font-medium text-[#797167]"
                    }`}
                  >
                    {stat.isToday ? "Today" : stat.dayName}
                  </span>
                  <span
                    className={`text-[9px] sm:text-[10.5px] leading-tight block ${
                      stat.isToday
                        ? "font-semibold text-[#26201b]"
                        : "text-[#8c857b]"
                    }`}
                  >
                    {stat.shortDate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
