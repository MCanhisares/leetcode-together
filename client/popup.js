document.addEventListener('DOMContentLoaded', function() {
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const usernameInput = document.getElementById('username');
  const roomCodeInput = document.getElementById('roomCode');
  const statusDiv = document.getElementById('status');

  connectBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();
    if (username && roomCode) {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: "connect", roomCode, username});
      });
      statusDiv.textContent = `Connected to ${roomCode} as ${username}`;
    } else {
      statusDiv.textContent = "Please enter both username and room code";
    }
  });

  disconnectBtn.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: "disconnect"});
    });
    statusDiv.textContent = "Disconnected";
  });
});