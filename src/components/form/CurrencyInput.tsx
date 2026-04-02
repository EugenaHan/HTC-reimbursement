import { useEffect, useState } from "react";
import { fieldInputClassName } from "./FieldShell";

interface CurrencyInputProps {
  id?: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}

const formatDraftValue = (value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return "";
  }

  return String(value);
};

const normalizeDraftValue = (draft: string) => draft.replace(/[^\d.]/g, "");

export function CurrencyInput({ id, value, onChange, placeholder }: CurrencyInputProps) {
  const [draft, setDraft] = useState(() => formatDraftValue(value));

  useEffect(() => {
    setDraft(formatDraftValue(value));
  }, [value]);

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400">￥</span>
      <input
        id={id}
        className={`${fieldInputClassName} pl-9`}
        inputMode="decimal"
        placeholder={placeholder ?? "0.00"}
        type="text"
        value={draft}
        onChange={(event) => {
          const nextDraft = normalizeDraftValue(event.target.value);

          if (nextDraft.split(".").length > 2) {
            return;
          }

          setDraft(nextDraft);

          if (nextDraft === "") {
            onChange(undefined);
            return;
          }

          if (nextDraft === ".") {
            return;
          }

          const parsedValue = Number(nextDraft);
          if (!Number.isNaN(parsedValue)) {
            onChange(parsedValue);
          }
        }}
        onBlur={() => {
          if (draft === "" || draft === ".") {
            setDraft("");
            onChange(undefined);
            return;
          }

          const parsedValue = Number(draft);
          if (Number.isNaN(parsedValue)) {
            setDraft(formatDraftValue(value));
            return;
          }

          const normalizedValue = parsedValue
            .toFixed(2)
            .replace(/\.00$/, "")
            .replace(/(\.\d)0$/, "$1");
          setDraft(normalizedValue);
          onChange(parsedValue);
        }}
      />
    </div>
  );
}
