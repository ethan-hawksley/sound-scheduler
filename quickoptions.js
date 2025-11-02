console.log('quickoptions.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('quickoptions.js DOM loaded');
});

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('stop-sound').addEventListener('click', async () => {
  try {
    const now = new Date();
    await chrome.runtime.sendMessage({
      type: 'stop-sound',
      timestamp: `${now.toLocaleTimeString()}.${now.getMilliseconds()}`,
    });
    console.log('Sound stopped');
  } catch (e) {
    console.warn('Error stopping sound', e);
  }
});
