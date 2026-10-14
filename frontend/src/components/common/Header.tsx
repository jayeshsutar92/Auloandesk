import React from "react";

interface HeaderProps {
  activeTab: "apply" | "dashboard";
  onTabChange: (tab: "apply" | "dashboard") => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange("apply")}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg
              className="w-6 h-6 text-slate-950"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              AuLoan<span className="text-amber-400">Desk</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase text-slate-400 font-medium block">
              TGlobal Gold Lending Portal
            </span>
          </div>
        </div>

        {/* Live Gold Rate Badge */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-amber-500/20 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400">24K Benchmark:</span>
          <span className="font-semibold text-amber-300">₹7,000 / g</span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onTabChange("apply")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === "apply"
                ? "bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Apply for Loan
          </button>
          <button
            type="button"
            onClick={() => onTabChange("dashboard")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            Leads Dashboard
          </button>
        </nav>
      </div>
    </header>
  );
};
