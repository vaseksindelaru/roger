import { RadioChannel, RadioTrack, WordItem } from '../types';

export interface RadioChannelPayload {
  channel: RadioChannel;
  tracks: RadioTrack[];
}

export const GALACTIC_PRESET_STATIONS = [
  'Monolith Burger Jazz',
  'Monolith Bar Classic (SQ4)',
  'Xenon City Beats',
  'Vohaul Dark Signal',
  'Galaxy Gallop Rock',
  'Estraana Ambient',
  'Sariens Patrol Alarm',
  'Space Janitor Funk',
];

const normalizeStationName = (value: string) => value.trim().slice(0, 120);

export const mergeStationCatalog = (stations: string[]): string[] => {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const raw of stations) {
    const normalized = normalizeStationName(raw || '');
    if (!normalized) continue;
    if (seen.has(normalized.toLowerCase())) continue;
    seen.add(normalized.toLowerCase());
    merged.push(normalized);
  }
  return merged;
};

export const extractStationCatalog = (
  payload?: Partial<RadioChannelPayload> | null,
  extraStations: string[] = []
): string[] => {
  const trackStyles = (payload?.tracks || [])
    .map((track) => track?.style || '')
    .filter(Boolean);
  return mergeStationCatalog([
    ...GALACTIC_PRESET_STATIONS,
    ...(payload?.channel?.style ? [payload.channel.style] : []),
    ...trackStyles,
    ...extraStations,
  ]);
};

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
