/**
 * mock های Web Audio برای تست در Node (بدون مرورگر). مالک: AI-13.
 */
import type {
  EngineContextLike,
  BufferSourceLike,
  AudioBufferLike,
} from '../src/engine';
import type { AudioParamLike, GainNodeLike } from '../src/mixer';

export interface ParamEvent {
  kind: 'set' | 'expRamp' | 'cancel';
  value?: number;
  time: number;
}

export class MockParam implements AudioParamLike {
  events: ParamEvent[] = [];
  constructor(public value = 1) {}
  setValueAtTime(value: number, startTime: number): void {
    this.value = value;
    this.events.push({ kind: 'set', value, time: startTime });
  }
  exponentialRampToValueAtTime(value: number, endTime: number): void {
    this.value = value;
    this.events.push({ kind: 'expRamp', value, time: endTime });
  }
  cancelScheduledValues(startTime: number): void {
    this.events.push({ kind: 'cancel', time: startTime });
  }
}

export class MockGain implements GainNodeLike {
  gain = new MockParam(1);
  connectedTo: unknown[] = [];
  connect(dest: unknown): void {
    this.connectedTo.push(dest);
  }
}

export class MockBuffer implements AudioBufferLike {
  data: Float32Array;
  constructor(public length: number) {
    this.data = new Float32Array(length);
  }
  copyToChannel(source: Float32Array): void {
    this.data.set(source.subarray(0, this.length));
  }
}

export class MockSource implements BufferSourceLike {
  buffer: AudioBufferLike | null = null;
  loop = false;
  playbackRate = { value: 1 };
  connectedTo: unknown[] = [];
  started = false;
  stopped = false;
  onended: (() => void) | null = null;
  connect(dest: unknown): void {
    this.connectedTo.push(dest);
  }
  start(): void {
    this.started = true;
  }
  stop(): void {
    this.stopped = true;
  }
}

export class MockContext implements EngineContextLike {
  currentTime = 0;
  state = 'running';
  destination = { isDestination: true };
  sampleRate = 44100;
  gains: MockGain[] = [];
  sources: MockSource[] = [];
  buffersCreated = 0;
  resumed = 0;
  createGain(): MockGain {
    const g = new MockGain();
    this.gains.push(g);
    return g;
  }
  createBuffer(_ch: number, length: number): MockBuffer {
    this.buffersCreated++;
    return new MockBuffer(length);
  }
  createBufferSource(): MockSource {
    const s = new MockSource();
    this.sources.push(s);
    return s;
  }
  resume(): Promise<void> {
    this.resumed++;
    this.state = 'running';
    return Promise.resolve();
  }
}
