import React from "react";
import type { QuoteSummaryData } from "../../services/api.js";

export interface QuoteSummaryCardProps {
  quote: QuoteSummaryData;
}

export const QuoteSummaryCard: React.FC<QuoteSummaryCardProps> = ({ quote }) => {
  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 shadow-xl shadow-slate-950/50 overflow-hidden text-xs">
      {/* Card Header */}
      <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-b border-amber-500/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-500/30">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="w-3.5 h-3.5 shrink-0"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" fill="currentColor" fillOpacity="0.25" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-amber-300 text-xs tracking-tight truncate">
              Indicative Loan Quote
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              Authoritative valuation at benchmark ₹7,000/g 24K rate
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
          {quote.schemes.length} Schemes
        </span>
      </div>

      {/* Gold Collateral Valuation Banner */}
      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block">
            Assessed Collateral Value
          </span>
          <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 font-mono tracking-tight">
            ₹{quote.goldValue.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] text-slate-400 block">Pure Gold Content</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            {quote.pureGoldGrams.toFixed(2)} g (24K equiv)
          </span>
        </div>
      </div>

      {/* Gold Details Grid */}
      <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-center">
        <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-medium">Gross Weight</span>
          <span className="font-mono font-semibold text-slate-200 text-xs">
            {quote.grossWeightGrams} g
          </span>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-medium">Net Gold</span>
          <span className="font-mono font-semibold text-amber-300 text-xs">
            {quote.netWeightGrams} g
          </span>
        </div>
        <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-[9px] text-slate-400 block font-medium">Purity</span>
          <span className="font-mono font-semibold text-slate-200 text-xs">
            {quote.karat}K ({quote.karat === 24 ? "99.9%" : quote.karat === 22 ? "91.6%" : "75.0%"})
          </span>
        </div>
      </div>

      {/* Available Schemes List */}
      <div className="p-3.5 space-y-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
          Available Financing Schemes
        </span>
        <div className="space-y-2">
          {quote.schemes.map((scheme, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-100 text-xs">
                    {scheme.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {scheme.annualInterestRate}% p.a.
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Tenure: {scheme.tenureMonths} Months • Max LTV: {Math.round(scheme.maxLtv * 100)}%
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[9px] text-slate-400 block">Eligible Loan</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono tracking-tight">
                  ₹{scheme.eligibleLoan.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Note */}
      <div className="px-3.5 py-2 bg-slate-950 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
        <span>RBI LTV Cap: 75% max</span>
        <span>Subject to branch physical assay & KYC</span>
      </div>
    </div>
  );
};
