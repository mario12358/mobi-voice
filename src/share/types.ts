// Getting text out of the app: the clipboard and the system share sheet (MV-SUM-1, MV-EXP-1).
export interface ShareSheet {
  copy(text: string): Promise<void>;
  share(title: string, text: string): Promise<void>;
}
