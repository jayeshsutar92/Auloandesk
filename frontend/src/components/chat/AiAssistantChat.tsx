import React from "react";
import {
  sendAssistantChat,
  ApiServiceError,
  type ChatMessage,
  type ToolExecutionRecord,
  type ApplicationSummaryData,
  type QuoteSummaryData
} from "../../services/api.js";
import { ApplicationConfirmationCard } from "./ApplicationConfirmationCard.js";
import { QuoteSummaryCard } from "./QuoteSummaryCard.js";
import { MarkdownContent } from "./MarkdownContent.js";

interface DisplayMessage extends ChatMessage {
  id: string;
  toolExecutions?: ToolExecutionRecord[];
  applicationSummary?: ApplicationSummaryData | null;
  quoteSummary?: QuoteSummaryData | null;
  confirmationStatus?: "pending" | "confirmed" | "cancelled";
}

const STARTER_PROMPTS = [
  "What gold loan schemes are available?",
  "Calculate quote for 50g gross and 45g net with 22K gold",
  "How is gold collateral valued?"
];

/**
 * Fallback parser in case message text contains an unparsed markdown table
 */
function extractClientApplicationSummary(content: string): ApplicationSummaryData | null {
  if (!content) return null;
  const tableRegex = /\|[^\n]+\|[^\n]+\|(?:\r?\n\|[-:\s|]+\|)?(?:\r?\n\|[^\n]+\|[^\n]+\|)+/;
  const match = content.match(tableRegex);
  if (!match) return null;

  const lines = match[0].split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  const fields: Record<string, string> = {};

  for (const line of lines) {
    const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (cells.length >= 2 && cells[0] && cells[1]) {
      const key = cells[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const val = cells[1];
      if (key && !key.includes("---") && key !== "field" && key !== "parameter") {
        fields[key] = val;
      }
    }
  }

  const getVal = (...keys: string[]): string | undefined => {
    for (const k of keys) {
      if (fields[k]) return fields[k];
      for (const fKey of Object.keys(fields)) {
        if (fKey.includes(k)) return fields[fKey];
      }
    }
    return undefined;
  };

  const name = getVal("fullname", "legalname", "applicantname", "applicant");
  const mobile = getVal("maskedmobilenumber", "mobilenumber", "maskedmobile", "mobile");
  const gross = getVal("grossweight", "gross");
  const net = getVal("netgoldweight", "netweight", "net");
  const karat = getVal("karat", "goldpurity", "purity");
  const scheme = getVal("selectedscheme", "schemename", "scheme", "plan");
  const rate = getVal("annualinterestrate", "interestrate", "rate");
  const tenure = getVal("tenuremonths", "tenure");
  const loan = getVal("eligibleloanamount", "eligibleloan", "sanctionedloanamount", "loanamount");

  // Strict check: Only construct summary if ALL critical fields are actually provided in the table
  if (name && mobile && gross && net && karat && scheme && loan) {
    return {
      fullName: name.replace(/[*_]/g, "").trim(),
      maskedMobileNumber: mobile.replace(/[*_]/g, "").trim(),
      grossWeightGrams: parseFloat(gross?.replace(/[^0-9.]/g, "") || "0"),
      netWeightGrams: parseFloat(net?.replace(/[^0-9.]/g, "") || "0"),
      karat: parseInt(karat?.replace(/[^0-9]/g, "") || "22", 10),
      schemeName: scheme.replace(/[*_]/g, "").trim(),
      annualInterestRate: parseFloat(rate?.replace(/[^0-9.]/g, "") || "12"),
      tenureMonths: parseInt(tenure?.replace(/[^0-9]/g, "") || "12", 10),
      eligibleLoan: parseFloat(loan?.replace(/[^0-9.]/g, "") || "0")
    };
  }
  return null;
}

function cleanContentText(content: string): string {
  if (!content) return "";
  const tableRegex = /\|[^\n]+\|[^\n]+\|(?:\r?\n\|[-:\s|]+\|)?(?:\r?\n\|[^\n]+\|[^\n]+\|)+/g;
  return content.replace(tableRegex, "").replace(/\n{3,}/g, "\n\n").trim();
}

export const AiAssistantChat: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [input, setInput] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [messages, setMessages] = React.useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am **Goldie**, your institutional Gold Loan Assistant for AuLoanDesk.\n\nI can explain our RBI-compliant financing schemes, calculate instant quotes based on your gold weight and karat, and guide you through submitting a loan application. How can I assist you today?"
    }
  ]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const idCounter = React.useRef<number>(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    idCounter.current += 1;
    const userMessage: DisplayMessage = {
      id: `user-${idCounter.current}`,
      role: "user",
      content: text
    };

    // If user explicitly sent text matching yes/no, update any pending confirmation card
    const lowerText = text.toLowerCase();
    if (lowerText.includes("yes") || lowerText.includes("confirm") || lowerText.includes("proceed")) {
      setMessages((prev) =>
        prev.map((m) =>
          m.confirmationStatus === "pending"
            ? { ...m, confirmationStatus: "confirmed" }
            : m
        )
      );
    } else if (lowerText.includes("no") || lowerText.includes("cancel") || lowerText.includes("modify")) {
      setMessages((prev) =>
        prev.map((m) =>
          m.confirmationStatus === "pending"
            ? { ...m, confirmationStatus: "cancelled" }
            : m
        )
      );
    }

    const newThread = [...messages, userMessage];
    setMessages(newThread);
    setInput("");
    setLoading(true);

    try {
      const apiMessages: ChatMessage[] = newThread.map((m) => ({
        role: m.role,
        content: m.content
      }));

      const response = await sendAssistantChat(apiMessages);

      idCounter.current += 1;
      const assistantMessage: DisplayMessage = {
        id: `assistant-${idCounter.current}`,
        role: "assistant",
        content: response.message,
        toolExecutions: response.toolExecutions,
        applicationSummary: response.applicationSummary || null,
        quoteSummary: response.quoteSummary || null,
        confirmationStatus: response.applicationSummary ? "pending" : undefined
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      let errorMessage = "I encountered a connection error. Please try again.";
      if (err instanceof ApiServiceError) {
        errorMessage = err.message;
      }
      idCounter.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${idCounter.current}`,
          role: "assistant",
          content: `⚠ **Error:** ${errorMessage}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCard = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, confirmationStatus: "confirmed" } : m
      )
    );
    void handleSend("Yes, I confirm and authorize this gold loan application.");
  };

  const handleCancelCard = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, confirmationStatus: "cancelled" } : m
      )
    );
    void handleSend("No, please cancel this application. I want to modify details.");
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I am **Goldie**, your institutional Gold Loan Assistant for AuLoanDesk.\n\nI can explain our RBI-compliant financing schemes, calculate instant quotes based on your gold weight and karat, and guide you through submitting a loan application. How can I assist you today?"
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full font-bold text-xs shadow-2xl transition-all duration-300 ${
            isOpen
              ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              : "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-amber-500/30 hover:scale-105 active:scale-95"
          }`}
          title="Open AuLoanDesk AI Assistant"
        >
          {isOpen ? (
            <>
              <svg className="w-4 h-4 shrink-0" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Close Assistant</span>
            </>
          ) : (
            <>
              <div className="relative">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block absolute -top-0.5 -right-0.5 ring-2 ring-slate-950 animate-pulse" />
                <svg className="w-5 h-5 shrink-0" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <span className="tracking-wide">Ask Goldie AI</span>
            </>
          )}
        </button>
      </div>

      {/* Slide-over / Floating Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[480px] h-[620px] max-h-[85vh] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Panel Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md shadow-amber-500/20">
                ✨
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Goldie AI</h3>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Loan Assistant
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online • Institutional Gold Loan Expert
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all cursor-pointer"
                title="Reset conversation"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all cursor-pointer"
                title="Minimize panel"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const summary = m.applicationSummary || (!isUser ? extractClientApplicationSummary(m.content) : null);
              const displayContent = cleanContentText(m.content);

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-3.5 leading-relaxed ${
                      isUser
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-br-xs"
                        : "bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-xs"
                    }`}
                  >
                    {/* Conversational Message Content */}
                    {displayContent && <MarkdownContent content={displayContent} />}

                    {/* Structured Quote Summary Card Component */}
                    {m.quoteSummary && <QuoteSummaryCard quote={m.quoteSummary} />}

                    {/* Structured Application Confirmation Card Component */}
                    {summary && (
                      <ApplicationConfirmationCard
                        summary={summary}
                        status={m.confirmationStatus || "pending"}
                        onConfirm={() => handleConfirmCard(m.id)}
                        onCancel={() => handleCancelCard(m.id)}
                        disabled={loading}
                      />
                    )}

                    {/* Render tool execution status badges if present */}
                    {m.toolExecutions && m.toolExecutions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                        {m.toolExecutions.map((te, idx) => {
                          const result = te.result as Record<string, unknown> | undefined;

                          if (te.toolName === "calculate_quote") {
                            // Rendered prominently above via QuoteSummaryCard
                            return null;
                          }

                          if (te.toolName === "submit_application" && result?.application) {
                            const app = result.application as {
                              applicationNumber: string;
                              maskedMobileNumber: string;
                              eligibleLoan: number;
                            };
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-[11px] space-y-1"
                              >
                                <div className="font-bold flex items-center gap-1">
                                  <span>✓</span> Application Registered
                                </div>
                                <div className="font-mono text-amber-300 font-bold">
                                  {app.applicationNumber}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Mobile: {app.maskedMobileNumber} • Sanction: ₹{app.eligibleLoan.toLocaleString("en-IN")}
                                </div>
                              </div>
                            );
                          }

                          if (te.toolName === "submit_application" && result?.error === "DUPLICATE_APPLICATION") {
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-[11px]"
                              >
                                <div className="font-bold">⚠ 7-Day Lockout Active</div>
                                <p className="text-[10px] mt-0.5 text-amber-300/80">
                                  {String(result.message)}
                                </p>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-400 max-w-[70%]">
                <svg className="w-4 h-4 shrink-0 animate-spin text-amber-400" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs">Goldie is evaluating your request...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          {messages.length <= 2 && (
            <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
              {STARTER_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white whitespace-nowrap border border-slate-700/60 transition-all cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask a question or enter your gold details..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0 stroke-[2.2]" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
