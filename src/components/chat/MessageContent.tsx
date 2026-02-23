"use client";

import { cn } from "@/lib/utils";

const URL_REGEX = /https?:\/\/[^\s<>[\]()]+/g;
const BOLD_REGEX = /\*([^*]+)\*/g;
const ITALIC_REGEX = /_([^_]+)_/g;
const STRIKE_REGEX = /~([^~]+)~/g;
const CODE_REGEX = /`([^`]+)`/g;

type Segment =
  | { type: "text"; value: string }
  | { type: "link"; url: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "strike"; value: string }
  | { type: "code"; value: string };

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const combined = new RegExp(
    `(${URL_REGEX.source})|(${CODE_REGEX.source})|(${BOLD_REGEX.source})|(${ITALIC_REGEX.source})|(${STRIKE_REGEX.source})`,
    "g"
  );

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      segments.push({ type: "link", url: match[1] });
    } else if (match[2]) {
      segments.push({ type: "code", value: match[3] });
    } else if (match[4]) {
      segments.push({ type: "bold", value: match[5] });
    } else if (match[6]) {
      segments.push({ type: "italic", value: match[7] });
    } else if (match[8]) {
      segments.push({ type: "strike", value: match[9] });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function MessageContent({
  content,
  deleted,
  className,
}: {
  content: string;
  deleted?: boolean;
  className?: string;
}) {
  if (deleted) {
    return (
      <span className={cn("italic text-muted-foreground", className)}>
        {content}
      </span>
    );
  }

  const lines = content.split("\n");

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {lines.map((line, lineIdx) => (
        <span key={lineIdx}>
          {lineIdx > 0 && <br />}
          {parseSegments(line).map((seg, segIdx) => {
            switch (seg.type) {
              case "link":
                return (
                  <a
                    key={segIdx}
                    href={seg.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-google-blue underline decoration-google-blue/40 hover:decoration-google-blue transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {seg.url}
                  </a>
                );
              case "bold":
                return <strong key={segIdx}>{seg.value}</strong>;
              case "italic":
                return <em key={segIdx}>{seg.value}</em>;
              case "strike":
                return <del key={segIdx} className="opacity-60">{seg.value}</del>;
              case "code":
                return (
                  <code
                    key={segIdx}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
                  >
                    {seg.value}
                  </code>
                );
              default:
                return <span key={segIdx}>{seg.value}</span>;
            }
          })}
        </span>
      ))}
    </span>
  );
}
