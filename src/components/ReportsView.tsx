"use client";

import { useEffect, useState, useCallback } from "react";
import TeamBarChart from "@/components/TeamBarChart";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TeamMemberStat {
  id: string;
  name: string;
  email: string;
  totalDurationMs: number;
  sessionCount: number;
  isWorkingNow: boolean;
  isMe: boolean;
}

type Period = "today" | "week" | "month";

interface ReportsViewProps {
  onOpenMemberProfile?: (memberId: string) => void;
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

export default function ReportsView({ onOpenMemberProfile }: ReportsViewProps) {
  const [period, setPeriod] = useState<Period>("today");
  const [offset, setOffset] = useState<number>(0);
  const [dateLabel, setDateLabel] = useState<string>("Today");
  const [teamReport, setTeamReport] = useState<TeamMemberStat[]>([]);
  const [teamTotalMs, setTeamTotalMs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTeamData = useCallback(async () => {
    const tzOffset = new Date().getTimezoneOffset();
    try {
      const res = await fetch(
        `/api/reports/team?period=${period}&offset=${offset}&tzOffset=${tzOffset}`
      );
      if (res.ok) {
        const data = await res.json();
        setTeamReport(data.teamReport || []);
        setTeamTotalMs(data.teamTotalDurationMs || 0);
        if (data.label) {
          setDateLabel(data.label);
        }
      }
    } catch (err) {
      console.error("Error fetching team report:", err);
    } finally {
      setIsLoading(false);
    }
  }, [period, offset]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod);
    setOffset(0); // Instantly resets to current period
  };

  const displayHeaderLabel = dateLabel.toUpperCase();

  return (
    <div className="w-full space-y-6 tab-content">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[26px] font-bold tracking-tight text-[#26201b]">
          Reports
        </h1>
      </div>

      {/* Navigation Controls: Clean, stationary, zero layout jumping */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Scale Selector: Day / Week / Month */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          {(["today", "week", "month"] as Period[]).map((p) => {
            const label =
              p === "today" ? "Day" : p === "week" ? "Week" : "Month";
            const isActive = period === p && offset === 0;
            const isCurrentPeriodType = period === p;
            return (
              <button
                key={p}
                onClick={() => handlePeriodChange(p)}
                title={`View ${label} report (click to jump to present)`}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#26201b] text-white shadow-xs font-semibold"
                    : isCurrentPeriodType
                    ? "bg-[#ede8df] text-[#26201b] border border-[#dcd6cb] font-semibold"
                    : "bg-transparent text-[#6e675d] border border-[#dcd6cb] hover:border-[#26201b]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Compact, Stationary Date Slider (Fixed Width, No Popping Buttons) */}
        <div className="flex items-center bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-full p-0.5 shadow-xs shrink-0">
          <button
            onClick={() => setOffset((prev) => prev - 1)}
            title="Previous"
            className="w-7.5 h-7.5 rounded-full flex items-center justify-center hover:bg-[#ede8df] text-[#26201b] transition cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span
            className="w-[100px] sm:w-[108px] text-[12px] sm:text-[13px] font-semibold text-[#26201b] text-center select-none truncate px-1"
            title={dateLabel}
          >
            {dateLabel || (isLoading ? "..." : "Today")}
          </span>

          <button
            onClick={() => setOffset((prev) => prev + 1)}
            disabled={offset >= 0}
            title="Next"
            className="w-7.5 h-7.5 rounded-full flex items-center justify-center hover:bg-[#ede8df] text-[#26201b] transition cursor-pointer disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Team Summary Metric Card */}
      <div className="w-full bg-[#fbf9f5] border-[1.5px] border-[#e5e0d8] rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] sm:text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#797167] mb-1.5 sm:mb-2">
            {displayHeaderLabel} · TEAM TOTAL
          </div>
          <div className="text-[36px] sm:text-[48px] font-bold tracking-tight text-[#26201b] leading-tight font-clock">
            {formatSummaryDuration(teamTotalMs)}
          </div>
        </div>
        <div className="text-[13.5px] text-[#797167]">
          {offset === 0 ? (
            <span>
              {teamReport.filter((m) => m.isWorkingNow).length} active now / {teamReport.length} members
            </span>
          ) : (
            <span>
              {teamReport.filter((m) => m.totalDurationMs > 0).length} contributed / {teamReport.length} members
            </span>
          )}
        </div>
      </div>

      {/* Interactive Team Bar Chart */}
      <TeamBarChart
        members={teamReport}
        totalTeamDurationMs={teamTotalMs}
        periodLabel={dateLabel}
        onSelectMember={onOpenMemberProfile}
      />

      {/* Team Comparison Table */}
      <div className="border-[1.5px] border-[#e5e0d8] rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#fbf9f5]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e5e0d8] bg-[#f6f2ea]/60 text-[11.5px] sm:text-[12px] font-semibold uppercase tracking-[0.1em] text-[#797167]">
              <th className="py-3 px-3.5 sm:px-6">Member</th>
              <th className="hidden sm:table-cell py-3 px-3.5 sm:px-6">Status</th>
              <th className="py-3 px-3.5 sm:px-6 text-right">Sessions</th>
              <th className="py-3 px-3.5 sm:px-6 text-right">Total Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e0d8] text-[13.5px] sm:text-[14px]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#797167]">
                  Loading team data...
                </td>
              </tr>
            ) : teamReport.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#797167]">
                  No team data recorded for this period.
                </td>
              </tr>
            ) : (
              teamReport.map((member) => {
                const maxMs = teamReport[0]?.totalDurationMs || 1;
                const percentage =
                  maxMs > 0
                    ? Math.round((member.totalDurationMs / maxMs) * 100)
                    : 0;

                return (
                  <tr
                    key={member.id}
                    onClick={() => onOpenMemberProfile && onOpenMemberProfile(member.id)}
                    className="hover:bg-[#f6f2ea]/60 transition cursor-pointer"
                    title="Click to view member profile"
                  >
                    <td className="py-3 sm:py-3.5 px-3.5 sm:px-6">
                      <div className="flex items-center space-x-2.5 sm:space-x-3">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-[#ede8df] text-[#26201b] flex items-center justify-center text-[12px] font-bold">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          {offset === 0 && member.isWorkingNow && (
                            <span className="online-dot absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ring-2 ring-[#fbf9f5]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-[#26201b] flex items-center space-x-1.5 leading-tight">
                            <span className="hover:underline truncate">{member.name}</span>
                            {member.isMe && (
                              <span className="text-[10px] sm:text-[10.5px] font-normal px-1.5 py-0.2 bg-[#ede8df] text-[#544e46] rounded-md shrink-0">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11.5px] sm:text-[12.5px] text-[#8c857b] truncate">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="hidden sm:table-cell py-3.5 px-3.5 sm:px-6">
                      {offset === 0 && member.isWorkingNow ? (
                        <div className="inline-flex items-center space-x-1.5 text-[12.5px] sm:text-[13px] font-medium text-[#2f7543]">
                          <span className="online-dot" />
                          <span>Online</span>
                        </div>
                      ) : (
                        <span className="text-[12.5px] sm:text-[13px] text-[#8c857b]">Offline</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3.5 sm:px-6 text-right font-medium text-[#6e675d]">
                      {member.sessionCount}
                    </td>

                    <td className="py-3.5 px-3.5 sm:px-6 text-right">
                      <div className="font-bold text-[#26201b] font-clock">
                        {formatSummaryDuration(member.totalDurationMs)}
                      </div>
                      <div className="w-16 sm:w-20 ml-auto mt-1.5 h-1.5 bg-[#e5e0d8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#26201b] rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
