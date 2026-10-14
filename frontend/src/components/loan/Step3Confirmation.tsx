import React from "react";
import type {
  SupportedKarat,
  SchemeQuote,
  CreateLeadResponseData
} from "../../types/loan.types.js";
import { submitLead, ApiServiceError } from "../../services/api.js";
import { Alert } from "../common/Alert.js";

interface Step3ConfirmationProps {
  applicant: {
    fullName: string;
    mobileNumber: string;
    email?: string;
  };
  gold: {
    grossWeightGrams: number;
    netWeightGrams: number;
    karat: SupportedKarat;
  };
  selectedScheme: SchemeQuote;
  appliedLoanAmount?: number;
  onBack: () => void;
  onReset: () => void;
  onViewDashboard: () => void;
}

export const Step3Confirmation: React.FC<Step3ConfirmationProps> = ({
  applicant,
  gold,
  selectedScheme,
  appliedLoanAmount,
  onBack,
  onReset,
  onViewDashboard
}) => {
  const [confirmed, setConfirmed] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] =
    React.useState<CreateLeadResponseData | null>(null);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [duplicateId, setDuplicateId] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]> | null>(null);

  const finalLoanAmount = appliedLoanAmount || selectedScheme.eligibleLoan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;

    setSubmitting(true);
    setErrorMessage(null);
    setDuplicateId(null);
    setFieldErrors(null);

    try {
      const response = await submitLead({
        fullName: applicant.fullName.trim(),
        mobileNumber: applicant.mobileNumber.trim(),
        email: applicant.email?.trim() || null,
        grossWeightGrams: gold.grossWeightGrams,
        netWeightGrams: gold.netWeightGrams,
        karat: gold.karat,
        schemeId: selectedScheme.schemeId,
        appliedLoanAmount: finalLoanAmount
      });

      setSubmissionSuccess(response);
    } catch (err) {
      if (err instanceof ApiServiceError) {
        if (err.code === "DUPLICATE_APPLICATION" || err.existingApplicationId) {
          setDuplicateId(err.existingApplicationId || null);
          setErrorMessage(err.message || "An active application already exists for this mobile number within the last 7 days.");
        } else {
          setErrorMessage(err.message || "Failed to submit loan application.");
        }
        if (err.fields) {
          setFieldErrors(err.fields);
        }
      } else {
        setErrorMessage("An unexpected network error occurred while submitting your application.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Render Success State
  if (submissionSuccess) {
    return (
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-8 shadow-2xl backdrop-blur-md relative overflow-hidden animate-fadeIn">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="text-center max-w-lg mx-auto">
          {/* Animated checkmark circle */}
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <svg className="w-8 h-8 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Application Registered Successfully
          </span>
          <h2 className="text-2xl font-extrabold text-white">
            Gold Loan Sanction Initiated
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Your application has been received and logged into the AuLoanDesk portal.
          </p>

          {/* Reference Card */}
          <div className="my-6 p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Application Number</span>
              <span className="text-sm font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {submissionSuccess.applicationNumber}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Application ID</span>
              <span className="text-xs font-mono text-slate-400 truncate max-w-[200px]" title={submissionSuccess.applicationId}>
                {submissionSuccess.applicationId}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Applicant</span>
              <span className="text-xs font-medium text-white">
                {submissionSuccess.fullName} ({submissionSuccess.maskedMobileNumber})
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400">Selected Scheme</span>
              <span className="text-xs font-medium text-white">
                {submissionSuccess.scheme.name} ({submissionSuccess.scheme.annualInterestRate}% p.a.)
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-semibold text-amber-400/90">Sanctioned Eligible Loan</span>
              <span className="text-lg font-bold text-emerald-400">
                ₹{submissionSuccess.eligibleLoan.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Next Steps Guide */}
          <div className="text-left p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 space-y-1.5 mb-6">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <span>📋</span> Next Steps for Disbursement:
            </div>
            <p>1. Our authorized bullion valuator will inspect collateral authenticity at the branch.</p>
            <p>2. Complete Aadhaar e-KYC or biometric verification.</p>
            <p>3. Immediate instant loan transfer directly to your designated bank account.</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={onReset}
              className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 hover:text-white transition-all"
            >
              Start New Application
            </button>
            <button
              type="button"
              onClick={onViewDashboard}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center justify-center gap-2"
            >
              <span>View in Admin Dashboard</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Format mobile for display
  const maskedOrFormattedMobile = `+91 ${applicant.mobileNumber.slice(0, 5)} ${applicant.mobileNumber.slice(5)}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 409 Duplicate Alert */}
      {duplicateId && (
        <Alert
          type="warning"
          title="Duplicate Application Detected"
          message={errorMessage || "An active application was already submitted for this mobile number within the last 7 days."}
          actionText="View in Dashboard"
          onAction={onViewDashboard}
        />
      )}

      {/* General Error Alert */}
      {!duplicateId && errorMessage && (
        <Alert
          type="error"
          title="Submission Error"
          message={errorMessage}
        />
      )}

      {/* Field Errors List */}
      {fieldErrors && Object.keys(fieldErrors).length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
          <div className="font-semibold text-rose-200 mb-1">Please correct the following fields:</div>
          {Object.entries(fieldErrors).map(([field, msgs]) => (
            <div key={field} className="flex gap-1.5">
              <span className="font-semibold capitalize">{field}:</span>
              <span>{msgs.join(", ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review Summary */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
            3
          </span>
          Review & Confirmation
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Please review the loan terms and applicant verification data carefully before final authorization.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Applicant & Collateral */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              Applicant & Collateral
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Full Name</span>
                <span className="font-semibold text-white">{applicant.fullName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Mobile Number</span>
                <span className="font-mono font-semibold text-white">{maskedOrFormattedMobile}</span>
              </div>
              {applicant.email && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Email Address</span>
                  <span className="text-slate-300">{applicant.email}</span>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Gross Physical Weight</span>
                <span className="font-semibold text-white">{gold.grossWeightGrams.toFixed(2)} g</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Net Pure Content Weight</span>
                <span className="font-semibold text-white">{gold.netWeightGrams.toFixed(2)} g</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Gold Purity</span>
                <span className="font-semibold text-amber-400">{gold.karat} Karat</span>
              </div>
            </div>
          </div>

          {/* Section 2: Selected Loan Structure */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
              Loan Terms & Valuation
            </h4>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Selected Scheme</span>
                <span className="font-semibold text-white">{selectedScheme.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Scheme Code</span>
                <span className="font-mono text-slate-300">{selectedScheme.code}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Interest Rate</span>
                <span className="font-semibold text-amber-400">{selectedScheme.annualInterestRate}% p.a.</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Tenure</span>
                <span className="text-white">{selectedScheme.tenureMonths} Months</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Max LTV Permitted</span>
                <span className="text-white">{selectedScheme.maxLtv}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Max Eligible Loan</span>
                <span className="font-bold text-amber-400">₹{selectedScheme.eligibleLoan.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Big Highlight Box */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Applied Loan Amount for Sanction
            </span>
            <div className="text-2xl font-black text-amber-300 tracking-tight mt-0.5">
              ₹{finalLoanAmount.toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-slate-400">
              Subject to physical assay confirmation at the branch.
            </span>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-xs text-slate-400 block">Annual Interest</span>
            <span className="text-sm font-bold text-white block">
              ₹{Math.round((finalLoanAmount * selectedScheme.annualInterestRate) / 100).toLocaleString("en-IN")} / year
            </span>
          </div>
        </div>
      </div>

      {/* Explicit Consent Declaration */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <label className="flex items-start gap-3.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900 bg-slate-950 border-slate-700 cursor-pointer"
          />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-white block mb-0.5">
              Explicit Declaration & Consent <span className="text-rose-400">*</span>
            </span>
            I hereby declare that the gold ornaments pledged are my legal property and all information
            provided is accurate. I authorize AuLoanDesk and its lending partners to process this loan application,
            conduct bullion verification, and verify KYC records in compliance with applicable RBI guidelines.
          </div>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Modify Quotes</span>
        </button>

        <button
          type="submit"
          disabled={!confirmed || submitting}
          className="px-7 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Submitting Application...</span>
            </>
          ) : (
            <>
              <span>Confirm & Submit Application</span>
              <svg className="w-4 h-4 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
