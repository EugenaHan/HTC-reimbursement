import clsx from "clsx";

interface StepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const active = index === currentStep;
        const completed = index < currentStep;

        return (
          <li
            key={step}
            className={clsx(
              "rounded-2xl border px-4 py-4 shadow-sm transition-colors",
              active && "border-ink-500 bg-white shadow-panel",
              completed && "border-accent-300 bg-accent-50",
              !active && !completed && "border-ink-100 bg-white/70",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  active && "bg-ink-700 text-white",
                  completed && "bg-accent-600 text-white",
                  !active && !completed && "bg-ink-100 text-ink-500",
                )}
              >
                {index + 1}
              </span>
              <div>
                <p className="text-sm text-ink-400">步骤 {index + 1}</p>
                <p className="text-base font-semibold text-ink-900">{step}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
