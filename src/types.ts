export type Source = 'video' | 'playlist' | 'channel';
export type Format = 'txt' | 'srt' | 'json';
export interface Snippet { text: string; start: number; duration: number }
export interface Video { id: string; title: string; channel: string; duration: number; snippets: Snippet[]; language: string; languageCode: string; generated: boolean; source: Source; sourceTitle: string; sourceUrl: string; savedAt: string }
export type JobEvent =
  | { type: 'phase'; message: string }
  | { type: 'discovered'; total: number; title: string; cached: number }
  | { type: 'progress'; current: number; total: number; title: string }
  | { type: 'video'; video: Video }
  | { type: 'skipped'; id: string; title: string; message: string }
  | { type: 'done'; success: number; failed: number; cached: number }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };
export interface Desktop {
  load(): Promise<Video[]>;
  start(input: {url: string; kind: Source; languages: string[]; fallback: boolean; refreshExisting: boolean}): Promise<boolean>;
  cancel(): Promise<void>;
  export(ids: string[], format: Format): Promise<number>;
  remove(id: string): Promise<Video[]>;
  openVideo(id: string): Promise<void>;
  onEvent(callback: (event: JobEvent) => void): () => void;
}
declare global { interface Window { desktop?: Desktop } }
