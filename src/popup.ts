import type { Alarm } from './lib/types';
import { loadAlarms as loadAlarmsFromStorage, saveAlarms, saveTheme, loadTheme as loadThemeFromStorage } from './lib/storage';
import { sortAlarms, addOrUpdateAlarm, deleteAlarm, syncChromeAlarms, toggleAlarmEnabled } from './lib/alarms';

// --- DOM Elements ---
const mainView = document.getElementById('main-view') as HTMLDivElement;
const editView = document.getElementById('edit-view') as HTMLDivElement;
const settingsView = document.getElementById('settings-view') as HTMLDivElement;
const alarmList = document.getElementById('alarm-list') as HTMLUListElement;
const addAlarmBtn = document.getElementById('add-alarm-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const editViewTitle = document.getElementById('edit-view-title') as HTMLHeadingElement;
const alarmIdInput = document.getElementById('alarm-id') as HTMLInputElement;
const alarmTimeInput = document.getElementById('alarm-time') as HTMLInputElement;
const weekdayButtons = document.querySelectorAll('.weekday') as NodeListOf<HTMLButtonElement>;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const backToMainBtn = document.getElementById('back-to-main-btn') as HTMLButtonElement;
const themeSelector = document.getElementById('theme-selector') as HTMLDivElement;

// --- App State ---
let alarmsState: Alarm[] = [];
const weekdayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Functions ---

/**
 * Replaces __MSG_...__ placeholders in the document with localized messages.
 */
const localizeHtml = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      const text = node.nodeValue;
      const newText = text.replace(/__MSG_(\w+)__/g, (match, key) => {
        return chrome.i18n.getMessage(key) || match;
      });
      if (newText !== text) {
        node.nodeValue = newText;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      for (let i = 0; i < element.attributes.length; i++) {
        const attr = element.attributes[i];
        const text = attr.value;
        const newText = text.replace(/__MSG_(\w+)__/g, (match, key) => {
          return chrome.i18n.getMessage(key) || match;
        });
        if (newText !== text) {
          attr.value = newText;
        }
      }
    }
  }
}

/**
 * Shows the main view and hides the edit view.
 */
const showMainView = () => {
  mainView.classList.remove('hidden');
  editView.classList.add('hidden');
  settingsView.classList.add('hidden');
};

/**
 * Shows the settings view.
 */
const showSettingsView = () => {
  mainView.classList.add('hidden');
  editView.classList.add('hidden');
  settingsView.classList.remove('hidden');
}

/**
 * Shows the edit view and hides the main view.
 * @param {Alarm | null} alarm - The alarm to edit, or null to add a new one.
 */
const showEditView = (alarm: Alarm | null) => {
  editViewTitle.textContent = alarm ? 'Edit Alarm' : 'Add Alarm';
  alarmIdInput.value = alarm ? alarm.id : '';
  alarmTimeInput.value = alarm ? alarm.time : '07:00';

  // Reset and set active weekdays
  weekdayButtons.forEach(btn => {
    const day = parseInt(btn.dataset.day || '0', 10);
    if (alarm && alarm.days.includes(day)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  mainView.classList.add('hidden');
  editView.classList.remove('hidden');
};

/**
 * Renders the list of alarms.
 */
const renderAlarms = () => {
  alarmList.innerHTML = '';
  if (alarmsState.length === 0) {
    alarmList.innerHTML = '<li>No alarms set.</li>';
    return;
  }

  const sorted = sortAlarms(alarmsState);

  sorted.forEach(alarm => {
    const listItem = document.createElement('li');
    listItem.className = 'alarm-item';
    listItem.dataset.id = alarm.id;

    const daysText = alarm.days.length > 0
      ? alarm.days.map(d => weekdayMap[d]).join(', ')
      : 'Once';

    listItem.innerHTML = `
      <div class="alarm-item-left">
        <div class="alarm-time">${alarm.time}</div>
        <div class="alarm-days">${daysText}</div>
      </div>
      <div class="alarm-item-right">
        <button class="delete-btn" data-id="${alarm.id}">🗑️</button>
        <label class="switch">
          <input type="checkbox" class="toggle-switch" data-id="${alarm.id}" ${alarm.enabled ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
    `;

    alarmList.appendChild(listItem);
  });
};

/**
 * Applies the selected theme.
 * @param {string} theme - The theme to apply ('dark' or 'light').
 */
const applyTheme = (theme: string) => {
    document.body.classList.toggle('light-theme', theme === 'light');
    const themeInput = document.querySelector(`#theme-selector input[value=${theme}]`) as HTMLInputElement;
    if (themeInput) {
        themeInput.checked = true;
    }
};

/**
 * Loads alarms from storage, updates state, and re-renders the list.
 */
const refreshAlarms = async () => {
    alarmsState = await loadAlarmsFromStorage();
    renderAlarms();
};

/**
 * Loads the theme from storage and applies it.
 */
const loadTheme = async () => {
    const theme = await loadThemeFromStorage();
    applyTheme(theme);
};

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
  localizeHtml();
  refreshAlarms();
  loadTheme();
  showMainView();
});

addAlarmBtn.addEventListener('click', () => {
  showEditView(null);
});

settingsBtn.addEventListener('click', () => {
    showSettingsView();
});

backToMainBtn.addEventListener('click', () => {
    showMainView();
});

themeSelector.addEventListener('change', async (e) => {
    const newTheme = (e.target as HTMLInputElement).value;
    applyTheme(newTheme);
    await saveTheme(newTheme);
});

cancelBtn.addEventListener('click', () => {
  showMainView();
});

weekdayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
  });
});

saveBtn.addEventListener('click', async () => {
  const id = alarmIdInput.value || `alarm_${Date.now()}`;
  const time = alarmTimeInput.value;
  const days = Array.from(weekdayButtons)
    .filter(btn => btn.classList.contains('active'))
    .map(btn => parseInt(btn.dataset.day || '0', 10));

  const newAlarm: Alarm = { id, time, days, enabled: true };

  alarmsState = addOrUpdateAlarm(alarmsState, newAlarm);

  await saveAlarms(alarmsState);
  await syncChromeAlarms();
  renderAlarms();
  showMainView();
});

alarmList.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const alarmItem = target.closest('.alarm-item');
  const id = (alarmItem as HTMLLIElement)?.dataset.id;

  if (!id) return;

  // Handle toggle switch
  if (target.classList.contains('toggle-switch')) {
    const input = target as HTMLInputElement;
    const alarm = alarmsState.find(a => a.id === id);
    if (alarm) {
      alarm.enabled = input.checked;
      await saveAlarms(alarmsState);
      await syncChromeAlarms();
    }
    return;
  }

  // Handle delete button
  if (target.classList.contains('delete-btn')) {
    if (confirm('Are you sure you want to delete this alarm?')) {
        alarmsState = deleteAlarm(alarmsState, id);
        await saveAlarms(alarmsState);
        await syncChromeAlarms();
        renderAlarms();
    }
    return;
  }

  // Handle click on item to edit
  if (alarmItem && !target.classList.contains('slider')) {
      const alarm = alarmsState.find(a => a.id === id);
      if (alarm) {
          showEditView(alarm);
      }
  }
});
