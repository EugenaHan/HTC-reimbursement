interface PolicyNoticeProps {
  title: string;
  lines: string[];
}

export function PolicyNotice({ title, lines }: PolicyNoticeProps) {
  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50/80 p-4">
      <p className="text-sm font-semibold text-accent-800">{title}</p>
      <div className="mt-2 space-y-1">
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-accent-900">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
