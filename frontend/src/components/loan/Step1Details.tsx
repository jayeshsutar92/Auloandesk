import React from "react";
import type { SupportedKarat } from "../../types/loan.types.js";

export interface Step1FormData {
  fullName: string;
  mobileNumber: string;
  email: string;
  grossWeightGrams: string;
  netWeightGrams: string;
  karat: SupportedKarat;
}

interface Step1DetailsProps {
  formData: Step1FormData;
  onChange: (updates: Partial<Step1FormData>) => void;
  onNext: () => void;
}

export const Step1Details: React.FC<Step1DetailsProps> = ({
  formData,
  onChange,
  onNext
}) => {
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Field Validations
  const nameError = React.useMemo(() => {
    const val = formData.fullName.trim();
    if (!val) return "Full name is required";
    if (val.length < 2) return "Name must be at least 2 characters long";
    if (val.length > 60) return "Name cannot exceed 60 characters";
    if (!/^[A-Za-z\s]+$/.test(val)) return "Name must contain only letters and spaces";
    return null;
  }, [formData.fullName]);

  const mobileError = React.useMemo(() => {
    const val = formData.mobileNumber.trim();
    if (!val) return "Mobile number is required";
    if (!/^[6-9]\d{9}$/.test(val))
      return "Must be a valid 10-digit Indian mobile number starting with 6-9";
    return null;
  }, [formData.mobileNumber]);

  const emailError = React.useMemo(() => {
    const val = formData.email.trim();
    if (!val) return null; // optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Invalid email address format";
    return null;
  }, [formData.email]);

  const grossWeightNum = parseFloat(formData.grossWeightGrams);
  const netWeightNum = parseFloat(formData.netWeightGrams);

  const grossWeightError = React.useMemo(() => {
    if (!formData.grossWeightGrams) return "Gross weight is required";
    if (isNaN(grossWeightNum) || grossWeightNum <= 0) return "Gross weight must be greater than 0";
    if (grossWeightNum > 1000) return "Maximum gold weight is 1000 grams";
    return null;
  }, [formData.grossWeightGrams, grossWeightNum]);

  const netWeightError = React.useMemo(() => {
    if (!formData.netWeightGrams) return "Net weight is required";
    if (isNaN(netWeightNum) || netWeightNum <= 0) return "Net weight must be greater than 0";
    if (netWeightNum > 1000) return "Maximum gold weight is 1000 grams";
    if (!isNaN(grossWeightNum) && netWeightNum > grossWeightNum) {
      return "Net weight cannot exceed gross weight";
    }
    return null;
  }, [formData.netWeightGrams, netWeightNum, grossWeightNum]);

  const isFormValid =
    !nameError && !mobileError && !emailError && !grossWeightError && !netWeightError;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      mobileNumber: true,
      email: true,
      grossWeightGrams: true,
      netWeightGrams: true
    });

    if (isFormValid) {
      onNext();
    }
  };

  const karats: { value: SupportedKarat; label: string; purity: string }[] = [
    { value: 18, label: "18 Karat", purity: "75.0% Purity" },
    { value: 22, label: "22 Karat", purity: "91.67% Standard" },
    { value: 24, label: "24 Karat", purity: "99.9% Pure" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card 1: Applicant Details */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
            1
          </span>
          Applicant Information
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Enter applicant KYC details. A 7-day duplicate lockout policy applies to mobile numbers.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Legal Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="e.g. Rahul Sharma"
              value={formData.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
              onBlur={() => handleBlur("fullName")}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm placeholder-slate-500 focus:outline-none transition-all ${
                touched.fullName && nameError
                  ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                  : "border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }`}
            />
            {touched.fullName && nameError && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {nameError}
              </p>
            )}
          </div>

          {/* Mobile Number */}
          <div>
            <label htmlFor="mobileNumber" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Indian Mobile Number <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-semibold text-slate-500 pointer-events-none">
                +91
              </span>
              <input
                id="mobileNumber"
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={formData.mobileNumber}
                onChange={(e) => onChange({ mobileNumber: e.target.value.replace(/\D/g, "") })}
                onBlur={() => handleBlur("mobileNumber")}
                className={`w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm placeholder-slate-500 focus:outline-none transition-all ${
                  touched.mobileNumber && mobileError
                    ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                    : "border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                }`}
              />
            </div>
            {touched.mobileNumber && mobileError && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {mobileError}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Must be 10 digits starting with 6, 7, 8, or 9
            </p>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-slate-500 text-[10px]">(Optional)</span>
            </label>
            <input
              id="email"
              type="email"
              placeholder="rahul@example.com"
              value={formData.email}
              onChange={(e) => onChange({ email: e.target.value })}
              onBlur={() => handleBlur("email")}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm placeholder-slate-500 focus:outline-none transition-all ${
                touched.email && emailError
                  ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                  : "border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }`}
            />
            {touched.email && emailError && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {emailError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Gold Specifications */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
            2
          </span>
          Gold Specifications
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Provide gross and net weights. The net weight represents genuine gold content without stones.
        </p>

        {/* Karat Selection */}
        <div className="mb-5">
          <span className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Gold Purity (Karat) <span className="text-rose-400">*</span>
          </span>
          <div className="grid grid-cols-3 gap-3">
            {karats.map((k) => {
              const isSelected = formData.karat === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => onChange({ karat: k.value })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-amber-500/15 border-amber-400/80 ring-2 ring-amber-400/30 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{k.label}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                  </div>
                  <span className="text-[11px] text-amber-300/80 font-medium block">
                    {k.purity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gross Weight */}
          <div>
            <label htmlFor="grossWeight" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Gross Weight (Grams) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="grossWeight"
                type="number"
                step="0.01"
                min="0.1"
                max="1000"
                placeholder="e.g. 50.00"
                value={formData.grossWeightGrams}
                onChange={(e) => onChange({ grossWeightGrams: e.target.value })}
                onBlur={() => handleBlur("grossWeightGrams")}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm placeholder-slate-500 focus:outline-none transition-all pr-10 ${
                  touched.grossWeightGrams && grossWeightError
                    ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                    : "border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-500">
                g
              </span>
            </div>
            {touched.grossWeightGrams && grossWeightError && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {grossWeightError}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Total physical weight including ornaments/stones</p>
          </div>

          {/* Net Weight */}
          <div>
            <label htmlFor="netWeight" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Net Gold Weight (Grams) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                id="netWeight"
                type="number"
                step="0.01"
                min="0.1"
                max="1000"
                placeholder="e.g. 45.00"
                value={formData.netWeightGrams}
                onChange={(e) => onChange({ netWeightGrams: e.target.value })}
                onBlur={() => handleBlur("netWeightGrams")}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm placeholder-slate-500 focus:outline-none transition-all pr-10 ${
                  touched.netWeightGrams && netWeightError
                    ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                    : "border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                }`}
              />
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-semibold text-slate-500">
                g
              </span>
            </div>
            {touched.netWeightGrams && netWeightError && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <span>⚠</span> {netWeightError}
              </p>
            )}
            <p className="text-[11px] text-slate-500 mt-1">Net gold weight after deducting stones (must be ≤ gross)</p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] transition-all flex items-center gap-2"
        >
          <span>Calculate Quotes</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className="w-4 h-4 shrink-0"
            fill="none"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </form>
  );
};
