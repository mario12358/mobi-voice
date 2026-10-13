export interface LlamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlamaCompletionParams {
  messages: LlamaMessage[];
  n_predict: number;
  temperature: number;
}

export interface LlamaCompletionResult {
  text: string;
  interrupted: boolean;
}

// The slice of llama.rn's LlamaContext the app uses (lets Jest run without the native module).
export interface LlamaContextLike {
  completion(
    params: LlamaCompletionParams,
    onToken: (data: { token: string }) => void,
  ): Promise<LlamaCompletionResult>;
  stopCompletion(): Promise<void>;
  release(): Promise<void>;
}

export interface LlamaInitParams {
  model: string;
  n_ctx: number;
  n_gpu_layers: number;
  use_mlock: boolean;
}

export type InitLlama = (params: LlamaInitParams) => Promise<LlamaContextLike>;

// Phones fit one GGUF model in memory: switching models releases the previous context first.
export class LlamaContextSlot {
  private loaded: { modelPath: string; context: Promise<LlamaContextLike> } | null = null;

  constructor(
    private readonly initLlama: InitLlama,
    private readonly gpuLayers: number,
  ) {}

  get loadedModelPath(): string | null {
    return this.loaded?.modelPath ?? null;
  }

  async acquire(modelPath: string, contextTokens: number): Promise<LlamaContextLike> {
    if (this.loaded?.modelPath === modelPath) return this.loaded.context;
    await this.release();
    const context = this.initLlama({
      model: modelPath,
      n_ctx: contextTokens,
      n_gpu_layers: this.gpuLayers,
      use_mlock: false,
    });
    this.loaded = { modelPath, context };
    try {
      return await context;
    } catch (error) {
      this.loaded = null;
      throw error;
    }
  }

  async release(): Promise<void> {
    const previous = this.loaded;
    this.loaded = null;
    if (previous !== null) await (await previous.context).release();
  }
}
