import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import * as storage from './lib/storage';
import * as alarms from './lib/alarms';

// Mock dependent modules
vi.mock('./lib/storage');
vi.mock('./lib/alarms', () => ({
  sortAlarms: vi.fn(alarms => [...alarms].sort((a, b) => a.time.localeCompare(b.time))),
  addOrUpdateAlarm: vi.fn((alarms, newAlarm) => {
    const index = alarms.findIndex(a => a.id === newAlarm.id);
    if (index > -1) {
      const newAlarms = [...alarms];
      newAlarms[index] = newAlarm;
      return newAlarms;
    }
    return [...alarms, newAlarm];
  }),
  deleteAlarm: vi.fn((alarms, id) => alarms.filter(a => a.id !== id)),
  syncChromeAlarms: vi.fn(),
}));

describe('Popup UI and Interactions', () => {
  beforeEach(async () => {
    // Reset modules to ensure popup.ts is re-evaluated in each test
    vi.resetModules();

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Load HTML content from src/popup.html
    const html = fs.readFileSync(path.resolve(__dirname, 'popup.html'), 'utf8');
    document.body.innerHTML = html;

    // Reset mocks before each test
    vi.clearAllMocks();

    // Set default mock implementations
    vi.mocked(storage.loadAlarms).mockResolvedValue([]);
    vi.mocked(storage.loadTheme).mockResolvedValue('system');

    // Dynamically import popup.ts to execute its code after the DOM is set up
    // This is important because popup.ts runs code on module load
    await import('./popup');
  });

  it('should show main view by default', () => {
    const mainView = document.getElementById('main-view') as HTMLDivElement;
    const editView = document.getElementById('edit-view') as HTMLDivElement;
    const settingsView = document.getElementById('settings-view') as HTMLDivElement;

    expect(mainView.classList.contains('hidden')).toBe(false);
    expect(editView.classList.contains('hidden')).toBe(true);
    expect(settingsView.classList.contains('hidden')).toBe(true);
  });

  it('should show edit view when add alarm button is clicked', async () => {
    const addAlarmBtn = document.getElementById('add-alarm-btn') as HTMLButtonElement;
    const mainView = document.getElementById('main-view') as HTMLDivElement;
    const editView = document.getElementById('edit-view') as HTMLDivElement;

    addAlarmBtn.click();

    expect(mainView.classList.contains('hidden')).toBe(true);
    expect(editView.classList.contains('hidden')).toBe(false);
  });

  it('should show settings view when settings button is clicked', () => {
    const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    const mainView = document.getElementById('main-view') as HTMLDivElement;
    const settingsView = document.getElementById('settings-view') as HTMLDivElement;

    settingsBtn.click();

    expect(mainView.classList.contains('hidden')).toBe(true);
    expect(settingsView.classList.contains('hidden')).toBe(false);
  });

  it('should return to main view from edit view when cancel is clicked', () => {
    const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
    const mainView = document.getElementById('main-view') as HTMLDivElement;
    const editView = document.getElementById('edit-view') as HTMLDivElement;

    // First go to edit view
    const addAlarmBtn = document.getElementById('add-alarm-btn') as HTMLButtonElement;
    addAlarmBtn.click();
    expect(editView.classList.contains('hidden')).toBe(false);

    // Now click cancel
    cancelBtn.click();
    expect(mainView.classList.contains('hidden')).toBe(false);
    expect(editView.classList.contains('hidden')).toBe(true);
  });

  it('should return to main view from settings view when back is clicked', () => {
    const backToMainBtn = document.getElementById('back-to-main-btn') as HTMLButtonElement;
    const mainView = document.getElementById('main-view') as HTMLDivElement;
    const settingsView = document.getElementById('settings-view') as HTMLDivElement;

    // First go to settings view
    const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    settingsBtn.click();
    expect(settingsView.classList.contains('hidden')).toBe(false);

    // Now click back
    backToMainBtn.click();
    expect(mainView.classList.contains('hidden')).toBe(false);
    expect(settingsView.classList.contains('hidden')).toBe(true);
  });

  describe('Alarm Rendering', () => {
    it('should display "No alarms set." when no alarms exist', async () => {
      vi.mocked(storage.loadAlarms).mockResolvedValue([]);

      // Manually trigger refresh since it's called on DOMContentLoaded
      await (await import('./popup')).refreshAlarms();

      const alarmList = document.getElementById('alarm-list') as HTMLUListElement;
      expect(alarmList.textContent).toContain('No alarms set.');
    });

    it('should render a list of alarms', async () => {
      const mockAlarms = [
        { id: '1', time: '10:00', days: [], enabled: true, name: 'Test Alarm 1' },
        { id: '2', time: '11:00', days: [1, 2], enabled: false, name: 'Test Alarm 2' },
      ];
      vi.mocked(storage.loadAlarms).mockResolvedValue(mockAlarms);
      vi.mocked(alarms.sortAlarms).mockReturnValue(mockAlarms); // Mock sort to control order

      // Manually trigger refresh
      await (await import('./popup')).refreshAlarms();

      const alarmList = document.getElementById('alarm-list') as HTMLUListElement;
      const alarmItems = alarmList.querySelectorAll('.alarm-item');

      expect(alarmItems).toHaveLength(2);
      expect(alarmList.textContent).toContain('Test Alarm 1');
      expect(alarmList.textContent).toContain('10:00');
      expect(alarmList.textContent).toContain('Test Alarm 2');
      expect(alarmList.textContent).toContain('11:00');

      const toggleSwitch = alarmItems[1].querySelector('.toggle-switch') as HTMLInputElement;
      expect(toggleSwitch.checked).toBe(false);
    });
  });

  describe('User Interactions', () => {
    it('should save a new alarm', async () => {
      document.getElementById('add-alarm-btn')?.click();

      // Fill out the form
      const nameInput = document.getElementById('alarm-name') as HTMLInputElement;
      const timeInput = document.getElementById('alarm-time') as HTMLInputElement;
      nameInput.value = 'New Test Alarm';
      timeInput.value = '09:30';
      document.querySelector('.weekday[data-day="1"]')?.classList.add('active');

      document.getElementById('save-btn')?.click();

      await vi.dynamicImportSettled();

      expect(alarms.addOrUpdateAlarm).toHaveBeenCalled();
      expect(storage.saveAlarms).toHaveBeenCalled();
      expect(alarms.syncChromeAlarms).toHaveBeenCalled();

      const mainView = document.getElementById('main-view') as HTMLDivElement;
      expect(mainView.classList.contains('hidden')).toBe(false);
    });

    it('should delete an alarm', async () => {
        const mockAlarms = [{ id: '1', time: '10:00', days: [], enabled: true, name: 'Test Alarm' }];
        vi.mocked(storage.loadAlarms).mockResolvedValue(mockAlarms);
        vi.mocked(alarms.sortAlarms).mockReturnValue(mockAlarms);
        window.confirm = vi.fn(() => true); // Mock confirm dialog

        await (await import('./popup')).refreshAlarms();

        const deleteBtn = document.querySelector('.delete-btn') as HTMLButtonElement;
        deleteBtn.click();

        await vi.dynamicImportSettled();

        expect(window.confirm).toHaveBeenCalled();
        expect(alarms.deleteAlarm).toHaveBeenCalledWith(expect.any(Array), '1');
        expect(storage.saveAlarms).toHaveBeenCalled();
        expect(alarms.syncChromeAlarms).toHaveBeenCalled();
    });

    it('should toggle an alarm enabled state', async () => {
        const mockAlarms = [{ id: '1', time: '10:00', days: [], enabled: true, name: 'Test Alarm' }];
        vi.mocked(storage.loadAlarms).mockResolvedValue(mockAlarms);
        vi.mocked(alarms.sortAlarms).mockReturnValue(mockAlarms);

        await (await import('./popup')).refreshAlarms();

        const toggleSwitch = document.querySelector('.toggle-switch') as HTMLInputElement;
        toggleSwitch.click(); // This will change its checked state to false

        await vi.dynamicImportSettled();

        expect(storage.saveAlarms).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ id: '1', enabled: false })
            ])
        );
        expect(alarms.syncChromeAlarms).toHaveBeenCalled();
    });
  });

  describe('Theme Switching', () => {
    it('should apply and save the theme when changed', async () => {
      // Go to settings view
      document.getElementById('settings-btn')?.click();

      const themeSelector = document.getElementById('theme-selector') as HTMLDivElement;
      const lightThemeRadio = document.getElementById('theme-light') as HTMLInputElement;

      // Change theme to light
      lightThemeRadio.checked = true;
      // Dispatch from the radio button so e.target is correct
      lightThemeRadio.dispatchEvent(new Event('change', { bubbles: true }));

      await vi.dynamicImportSettled();

      // Check that the theme was applied to the body
      expect(document.body.classList.contains('light-theme')).toBe(true);

      // Check that saveTheme was called
      expect(storage.saveTheme).toHaveBeenCalledWith('light');
    });
  });
});
