chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "connect" || request.action === "disconnect") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, request);
    });
  }
});