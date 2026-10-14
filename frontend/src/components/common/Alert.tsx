import React from "react";

interface AlertProps {
  type?: "error" | "warning" | "success" | "info";
  title?: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = "error",
  title,
  message,
  actionText,
  onAction,
  className = ""
}) => {
  const styles = {
    error: "bg-rose-950/40 border-rose-800/60 text-rose-200",
    warning: "bg-amber-950/40 border-amber-800/60 text-amber-200",
    success: "bg-emerald-950/40 border-emerald-800/60 text-emerald-200",
    info: "bg-sky-950/40 border-sky-800/60 text-sky-200"
  };

  const icons = {
    error: (
      <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-sm ${styles[type]} ${className}`}>
      {icons[type]}
      <div className="flex-1">
        {title && <h4 className="font-semibold text-white mb-0.5">{title}</h4>}
        <p className="leading-relaxed">{message}</p>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-2 text-xs font-semibold underline hover:no-underline text-white block"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};
