import React from "react";
import { cn } from "@/lib/utils";

interface TruncatedCellTextProps {
  text: string | number | null | undefined;
  maxChars?: number;
  className?: string;
}

const truncateByChars = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
};

export default function TruncatedCellText({
  text,
  maxChars = 32,
  className,
}: TruncatedCellTextProps) {
  const raw = text == null ? "" : String(text);
  const display = truncateByChars(raw, maxChars);

  return (
    <span
      className={cn("block truncate", className)}
      title={raw || undefined}
      aria-label={raw}
    >
      {display || "-"}
    </span>
  );
}

