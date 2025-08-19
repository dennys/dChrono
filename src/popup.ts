import { TimepickerUI } from 'timepicker-ui';
import 'timepicker-ui/main.css';
import 'timepicker-ui/index.css';
import 'timepicker-ui/theme-dark.css';
import type { Alarm } from './lib/types';
import { loadAlarms as loadAlarmsFromStorage, saveAlarms, saveTheme, loadTheme as loadThemeFromStorage } from './lib/storage';
import { sortAlarms, addOrUpdateAlarm, deleteAlarm, syncChromeAlarms, toggleAlarmEnabled } from './lib/alarms';
import { convert12hTo24h, convert24hTo12h } from './lib/time';

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
const alarmNameInput = document.getElementById('alarm-name') as HTMLInputElement;
const alarmDescriptionInput = document.getElementById('alarm-description') as HTMLInputElement;
const weekdayButtons = document.querySelectorAll('.weekday') as NodeListOf<HTMLButtonElement>;
const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
const backToMainBtn = document.getElementById('back-to-main-btn') as HTMLButtonElement;
const themeSelector = document.getElementById('theme-selector') as HTMLDivElement;

// --- App State ---
let alarmsState: Alarm[] = [];
const weekdayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let timepicker: TimepickerUI | null = null;


const createTimepicker = () => {
    if (timepicker) {
        timepicker.destroy();
    }
    const isLightTheme = document.body.classList.contains('light-theme');
    const timepickerTheme = isLightTheme ? 'basic' : 'dark';

    timepicker = new TimepickerUI(alarmTimeInput, {
        clockType: '12h',
        theme: timepickerTheme,
    });
    timepicker.create();
}

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

const allViews = [mainView, editView, settingsView];

const showView = (viewToShow: HTMLElement) => {
  allViews.forEach(view => {
    if (view === viewToShow) {
      view.classList.remove('hidden');
    } else {
      view.classList.add('hidden');
    }
  });
};


/**
 * Shows the main view and hides the edit view.
 */
const showMainView = () => {
  showView(mainView);
};

/**
 * Shows the settings view.
 */
const showSettingsView = () => {
  showView(settingsView);
}

/**
 * Shows the edit view and hides the main view.
 * @param {Alarm | null} alarm - The alarm to edit, or null to add a new one.
 */
const showEditView = (alarm: Alarm | null) => {
  editViewTitle.textContent = alarm ? chrome.i18n.getMessage('editAlarm') : chrome.i18n.getMessage('addAlarm');
  alarmIdInput.value = alarm ? alarm.id : '';
  alarmTimeInput.value = alarm ? convert24hTo12h(alarm.time) : '7:00 AM';
  alarmNameInput.value = alarm ? alarm.name || '' : '';
  alarmDescriptionInput.value = alarm ? alarm.description || '' : '';

  // Reset and set active weekdays
  weekdayButtons.forEach(btn => {
    const day = parseInt(btn.dataset.day || '0', 10);
    if (alarm && alarm.days.includes(day)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  showView(editView);
};

/**
 * Renders the list of alarms.
 */
const renderAlarms = () => {
  // Clear existing alarms
  while (alarmList.firstChild) {
    alarmList.removeChild(alarmList.firstChild);
  }

  if (alarmsState.length === 0) {
    const noAlarmsItem = document.createElement('li');
    noAlarmsItem.textContent = 'No alarms set.';
    alarmList.appendChild(noAlarmsItem);
    return;
  }

  const sorted = sortAlarms(alarmsState);

  sorted.forEach(alarm => {
    const listItem = document.createElement('li');
    listItem.className = 'alarm-item';
    listItem.dataset.id = alarm.id;

    const alarmItemLeft = document.createElement('div');
    alarmItemLeft.className = 'alarm-item-left';

    const alarmTime = document.createElement('div');
    alarmTime.className = 'alarm-time';
    alarmTime.textContent = alarm.time;

    const alarmName = document.createElement('div');
    alarmName.className = 'alarm-name';
    alarmName.textContent = alarm.name || '';

    const alarmDescription = document.createElement('div');
    alarmDescription.className = 'alarm-description';
    alarmDescription.textContent = alarm.description || '';

    const daysText = alarm.days.length > 0
      ? alarm.days.map(d => chrome.i18n.getMessage(weekdayMap[d])).join(', ')
      : chrome.i18n.getMessage('once');
    const alarmDays = document.createElement('div');
    alarmDays.className = 'alarm-days';
    alarmDays.textContent = daysText;

    alarmItemLeft.appendChild(alarmTime);
    alarmItemLeft.appendChild(alarmName);
    alarmItemLeft.appendChild(alarmDescription);
    alarmItemLeft.appendChild(alarmDays);

    const alarmItemRight = document.createElement('div');
    alarmItemRight.className = 'alarm-item-right';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn icon-btn';
    deleteBtn.dataset.id = alarm.id;
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';

    const toggleSwitch = document.createElement('input');
    toggleSwitch.type = 'checkbox';
    toggleSwitch.className = 'toggle-switch';
    toggleSwitch.dataset.id = alarm.id;
    toggleSwitch.checked = alarm.enabled;

    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'slider';

    switchLabel.appendChild(toggleSwitch);
    switchLabel.appendChild(sliderSpan);

    alarmItemRight.appendChild(deleteBtn);
    alarmItemRight.appendChild(switchLabel);

    listItem.appendChild(alarmItemLeft);
    listItem.appendChild(alarmItemRight);

    alarmList.appendChild(listItem);
  });
};

/**
 * Applies the selected theme.
 * @param {string} theme - The theme to apply ('dark' or 'light').
 */
const applyTheme = (theme: string) => {
    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        document.body.classList.toggle('light-theme', systemTheme === 'light');
    } else {
        document.body.classList.toggle('light-theme', theme === 'light');
    }
    const themeInput = document.querySelector(`#theme-selector input[value=${theme}]`) as HTMLInputElement;
    if (themeInput) {
        themeInput.checked = true;
    }
};

/**
 * Loads alarms from storage, updates state, and re-renders the list.
 */
export const refreshAlarms = async () => {
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

window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', async () => {
    const theme = await loadThemeFromStorage();
    if (theme === 'system') {
        applyTheme('system');
        createTimepicker();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
  localizeHtml();
  await refreshAlarms();
  await loadTheme();
  showMainView();
  createTimepicker();
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
    createTimepicker();
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
  const timeValue = alarmTimeInput.value;
  if (!timeValue) {
    alert(chrome.i18n.getMessage('timeIsRequired'));
    return;
  }

  const id = alarmIdInput.value || `alarm_${Date.now()}`;
  const time = convert12hTo24h(timeValue);
  const days = Array.from(weekdayButtons)
    .filter(btn => btn.classList.contains('active'))
    .map(btn => parseInt(btn.dataset.day || '0', 10));
  const name = alarmNameInput.value;
  const description = alarmDescriptionInput.value;

  const newAlarm: Alarm = { id, time, days, enabled: true, name, description };

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
    if (confirm(chrome.i18n.getMessage('deleteConfirm'))) {
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
