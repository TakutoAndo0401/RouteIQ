import { LoaderCircle } from "lucide-react";

interface LoadingSpinnerProps {
  /** 支援技術に読み上げられる処理中の内容。 */
  label?: string;
  /** アイコンの表示サイズ（px）。 */
  size?: number;
}

/**
 * 非同期処理中であることを、アクセシブルな回転アイコンで示します。
 *
 * @summary 読み込み状態を示すスピナー
 */
export function LoadingSpinner({ label = "読み込み中", size = 16 }: LoadingSpinnerProps) {
  return (
    <LoaderCircle
      className="loading-spinner"
      size={size}
      aria-label={label}
      role="img"
    />
  );
}
