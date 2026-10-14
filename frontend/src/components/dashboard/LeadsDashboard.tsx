import React from "react";
import type { LeadItem, LoanScheme } from "../../types/loan.types.js";
import { fetchLeads, fetchLoanSchemes, ApiServiceError } from "../../services/api.js";
import { Alert } from "../common/Alert.js";

interface LeadsDashboardProps {
  onNewApplication: () => void;
}

export const LeadsDashboard: React.FC<LeadsDashboardProps> = ({ onNewApplication }) => {
  const [leads, setLeads] = React.useState<LeadItem[]>([]);
  const [schemes, setSchemes] = React.useState<LoanScheme[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [selectedSchemeFilter, setSelectedSchemeFilter] = React.useState<string>("ALL");
  const [selectedLead, setSelectedLead] = React.useState<LeadItem | null>(null);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsData, schemesData] = await Promise.all([
        fetchLeads(),
        fetchLoanSchemes().catch(() => [])
      ]);
      setLeads(leadsData);
      setSchemes(schemesData);
    } catch (err) {
      if (err instanceof ApiServiceError) {
        setError(err.message);
      } else {
        setError("Failed to load loan applications. Please verify network connectivity.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let ignore = false;

    async function fetchInitialData() {
      try {
        const [leadsData, schemesData] = await Promise.all([
          fetchLeads(),
          fetchLoanSchemes().catch(() => [])
        ]);
        if (!ignore) {
          setLeads(leadsData);
          setSchemes(schemesData);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiServiceError) {
            setError(err.message);
          } else {
            setError("Failed to load loan applications. Please verify network connectivity.");
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void fetchInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  // Client-side filter for real-time instant search by name or masked mobile
  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        searchTerm === "" ||
        lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.maskedMobileNumber.includes(searchTerm) ||
        lead.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesScheme =
        selectedSchemeFilter === "ALL" || lead.scheme.id === selectedSchemeFilter;

      return matchesSearch && matchesScheme;
    });
  }, [leads, searchTerm, selectedSchemeFilter]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 block mb-1">
            AuLoanDesk Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Loan Applications Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time queue of submitted gold loan leads with masked KYC mobile compliance.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50"
            title="Refresh application records"
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
            <span>{loading ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={onNewApplication}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Total Leads</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">
            {leads.length}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Under Review</span>
          <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
            {leads.filter((l) => l.status === "SUBMITTED" || l.status === "IN_REVIEW").length}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Total Collateral (Net)</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">
            {leads.reduce((sum, l) => sum + (l.netWeightGrams || 0), 0).toFixed(1)} g
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <span className="text-xs text-slate-400 font-medium block">Pipeline Value</span>
          <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
            ₹
            {Math.round(
              leads.reduce((sum, l) => sum + (l.appliedLoanAmount || l.eligibleLoan || 0), 0)
            ).toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Alert
          type="error"
          title="Dashboard Error"
          message={error}
          actionText="Retry"
          onAction={() => void refreshData()}
        />
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by applicant name, masked mobile, or application number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="schemeFilter" className="text-xs text-slate-400 whitespace-nowrap">
            Scheme:
          </label>
          <select
            id="schemeFilter"
            value={selectedSchemeFilter}
            onChange={(e) => setSelectedSchemeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
          >
            <option value="ALL">All Schemes ({leads.length})</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading && leads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <svg
              className="w-8 h-8 animate-spin text-amber-400 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-slate-400">Loading loan records from database...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-white mb-1">No Applications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchTerm || selectedSchemeFilter !== "ALL"
                ? "No applications matched your current filters. Try resetting the search or filter query."
                : "No loan applications have been submitted yet. Create the first application to view it here."}
            </p>
            {searchTerm || selectedSchemeFilter !== "ALL" ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSchemeFilter("ALL");
                }}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition-all"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={onNewApplication}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
              >
                Create Application
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3.5 px-4">Application</th>
                  <th className="py-3.5 px-4">Applicant</th>
                  <th className="py-3.5 px-4">Gold Collateral</th>
                  <th className="py-3.5 px-4">Scheme</th>
                  <th className="py-3.5 px-4 text-right">Loan Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Date</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => {
                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Application Number */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-amber-400 block">
                          {lead.applicationNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {lead.id.slice(0, 8)}...
                        </span>
                      </td>

                      {/* Applicant */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">
                          {lead.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {lead.maskedMobileNumber}
                        </span>
                      </td>

                      {/* Gold Details */}
                      <td className="py-3 px-4">
                        <span className="text-white font-medium block">
                          {lead.netWeightGrams.toFixed(2)} g ({lead.goldKarat}K)
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Valued: ₹{lead.goldValue.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Scheme */}
                      <td className="py-3 px-4">
                        <span className="font-medium text-white block">
                          {lead.scheme.name}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {lead.scheme.annualInterestRate}% p.a. • {lead.scheme.tenureMonths}M
                        </span>
                      </td>

                      {/* Loan Amount */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-400 block">
                          ₹{(lead.appliedLoanAmount || lead.eligibleLoan).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Max: ₹{lead.eligibleLoan.toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {lead.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap text-[11px]">
                        {formatDate(lead.createdAt)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedLead(lead)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium border border-slate-700 transition-all"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Application Summary
                </span>
                <h3 className="text-base font-bold text-white mt-0.5 font-mono">
                  {selectedLead.applicationNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Full Name</span>
                  <span className="font-semibold text-white">{selectedLead.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Masked Mobile</span>
                  <span className="font-mono font-semibold text-white">
                    {selectedLead.maskedMobileNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Submission Date</span>
                  <span className="text-white">{formatDate(selectedLead.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Application Status</span>
                  <span className="text-amber-400 font-bold">{selectedLead.status}</span>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Collateral Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Gross Weight</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedLead.grossWeightGrams} g</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Net Weight</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedLead.netWeightGrams} g</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Purity</span>
                    <span className="font-bold text-amber-400 mt-0.5 block">{selectedLead.goldKarat}K</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Pure Gold</span>
                    <span className="font-bold text-white mt-0.5 block">{selectedLead.pureGoldGrams.toFixed(2)} g</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Scheme & Financials
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scheme Name</span>
                    <span className="font-semibold text-white">{selectedLead.scheme.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Annual Interest Rate</span>
                    <span className="text-amber-400 font-semibold">{selectedLead.scheme.annualInterestRate}% p.a.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tenure</span>
                    <span className="text-white">{selectedLead.scheme.tenureMonths} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assessed Collateral Value</span>
                    <span className="text-white font-medium">₹{selectedLead.goldValue.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Eligible Loan</span>
                    <span className="font-bold text-amber-400">₹{selectedLead.eligibleLoan.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-amber-300 font-semibold">Applied Loan Amount</span>
                    <span className="text-emerald-400 font-extrabold text-sm">
                      ₹{(selectedLead.appliedLoanAmount || selectedLead.eligibleLoan).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
