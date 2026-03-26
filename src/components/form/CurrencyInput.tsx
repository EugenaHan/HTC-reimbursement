import { fieldInputClassName } from "./FieldShell";

interface CurrencyInputProps {
  id?: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
}

export function CurrencyInput({ id, value, onChange, placeholder }: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-400">￥</span>
      <input
        id={id}
        className={`${fieldInputClassName} pl-9`}
        inputMode="decimal"
        min="0"
        placeholder={placeholder ?? "0.00"}
        step="0.01"
        type="number"
        value={value ?? ""}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue === "" ? undefined : Number(nextValue));
        }}
      />
    </div>
  );
}
