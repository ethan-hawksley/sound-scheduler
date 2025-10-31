// Keep the offscreen document alive with periodic heartbeat
setInterval(() => {
  console.log('Offscreen document heartbeat');
}, 10000); // Every 10 seconds

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'play-sound') {
    console.log(`Playing sound at ${message.timestamp}`);

    // Create and play audio
    const audio = new Audio('sound.ogg');
    audio.play()
      .then(() => {
        console.log('Sound played successfully');
        sendResponse({success: true});
      })
      .catch((error) => {
        console.error('Error playing sound:', error);
        sendResponse({success: false, error: error.message});
      });

    // Return true to indicate we'll send a response asynchronously
    return true;
  }

  // Handle ping messages to keep connection alive
  if (message.type === 'ping') {
    sendResponse({status: 'alive'});
    return true;
  }
});

console.log('Offscreen document loaded and ready');

