/*
 * Author: Marcel Canhisares
 *
 * Released under the GNU AGPLv3 License.
 * Copyright (c) 2024 Marcel Canhisares
 */
document.addEventListener('DOMContentLoaded', function() {
  const connectBtn = document.getElementById('connectBtn');
  const disconnectBtn = document.getElementById('disconnectBtn');
  const usernameInput = document.getElementById('username');
  const roomCodeInput = document.getElementById('roomCode');
  const passwordInput = document.getElementById('password');
  const statusDiv = document.getElementById('status');

  // Load saved state when popup opens
  chrome.storage.local.get(['connectionState'], function(result) {
    if (result.connectionState) {
      const { username, roomCode, isConnected } = result.connectionState;
      if (isConnected) {
        usernameInput.value = username;
        roomCodeInput.value = roomCode;
        setConnectedState();
      }
    }
  });

  function setStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'error' : 'success';
  }

  function setConnectedState() {
    connectBtn.disabled = true;
    usernameInput.disabled = true;
    roomCodeInput.disabled = true;
    passwordInput.disabled = true;
    disconnectBtn.disabled = false;
    setStatus('Connected to room');
  }

  function setDisconnectedState() {
    connectBtn.disabled = false;
    usernameInput.disabled = false;
    roomCodeInput.disabled = false;
    passwordInput.disabled = false;
    disconnectBtn.disabled = true;
    passwordInput.value = '';
    setStatus('Disconnected');
  }

  connectBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !roomCode || !password) {
      setStatus('Please fill in all fields', true);
      return;
    }

    chrome.runtime.sendMessage({
      action: "connect",
      username: username,
      roomCode: roomCode,
      password: password
    });

    setStatus('Connecting...');
  });

  disconnectBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "disconnect" });
    chrome.storage.local.remove('connectionState', function() {
      setDisconnectedState();
    });
  });

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'joinError') {
      setStatus(message.message, true);
    } else if (message.type === 'joinSuccess') {
      // Save connection state
      chrome.storage.local.set({
        connectionState: {
          username: usernameInput.value.trim(),
          roomCode: roomCodeInput.value.trim(),
          isConnected: true
        }
      });
      setConnectedState();
    }
  });

  // Set initial button states
  disconnectBtn.disabled = true;
});