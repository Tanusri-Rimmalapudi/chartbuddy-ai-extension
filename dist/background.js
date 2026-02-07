
// ChartBuddy Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChartBuddy Extension Installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'LOG_ACTION') {
    console.log('Action Logged:', request.payload);
    sendResponse({ status: 'logged' });
  }
  return true;
});
