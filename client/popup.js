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
      chrome.runtime.sendMessage({
        action: "connect",
        username: username,
        roomCode: roomCode
      });
      statusDiv.textContent = `Connecting to ${roomCode} as ${username}...`;
    } else {
      statusDiv.textContent = "Please enter both username and room code";
    }
  });

  disconnectBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "disconnect" });
    statusDiv.textContent = "Disconnected";
  });
});