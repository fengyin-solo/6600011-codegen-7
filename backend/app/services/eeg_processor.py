import numpy as np
from scipy import signal

CHANNELS = ['Fp1','Fp2','F3','F4','C3','C4','P3','P4','O1','O2']
SAMPLE_RATE = 256
BANDS = {'delta': (0.5,4), 'theta': (4,8), 'alpha': (8,13), 'beta': (13,30), 'gamma': (30,100)}

def generate_mock_eeg(duration_sec: float = 5.0) -> dict:
    t = np.linspace(0, duration_sec, int(SAMPLE_RATE * duration_sec))
    data = {}
    for ch in CHANNELS:
        sig = 0.5*np.sin(2*np.pi*10*t) + 0.3*np.sin(2*np.pi*20*t) + 0.2*np.random.randn(len(t))
        data[ch] = sig.tolist()
    return {'channels': CHANNELS, 'sample_rate': SAMPLE_RATE, 'data': data, 'time': t.tolist(), 'duration': duration_sec}

def compute_band_power(channel_data: list, sample_rate: int) -> dict:
    freqs, psd = signal.welch(channel_data, fs=sample_rate, nperseg=256)
    result = {}
    for name, (low, high) in BANDS.items():
        mask = (freqs >= low) & (freqs <= high)
        result[name] = float(np.trapz(psd[mask], freqs[mask])) if mask.any() else 0.0
    return result

def compute_spectrogram(channel_data: list, sample_rate: int) -> dict:
    f, t, Sxx = signal.spectrogram(channel_data, fs=sample_rate, nperseg=128, noverlap=64)
    return {'frequencies': f.tolist(), 'time': t.tolist(), 'power': (10*np.log10(Sxx+1e-10)).tolist()}

def compute_brain_state(channel_data: list, sample_rate: int) -> dict:
    import time
    bands = compute_band_power(channel_data, sample_rate)
    total = sum(bands.values()) + 1e-10
    beta_rel = bands['beta'] / total
    alpha_rel = bands['alpha'] / total
    theta_rel = bands['theta'] / total
    focus = min(100.0, max(0.0, (beta_rel * 300) + np.random.uniform(-5, 5)))
    relaxation = min(100.0, max(0.0, (alpha_rel * 300) + np.random.uniform(-5, 5)))
    fatigue = min(100.0, max(0.0, (theta_rel * 300) + np.random.uniform(-5, 5)))
    scores = {'focused': focus, 'relaxed': relaxation, 'fatigued': fatigue}
    max_score = max(scores.values())
    if max_score < 50:
        status = 'neutral'
        status_label = '平稳'
        status_color = '#757575'
    else:
        status = max(scores, key=scores.get)
        if status == 'focused':
            status_label = '专注'
            status_color = '#1976d2'
        elif status == 'relaxed':
            status_label = '放松'
            status_color = '#388e3c'
        else:
            status_label = '疲劳'
            status_color = '#d32f2f'
    return {
        'focus': round(focus, 1),
        'relaxation': round(relaxation, 1),
        'fatigue': round(fatigue, 1),
        'status': status,
        'statusLabel': status_label,
        'statusColor': status_color,
        'timestamp': int(time.time() * 1000)
    }

def compute_correlation(target_channel: str, all_data: dict, sample_rate: int) -> dict:
    target_data = np.array(all_data[target_channel])
    correlations = []
    for ch in CHANNELS:
        if ch == target_channel:
            correlations.append({
                'channel': ch,
                'targetChannel': target_channel,
                'correlation': 1.0,
                'coherence': 1.0
            })
            continue
        ch_data = np.array(all_data[ch])
        corr = float(np.corrcoef(target_data, ch_data)[0, 1])
        f, coh = signal.coherence(target_data, ch_data, fs=sample_rate, nperseg=128)
        alpha_mask = (f >= 8) & (f <= 13)
        mean_coh = float(np.mean(coh[alpha_mask])) if alpha_mask.any() else 0.0
        correlations.append({
            'channel': ch,
            'targetChannel': target_channel,
            'correlation': round(corr, 4),
            'coherence': round(mean_coh, 4)
        })
    return {'targetChannel': target_channel, 'correlations': correlations}

def evaluate_focus_training(snapshots: list, preset_duration: float) -> dict:
    if not snapshots:
        return {
            'averageFocus': 0, 'maxFocus': 0, 'minFocus': 0,
            'focusRatio': 0, 'averageRelaxation': 0, 'averageFatigue': 0,
            'stability': 0, 'grade': '-', 'gradeColor': '#999'
        }
    focus_values = [s['focus'] for s in snapshots]
    relaxation_values = [s['relaxation'] for s in snapshots]
    fatigue_values = [s['fatigue'] for s in snapshots]
    avg_focus = float(np.mean(focus_values))
    max_focus = float(np.max(focus_values))
    min_focus = float(np.min(focus_values))
    focus_ratio = float(np.mean([1 for v in focus_values if v >= 60]))
    avg_relaxation = float(np.mean(relaxation_values))
    avg_fatigue = float(np.mean(fatigue_values))
    std_dev = float(np.std(focus_values))
    stability = max(0.0, min(100.0, 100 - std_dev * 2))
    if avg_focus >= 80 and focus_ratio >= 0.8:
        grade, grade_color = 'S', '#ff6f00'
    elif avg_focus >= 70 and focus_ratio >= 0.6:
        grade, grade_color = 'A', '#d32f2f'
    elif avg_focus >= 60 and focus_ratio >= 0.4:
        grade, grade_color = 'B', '#1565c0'
    elif avg_focus >= 50:
        grade, grade_color = 'C', '#388e3c'
    else:
        grade, grade_color = 'D', '#757575'
    return {
        'averageFocus': round(avg_focus, 1),
        'maxFocus': round(max_focus, 1),
        'minFocus': round(min_focus, 1),
        'focusRatio': round(focus_ratio * 100, 1),
        'averageRelaxation': round(avg_relaxation, 1),
        'averageFatigue': round(avg_fatigue, 1),
        'stability': round(stability, 1),
        'grade': grade,
        'gradeColor': grade_color
    }
