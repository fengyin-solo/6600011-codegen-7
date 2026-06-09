export interface EEGData { channels: string[]; sample_rate: number; data: Record<string, number[]>; time: number[]; duration: number; }
export interface BandPower { delta: number; theta: number; alpha: number; beta: number; gamma: number; }
export interface BrainState {
  focus: number;
  relaxation: number;
  fatigue: number;
  status: 'focused' | 'relaxed' | 'fatigued' | 'neutral';
  statusLabel: string;
  statusColor: string;
  timestamp: number;
}
export interface ChannelCorrelation {
  channel: string;
  targetChannel: string;
  correlation: number;
  coherence: number;
}
export interface CorrelationData {
  targetChannel: string;
  correlations: ChannelCorrelation[];
}

export interface RecordingFrame {
  relativeTime: number;
  eeg: EEGData;
  bands: BandPower;
  brainState: BrainState;
}

export interface Recording {
  id: string;
  name: string;
  channel: string;
  startTime: number;
  endTime: number;
  duration: number;
  frames: RecordingFrame[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  currentFrame: RecordingFrame | null;
}

export interface FocusTrainingSnapshot {
  relativeTime: number;
  focus: number;
  relaxation: number;
  fatigue: number;
  status: BrainState['status'];
}

export interface FocusTrainingSession {
  id: string;
  channel: string;
  presetDuration: number;
  startTime: number;
  endTime: number;
  actualDuration: number;
  snapshots: FocusTrainingSnapshot[];
  completed: boolean;
}

export interface FocusTrainingResult {
  averageFocus: number;
  maxFocus: number;
  minFocus: number;
  focusRatio: number;
  averageRelaxation: number;
  averageFatigue: number;
  stability: number;
  grade: string;
  gradeColor: string;
}
