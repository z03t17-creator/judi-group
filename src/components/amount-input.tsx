"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { parseFormattedNumber } from "@/lib/money";

type AmountInputProps = {
  /** When set, a hidden input submits the clean numeric value. */
  name?: string;
  /** Raw numeric default (no commas). */
  defaultValue?: string | number;
  /** Controlled raw numeric value (no commas). */
  value?: string | number;
  onValueChange?: (raw: string) => void;
  /** IQD / whole amounts → 0; USD prices → 2. */
  fractionDigits?: number;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

/** Count of digits/decimal point before caret — restores position after commas shift. */
function significantCaretIndex(value: string, caret: number): number {
  return value.slice(0, caret).replace(/[^\d.]/g, "").length;
}

function caretFromSignificantIndex(formatted: string, index: number): number {
  if (index <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d.]/.test(formatted[i]!)) {
      seen += 1;
      if (seen === index) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * Live thousand-separator display while typing.
 * Commas insert as you type; trailing "." kept for decimals.
 */
function formatLive(raw: string, fractionDigits: number): string {
  if (!raw) return "";
  const keepTrailingDot = fractionDigits > 0 && raw.endsWith(".");
  const body = keepTrailingDot ? raw.slice(0, -1) : raw;
  const cleaned = parseFormattedNumber(body);
  if (!cleaned && !keepTrailingDot) return "";

  const [intRaw = "", decRaw = ""] = cleaned.split(".");
  const intDigits = intRaw.replace(/\D/g, "");
  const intFormatted = (intDigits || (keepTrailingDot || cleaned.includes(".") ? "0" : "")).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );

  if (fractionDigits <= 0) return intFormatted;

  if (keepTrailingDot && !cleaned.includes(".")) {
    return `${intFormatted}.`;
  }
  if (cleaned.includes(".")) {
    return `${intFormatted}.${decRaw.slice(0, fractionDigits)}`;
  }
  return intFormatted;
}

function normalizeTyped(value: string, fractionDigits: number): string {
  let typed = value.replace(/[^\d.]/g, "");
  const firstDot = typed.indexOf(".");
  if (firstDot !== -1) {
    typed =
      typed.slice(0, firstDot + 1) +
      typed.slice(firstDot + 1).replace(/\./g, "");
  }

  if (fractionDigits <= 0) {
    return typed.replace(/\./g, "");
  }

  const parts = typed.split(".");
  const intPart = parts[0] ?? "";
  if (parts.length === 1) return intPart;
  return `${intPart}.${(parts[1] ?? "").slice(0, fractionDigits)}`;
}

/**
 * Money / large-number field with live `,` thousand separators while typing.
 * Submits a clean numeric string via a hidden input when `name` is set.
 */
export function AmountInput({
  name,
  defaultValue = "",
  value,
  onValueChange,
  fractionDigits = 0,
  className = "",
  id,
  required,
  disabled,
  placeholder,
  "aria-label": ariaLabel,
}: AmountInputProps) {
  const controlled = value !== undefined;
  const [raw, setRaw] = useState(() =>
    parseFormattedNumber(controlled ? value : defaultValue),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretRef = useRef<number | null>(null);

  useEffect(() => {
    if (!controlled) return;
    setRaw(parseFormattedNumber(value));
  }, [controlled, value]);

  const currentRaw = controlled ? parseFormattedNumber(value) : raw;
  // Controlled path may drop a trailing "." from parent state; keep uncontrolled raw as typed.
  const liveRaw = controlled ? currentRaw : raw;
  const display = liveRaw ? formatLive(liveRaw, fractionDigits) : "";

  useLayoutEffect(() => {
    const input = inputRef.current;
    const significantIndex = pendingCaretRef.current;
    if (!input || significantIndex == null) return;
    const next = caretFromSignificantIndex(input.value, significantIndex);
    input.setSelectionRange(next, next);
    pendingCaretRef.current = null;
  }, [display]);

  function applyRaw(nextRaw: string) {
    if (!controlled) setRaw(nextRaw);
    onValueChange?.(nextRaw.endsWith(".") ? nextRaw.slice(0, -1) : nextRaw);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const el = event.target;
    const caret = el.selectionStart ?? el.value.length;
    pendingCaretRef.current = significantCaretIndex(el.value, caret);
    applyRaw(normalizeTyped(el.value, fractionDigits));
  }

  const submitRaw = liveRaw.endsWith(".") ? liveRaw.slice(0, -1) : liveRaw;

  return (
    <>
      {name ? <input type="hidden" name={name} value={submitRaw} /> : null}
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode={fractionDigits > 0 ? "decimal" : "numeric"}
        value={display}
        onChange={onChange}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className={className}
      />
    </>
  );
}
