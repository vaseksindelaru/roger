import { RadioChannel, RadioTrack, WordItem } from '../types';

export interface RadioChannelPayload {
  channel: RadioChannel;
  tracks: RadioTrack[];
}

export const fetchRadioChannel = async (): Promise<RadioChannelPayload> => {
  const response = await fetch('/api/radio/channel');
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo cargar el canal de radio.');
  }
  return data;
};

export const saveRadioChannel = async (name: string, style: string): Promise<RadioChannel> => {
  const response = await fetch('/api/radio/channel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, style }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo guardar el canal.');
  }
  return data;
};

export const tuneRadioStation = async (payload: {
  style: string;
  words: WordItem[];
}): Promise<{ audio_base64: string; source: string; warning?: string | null }> => {
  const response = await fetch('/api/radio/tune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo sintonizar la estación.');
  }
  return data;
};

export const addTrackToRadioChannel = async (payload: {
  title: string;
  style: string;
  prompt?: string;
  words_script?: string;
  audio_base64: string;
  channel_name?: string;
}): Promise<{ track: RadioTrack; warning?: string | null }> => {
  const response = await fetch('/api/radio/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo añadir la pista al canal.');
  }
  return data;
};

export const generateLearningTrack = async (payload: {
  title: string;
  style: string;
  words: WordItem[];
  channel_name?: string;
}): Promise<{ track: RadioTrack; warning?: string | null }> => {
  const response = await fetch('/api/radio/tracks/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo generar la canción de aprendizaje.');
  }
  return data;
};

export const deleteRadioTrack = async (trackId: number): Promise<void> => {
  const response = await fetch(`/api/radio/tracks/${trackId}`, { method: 'DELETE' });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'No se pudo eliminar la pista.');
  }
};
