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
    {active: true, interval: 1},
    (items) => {
      $('active').checked = items.active;
      $('interval').value = items.interval;
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
}