import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { setupAlarmPage } from './alarm';

vi.mock('./lib/storage', () => ({
    loadTheme: vi.fn().mockResolvedValue('dark'),
}));

describe('Alarm Popup UI and Interactions', () => {
    const setupDOM = (searchParams: URLSearchParams) => {
        const html = fs.readFileSync(path.resolve(__dirname, 'alarm.html'), 'utf8');
        document.body.innerHTML = html;
        Object.defineProperty(window, 'location', {
            value: { search: searchParams.toString() },
            writable: true
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'close', { value: vi.fn(), writable: true });
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
            })),
        });
    });

    it('should display alarm name and description', async () => {
        const params = new URLSearchParams('name=Test+Alarm&description=Test+Desc');
        setupDOM(params);

        setupAlarmPage();
        await vi.dynamicImportSettled();

        const alarmName = document.getElementById('alarm-name-display');
        const alarmDescription = document.getElementById('alarm-description-display');
        expect(alarmName?.textContent).toBe('Test Alarm');
        expect(alarmDescription?.textContent).toBe('Test Desc');
    });

    it('should apply light theme from storage', async () => {
        setupDOM(new URLSearchParams());
        vi.mocked(chrome.storage.local.get).mockResolvedValue({ theme: 'light' });

        setupAlarmPage();
        await vi.dynamicImportSettled();

        expect(document.body.classList.contains('light-theme')).toBe(true);
    });

    it('should send disable message for non-recurring alarm on close', async () => {
        const params = new URLSearchParams('alarmName=alarm1&days=[]');
        setupDOM(params);

        setupAlarmPage();
        await vi.dynamicImportSettled();

        const closeBtn = document.getElementById('close-btn');
        closeBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 0)); // Allow async event handler to complete

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'DISABLE_ALARM',
                alarmName: 'alarm1'
            }),
            expect.any(Function)
        );
        expect(window.close).toHaveBeenCalledOnce();
    });

    it('should NOT send disable message for recurring alarm on close', async () => {
        const params = new URLSearchParams('alarmName=alarm2&days=[1,2]');
        setupDOM(params);

        setupAlarmPage();
        await vi.dynamicImportSettled();

        const closeBtn = document.getElementById('close-btn');
        closeBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 0)); // Allow async event handler to complete

        expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
        expect(window.close).toHaveBeenCalledOnce();
    });

    it('should send disable message for non-recurring alarm on snooze', async () => {
        const params = new URLSearchParams('alarmName=alarm1&days=[]');
        setupDOM(params);

        setupAlarmPage();
        await vi.dynamicImportSettled();

        const snoozeBtn = document.getElementById('snooze-btn');
        snoozeBtn?.click();
        await new Promise(resolve => setTimeout(resolve, 0)); // Allow async event handler to complete

        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'DISABLE_ALARM',
                alarmName: 'alarm1'
            }),
            expect.any(Function)
        );
        expect(chrome.alarms.create).toHaveBeenCalledOnce();
        expect(window.close).toHaveBeenCalledOnce();
    });
});
