interface MetricProps {
  /** 値の意味を示す短いラベル。 */
  label: string;
  /** 整形済みの時間、費用、距離などの表示値。 */
  value: string;
  /** 値の評価を色で補助する表示トーン。 */
  tone?: "neutral" | "good" | "warn";
  /** ラベルの前に添える任意のアイコン。 */
  icon?: React.ReactNode;
}

/**
 * 時間・費用・距離など、ラベルと値の組をトーン付きで表示します。
 *
 * @summary 判断材料となる単一の指標を表示
 */
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
