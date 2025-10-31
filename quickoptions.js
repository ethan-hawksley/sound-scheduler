console.log('loaded quick options');

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
