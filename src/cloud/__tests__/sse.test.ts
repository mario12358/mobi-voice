import { SseParser } from '../sse';

describe('SseParser', () => {
  it('splits events on blank lines and joins multi-line data', () => {
    const parser = new SseParser();

    expect(parser.push('event: message_start\ndata: {"x":1}\n\ndata: a\ndata: b\n\n')).toEqual([
      { event: 'message_start', data: '{"x":1}' },
      { event: null, data: 'a\nb' },
    ]);
  });

  it('keeps a line cut between chunks, including CRLF endings', () => {
    const parser = new SseParser();

    expect(parser.push('data: {"text":"Dzie')).toEqual([]);
    expect(parser.push('ń dobry"}\r\n')).toEqual([]);
    expect(parser.push('\r\n')).toEqual([{ event: null, data: '{"text":"Dzień dobry"}' }]);
  });

  it('ignores comments and empty events, and flushes the last event at the end', () => {
    const parser = new SseParser();

    expect(parser.push(': keep-alive\n\n\ndata: ostatnie')).toEqual([]);
    expect(parser.finish()).toEqual([{ event: null, data: 'ostatnie' }]);
  });
});
