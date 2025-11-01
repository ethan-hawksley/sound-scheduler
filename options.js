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
    {active: true, interval: 1, times: []},
    (items) => {
      $('active').checked = items.active;
      $('interval').value = items.interval;
      renderTimes(items.times);
    }
  );
}

function attachEventListeners() {
  $('active').addEventListener('change', () => {
    chrome.storage.sync.set(
      {active: $('active').checked},
      () => {
        console.log('Active changed');
      }
    );
  });
  $('interval').addEventListener('change', () => {
    chrome.storage.sync.set(
      {interval: $('interval').value},
      () => {
        console.log('Interval changed');
      }
    );
  });
  $('add-time').addEventListener('click', () => {
    addTime();
  });
}

const days = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

function renderTimes(times) {
  const week1Times = $('week-1-times');
  const week2Times = $('week-2-times');

  const frag1 = document.createDocumentFragment();
  const frag2 = document.createDocumentFragment();

  for (const time of times) {
    const row = createTimeRow(time);
    if (time.week === 1) {
      frag1.append(row)
    } else {
      frag2.append(row)
    }
  }
  week1Times.replaceChildren(frag1);
  week2Times.replaceChildren(frag2);
}

function createTimeRow(time) {
  const timeRow = document.createElement('div');
  const timeButton = document.createElement('button');
  timeButton.classList.add('time-button');
  const day = days[time.day];
  const hour = time.hour.toString().padStart(2, '0');
  const minute = time.minute.toString().padStart(2, '0');
  timeButton.textContent = `${day}, ${hour}:${minute}`;

  timeButton.addEventListener('click', () => {
    removeTime(time);
  });

  const timeCheckbox = document.createElement('input');
  timeCheckbox.type = 'checkbox';
  timeCheckbox.checked = time.enabled;

  timeCheckbox.addEventListener('change', () => {
    toggleTime(time);
  })

  timeRow.append(timeButton, timeCheckbox)
  return timeRow;
}

function addTime() {
  const week = Number(prompt('Enter week: 1 or 2'));
  const day = Number(prompt('Enter day of week: 1-Monday 2-Tuesday 3-Wednesday 4-Thursday 5-Friday'));
  const hour = Number(prompt('Enter hour: 0-23'));
  const minute = Number(prompt('Enter minute: 0-59'));
  const isInvalidInput = Number.isNaN(week) || Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute);
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
  chrome.storage.sync.get(
    {times: []},
    ({times}) => {
      times.push(time);
      chrome.storage.sync.set(
        {times},
        () => {
          renderTimes(times);
          console.log('Times changed');
        }
      );
    }
  );
}

function removeTime({week, day, hour, minute}) {
  console.log(week, day, hour, minute);
  chrome.storage.sync.get(
    {times: []},
    ({times}) => {
      const itemIndex = times.findIndex((item) => {
        return item.week === week && item.day === day && item.hour === hour && item.minute === minute
      });
      if (itemIndex === -1) {
        alert('Item could not be found')
        return;
      }
      times.splice(itemIndex, 1);
      chrome.storage.sync.set(
        {times},
        () => {
          console.log(times);
          renderTimes(times);
          console.log('Times changed');
        }
      );
    }
  );
}

function toggleTime({week, day, hour, minute}) {
  chrome.storage.sync.get(
    {times: []},
    ({times}) => {
      const itemIndex = times.findIndex((item) => {
        return item.week === week && item.day === day && item.hour === hour && item.minute === minute
      });
      if (itemIndex === -1) {
        alert('Item could not be found')
        return;
      }
      const item = times[itemIndex]
      item.enabled = !item.enabled;
      times[itemIndex] = item;
      chrome.storage.sync.set(
        {times},
        () => {
          renderTimes(times);
          console.log('Times changed');
        }
      );
    }
  );
}