import { FakeTtsEngine } from '../../engines/fakes/FakeTtsEngine';
import { WavAudioSource } from '../../engines/fakes/WavAudioSource';
import { AudioSessionService } from '../AudioSessionService';
import { FakeAudioPorts } from '../fakeAudioPorts';
import type { MicPermissionStatus } from '../types';

function setup(permission: MicPermissionStatus = 'granted', onRequest: MicPermissionStatus = permission) {
  const ports = new FakeAudioPorts(permission, onRequest);
  const source = new WavAudioSource();
  const tts = new FakeTtsEngine(60_000);
  const session = new AudioSessionService({ ...ports, source: () => source, tts: () => tts });
  return { ports, source, tts, session };
}

async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('AudioSessionService', () => {
  it('starts listening once the microphone is granted', async () => {
    const { source, session } = setup('undetermined', 'granted');

    await expect(session.start(() => {})).resolves.toBe('listening');

    expect(session.current).toBe('listening');
    expect(source.isRunning).toBe(true);
  });

  it('does not touch the microphone when the permission is denied', async () => {
    const { source, session, ports } = setup('undetermined', 'denied');

    await expect(session.start(() => {})).resolves.toBe('permission_denied');

    expect(session.current).toBe('idle');
    expect(source.isRunning).toBe(false);
    expect(ports.keptAwake).toBe(false);
  });

  // specky: crit 01M4TPSCFBKVXWKN61HZM7D781
  it('pauses listening and reading on a phone call, then listens again without resuming the reading', async () => {
    const { source, tts, session, ports } = setup();
    await session.start(() => {});
    const reading = tts.speak('Pierwsze zdanie odpowiedzi.');

    ports.interrupt('began');
    await flush();

    expect(session.current).toBe('interrupted');
    expect(source.isRunning).toBe(false);
    expect(tts.isSpeaking).toBe(false);
    await reading;

    ports.interrupt('ended');
    await flush();

    expect(session.current).toBe('listening');
    expect(source.isRunning).toBe(true);
    expect(tts.isSpeaking).toBe(false);
    expect(tts.spoken).toEqual(['Pierwsze zdanie odpowiedzi.']);
  });

  it('ignores the end of an interruption after the session was stopped', async () => {
    const { source, session, ports } = setup();
    await session.start(() => {});
    ports.interrupt('began');
    await flush();
    await session.stop();

    ports.interrupt('ended');
    await flush();

    expect(session.current).toBe('idle');
    expect(source.isRunning).toBe(false);
  });

  // specky: crit 01M4TPSCFB2Z3N9PPK993P4VX6
  it('keeps the screen on for the whole voice session, including an interruption', async () => {
    const { session, ports } = setup();

    await session.start(() => {});
    expect(ports.keptAwake).toBe(true);

    ports.interrupt('began');
    await flush();
    expect(ports.keptAwake).toBe(true);

    await session.stop();
    expect(ports.keptAwake).toBe(false);
  });
});
