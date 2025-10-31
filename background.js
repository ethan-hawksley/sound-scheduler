// background.js - Fixed version with proper time calculation

let timeoutId = null;
let offscreenDocumentCreated = false;
const activationInterval = 1; // 1 minute for testing, change to 5 for production

async function createOffscreenDocument() {
  // Check if we already created it
  if (offscreenDocumentCreated) {
    return;
  }

  try {
    // Try to create the offscreen document
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play chime sound at regular intervals'
    });
    offscreenDocumentCreated = true;
    console.log('Offscreen document created');
  } catch (error) {
    // Document likely already exists, which is fine
    if (error.message.includes('single offscreen document')) {
      offscreenDocumentCreated = true;
      console.log('Offscreen document already exists');
    } else {
      console.error('Error creating offscreen document:', error);
    }
  }
}

function scheduleNextChime() {
  // Clear any existing timeout
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  // Calculate next interval - ALWAYS get the NEXT interval, never the current one
  let targetMinutes = Math.floor(minutes / activationInterval) * activationInterval + activationInterval;

  // Create target time
  const target = new Date(now);
  target.setMinutes(targetMinutes);
  target.setSeconds(0);
  target.setMilliseconds(0);

  // Handle hour rollover
  if (targetMinutes >= 60) {
    target.setHours(target.getHours() + 1);
    target.setMinutes(targetMinutes % 60);
  }

  const msUntilTarget = target.getTime() - now.getTime();

  // Safety check - ensure we're scheduling for the future
  if (msUntilTarget <= 0) {
    console.error(`Invalid scheduling: ${msUntilTarget}ms until target`);
    // Schedule for next interval
    setTimeout(() => scheduleNextChime(), 1000);
    return;
  }

  console.log(`Next chime in ${Math.round(msUntilTarget/1000)} seconds at ${target.toLocaleTimeString()}`);

  timeoutId = setTimeout(() => {
    playSound();
    scheduleNextChime(); // Schedule the next one
  }, msUntilTarget);
}

async function playSound() {
  const now = new Date();

  try {
    // Send message to offscreen document to play sound
    await chrome.runtime.sendMessage({
      type: 'play-sound',
      timestamp: `${now.toLocaleTimeString()}.${now.getMilliseconds()}`
    });

    console.log(`🔔 CHIME at exactly ${now.toLocaleTimeString()}.${String(now.getMilliseconds()).padStart(3, '0')}`);
  } catch (error) {
    console.error('Error playing sound:', error);
    // Try to recreate offscreen document if needed
    offscreenDocumentCreated = false;
    await createOffscreenDocument();
  }
}

// Initialize
(async () => {
  await createOffscreenDocument();
  scheduleNextChime();
})();

// Keep alive mechanism (Chrome might suspend the service worker)
chrome.alarms.create('keepAlive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // This just keeps the service worker alive
    console.log('Keep alive ping');
  }
});

// Handle extension updates or reloads
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated');
  offscreenDocumentCreated = false;
  await createOffscreenDocument();
  scheduleNextChime();
});