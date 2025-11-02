console.log('options.js loaded');

function $(id) {
  return document.getElementById(id);
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('options.js DOM loaded');
  restoreOptions();

  attachEventListeners();
});

function restoreOptions() {
  chrome.storage.sync.get(
    { active: true, times: [], currentWeek: 1 },
    ({ active, times, currentWeek }) => {
      $('active').checked = active;
      renderTimes(times);
      $('week').value = currentWeek.toString();
    }
  );
}

function attachEventListeners() {
  $('active').addEventListener('change', () => {
    chrome.storage.sync.set({ active: $('active').checked }, () => {
      console.log('Active changed');
    });
  });
  $('add-time').addEventListener('click', () => {
    addTime();
  });
  $('week').addEventListener('change', () => {
    chrome.storage.sync.set({ currentWeek: Number($('week').value) }, () => {
      console.log('Current Week changed');
    });
  });
}

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function renderTimes(times) {
  const week1Times = $('week-1-times');
  const week2Times = $('week-2-times');

  const frag1 = document.createDocumentFragment();
  const frag2 = document.createDocumentFragment();

  for (const time of times) {
    const row = createTimeRow(time);
    if (time.week === 1) {
      frag1.append(row);
    } else {
      frag2.append(row);
    }
  }
  week1Times.replaceChildren(frag1);
  week2Times.replaceChildren(frag2);

  const weekIds = new Set();
  for (const time of times) {
    weekIds.add(time.week);
  }
  const weeksDiv = document.getElementById('weeks');
  weeksDiv.replaceChildren();
  for (const weekId of weekIds) {
    const table = createWeekTable(weekId, times);
    weeksDiv.append(table);
  }
}

function createTimeRow(time) {
  const week = time.week;
  const day = days[time.day];
  const hour = time.hour.toString().padStart(2, '0');
  const minute = time.minute.toString().padStart(2, '0');

  const timeRow = document.createElement('div');

  const timeButton = document.createElement('button');
  timeButton.classList.add('time-button');
  timeButton.textContent = `Week ${week} - ${day}, ${hour}:${minute}`;
  timeButton.addEventListener('click', () => {
    removeTime(time);
  });

  const timeCheckbox = document.createElement('input');
  timeCheckbox.type = 'checkbox';
  timeCheckbox.checked = time.enabled;
  timeCheckbox.addEventListener('change', () => {
    toggleTime(time);
  });

  timeRow.append(timeButton, timeCheckbox);
  return timeRow;
}

function addTime() {
  const week = Number(prompt('Enter week: 1 or 2'));
  const day = Number(
    prompt(
      'Enter day of week: 1-Monday 2-Tuesday 3-Wednesday 4-Thursday 5-Friday'
    )
  );
  const hour = Number(prompt('Enter hour: 0-23'));
  const minute = Number(prompt('Enter minute: 0-59'));
  const isInvalidInput =
    Number.isNaN(week) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute);
  if (isInvalidInput) {
    alert('Invalid input');
    return;
  }
  const time = {
    week,
    day,
    hour,
    minute,
    enabled: true,
  };
  chrome.storage.sync.get({ times: [] }, ({ times }) => {
    times.push(time);
    chrome.storage.sync.set({ times }, () => {
      renderTimes(times);
      console.log('Times changed');
    });
  });
}

function removeTime({ week, day, hour, minute }) {
  console.log(week, day, hour, minute);
  chrome.storage.sync.get({ times: [] }, ({ times }) => {
    const itemIndex = times.findIndex((item) => {
      return (
        item.week === week &&
        item.day === day &&
        item.hour === hour &&
        item.minute === minute
      );
    });
    if (itemIndex === -1) {
      alert('Item could not be found');
      return;
    }
    times.splice(itemIndex, 1);
    chrome.storage.sync.set({ times }, () => {
      console.log(times);
      renderTimes(times);
      console.log('Times changed');
    });
  });
}

function toggleTime({ week, day, hour, minute }) {
  chrome.storage.sync.get({ times: [] }, ({ times }) => {
    const itemIndex = times.findIndex((item) => {
      return (
        item.week === week &&
        item.day === day &&
        item.hour === hour &&
        item.minute === minute
      );
    });
    if (itemIndex === -1) {
      alert('Item could not be found');
      return;
    }
    const item = times[itemIndex];
    item.enabled = !item.enabled;
    times[itemIndex] = item;
    chrome.storage.sync.set({ times }, () => {
      renderTimes(times);
      console.log('Times changed');
    });
  });
}

function createWeekTable(weekId, times) {
  const uniqueHourMinutePairs = Array.from(
    new Set(
      times.map((time) =>
        JSON.stringify({ hour: time.hour, minute: time.minute })
      )
    )
  ).map((stringifiedPair) => JSON.parse(stringifiedPair));

  uniqueHourMinutePairs.sort((a, b) => {
    return a.hour - b.hour || a.minute - b.minute;
  });

  const table = document.createElement('table');

  const caption = document.createElement('caption');
  caption.textContent = `Week ${weekId}`;
  table.append(caption);

  const thead = document.createElement('thead');
  const tableHeadRow = document.createElement('tr');
  const timeStampHead = document.createElement('th');
  timeStampHead.scope = 'col';
  timeStampHead.textContent = 'Time';
  tableHeadRow.append(timeStampHead);
  for (const day of days) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = day;
    tableHeadRow.append(th);
  }
  thead.append(tableHeadRow);
  table.append(thead);

  const tbody = document.createElement('tbody');
  for (const hourMinutePair of uniqueHourMinutePairs) {
    const tr = document.createElement('tr');

    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = `${hourMinutePair.hour}:${hourMinutePair.minute.toString().padStart(2, '0')}`;
    tr.append(th);

    for (let dayNumber = 0; dayNumber < days.length; dayNumber++) {
      const td = document.createElement('td');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';

      const existingTime = times.find(
        (time) =>
          time.week === weekId &&
          time.day === dayNumber &&
          time.hour === hourMinutePair.hour &&
          time.minute === hourMinutePair.minute
      );

      checkbox.checked = existingTime ? existingTime.enabled : false;

      checkbox.addEventListener('change', () => {
        setTime(
          weekId,
          dayNumber,
          hourMinutePair.hour,
          hourMinutePair.minute,
          checkbox.checked
        );
      });
      td.append(checkbox);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);

  return table;
}

function setTime(week, day, hour, minute, enabled) {
  const time = {
    week,
    day,
    hour,
    minute,
  };

  chrome.storage.sync.get({ times: [] }, ({ times }) => {
    const itemIndex = times.findIndex(
      (item) =>
        item.week === week &&
        item.day === day &&
        item.hour === hour &&
        item.minute === minute
    );

    if (enabled) {
      if (itemIndex === -1) {
        times.push({ ...time, enabled: true });
      } else {
        times[itemIndex].enabled = true;
      }
    } else {
      if (itemIndex !== -1) {
        times.splice(itemIndex, 1);
      }
    }

    chrome.storage.sync.set({ times }, () => {
      renderTimes(times);
      console.log('Times changed');
    });
  });
}

/*
  Add week - auto increments
  Then a table showing all the days of the week is rendered
  Add time - input minutes and seconds
  rows of checkboxes, tick the times you want

  styling later
 */
