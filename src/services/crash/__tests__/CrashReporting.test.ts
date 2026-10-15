import { act, renderHook } from '@testing-library/react-native';

import { DEFAULT_SETTINGS, useSettingsStore } from '../../../state/settings';
import {
  CrashReporting,
  scrubEvent,
  type CrashEvent,
  type CrashSdk,
  type CrashSdkOptions,
} from '../CrashReporting';
import { useCrashReporting } from '../useCrashReporting';

const DSN = 'https://public@o1.ingest.sentry.io/2';
const OPENAI_KEY = 'test-openai-SEKRET-123';

class RecordingSdk implements CrashSdk {
  readonly inits: CrashSdkOptions[] = [];
  closes = 0;

  init(options: CrashSdkOptions): void {
    this.inits.push(options);
  }

  async close(): Promise<void> {
    this.closes += 1;
  }
}

// What the SDK might hand over after a crash during a conversation.
function crashDuringConversation(): CrashEvent {
  return {
    event_id: 'abc',
    timestamp: 1_760_000_000,
    platform: 'javascript',
    level: 'fatal',
    release: 'mobivoice@0.2.0',
    message: 'Użytkownik: Mój klucz to test-openai-SEKRET-123',
    exception: {
      values: [
        {
          type: 'TypeError',
          value: "Cannot read 'content' of „Gdzie nocować w Giżycku?”",
          mechanism: { type: 'onerror', handled: false, data: { prompt: 'Gdzie nocować?' } } as never,
          stacktrace: {
            frames: [
              {
                filename: 'app:///index.bundle',
                function: 'ConversationService.send',
                lineno: 10,
                colno: 4,
                in_app: true,
                vars: { text: 'Gdzie nocować w Giżycku?' },
              } as never,
            ],
          },
        },
      ],
    },
    breadcrumbs: [{ category: 'console', message: 'Odpowiedź: kemping nad jeziorem' }],
    extra: { lastMessage: 'Gdzie nocować w Giżycku?' },
    user: { id: 'u1', ip_address: '10.0.0.1' },
    request: {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { authorization: `Bearer ${OPENAI_KEY}` },
    },
    tags: { apiKey: OPENAI_KEY },
    contexts: {
      os: { name: 'Android', version: '14', kernel_version: 'x' },
      device: { model: 'Pixel 8', family: 'Pixel', name: 'Telefon Ani' },
      app: { app_version: '0.2.0', app_name: 'MobiVoice' },
      state: { topic: 'Wyjazd na Mazury' },
    },
  };
}

describe('crash reporting', () => {
  // specky: crit 01M4TPSDJ6PJ22Z0HREFQQ1Z00
  it('sends nothing without consent: the SDK starts only after consent and stops when it is withdrawn', async () => {
    const sdk = new RecordingSdk();
    const reporting = new CrashReporting(sdk, DSN, async () => [OPENAI_KEY, null]);

    await reporting.apply(false);
    expect(sdk.inits).toEqual([]);

    await reporting.apply(true);
    await reporting.apply(true);
    expect(sdk.inits).toHaveLength(1);
    expect(sdk.inits[0]!.dsn).toBe(DSN);

    await reporting.apply(false);
    expect(sdk.closes).toBe(1);
    // A report already queued when the consent was withdrawn is dropped.
    expect(sdk.inits[0]!.beforeSend(crashDuringConversation())).toBeNull();
  });

  it('never starts in a build without a Sentry project, even with consent', async () => {
    const sdk = new RecordingSdk();

    await new CrashReporting(sdk, undefined, async () => []).apply(true);
    await new CrashReporting(sdk, '', async () => []).apply(true);

    expect(sdk.inits).toEqual([]);
  });

  // specky: crit 01M4TPSDJ68G318A44NBBN2F31
  it('a report carries the error type, stack and phone, but no message content and no API keys', async () => {
    const sdk = new RecordingSdk();
    await new CrashReporting(sdk, DSN, async () => [OPENAI_KEY, null]).apply(true);

    const sent = sdk.inits[0]!.beforeSend(crashDuringConversation())!;

    expect(sent).toEqual({
      event_id: 'abc',
      timestamp: 1_760_000_000,
      platform: 'javascript',
      level: 'fatal',
      release: 'mobivoice@0.2.0',
      exception: {
        values: [
          {
            type: 'TypeError',
            mechanism: { type: 'onerror', handled: false },
            stacktrace: {
              frames: [
                {
                  filename: 'app:///index.bundle',
                  function: 'ConversationService.send',
                  lineno: 10,
                  colno: 4,
                  in_app: true,
                },
              ],
            },
          },
        ],
      },
      contexts: {
        os: { name: 'Android', version: '14' },
        device: { model: 'Pixel 8', family: 'Pixel' },
        app: { app_version: '0.2.0' },
      },
    });
    const text = JSON.stringify(sent);
    for (const content of ['Gdzie nocować', 'kemping', 'Mazury', 'SEKRET', 'Telefon Ani', '10.0.0.1']) {
      expect(text).not.toContain(content);
    }
  });

  it('blanks out a saved key wherever it would still appear', () => {
    const event: CrashEvent = {
      exception: {
        values: [{ type: 'Error', stacktrace: { frames: [{ function: `call ${OPENAI_KEY}` }] } }],
      },
    };

    const sent = scrubEvent(event, [OPENAI_KEY]);

    expect(sent.exception?.values?.[0]?.stacktrace?.frames?.[0]?.function).toBe('call [usunięto]');
  });

  it('follows the consent switch in Settings', async () => {
    const sdk = new RecordingSdk();
    const reporting = new CrashReporting(sdk, DSN, async () => []);
    useSettingsStore.setState(DEFAULT_SETTINGS);

    await renderHook(() => useCrashReporting(reporting));
    expect(sdk.inits).toEqual([]);

    await act(async () => useSettingsStore.getState().update({ crashReportsConsent: true }));
    expect(sdk.inits).toHaveLength(1);

    await act(async () => useSettingsStore.getState().update({ crashReportsConsent: false }));
    expect(sdk.closes).toBe(1);
  });
});
