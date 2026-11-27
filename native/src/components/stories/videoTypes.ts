export type StoryVideoProps = { uri: string; paused: boolean; onReady: () => void; onProgress: (n: number) => void; onEnd: () => void; onError: () => void };
