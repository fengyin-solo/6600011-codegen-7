import { create } from 'zustand';
import { EEGData, BandPower, BrainState, CorrelationData, Recording, RecordingFrame, PlaybackState, FocusTrainingSession, FocusTrainingSnapshot, FocusTrainingResult } from '../types';

const STORAGE_KEY = 'eeg_recordings';
const TRAINING_STORAGE_KEY = 'eeg_focus_trainings';

const loadRecordings = (): Recording[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecordings = (recordings: Recording[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recordings));
  } catch {}
};

const loadTrainings = (): FocusTrainingSession[] => {
  try {
    const stored = localStorage.getItem(TRAINING_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveTrainings = (trainings: FocusTrainingSession[]) => {
  try {
    localStorage.setItem(TRAINING_STORAGE_KEY, JSON.stringify(trainings));
  } catch {}
};

const computeTrainingResult = (session: FocusTrainingSession): FocusTrainingResult => {
  const { snapshots } = session;
  if (snapshots.length === 0) {
    return { averageFocus: 0, maxFocus: 0, minFocus: 0, focusRatio: 0, averageRelaxation: 0, averageFatigue: 0, stability: 0, grade: '-', gradeColor: '#999' };
  }
  const focusValues = snapshots.map(s => s.focus);
  const relaxationValues = snapshots.map(s => s.relaxation);
  const fatigueValues = snapshots.map(s => s.fatigue);
  const averageFocus = focusValues.reduce((a, b) => a + b, 0) / focusValues.length;
  const maxFocus = Math.max(...focusValues);
  const minFocus = Math.min(...focusValues);
  const focusRatio = focusValues.filter(v => v >= 60).length / focusValues.length;
  const averageRelaxation = relaxationValues.reduce((a, b) => a + b, 0) / relaxationValues.length;
  const averageFatigue = fatigueValues.reduce((a, b) => a + b, 0) / fatigueValues.length;
  const mean = averageFocus;
  const variance = focusValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / focusValues.length;
  const stdDev = Math.sqrt(variance);
  const stability = Math.max(0, Math.min(100, 100 - stdDev * 2));
  let grade: string;
  let gradeColor: string;
  if (averageFocus >= 80 && focusRatio >= 0.8) { grade = 'S'; gradeColor = '#ff6f00'; }
  else if (averageFocus >= 70 && focusRatio >= 0.6) { grade = 'A'; gradeColor = '#d32f2f'; }
  else if (averageFocus >= 60 && focusRatio >= 0.4) { grade = 'B'; gradeColor = '#1565c0'; }
  else if (averageFocus >= 50) { grade = 'C'; gradeColor = '#388e3c'; }
  else { grade = 'D'; gradeColor = '#757575'; }
  return { averageFocus: Math.round(averageFocus * 10) / 10, maxFocus: Math.round(maxFocus * 10) / 10, minFocus: Math.round(minFocus * 10) / 10, focusRatio: Math.round(focusRatio * 1000) / 10, averageRelaxation: Math.round(averageRelaxation * 10) / 10, averageFatigue: Math.round(averageFatigue * 10) / 10, stability: Math.round(stability * 10) / 10, grade, gradeColor };
};

interface EEGState {
  eegData: EEGData | null;
  selectedChannel: string;
  bandPower: BandPower | null;
  isStreaming: boolean;
  brainState: BrainState | null;
  correlationData: CorrelationData | null;
  isRecording: boolean;
  recordingStartTime: number;
  currentRecordingFrames: RecordingFrame[];
  recordings: Recording[];
  playbackMode: boolean;
  activeRecording: Recording | null;
  playbackState: PlaybackState;
  setEEGData: (d: EEGData | null) => void;
  setChannel: (c: string) => void;
  setBandPower: (b: BandPower | null) => void;
  setStreaming: (v: boolean) => void;
  setBrainState: (s: BrainState | null) => void;
  setCorrelationData: (c: CorrelationData | null) => void;
  startRecording: () => void;
  stopRecording: (name: string) => void;
  addRecordingFrame: (eeg: EEGData, bands: BandPower, brainState: BrainState) => void;
  deleteRecording: (id: string) => void;
  enterPlaybackMode: (recording: Recording) => void;
  exitPlaybackMode: () => void;
  setPlaybackTime: (time: number) => void;
  togglePlayback: () => void;
  setPlaybackPlaying: (playing: boolean) => void;
  isFocusTraining: boolean;
  focusTrainingPreset: number;
  focusTrainingStartTime: number;
  focusTrainingSnapshots: FocusTrainingSnapshot[];
  focusTrainingSessions: FocusTrainingSession[];
  focusTrainingResult: FocusTrainingResult | null;
  startFocusTraining: (durationSeconds: number) => void;
  stopFocusTraining: () => void;
  addFocusTrainingSnapshot: (brainState: BrainState) => void;
  deleteFocusTrainingSession: (id: string) => void;
  computeFocusTrainingResult: (session: FocusTrainingSession) => FocusTrainingResult;
}

export const useEEGStore = create<EEGState>((set, get) => ({
  eegData: null,
  selectedChannel: 'Fp1',
  bandPower: null,
  isStreaming: false,
  brainState: null,
  correlationData: null,
  isRecording: false,
  recordingStartTime: 0,
  currentRecordingFrames: [],
  recordings: loadRecordings(),
  playbackMode: false,
  activeRecording: null,
  playbackState: {
    isPlaying: false,
    currentTime: 0,
    currentFrame: null,
  },
  isFocusTraining: false,
  focusTrainingPreset: 0,
  focusTrainingStartTime: 0,
  focusTrainingSnapshots: [],
  focusTrainingSessions: loadTrainings(),
  focusTrainingResult: null,
  setEEGData: (d) => set({ eegData: d }),
  setChannel: (c) => set({ selectedChannel: c }),
  setBandPower: (b) => set({ bandPower: b }),
  setStreaming: (v) => set({ isStreaming: v }),
  setBrainState: (s) => set({ brainState: s }),
  setCorrelationData: (c) => set({ correlationData: c }),
  startRecording: () => {
    const { selectedChannel } = get();
    set({
      isRecording: true,
      recordingStartTime: Date.now(),
      currentRecordingFrames: [],
      playbackMode: false,
      activeRecording: null,
    });
  },
  stopRecording: (name: string) => {
    const { currentRecordingFrames, recordingStartTime, selectedChannel } = get();
    if (currentRecordingFrames.length === 0) {
      set({ isRecording: false, currentRecordingFrames: [] });
      return;
    }
    const endTime = Date.now();
    const duration = (endTime - recordingStartTime) / 1000;
    const newRecording: Recording = {
      id: `rec_${endTime}`,
      name: name || `录制 ${new Date(recordingStartTime).toLocaleString()}`,
      channel: selectedChannel,
      startTime: recordingStartTime,
      endTime,
      duration,
      frames: currentRecordingFrames,
    };
    const recordings = [...get().recordings, newRecording];
    saveRecordings(recordings);
    set({
      isRecording: false,
      recordingStartTime: 0,
      currentRecordingFrames: [],
      recordings,
    });
  },
  addRecordingFrame: (eeg, bands, brainState) => {
    const { isRecording, recordingStartTime, currentRecordingFrames } = get();
    if (!isRecording) return;
    const relativeTime = (Date.now() - recordingStartTime) / 1000;
    const frame: RecordingFrame = { relativeTime, eeg, bands, brainState };
    set({ currentRecordingFrames: [...currentRecordingFrames, frame] });
  },
  deleteRecording: (id) => {
    const recordings = get().recordings.filter(r => r.id !== id);
    saveRecordings(recordings);
    const { activeRecording } = get();
    if (activeRecording?.id === id) {
      set({ recordings, playbackMode: false, activeRecording: null });
    } else {
      set({ recordings });
    }
  },
  enterPlaybackMode: (recording) => {
    if (recording.frames.length === 0) return;
    set({
      playbackMode: true,
      activeRecording: recording,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        currentFrame: recording.frames[0],
      },
      eegData: recording.frames[0].eeg,
      bandPower: recording.frames[0].bands,
      brainState: recording.frames[0].brainState,
    });
  },
  exitPlaybackMode: () => {
    set({
      playbackMode: false,
      activeRecording: null,
      playbackState: {
        isPlaying: false,
        currentTime: 0,
        currentFrame: null,
      },
    });
  },
  setPlaybackTime: (time) => {
    const { activeRecording } = get();
    if (!activeRecording || activeRecording.frames.length === 0) return;
    const frames = activeRecording.frames;
    let frameIndex = 0;
    for (let i = 0; i < frames.length; i++) {
      if (frames[i].relativeTime <= time) {
        frameIndex = i;
      } else {
        break;
      }
    }
    const frame = frames[frameIndex];
    set({
      playbackState: {
        ...get().playbackState,
        currentTime: time,
        currentFrame: frame,
      },
      eegData: frame.eeg,
      bandPower: frame.bands,
      brainState: frame.brainState,
    });
  },
  togglePlayback: () => {
    const { playbackState } = get();
    set({
      playbackState: {
        ...playbackState,
        isPlaying: !playbackState.isPlaying,
      },
    });
  },
  setPlaybackPlaying: (playing) => {
    set({
      playbackState: {
        ...get().playbackState,
        isPlaying: playing,
      },
    });
  },
  startFocusTraining: (durationSeconds) => {
    set({
      isFocusTraining: true,
      focusTrainingPreset: durationSeconds,
      focusTrainingStartTime: Date.now(),
      focusTrainingSnapshots: [],
      focusTrainingResult: null,
    });
  },
  stopFocusTraining: () => {
    const { focusTrainingSnapshots, focusTrainingStartTime, focusTrainingPreset, selectedChannel, focusTrainingSessions } = get();
    const endTime = Date.now();
    const actualDuration = (endTime - focusTrainingStartTime) / 1000;
    const session: FocusTrainingSession = {
      id: `train_${endTime}`,
      channel: selectedChannel,
      presetDuration: focusTrainingPreset,
      startTime: focusTrainingStartTime,
      endTime,
      actualDuration,
      snapshots: focusTrainingSnapshots,
      completed: actualDuration >= focusTrainingPreset * 0.9,
    };
    const result = computeTrainingResult(session);
    const sessions = [...focusTrainingSessions, session];
    saveTrainings(sessions);
    set({
      isFocusTraining: false,
      focusTrainingPreset: 0,
      focusTrainingStartTime: 0,
      focusTrainingSnapshots: [],
      focusTrainingSessions: sessions,
      focusTrainingResult: result,
    });
  },
  addFocusTrainingSnapshot: (brainState) => {
    const { isFocusTraining, focusTrainingStartTime, focusTrainingSnapshots } = get();
    if (!isFocusTraining) return;
    const relativeTime = (Date.now() - focusTrainingStartTime) / 1000;
    const snapshot: FocusTrainingSnapshot = {
      relativeTime,
      focus: brainState.focus,
      relaxation: brainState.relaxation,
      fatigue: brainState.fatigue,
      status: brainState.status,
    };
    set({ focusTrainingSnapshots: [...focusTrainingSnapshots, snapshot] });
  },
  deleteFocusTrainingSession: (id) => {
    const sessions = get().focusTrainingSessions.filter(s => s.id !== id);
    saveTrainings(sessions);
    set({ focusTrainingSessions: sessions });
  },
  computeFocusTrainingResult: (session) => {
    return computeTrainingResult(session);
  },
}));
