import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Persist form state to sessionStorage so it survives dialog close/reopen.
 * `isDirty` compares against the initial values captured on first mount.
 */
export function useFormDraft<T extends Record<string, unknown>>(key: string, initial: T) {
  const storageKey = `form-draft:${key}`;
  const initialRef = useRef(initial);
  const initialJson = useMemo(() => JSON.stringify(initialRef.current), []);

  const [values, setValues] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) return { ...initial, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return initial;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (JSON.stringify(values) === initialJson) {
        window.sessionStorage.removeItem(storageKey);
      } else {
        window.sessionStorage.setItem(storageKey, JSON.stringify(values));
      }
    } catch { /* ignore */ }
  }, [values, storageKey, initialJson]);

  const isDirty = JSON.stringify(values) !== initialJson;

  return {
    values,
    setValues,
    set: <K extends keyof T>(k: K, v: T[K]) =>
      setValues((p) => ({ ...p, [k]: v })),
    isDirty,
    clear: () => clearDraft(key),
  };
}

export function hasDraft(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.sessionStorage.getItem(`form-draft:${key}`);
  } catch {
    return false;
  }
}

export function clearDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(`form-draft:${key}`);
  } catch { /* ignore */ }
}

/**
 * Shared confirmation copy for the dialog close / switch actions.
 * Returns true if the user chose to proceed.
 */
export function confirmDiscardOrKeep(): boolean {
  if (typeof window === "undefined") return true;
  return window.confirm(
    "You have unsaved changes. They will be kept as a draft and restored when you reopen this form.\n\nClose anyway?",
  );
}
