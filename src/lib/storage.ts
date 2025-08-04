import type { Alarm } from './types';

export const saveAlarms = async (alarms: Alarm[]): Promise<void> => {
  await chrome.storage.local.set({ alarms });
};

export const loadAlarms = async (): Promise<Alarm[]> => {
  const result = await chrome.storage.local.get('alarms');
  return result.alarms || [];
};

export const saveTheme = async (theme: string): Promise<void> => {
  await chrome.storage.local.set({ theme });
};

export const loadTheme = async (): Promise<string> => {
  const result = await chrome.storage.local.get('theme');
  return result.theme || 'dark'; // Default to dark theme
};
