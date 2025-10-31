console.log('quickoptions.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('quickoptions.js DOM loaded');
});

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
