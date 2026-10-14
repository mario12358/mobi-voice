import type { ShareSheet } from './types';

// Records what would leave the app: Jest tests and e2e builds, where the system sheet cannot be driven.
export class MemoryShareSheet implements ShareSheet {
  readonly copied: string[] = [];
  readonly shared: { title: string; text: string }[] = [];

  async copy(text: string): Promise<void> {
    this.copied.push(text);
  }

  async share(title: string, text: string): Promise<void> {
    this.shared.push({ title, text });
  }
}
