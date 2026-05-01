import { LoaderCircle } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
  size?: number;
}

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
