// Keep the offscreen document alive with periodic heartbeat
setInterval(() => {
  console.log('Offscreen document heartbeat');
}, 10000); // Every 10 seconds

const audioStreams = new Set();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'play-sound') {
    console.log(`Playing sound at ${message.timestamp}`);
    playAudio(sendResponse);
    return true;
  }

  if (message.type === 'stop-sound') {
    console.log('Stopping sound');
    stopAudio();
    return true;
  }

  // Handle ping messages to keep connection alive
  if (message.type === 'ping') {
    sendResponse({ status: 'alive' });
    return true;
  }
});

function playAudio(sendResponse) {
  const audio = new Audio('sound.ogg');
  audioStreams.add(audio);
  audio
    .play()
    .then(() => {
      console.log('Sound played successfully');
      sendResponse({ success: true });
      audio.addEventListener('ended', () => {
        chrome.action.setBadgeBackgroundColor({ color: '#00ff00' });
        chrome.action.setBadgeText({ text: '✔' });
        audioStreams.delete(audio);
      });
    })
    .catch((error) => {
      console.error('Error playing sound:', error);
      sendResponse({ success: false, error: error.message });
    });
}

function stopAudio() {
  audioStreams.forEach((audio) => {
    audio.pause();
    audioStreams.delete(audio);
  });
}

console.log('Offscreen document loaded and ready');
