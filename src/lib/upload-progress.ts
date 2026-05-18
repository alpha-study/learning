export type UploadProgressState = {
  label: string;
  /** 0–100; values below 0 mean indeterminate. */
  percent: number;
};

type UploadProgressListener = (state: UploadProgressState | null) => void;

let current: UploadProgressState | null = null;
const listeners = new Set<UploadProgressListener>();

export function getUploadProgress(): UploadProgressState | null {
  return current;
}

export function setUploadProgress(state: UploadProgressState | null): void {
  current = state;
  for (const listener of listeners) {
    listener(current);
  }
}

export function subscribeUploadProgress(listener: UploadProgressListener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

/** Map a single file's loaded/total into a slice of the overall 0–100 bar. */
export function mapUploadSlice(
  loaded: number,
  total: number,
  startPercent: number,
  endPercent: number
): number {
  if (!Number.isFinite(total) || total <= 0) {
    return startPercent;
  }
  const ratio = Math.min(1, Math.max(0, loaded / total));
  return Math.round(startPercent + ratio * (endPercent - startPercent));
}
