import React from "react";

export type StepNumber = 1 | 2 | 3;

export interface StepIndicatorProps {
  currentStep: StepNumber;
  onStepClick?: (step: StepNumber) => void;
}

const STEPS: { step: StepNumber; title: string; desc: string }[] = [
  { step: 1, title: "Gold & Applicant", desc: "Enter weight & details" },
  { step: 2, title: "Loan Quotes", desc: "Compare & select scheme" },
  { step: 3, title: "Review & Submit", desc: "Confirm application" }
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="w-full max-w-3xl mx-auto mb-8 px-2">
      <div className="grid grid-cols-3 relative">
        {/* Connecting track line */}
        <div className="absolute top-5 left-1/6 right-1/6 h-0.5 bg-slate-800 -z-0">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
            style={{
              width: currentStep === 1 ? "0%" : currentStep === 2 ? "50%" : "100%"
            }}
          />
        </div>

        {STEPS.map((s) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <div
              key={s.step}
              onClick={() => {
                if (isDone && onStepClick) {
                  onStepClick(s.step);
                }
              }}
              className={`flex flex-col items-center text-center z-10 ${
                isDone ? "cursor-pointer group" : ""
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                  isDone
                    ? "bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 group-hover:bg-amber-400 group-hover:scale-105"
                    : isCurrent
                    ? "bg-amber-400 text-slate-950 ring-4 ring-amber-400/30 scale-105"
                    : "bg-slate-900 border border-slate-700 text-slate-500"
                }`}
              >
                {isDone ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span
                className={`mt-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                  isCurrent ? "text-amber-300" : isDone ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {s.title}
              </span>
              <span className="hidden sm:block text-[11px] text-slate-500 mt-0.5">
                {s.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
