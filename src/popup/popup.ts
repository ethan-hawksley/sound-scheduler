import browser from "webextension-polyfill";

console.log("Popup script loaded");

// Example of using the browser API
browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
    console.log("Active tab:", tabs[0]);
});