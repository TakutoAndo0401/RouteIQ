interface MetricProps {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
  icon?: React.ReactNode;
}

export function Metric({ label, value, tone = "neutral", icon }: MetricProps) {
  return (
    <div className={`metric metric--${tone}`}>
      <span>
        {icon ? <span className="metric__icon">{icon}</span> : null}
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
