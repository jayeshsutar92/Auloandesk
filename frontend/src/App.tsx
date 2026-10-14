import React from "react";
import { Header } from "./components/common/Header.js";
import { LoanApplicationFlow } from "./components/loan/LoanApplicationFlow.js";
import { LeadsDashboard } from "./components/dashboard/LeadsDashboard.js";

export function App() {
  const [activeTab, setActiveTab] = React.useState<"apply" | "dashboard">("apply");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Navigation Header */}
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1">
        {activeTab === "apply" ? (
          <LoanApplicationFlow onViewDashboard={() => setActiveTab("dashboard")} />
        ) : (
          <LeadsDashboard onNewApplication={() => setActiveTab("apply")} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-8 px-4 sm:px-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-semibold text-slate-400">AuLoanDesk</span>
            <span>— Institutional Gold Loan Origination & Valuation Portal</span>
          </div>

          <p className="text-[11px] text-slate-500 max-w-md">
            Financing quotes subject to physical bullion assay verification. LTV ceilings capped at 75% in strict compliance with RBI directives.
          </p>

          <div className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} TGlobal Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
