// Server-sent events as the LLM providers stream them: `data:` lines, events split by a blank line.
// Chunks from the network can cut a line anywhere, so the parser keeps the unfinished tail.
export interface SseEvent {
  event: string | null;
  data: string;
}

export class SseParser {
  private buffer = '';
  private event: string | null = null;
  private data: string[] = [];

  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const events: SseEvent[] = [];
    let newline = this.buffer.search(/\r?\n/);
    while (newline !== -1) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(this.buffer[newline] === '\r' ? newline + 2 : newline + 1);
      const event = this.line(line);
      if (event !== null) events.push(event);
      newline = this.buffer.search(/\r?\n/);
    }
    return events;
  }

  // End of the stream: an event not closed by a blank line still counts.
  finish(): SseEvent[] {
    const pending = this.buffer.length > 0 ? this.push('\n') : [];
    const last = this.dispatch();
    return last === null ? pending : [...pending, last];
  }

  private line(line: string): SseEvent | null {
    if (line === '') return this.dispatch();
    if (line.startsWith(':')) return null;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'data') this.data.push(value);
    else if (field === 'event') this.event = value;
    return null;
  }

  private dispatch(): SseEvent | null {
    if (this.data.length === 0) {
      this.event = null;
      return null;
    }
    const event = { event: this.event, data: this.data.join('\n') };
    this.event = null;
    this.data = [];
    return event;
  }
}
