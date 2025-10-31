// offscreen.js - Handles audio playback with single audio instance

// Create a single audio instance and reuse it
const audio = new Audio(chrome.runtime.getURL('sound.ogg'));
audio.preload = 'auto';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'play-sound') {
    // Reset the audio to the beginning before playing
    audio.currentTime = 0;

    audio.play().then(() => {
      console.log(`Sound played at ${message.timestamp}`);
    }).catch(error => {
      console.error('Error playing audio:', error);
    });
  }
});