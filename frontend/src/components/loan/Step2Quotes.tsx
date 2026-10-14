import React from "react";
import type { QuotesResponseData, SupportedKarat, SchemeQuote } from "../../types/loan.types.js";
import { fetchQuotes, ApiServiceError } from "../../services/api.js";
import { Alert } from "../common/Alert.js";

interface Step2QuotesProps {
  grossWeightGrams: number;
  netWeightGrams: number;
  karat: SupportedKarat;
  selectedSchemeId: string;
  appliedLoanAmount?: number;
  onSelectScheme: (scheme: SchemeQuote, customAmount?: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export const Step2Quotes: React.FC<Step2QuotesProps> = ({
  grossWeightGrams,
  netWeightGrams,
  karat,
  selectedSchemeId,
  appliedLoanAmount,
  onSelectScheme,
  onBack,
  onNext
}) => {
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [quotesData, setQuotesData] = React.useState<QuotesResponseData | null>(null);
  const [customAmountInput, setCustomAmountInput] = React.useState<string>(
    appliedLoanAmount ? appliedLoanAmount.toString() : ""
  );

  const loadQuotes = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchQuotes({
        grossWeightGrams,
        netWeightGrams,
        karat
      });
      setQuotesData(data);

      // Auto-select first scheme if none selected or if selected is not present
      if (data.schemes.length > 0) {
        const found = data.schemes.find((s) => s.schemeId === selectedSchemeId);
        if (!found) {
          onSelectScheme(data.schemes[0]);
        }
      }
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError("Failed to calculate loan quotes. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [grossWeightGrams, netWeightGrams, karat, selectedSchemeId, onSelectScheme]);

  React.useEffect(() => {
    // Debounce the initial or repeated quote calculation (350ms)
    const timer = setTimeout(() => {
      void loadQuotes();
    }, 350);

    return () => clearTimeout(timer);
  }, [grossWeightGrams, netWeightGrams, karat, loadQuotes]);

  const selectedQuote = quotesData?.schemes.find((s) => s.schemeId === selectedSchemeId);

  const handleSchemeSelect = (scheme: SchemeQuote) => {
    const defaultAmount = scheme.eligibleLoan;
    setCustomAmountInput(defaultAmount.toString());
    onSelectScheme(scheme, defaultAmount);
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmountInput(val);
    const parsed = parseFloat(val);
    if (selectedQuote) {
      if (!isNaN(parsed) && parsed > 0) {
        onSelectScheme(selectedQuote, parsed);
      } else {
        onSelectScheme(selectedQuote, undefined);
      }
    }
  };

  const amountNumber = parseFloat(customAmountInput);
  const isCustomAmountValid =
    !customAmountInput ||
    (!isNaN(amountNumber) &&
      amountNumber > 0 &&
      selectedQuote &&
      amountNumber <= selectedQuote.eligibleLoan);

  return (
    <div className="space-y-6">
      {/* Valuation Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/90 block mb-1">
              Live Gold Valuation
            </span>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Assessed Collateral Value
            </h3>
          </div>

          <button
            type="button"
            onClick={() => void loadQuotes()}
            disabled={loading}
            className="self-start md:self-auto px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-400" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{loading ? "Calculating..." : "Refresh Valuation"}</span>
          </button>
        </div>

        {/* Valuation Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <span className="text-[11px] text-slate-400 block font-medium">Net Weight</span>
            <span className="text-base font-bold text-white mt-0.5 block">
              {netWeightGrams.toFixed(2)} g
            </span>
            <span className="text-[10px] text-slate-500">Gross: {grossWeightGrams.toFixed(2)} g</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <span className="text-[11px] text-slate-400 block font-medium">Gold Purity</span>
            <span className="text-base font-bold text-amber-400 mt-0.5 block">{karat} Karat</span>
            <span className="text-[10px] text-slate-500">
              {karat === 24 ? "99.9% fine" : karat === 22 ? "91.6% fine" : "75.0% fine"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/70">
            <span className="text-[11px] text-slate-400 block font-medium">Pure Gold Content</span>
            <span className="text-base font-bold text-white mt-0.5 block">
              {quotesData ? `${quotesData.pureGoldGrams.toFixed(3)} g` : "—"}
            </span>
            <span className="text-[10px] text-slate-500">24K Equivalent</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-amber-500/30">
            <span className="text-[11px] text-amber-300/80 block font-medium">Collateral Valuation</span>
            <span className="text-base font-extrabold text-amber-300 mt-0.5 block">
              {quotesData ? `₹${quotesData.goldValue.toLocaleString("en-IN")}` : "—"}
            </span>
            <span className="text-[10px] text-slate-500">
              @ ₹{quotesData?.rate24kPerGram.toLocaleString("en-IN") || "7,000"}/g benchmark
            </span>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert
          type="error"
          title="Quote Calculation Error"
          message={error}
          actionText="Retry Quote"
          onAction={() => void loadQuotes()}
        />
      )}

      {/* Scheme Selection Header */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
            2
          </span>
          Select Loan Scheme
        </h3>
        <p className="text-xs text-slate-400">
          Choose an eligible financing structure backed by your verified collateral valuation.
        </p>
      </div>

      {/* Loading Skeletons */}
      {loading && !quotesData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse space-y-4"
            >
              <div className="h-5 bg-slate-800 rounded w-1/2" />
              <div className="h-8 bg-slate-800 rounded w-3/4" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scheme Cards */}
      {quotesData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotesData.schemes.map((scheme) => {
            const isSelected = selectedSchemeId === scheme.schemeId;
            const isBullet = scheme.code.includes("BULLET");

            return (
              <div
                key={scheme.schemeId}
                onClick={() => handleSchemeSelect(scheme)}
                className={`p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-900 border-amber-400/90 ring-2 ring-amber-400/30 shadow-xl shadow-amber-500/10"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                }`}
              >
                {/* Badge top-right */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                      {scheme.code}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5">{scheme.name}</h4>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-amber-400 bg-amber-400 text-slate-950"
                        : "border-slate-700 bg-slate-800"
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Eligible Loan Big Display */}
                <div className="my-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Max Eligible Loan
                  </span>
                  <div className="text-2xl font-extrabold text-amber-400 tracking-tight mt-0.5">
                    ₹{scheme.eligibleLoan.toLocaleString("en-IN")}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Calculated at {scheme.maxLtv}% Loan-to-Value
                  </span>
                </div>

                {/* Scheme Highlights */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
                  <div className="p-2 rounded-lg bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block font-medium">Interest</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {scheme.annualInterestRate}% p.a.
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block font-medium">Tenure</span>
                    <span className="text-xs font-bold text-white mt-0.5 block">
                      {scheme.tenureMonths} Mos
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-950/40">
                    <span className="text-[10px] text-slate-400 block font-medium">Repayment</span>
                    <span className="text-xs font-bold text-amber-300 mt-0.5 block">
                      {isBullet ? "Bullet" : "Monthly EMI"}
                    </span>
                  </div>
                </div>

                {/* Explanatory footnote */}
                <p className="text-[11px] text-slate-400 mt-3 pt-2">
                  {isBullet
                    ? "Pay entire interest and principal at the end of 12 months. Ideal for short-term liquidity."
                    : "Pay comfortable equated monthly installments with a higher 75% loan-to-value ceiling."}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Applied Loan Amount customizer (optional within ceiling) */}
      {selectedQuote && (
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <label htmlFor="customLoanAmount" className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Desired Loan Amount
              </label>
              <p className="text-xs text-slate-400">
                You can apply for up to the eligible limit of ₹{selectedQuote.eligibleLoan.toLocaleString("en-IN")}.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-400">
              Selected: {selectedQuote.name}
            </span>
          </div>

          <div className="relative mt-2 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-semibold text-slate-500 pointer-events-none">
              ₹
            </span>
            <input
              id="customLoanAmount"
              type="number"
              min={1000}
              max={selectedQuote.eligibleLoan}
              step={100}
              placeholder={selectedQuote.eligibleLoan.toString()}
              value={customAmountInput}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-slate-950 border text-white text-sm placeholder-slate-500 focus:outline-none transition-all ${
                !isCustomAmountValid
                  ? "border-rose-500 focus:ring-2 focus:ring-rose-500/30"
                  : "border-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              }`}
            />
          </div>

          {!isCustomAmountValid && (
            <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
              <span>⚠</span> Applied loan amount must be between ₹1,000 and ₹{selectedQuote.eligibleLoan.toLocaleString("en-IN")}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Details</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!selectedSchemeId || !isCustomAmountValid || loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
        >
          <span>Review Application</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};
