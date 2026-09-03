"use client";

import { useState } from "react";

interface TeamMemberStat {
  id: string;
  name: string;
  email: string;
  totalDurationMs: number;
  sessionCount: number;
  isWorkingNow: boolean;
  isMe: boolean;
}

interface TeamBarChartProps {
  members: TeamMemberStat[];
  totalTeamDurationMs: number;
  periodLabel: string;
  onSelectMember?: (memberId: string) => void;
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

export default function TeamBarChart({
  members,
  totalTeamDurationMs,
  periodLabel,
  onSelectMember,
}: TeamBarChartProps) {
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);

  if (!members || members.length === 0) return null;

  // Find maximum duration to scale bar heights relative to max
  const maxMs = Math.max(...members.map((m) => m.totalDurationMs), 1);

  return (
    <div className="w-full bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-[20px] sm:rounded-[24px] p-4 sm:p-7">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167]">
            Work Duration Comparison ({periodLabel})
          </h2>
          <p className="text-[12px] sm:text-[12.5px] text-[#8c857b] mt-0.5">
            Hover or tap any column to view individual stats
          </p>
        </div>
      </div>

      {/* Chart Area */}
      <div className="relative pt-6 pb-2">
        {/* Subtle reference grid lines */}
        <div className="absolute inset-x-0 top-6 border-b border-dashed border-[#e5e0d8]/80 pointer-events-none" />
        <div className="absolute inset-x-0 top-24 border-b border-dashed border-[#e5e0d8]/50 pointer-events-none" />

        {/* Columns Flex Container */}
        <div className="h-44 sm:h-48 flex items-end justify-between gap-1.5 sm:gap-4 px-1 sm:px-4">
          {members.map((member) => {
            const isHovered = hoveredMemberId === member.id;
            const percentOfMax = maxMs > 0 ? (member.totalDurationMs / maxMs) * 100 : 0;
            const percentOfTotal =
              totalTeamDurationMs > 0
                ? Math.round((member.totalDurationMs / totalTeamDurationMs) * 100)
                : 0;

            // Height scaling: if > 0 ensure minimum height of 8% for visibility, max 100%
            const barHeight =
              member.totalDurationMs > 0
                ? Math.max(10, Math.round(percentOfMax * 0.9))
                : 3;

            return (
              <div
                key={member.id}
                onMouseEnter={() => setHoveredMemberId(member.id)}
                onMouseLeave={() => setHoveredMemberId(null)}
                onClick={() => onSelectMember && onSelectMember(member.id)}
                className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
              >
                {/* Floating Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 bg-[#26201b] text-white text-[11.5px] py-1.5 px-3 rounded-xl shadow-lg pointer-events-none whitespace-nowrap animate-fadeIn flex flex-col items-center">
                    <span className="font-semibold">
                      {member.name}: {formatSummaryDuration(member.totalDurationMs)}
                    </span>
                    <span className="text-[10px] text-[#dcd6cb]">
                      {percentOfTotal}% of team · {member.sessionCount} sessions
                    </span>
                    <div className="w-2 h-2 bg-[#26201b] rotate-45 absolute -bottom-1" />
                  </div>
                )}

                {/* Duration Label above Bar */}
                <div
                  className={`text-[9.5px] sm:text-[12px] font-bold font-clock mb-2 transition-transform duration-200 select-none ${
                    isHovered ? "scale-110 text-[#26201b]" : "text-[#797167]"
                  }`}
                >
                  {formatSummaryDuration(member.totalDurationMs)}
                </div>

                {/* The Bar Column */}
                <div className="w-full max-w-[56px] h-full flex items-end">
                  <div
                    style={{ height: `${barHeight}%` }}
                    className={`w-full rounded-t-xl transition-all duration-500 ease-out relative ${
                      member.totalDurationMs === 0
                        ? "bg-[#e5e0d8] opacity-60"
                        : member.isWorkingNow
                        ? "bg-[#3d7751] group-hover:bg-[#2f5e3f] shadow-xs"
                        : "bg-[#26201b] group-hover:bg-[#3d352e]"
                    } ${isHovered ? "ring-2 ring-offset-2 ring-[#26201b]" : ""}`}
                  >
                    {/* Active pulse on bar top if currently clocked in */}
                    {member.isWorkingNow && (
                      <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#52a36b] rounded-full" />
                    )}
                  </div>
                </div>

                {/* Member Label below bar */}
                <div className="mt-2.5 sm:mt-3 text-center flex flex-col items-center max-w-full">
                  <div className="relative mb-1">
                    <div className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-[#ede8df] flex items-center justify-center text-[10.5px] sm:text-[11px] font-bold text-[#26201b]">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    {member.isWorkingNow && (
                      <span className="online-dot absolute -bottom-0.5 -right-0.5 w-2 h-2" />
                    )}
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-medium text-[#26201b] truncate max-w-[52px] sm:max-w-[65px] group-hover:underline">
                    {member.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend / Footer */}
      <div className="mt-4 pt-3 border-t border-[#e5e0d8]/60 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-[11.5px] text-[#797167]">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#26201b]" />
            <span>Logged hours</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-[#3d7751]" />
            <span>Active now</span>
          </div>
        </div>
        <span>Total: {formatSummaryDuration(totalTeamDurationMs)}</span>
      </div>
    </div>
  );
}
