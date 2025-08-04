document.addEventListener('DOMContentLoaded', () => {
  const alarmNameInput = document.getElementById('alarm-name') as HTMLInputElement;
  const alarmTimeInput = document.getElementById('alarm-time') as HTMLInputElement;
  const setAlarmButton = document.getElementById('set-alarm') as HTMLButtonElement;
  const alarmList = document.getElementById('alarm-list') as HTMLUListElement;
  const statusMessage = document.getElementById('status-message') as HTMLDivElement;

  const renderAlarms = () => {
    chrome.alarms.getAll((alarms) => {
      alarmList.innerHTML = '';
      if (alarms.length === 0) {
        alarmList.innerHTML = '<li>No alarms set.</li>';
        return;
      }

      alarms.forEach((alarm) => {
        const listItem = document.createElement('li');
        const alarmTime = new Date(alarm.scheduledTime).toLocaleString();
        listItem.textContent = `${alarm.name} - ${alarmTime}`;

        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => {
          chrome.alarms.clear(alarm.name, () => {
            renderAlarms();
          });
        });

        listItem.appendChild(cancelButton);
        alarmList.appendChild(listItem);
      });
    });
  };

  setAlarmButton.addEventListener('click', () => {
    const alarmName = alarmNameInput.value;
    const alarmTime = new Date(alarmTimeInput.value).getTime();

    if (!alarmName) {
      alert('Please provide a name for the alarm.');
      return;
    }

    if (isNaN(alarmTime)) {
      alert('Please provide a valid time for the alarm.');
      return;
    }

    if (alarmTime < Date.now()) {
      alert('Please provide a time in the future.');
      return;
    }

    chrome.alarms.create(alarmName, {
      when: alarmTime,
    });

    renderAlarms();
    alarmNameInput.value = '';
    alarmTimeInput.value = '';

    statusMessage.textContent = 'Alarm set!';
    setTimeout(() => {
      statusMessage.textContent = '';
    }, 3000);
  });

  renderAlarms();
});
