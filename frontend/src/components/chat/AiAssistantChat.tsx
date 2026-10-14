import React from "react";
import {
  sendAssistantChat,
  ApiServiceError,
  type ChatMessage,
  type ToolExecutionRecord
} from "../../services/api.js";

interface DisplayMessage extends ChatMessage {
  id: string;
  toolExecutions?: ToolExecutionRecord[];
}

const STARTER_PROMPTS = [
  "What gold loan schemes are available?",
  "Calculate quote for 50g gross and 45g net with 22K gold",
  "How is gold collateral valued?"
];

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

    const newThread = [...messages, userMessage];
    setMessages(newThread);
    setInput("");
    setLoading(true);

    try {
      // Send history to backend
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
        toolExecutions: response.toolExecutions
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
        <div className="fixed bottom-20 right-4 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-[450px] h-[580px] max-h-[80vh] bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-fadeIn">
          {/* Panel Header */}
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center font-bold text-sm shadow-md shadow-amber-500/20">
                ✨
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-white">Goldie AI</h3>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Groq 120B
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
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all"
                title="Reset conversation"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-all"
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
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${
                      isUser
                        ? "bg-amber-500/15 border border-amber-500/30 text-amber-100 rounded-br-xs"
                        : "bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Render tool execution results if present */}
                    {m.toolExecutions && m.toolExecutions.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                        {m.toolExecutions.map((te, idx) => {
                          const result = te.result as Record<string, unknown> | undefined;

                          if (te.toolName === "calculate_quote" && result?.quote) {
                            const q = result.quote as {
                              pureGoldGrams: number;
                              goldValue: number;
                              schemes: Array<{
                                name: string;
                                eligibleLoan: number;
                                annualInterestRate: number;
                              }>;
                            };
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-1.5 text-[11px]"
                              >
                                <div className="font-semibold text-amber-400 flex items-center justify-between">
                                  <span>Gold Valuation</span>
                                  <span>₹{q.goldValue.toLocaleString("en-IN")}</span>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Pure 24K Content: {q.pureGoldGrams.toFixed(2)}g
                                </div>
                                <div className="space-y-1 pt-1 border-t border-slate-800">
                                  {q.schemes.map((s, sIdx) => (
                                    <div key={sIdx} className="flex justify-between text-slate-300">
                                      <span>{s.name} ({s.annualInterestRate}%):</span>
                                      <span className="font-bold text-emerald-400">
                                        ₹{s.eligibleLoan.toLocaleString("en-IN")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
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

          {/* Confirmation Quick Actions when confirmation requested */}
          {messages[messages.length - 1]?.content.includes("Do you confirm") && (
            <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSend("Yes, I confirm")}
                disabled={loading}
                className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
              >
                ✓ Yes, I Confirm
              </button>
              <button
                type="button"
                onClick={() => handleSend("No, I want to change details")}
                disabled={loading}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                ✕ Modify Details
              </button>
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
