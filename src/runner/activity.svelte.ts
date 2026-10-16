// What Python is busy with, for the Run and Check buttons: running code, or loading the big libraries first.
const NAMES: Record<string, string> = {
  numpy: "NumPy",
  pandas: "pandas",
  sklearn: "scikit-learn",
  scipy: "SciPy",
};

export const runnerActivity = $state<{ loading: string[] | null }>({ loading: null });

export function busyLabel(): string {
  const names = runnerActivity.loading?.map((n) => NAMES[n] ?? n) ?? [];
  return names.length > 0 ? `Loading ${names.join(" and ")}...` : "Running...";
}
