export interface Alarm {
  id: string;
  time: string; // "HH:MM"
  days: number[]; // 0 for Sunday, 1 for Monday, etc.
  enabled: boolean;
  name?: string; // Optional name
  description?: string; // Optional description
}
