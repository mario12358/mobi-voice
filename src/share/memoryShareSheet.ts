import type { ShareSheet } from './types';

// Records what would leave the app: Jest tests and e2e builds, where the system sheet cannot be driven.
export class MemoryShareSheet implements ShareSheet {
  readonly copied: string[] = [];
  readonly shared: { title: string; text: string }[] = [];
  private readonly listeners = new Set<() => void>();

  async copy(text: string): Promise<void> {
    this.copied.push(text);
    this.notify();
  }

  async share(title: string, text: string): Promise<void> {
    this.shared.push({ title, text });
    this.notify();
  }

  // e2e builds show the last shared text on screen, for Detox to read.
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get version(): number {
    return this.copied.length + this.shared.length;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
