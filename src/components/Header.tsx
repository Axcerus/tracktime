"use client";

import { Clock, BarChart2, User } from "lucide-react";

interface HeaderProps {
  userName?: string | null;
  activeTab?: "timer" | "reports" | "profile";
  onTabChange?: (tab: "timer" | "reports" | "profile") => void;
  isWorking?: boolean;
}

export default function Header({
  userName,
  activeTab = "timer",
  onTabChange,
  isWorking = false,
}: HeaderProps) {
  const userInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  return (
    <>
      {/* Top Header Bar: Slim on mobile, standard on desktop */}
      <header className="sticky top-0 z-30 w-full bg-[#fbf9f5]/92 backdrop-blur-md border-b border-[#e5e0d8]/50 transition-colors">
        <div className="max-w-[640px] w-full mx-auto px-4 sm:px-6 h-[50px] sm:h-[68px] flex items-center justify-between gap-2 sm:gap-3">
          {/* Brand Logomark */}
          <button
            onClick={() => onTabChange && onTabChange("timer")}
            className="flex items-center gap-1.5 hover:opacity-85 active:scale-[0.98] transition-all cursor-pointer select-none group shrink-0"
            title="Track Home"
          >
            <img
              src="/axcerus-logo.png"
              alt="Axcerus logo"
              className="h-[20px] sm:h-[23px] w-auto object-contain shrink-0 transition-transform group-hover:scale-105"
            />
            <span className="text-[16px] sm:text-[18px] font-bold tracking-[-0.03em] text-[#26201b] leading-none">
              Track
            </span>
          </button>

          {/* Mobile Top Status Pill */}
          {userName && (
            <div className="sm:hidden flex items-center">
              {isWorking ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-[#e8f2eb] border border-[#6ab382] text-[#3d7751] rounded-full text-[11px] font-bold">
                  <span className="online-dot w-1.5 h-1.5" />
                  <span>Clocked in</span>
                </span>
              ) : (
                <span className="text-[11px] text-[#8c857b] font-medium px-2.5 py-0.5 bg-[#ede8df] rounded-full">
                  Offline
                </span>
              )}
            </div>
          )}

          {/* Desktop Center Nav: Segmented Pill Control */}
          {userName && (
            <nav className="hidden sm:flex items-center p-1 bg-[#ede8df]/60 rounded-full border border-[#e5e0d8]/70 text-[13px]">
              <button
                onClick={() => onTabChange && onTabChange("timer")}
                className={`px-3.5 py-1 rounded-full font-medium transition-all duration-150 cursor-pointer inline-flex items-center space-x-1.5 ${
                  activeTab === "timer"
                    ? "bg-white text-[#26201b] shadow-xs font-semibold"
                    : "text-[#797167] hover:text-[#26201b]"
                }`}
              >
                {isWorking && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2f7543] animate-pulse shrink-0" />
                )}
                <span>Timer</span>
              </button>
              <button
                onClick={() => onTabChange && onTabChange("reports")}
                className={`px-3.5 py-1 rounded-full font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === "reports"
                    ? "bg-white text-[#26201b] shadow-xs font-semibold"
                    : "text-[#797167] hover:text-[#26201b]"
                }`}
              >
                Reports
              </button>
            </nav>
          )}

          {/* Desktop Right: User Profile Pill */}
          {userName && (
            <div className="hidden sm:flex items-center shrink-0">
              <button
                onClick={() => onTabChange && onTabChange("profile")}
                className={`flex items-center space-x-2 py-1 pl-1.5 pr-3 rounded-full text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-white border border-[#e5e0d8] shadow-xs text-[#26201b] font-semibold"
                    : "bg-transparent hover:bg-[#ede8df]/60 text-[#6e675d] hover:text-[#26201b] border border-transparent hover:border-[#e5e0d8]/60"
                }`}
                title="View your profile"
              >
                <div className="w-5.5 h-5.5 rounded-full bg-[#26201b] text-white flex items-center justify-center text-[10.5px] font-bold shrink-0">
                  {userInitial}
                </div>
                <span className="truncate max-w-[120px]">{userName}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Floating Bottom Rounded Navigation Popup */}
      {userName && (
        <div className="sm:hidden fixed bottom-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
          <nav className="pointer-events-auto bg-[#fbf9f5]/95 backdrop-blur-xl border-[1.5px] border-[#e5e0d8] shadow-[0_12px_36px_rgba(38,32,27,0.18)] rounded-full p-1.5 flex items-center gap-1 ring-1 ring-black/5">
            <button
              onClick={() => onTabChange && onTabChange("timer")}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "timer"
                  ? "bg-[#26201b] text-white shadow-xs font-semibold"
                  : "text-[#797167] hover:text-[#26201b] active:bg-[#ede8df]"
              }`}
            >
              {isWorking ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#52a36b] animate-pulse shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Timer</span>
            </button>

            <button
              onClick={() => onTabChange && onTabChange("reports")}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "reports"
                  ? "bg-[#26201b] text-white shadow-xs font-semibold"
                  : "text-[#797167] hover:text-[#26201b] active:bg-[#ede8df]"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              <span>Reports</span>
            </button>

            <button
              onClick={() => onTabChange && onTabChange("profile")}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-all duration-150 cursor-pointer flex items-center space-x-1.5 ${
                activeTab === "profile"
                  ? "bg-[#26201b] text-white shadow-xs font-semibold"
                  : "text-[#797167] hover:text-[#26201b] active:bg-[#ede8df]"
              }`}
              title="View your profile"
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <User className="w-3.5 h-3.5 shrink-0" />
                {isWorking && (
                  <span className="online-dot absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ring-1 ring-white" />
                )}
              </div>
              <span>Profile</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
