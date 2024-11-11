/*
 * Author: Marcel Canhisares
 * 
 * Released under the GNU AGPLv3 License
 * Copyright (c) 2024 Marcel Canhisares
 */

let socket;
let currentRoom = null;
let username = null;
let isLocalChange = false;

function initSocket() {
  if (socket) {
    socket.disconnect();
  }

  socket = io("http://localhost:3000", {
    transports: ["websocket"],
    autoConnect: false,
  });

  socket.on('connect', () => {
    console.log('[CONTENT] Connected to server');
  });

  socket.on('joinError', ({ message }) => {
    console.log('[CONTENT] Join error:', message);
    chrome.runtime.sendMessage({ 
      type: 'joinError',
      message: message 
    });
  });

  socket.on('joinSuccess', () => {
    console.log('[CONTENT] Joined successfully');
    chrome.runtime.sendMessage({ 
      type: 'joinSuccess' 
    });
  });

  socket.on("disconnect", () => {
    console.log("[CONTENT] Disconnected from server");
    currentRoom = null;
    username = null;
  });

  socket.on("initialCode", (code) => {
    console.log("[CONTENT] Received initial code");
    sendToPage({
      action: "setInitialCode",
      code: code,
    });
  });

  socket.on("codeUpdate", ({ code, username: updater }) => {
    console.log(`[CONTENT] Received code update from ${updater}`);
    if (updater !== username) {
      sendToPage({
        action: "updateCode",
        code: code,
      });
    }
  });

  socket.on("userJoined", ({ username: joinedUser, users }) => {
    console.log(`[CONTENT] ${joinedUser} joined. Users: ${users.join(", ")}`);
  });

  socket.on("userLeft", ({ username: leftUser, users }) => {
    console.log(`[CONTENT] ${leftUser} left. Users: ${users.join(", ")}`);
  });
}

function injectScript(file_path) {
  var script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", file_path);
  document.documentElement.appendChild(script);
}

injectScript(chrome.runtime.getURL("monaco-proxy.js"));

window.addEventListener("message", function (event) {
  if (event.source != window) return;
  if (event.data.type && event.data.type === "FROM_PAGE") {
    if (event.data.action === "codeChange" && socket && socket.connected) {
      isLocalChange = true;
      socket.emit("codeChange", {
        room: currentRoom,
        code: event.data.code,
        username,
      });
      setTimeout(() => {
        isLocalChange = false;
      }, 0);
    }
  }
});

function sendToPage(message) {
  if (!isLocalChange) {
    window.postMessage({ type: "FROM_CONTENT_SCRIPT", ...message }, "*");
  }
}

function joinRoom(roomCode, user, password) {
  if (!socket) {
    initSocket();
  }

  if (!socket.connected) {
    socket.connect();
  }

  currentRoom = roomCode;
  username = user;

  // Join room with password
  socket.emit('join', { 
    room: roomCode, 
    username: user, 
    password: password,
  });
}

function leaveRoom() {
  if (socket && socket.connected && currentRoom) {
    socket.emit("leaveRoom", { room: currentRoom, username });
    currentRoom = null;
    username = null;
    socket.disconnect();
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[CONTENT] Received message from extension:", request);
  if (request.action === "connect") {
    joinRoom(request.roomCode, request.username, request.password);
  } else if (request.action === "disconnect") {
    leaveRoom();
  }
});

console.log("[CONTENT] Content script loaded");
