/*
 * Author: Marcel Canhisares
 * 
 * Released under the GNU AGPLv3 License
 * Copyright (c) 2024 Marcel Canhisares
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "connect" || request.action === "disconnect") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, request);
    });
  }
});