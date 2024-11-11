/*
 * Author: Marcel Canhisares
 *
 * Released under the GNU AGPLv3 License.
 * Copyright (c) 2024 Marcel Canhisares
 */
document.addEventListener("DOMContentLoaded", function () {
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const usernameInput = document.getElementById("username");
  const roomCodeInput = document.getElementById("roomCode");
  const passwordInput = document.getElementById("password");
  const statusDiv = document.getElementById("status");

  function setStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? "error" : "success";
  }

  connectBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    const roomCode = roomCodeInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !roomCode || !password) {
      setStatus("Please fill in all fields", true);
      return;
    }

    chrome.runtime.sendMessage({
      action: "connect",
      username: username,
      roomCode: roomCode,
      password: password,
    });

    setStatus("Connecting...");
  });

  disconnectBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "disconnect" });
    setStatus("Disconnected");
    passwordInput.value = "";
  });

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "joinError") {
      setStatus(message.message, true);
    } else if (message.type === "joinSuccess") {
      setStatus("Connected successfully!");
    }
  });
});
