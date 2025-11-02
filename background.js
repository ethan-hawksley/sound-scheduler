console.log('background.js loaded');

let timeoutId = null;
const CHECK_INTERVAL = 1;

async function getStoredConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { active: true, times: [], currentWeek: 1, lastOperation: null },
      resolve
    );
  });
}

async function createOffscreenDocument() {
  try {
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen.html')],
    });

    if (existingContexts.length > 0) {
      console.log('Offscreen document already exists');
      return true;
    }

    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play chime sound at regular intervals',
    });

    console.log('Offscreen document created');
    return true;
  } catch (error) {
    console.warn('Error creating offscreen document:', error);
    return false;
  }
}

async function ensureOffscreenDocument() {
  // try to ensure it exists; return true if exists/created
  const ok = await createOffscreenDocument();
  if (ok) return true;

  // small backoff and retry once
  await new Promise((r) => setTimeout(r, 500));
  return await createOffscreenDocument();
}

async function scheduleNextMinuteInterval() {
  // Clear any existing timeout
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  const now = new Date();
  const minutes = now.getMinutes();

  // ALWAYS schedule the NEXT interval
  let targetMinutes =
    Math.floor(minutes / CHECK_INTERVAL) * CHECK_INTERVAL + CHECK_INTERVAL;

  const target = new Date(now);
  target.setMinutes(targetMinutes);
  target.setSeconds(0);
  target.setMilliseconds(0);

  let msUntilTarget = target.getTime() - now.getTime();

  // If target rolled over an hour/day, ensure positive
  if (msUntilTarget <= 0) {
    target.setMinutes(target.getMinutes() + CHECK_INTERVAL);
    msUntilTarget = target.getTime() - now.getTime();
  }

  console.log(
    `Next chime in ${Math.round(msUntilTarget / 1000)} seconds at ${target.toLocaleTimeString()}`
  );

  timeoutId = setTimeout(async () => {
    await gatherConfigAndRunActivity();
    scheduleNextMinuteInterval(); // schedule next using possibly-updated interval
  }, msUntilTarget);
}

async function gatherConfigAndRunActivity() {
  const { active, times, currentWeek, lastOperation } = await getStoredConfig();
  runActivity(active, times, currentWeek, lastOperation);
}

function runActivity(active, times, currentWeek, lastOperation) {
  if (!active) {
    console.log('Not active');
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    chrome.action.setBadgeText({ text: '❌' });
    return;
  }
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();

  let lastOpDate;
  if (!lastOperation) {
    lastOpDate = new Date(0);
    console.log('No lastOperation found, using epoch');
  } else if (typeof lastOperation === 'string') {
    lastOpDate = new Date(lastOperation);
    if (isNaN(lastOpDate.getTime())) {
      console.warn('Invalid lastOperation string from storage:', lastOperation);
      lastOpDate = new Date(0);
    }
  } else {
    console.warn('Invalid lastOperation type from storage:', lastOperation);
    lastOpDate = new Date(0);
  }

  const timeSpan = Math.abs(now - lastOpDate);
  console.log(timeSpan);

  const WEEK_DURATION = 7 * 24 * 60 * 60 * 1000;
  const isDifferentWeek =
    timeSpan > WEEK_DURATION || lastOpDate.getDay() > now.getDay();
  if (isDifferentWeek) {
    if (currentWeek === 1) {
      currentWeek = 2;
    } else {
      currentWeek = 1;
    }
    chrome.storage.sync.set({ currentWeek: currentWeek }, () => {
      console.log('Current Week changed');
    });
  }

  chrome.storage.sync.set({ lastOperation: new Date().toISOString() }, () => {
    console.log('Last operation updated');
  });

  const matchesTime = (time) => {
    return (
      time.week === currentWeek &&
      time.day === day &&
      time.hour === hour &&
      time.minute === minute &&
      time.enabled
    );
  };
  if (!times.some(matchesTime)) {
    console.log('Current time does not match', times);
    chrome.action.setBadgeBackgroundColor({ color: '#00FF00' });
    chrome.action.setBadgeText({ text: '✔' });
    return;
  }

  chrome.action.setBadgeBackgroundColor({ color: '#0051ff' });
  chrome.action.setBadgeText({ text: '►' });

  playSound();
}

async function trySendMessageWithOffscreen(message) {
  // Ensure offscreen exists then send; retry once on failure
  const ensured = await ensureOffscreenDocument();
  if (!ensured) {
    throw new Error('Unable to ensure offscreen document');
  }

  try {
    return await chrome.runtime.sendMessage(message);
  } catch (err) {
    console.warn(
      'SendMessage failed, retrying after recreating offscreen:',
      err
    );
    const recreated = await createOffscreenDocument();
    if (!recreated) throw err;
    return await chrome.runtime.sendMessage(message);
  }
}

async function playSound() {
  const now = new Date();
  try {
    await trySendMessageWithOffscreen({
      type: 'play-sound',
      timestamp: `${now.toLocaleTimeString()}.${now.getMilliseconds()}`,
    });

    console.log(
      `🔔 CHIME at exactly ${now.toLocaleTimeString()}.${String(now.getMilliseconds()).padStart(3, '0')}`
    );
  } catch (error) {
    console.error('Error playing sound:', error);
  }
}

// Initialize
(async () => {
  await ensureOffscreenDocument();
  scheduleNextMinuteInterval();
})();

// Keep alive mechanism
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'keepAlive') {
    console.log('Keep alive ping');

    try {
      await trySendMessageWithOffscreen({ type: 'ping' });
    } catch (error) {
      console.log(
        'Offscreen document not available for ping, attempted recreate'
      );
    }
  }
});

// Handle extension updates or reloads
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated');
  await ensureOffscreenDocument();
  scheduleNextMinuteInterval();
});
