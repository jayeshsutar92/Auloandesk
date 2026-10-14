import React from "react";
import type { ApplicationSummaryData } from "../../services/api.js";

export interface ApplicationConfirmationCardProps {
  summary: ApplicationSummaryData;
  status?: "pending" | "confirmed" | "cancelled";
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const ApplicationConfirmationCard: React.FC<ApplicationConfirmationCardProps> = ({
  summary,
  status = "pending",
  onConfirm,
  onCancel,
  disabled = false
}) => {
  const isPending = status === "pending";
  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled";

  return (
    <div className="mt-3 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 shadow-xl shadow-slate-950/50 overflow-hidden text-xs">
      {/* Card Header with Status Badge */}
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
              Loan Application Summary
            </h4>
            <p className="text-[10px] text-slate-400 truncate">
              Review details prior to final submission
            </p>
          </div>
        </div>

        {isPending && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 shrink-0">
            Pending Confirmation
          </span>
        )}
        {isConfirmed && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 shrink-0">
            ✓ Confirmed
          </span>
        )}
        {isCancelled && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
            ✕ Cancelled
          </span>
        )}
      </div>

      {/* Eligible Loan Amount Callout with High Visual Emphasis */}
      <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block">
            Sanctioned Loan Amount
          </span>
          <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 font-mono tracking-tight">
            ₹{summary.eligibleLoan.toLocaleString("en-IN")}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] text-slate-400 block">Interest & Tenure</span>
          <span className="text-xs font-semibold text-emerald-400 font-mono">
            {summary.annualInterestRate}% p.a. • {summary.tenureMonths} Mo
          </span>
        </div>
      </div>

      {/* Structured Details Sections */}
      <div className="p-3.5 space-y-2.5">
        {/* Applicant Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">Applicant Name</span>
            <span className="font-semibold text-slate-100 text-xs break-words block">
              {summary.fullName}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Masked Mobile</span>
            <span className="font-mono font-semibold text-slate-200 text-xs block">
              {summary.maskedMobileNumber}
            </span>
          </div>
        </div>

        {/* Collateral Section */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2.5 border-b border-slate-800/80">
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Gross Weight</span>
            <span className="font-semibold text-slate-200 text-xs font-mono block">
              {summary.grossWeightGrams} g
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Net Gold Weight</span>
            <span className="font-semibold text-amber-300 text-xs font-mono block">
              {summary.netWeightGrams} g
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block font-medium">Gold Purity</span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-200 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              {summary.karat}K ({summary.karat === 24 ? "99.9%" : summary.karat === 22 ? "91.6%" : "75.0%"})
            </span>
          </div>
        </div>

        {/* Selected Scheme Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="min-w-0">
            <span className="text-[10px] text-slate-400 block font-medium">Selected Scheme</span>
            <span className="font-semibold text-slate-200 text-xs break-words block">
              {summary.schemeName}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">RBI Compliance</span>
            <span className="text-[11px] text-slate-400 block">
              LTV Capped at 75% max
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation and Cancellation Actions Footer */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-2">
        {isPending ? (
          <>
            <button
              type="button"
              onClick={onConfirm}
              disabled={disabled}
              className="w-full sm:flex-1 py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 shrink-0 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Confirm Application</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={disabled}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs border border-slate-700/80 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 shrink-0 stroke-[2.2]"
                fill="none"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Cancel</span>
            </button>
          </>
        ) : isConfirmed ? (
          <div className="w-full py-1 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Application Confirmed & Submitted</span>
          </div>
        ) : (
          <div className="w-full py-1 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Application Submission Cancelled</span>
          </div>
        )}
      </div>
    </div>
  );
};
