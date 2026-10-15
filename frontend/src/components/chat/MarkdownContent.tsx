import React from "react";

interface MarkdownContentProps {
  content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  if (!content) return null;

  // Split content into paragraphs or list blocks
  const blocks = content.split(/\n{2,}/);

  return (
    <div className="space-y-2 text-xs leading-relaxed">
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Check if block is a bullet list
        const lines = trimmed.split(/\n/);
        const isBulletList = lines.every((line) => /^\s*[-*•]\s+/.test(line));
        if (isBulletList) {
          return (
            <ul key={bIdx} className="space-y-1 my-1 pl-2 list-none">
              {lines.map((line, lIdx) => {
                const text = line.replace(/^\s*[-*•]\s+/, "");
                return (
                  <li key={lIdx} className="flex items-start gap-1.5 text-slate-300">
                    <span className="text-amber-400 mt-1 text-[8px] shrink-0">•</span>
                    <span>{renderInline(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Check if block is a numbered list
        const isNumberedList = lines.every((line) => /^\s*\d+\.\s+/.test(line));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-1 my-1 pl-1 list-none">
              {lines.map((line, lIdx) => {
                const numMatch = line.match(/^\s*(\d+)\.\s+/);
                const num = numMatch ? numMatch[1] : `${lIdx + 1}`;
                const text = line.replace(/^\s*\d+\.\s+/, "");
                return (
                  <li key={lIdx} className="flex items-start gap-1.5 text-slate-300">
                    <span className="font-mono text-amber-400 font-semibold text-[10px] shrink-0">
                      {num}.
                    </span>
                    <span>{renderInline(text)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Check if block is a raw pipe table (suppress in favor of structured UI cards)
        const isTable = lines.length >= 2 && lines.every((line) => line.trim().startsWith("|") && line.trim().endsWith("|"));
        if (isTable) {
          return null;
        }

        // Paragraph with line breaks
        return (
          <p key={bIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {renderInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

function renderInline(text: string): React.ReactNode[] {
  // Regex pattern for bold (**text**), italic (*text*), and code (`text`)
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic text-slate-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-[10px] border border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
