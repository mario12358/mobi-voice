import { EndpointingVad } from '../EndpointingVad';
import { SileroSpeechDetector } from '../SileroSpeechDetector';

jest.mock('../../../../modules/mobi-audio', () => ({
  MobiAudio: {
    loadVad: jest.fn(async () => {}),
    vadAccept: jest.fn(() => false),
    vadReset: jest.fn(),
  },
}));

const { MobiAudio: native } = jest.requireMock('../../../../modules/mobi-audio') as {
  MobiAudio: { loadVad: jest.Mock; vadAccept: jest.Mock; vadReset: jest.Mock };
};

describe('SileroSpeechDetector', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads the bundled model for the capture sample rate', async () => {
    await new SileroSpeechDetector(16_000).load();
    expect(native.loadVad).toHaveBeenCalledWith(16_000);
  });

  it('feeds Silero 512-sample windows and cuts the utterance on its decisions', () => {
    // 10 windows of speech, then silence.
    native.vadAccept.mockImplementation(() => native.vadAccept.mock.calls.length <= 10);
    const vad = new EndpointingVad(new SileroSpeechDetector(16_000));
    vad.setSilenceThresholdMs(1_500);

    const events = vad.process({ samples: new Float32Array(512 * 60), sampleRate: 16_000 });

    expect(native.vadAccept.mock.calls[0]?.[0]).toHaveLength(512);
    expect(events.map((event) => event.type)).toEqual(['speech_start', 'speech_end']);
    const end = events[1];
    if (end?.type !== 'speech_end') throw new Error('expected speech_end');
    expect(end.segment.endMs).toBe(320);
  });

  it('resets the native detector together with the endpointing state', () => {
    new EndpointingVad(new SileroSpeechDetector(16_000)).reset();
    expect(native.vadReset).toHaveBeenCalledTimes(1);
  });
});
