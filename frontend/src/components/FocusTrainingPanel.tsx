import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEEGStore } from '../store/eeg';
import { FocusTrainingResult } from '../types';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const PRESET_DURATIONS = [
  { label: '1 分钟', seconds: 60 },
  { label: '3 分钟', seconds: 180 },
  { label: '5 分钟', seconds: 300 },
  { label: '10 分钟', seconds: 600 },
];

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ResultCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{
    flex: '1 1 45%',
    padding: '12px',
    background: `${color}10`,
    borderRadius: '8px',
    border: `1px solid ${color}30`,
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
  </div>
);

export const FocusTrainingPanel: React.FC = () => {
  const {
    brainState,
    isFocusTraining,
    focusTrainingPreset,
    focusTrainingStartTime,
    focusTrainingSnapshots,
    focusTrainingSessions,
    focusTrainingResult,
    startFocusTraining,
    stopFocusTraining,
    addFocusTrainingSnapshot,
    deleteFocusTrainingSession,
    computeFocusTrainingResult,
  } = useEEGStore();

  const [selectedDuration, setSelectedDuration] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [resultData, setResultData] = useState<FocusTrainingResult | null>(null);
  const [resultSessionId, setResultSessionId] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isFocusTraining) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const e = (now - focusTrainingStartTime) / 1000;
        setElapsed(e);
        if (e >= focusTrainingPreset) {
          stopFocusTraining();
        }
      }, 200);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFocusTraining, focusTrainingStartTime, focusTrainingPreset]);

  useEffect(() => {
    if (isFocusTraining && brainState) {
      addFocusTrainingSnapshot(brainState);
    }
  }, [isFocusTraining, brainState]);

  useEffect(() => {
    if (!isFocusTraining && focusTrainingResult) {
      setResultData(focusTrainingResult);
      setShowResult(true);
    }
  }, [isFocusTraining, focusTrainingResult]);

  const handleStart = useCallback(() => {
    setShowResult(false);
    setResultData(null);
    startFocusTraining(selectedDuration);
  }, [selectedDuration, startFocusTraining]);

  const handleStop = useCallback(() => {
    stopFocusTraining();
  }, [stopFocusTraining]);

  const handleViewResult = useCallback((sessionId: string) => {
    const session = focusTrainingSessions.find(s => s.id === sessionId);
    if (session) {
      const result = computeFocusTrainingResult(session);
      setResultData(result);
      setResultSessionId(sessionId);
      setShowResult(true);
    }
  }, [focusTrainingSessions, computeFocusTrainingResult]);

  const progress = isFocusTraining ? Math.min(100, (elapsed / focusTrainingPreset) * 100) : 0;
  const remaining = isFocusTraining ? Math.max(0, focusTrainingPreset - elapsed) : 0;
  const currentFocus = isFocusTraining && brainState ? brainState.focus : 0;

  const chartData = focusTrainingSnapshots.map(s => ({
    time: Math.round(s.relativeTime * 10) / 10,
    focus: s.focus,
    relaxation: s.relaxation,
    fatigue: s.fatigue,
  }));

  return (
    <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', margin: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h3 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>🎯</span>
        专注训练
      </h3>

      {!isFocusTraining && !showResult && (
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px', fontWeight: 500 }}>
            选择训练时长
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {PRESET_DURATIONS.map(d => (
              <button
                key={d.seconds}
                onClick={() => setSelectedDuration(d.seconds)}
                style={{
                  padding: '12px',
                  background: selectedDuration === d.seconds
                    ? 'linear-gradient(135deg, #1565c0, #0d47a1)'
                    : '#f5f5f5',
                  color: selectedDuration === d.seconds ? '#fff' : '#333',
                  border: selectedDuration === d.seconds ? '2px solid #1565c0' : '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: selectedDuration === d.seconds ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedDuration === d.seconds ? '0 2px 8px rgba(21,101,192,0.3)' : 'none',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleStart}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #1565c0, #0d47a1)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 12px rgba(21,101,192,0.4)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            🎯 开始专注训练
          </button>
        </div>
      )}

      {isFocusTraining && (
        <div>
          <div style={{
            textAlign: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #0d47a1, #1565c0)',
            borderRadius: '12px',
            color: '#fff',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(21,101,192,0.4)',
          }}>
            <div style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {formatDuration(remaining)}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
              剩余时间 / 总时长 {formatDuration(focusTrainingPreset)}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '6px' }}>
              <span>训练进度</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div style={{ height: '10px', background: '#e0e0e0', borderRadius: '5px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #1565c0, #42a5f5)',
                  borderRadius: '5px',
                  transition: 'width 0.3s ease-out',
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '16px',
            background: '#f5f7fa',
            borderRadius: '10px',
            marginBottom: '16px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>实时专注度</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: currentFocus >= 60 ? '#1565c0' : currentFocus >= 40 ? '#f57c00' : '#d32f2f',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {currentFocus.toFixed(0)}
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: currentFocus >= 60
                ? 'linear-gradient(135deg, #1565c0, #42a5f5)'
                : currentFocus >= 40
                  ? 'linear-gradient(135deg, #f57c00, #ffb74d)'
                  : 'linear-gradient(135deg, #d32f2f, #ef5350)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              boxShadow: currentFocus >= 60
                ? '0 0 16px rgba(21,101,192,0.5)'
                : currentFocus >= 40
                  ? '0 0 16px rgba(245,124,0,0.5)'
                  : '0 0 16px rgba(211,47,47,0.5)',
              animation: 'focusPulse 2s infinite',
            }}>
              {currentFocus >= 60 ? '🎯' : currentFocus >= 40 ? '⚡' : '💤'}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px' }}>采集快照</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#333', fontVariantNumeric: 'tabular-nums' }}>
                {focusTrainingSnapshots.length}
              </div>
            </div>
          </div>

          {focusTrainingSnapshots.length > 2 && (
            <div style={{ height: '120px', marginBottom: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="time" hide />
                  <YAxis domain={[0, 100]} hide />
                  <ReferenceLine y={60} stroke="#1565c040" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="focus" stroke="#1565c0" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <button
            onClick={handleStop}
            style={{
              width: '100%',
              padding: '12px',
              background: '#757575',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ⏹ 结束训练
          </button>

          <style>{`
            @keyframes focusPulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.06); }
            }
          `}</style>
        </div>
      )}

      {showResult && resultData && (
        <div>
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: 'linear-gradient(135deg, #1565c0, #0d47a1)',
            borderRadius: '12px',
            color: '#fff',
            marginBottom: '16px',
            boxShadow: '0 4px 16px rgba(21,101,192,0.4)',
          }}>
            <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '8px' }}>训练评级</div>
            <div style={{
              fontSize: '56px',
              fontWeight: 900,
              letterSpacing: '4px',
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              {resultData.grade}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
              平均专注度 {resultData.averageFocus} · 专注占比 {resultData.focusRatio}%
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
            <ResultCard label="平均专注度" value={`${resultData.averageFocus}`} color="#1565c0" />
            <ResultCard label="最高专注度" value={`${resultData.maxFocus}`} color="#2e7d32" />
            <ResultCard label="最低专注度" value={`${resultData.minFocus}`} color="#e65100" />
            <ResultCard label="专注占比" value={`${resultData.focusRatio}%`} color="#1565c0" />
            <ResultCard label="平均放松度" value={`${resultData.averageRelaxation}`} color="#388e3c" />
            <ResultCard label="平均疲劳度" value={`${resultData.averageFatigue}`} color="#d32f2f" />
            <ResultCard label="稳定性" value={`${resultData.stability}`} color="#6a1b9a" />
          </div>

          {resultSessionId && (() => {
            const session = focusTrainingSessions.find(s => s.id === resultSessionId);
            if (!session || session.snapshots.length < 2) return null;
            const data = session.snapshots.map(s => ({
              time: Math.round(s.relativeTime * 10) / 10,
              focus: s.focus,
              relaxation: s.relaxation,
              fatigue: s.fatigue,
            }));
            return (
              <div style={{ height: '160px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px', fontWeight: 500 }}>专注度趋势</div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <ReferenceLine y={60} stroke="#1565c030" strokeDasharray="4 4" label={{ value: '专注线', position: 'right', fontSize: 10, fill: '#1565c060' }} />
                    <Line type="monotone" dataKey="focus" stroke="#1565c0" strokeWidth={2} dot={false} name="专注度" />
                    <Line type="monotone" dataKey="relaxation" stroke="#388e3c" strokeWidth={1.5} dot={false} name="放松度" />
                    <Line type="monotone" dataKey="fatigue" stroke="#d32f2f" strokeWidth={1.5} dot={false} name="疲劳度" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })()}

          <button
            onClick={() => { setShowResult(false); setResultData(null); setResultSessionId(null); }}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1565c0',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            返回
          </button>
        </div>
      )}

      {!isFocusTraining && !showResult && focusTrainingSessions.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '8px',
            fontWeight: 500,
            paddingTop: '12px',
            borderTop: '1px solid #eee',
          }}>
            训练记录 ({focusTrainingSessions.length})
          </div>
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {[...focusTrainingSessions].reverse().map(session => {
              const result = computeFocusTrainingResult(session);
              return (
                <div
                  key={session.id}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    marginBottom: '6px',
                    background: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: `${result.gradeColor}20`,
                        color: result.gradeColor,
                        fontSize: '14px',
                        fontWeight: 800,
                      }}>
                        {result.grade}
                      </span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#333' }}>
                          {session.completed ? '✅ 已完成' : '⚠️ 未完成'}
                        </div>
                        <div style={{ fontSize: '10px', color: '#999' }}>
                          {new Date(session.startTime).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{formatDuration(session.presetDuration)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleViewResult(session.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#e3f2fd',
                          color: '#1565c0',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        详情
                      </button>
                      <button
                        onClick={() => deleteFocusTrainingSession(session.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#ffebee',
                          color: '#d32f2f',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    专注均值 {result.averageFocus} · 占比 {result.focusRatio}% · 稳定性 {result.stability}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
