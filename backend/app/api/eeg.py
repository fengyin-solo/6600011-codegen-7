from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from ..services.eeg_processor import generate_mock_eeg, compute_band_power, compute_spectrogram, compute_brain_state, compute_correlation, SAMPLE_RATE, evaluate_focus_training

router = APIRouter(prefix="/eeg", tags=["eeg"])

@router.get("/stream")
async def stream_eeg(duration: float = 5.0):
    return generate_mock_eeg(duration)

@router.get("/bands/{channel}")
async def band_power(channel: str):
    data = generate_mock_eeg(5.0)
    if channel in data['data']:
        return {'channel': channel, 'bands': compute_band_power(data['data'][channel], SAMPLE_RATE)}
    return {'error': 'Channel not found'}

@router.get("/brain-state/{channel}")
async def brain_state(channel: str):
    data = generate_mock_eeg(5.0)
    if channel in data['data']:
        return {'channel': channel, 'state': compute_brain_state(data['data'][channel], SAMPLE_RATE)}
    return {'error': 'Channel not found'}

@router.get("/spectrogram/{channel}")
async def spectrogram(channel: str):
    data = generate_mock_eeg(5.0)
    if channel in data['data']:
        return {'channel': channel, 'spectrogram': compute_spectrogram(data['data'][channel], SAMPLE_RATE)}
    return {'error': 'Channel not found'}

@router.get("/correlation/{channel}")
async def correlation(channel: str, duration: float = 3.0):
    data = generate_mock_eeg(duration)
    if channel not in data['data']:
        return {'error': 'Channel not found'}
    return compute_correlation(channel, data['data'], SAMPLE_RATE)

@router.get("/channels")
async def list_channels():
    from ..services.eeg_processor import CHANNELS
    return {'channels': CHANNELS}

@router.get("/sample/{channel}")
async def full_sample(channel: str, duration: float = 3.0):
    data = generate_mock_eeg(duration)
    if channel not in data['data']:
        return {'error': 'Channel not found'}
    channel_data = data['data'][channel]
    return {
        'channel': channel,
        'eeg': data,
        'bands': compute_band_power(channel_data, SAMPLE_RATE),
        'brainState': compute_brain_state(channel_data, SAMPLE_RATE),
        'correlation': compute_correlation(channel, data['data'], SAMPLE_RATE)
    }

class SnapshotItem(BaseModel):
    relativeTime: float
    focus: float
    relaxation: float
    fatigue: float
    status: str

class TrainingEvalRequest(BaseModel):
    channel: str
    presetDuration: float
    snapshots: List[SnapshotItem]

@router.post("/training/evaluate")
async def evaluate_training(req: TrainingEvalRequest):
    snapshots = [{'relativeTime': s.relativeTime, 'focus': s.focus, 'relaxation': s.relaxation, 'fatigue': s.fatigue, 'status': s.status} for s in req.snapshots]
    return evaluate_focus_training(snapshots, req.presetDuration)
