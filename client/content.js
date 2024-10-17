// content.js
let socket;
let currentRoom = null;
let username = null;
let isInitialCodeSet = false;
let isConnecting = false;
let editorObserver = null;
let lastCode = '';

// Diff algorithm to find line changes
function findLineDiff(oldCode, newCode) {
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const changes = [];

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      changes.push({ lineNumber: i, content: newLines[i] || '' });
    }
  }

  return changes;
}

function initSocket() {
  if (socket) {
    console.log('Socket already exists, disconnecting...');
    socket.disconnect();
  }

  socket = io('http://localhost:3000', { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('Connected to server');
    isConnecting = false;
    if (currentRoom && username) {
      joinRoom(currentRoom, username);
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    isInitialCodeSet = false;
    isConnecting = false;
  });

  socket.on('initialCode', (code) => {
    console.log('Received initial code:', code);
    updateEditor(code);
    lastCode = code;
    isInitialCodeSet = true;
    console.log('Initial code set');
    attachEditorObserver();
  });

  socket.on('codeUpdate', ({ code, username: updater }) => {
    console.log(`Received code update from ${updater}`);
    if (updater !== username) {
      updateEditor(code);
      lastCode = code;
      console.log(`Code updated by ${updater}`);
    }
  });

  socket.on('userJoined', ({ username: joinedUser, users }) => {
    console.log(`${joinedUser} joined. Current users: ${users.join(', ')}`);
  });

  socket.on('userLeft', ({ username: leftUser, users }) => {
    console.log(`${leftUser} left. Current users: ${users.join(', ')}`);
  });
}

function joinRoom(roomCode, user) {
  console.log(`Attempting to join room ${roomCode} as ${user}`);
  socket.emit('join', { room: roomCode, username: user }, (response) => {
    console.log('Join room response:', response);
    isConnecting = false;
  });
}

function connectToRoom(roomCode, user) {
  if (isConnecting) {
    console.log('Connection already in progress. Please wait.');
    return;
  }

  isConnecting = true;
  username = user;
  currentRoom = roomCode;
  isInitialCodeSet = false;

  if (!socket || !socket.connected) {
    initSocket();
  } else {
    joinRoom(roomCode, user);
  }
}

function disconnectFromRoom() {
  if (socket && currentRoom) {
    socket.emit('leaveRoom', { room: currentRoom, username });
    console.log(`Leaving room ${currentRoom}`);
    currentRoom = null;
    username = null;
    isInitialCodeSet = false;
    detachEditorObserver();
  }
}

function getCodeFromEditor() {
  const editorLines = document.querySelectorAll('.view-line');
  return Array.from(editorLines).map(line => line.textContent).join('\n');
}

function updateEditor(code) {
  console.log('Updating editor with code:', code);
  const editorContainer = document.querySelector('.view-lines');
  if (editorContainer) {
    const changes = findLineDiff(lastCode, code);
    const lineDivs = editorContainer.querySelectorAll('.view-line');

    changes.forEach(change => {
      if (change.lineNumber < lineDivs.length) {
        lineDivs[change.lineNumber].textContent = change.content;
      } else {
        const newLineDiv = document.createElement('div');
        newLineDiv.className = 'view-line';
        newLineDiv.textContent = change.content;
        editorContainer.appendChild(newLineDiv);
      }
    });

    // Remove extra lines if necessary
    while (lineDivs.length > code.split('\n').length) {
      lineDivs[lineDivs.length - 1].remove();
    }

    console.log('Editor updated');

    // Trigger a custom event to simulate code change
    const changeEvent = new CustomEvent('leetCodeEditorChange');
    editorContainer.dispatchEvent(changeEvent);
  } else {
    console.log('Editor container not found for update');
  }
}

function attachEditorObserver() {
  detachEditorObserver();  // Detach any existing observer
  
  const editorContainer = document.querySelector('.view-lines');
  if (editorContainer) {
    editorObserver = new MutationObserver((mutations) => {
      if (isInitialCodeSet) {
        const newCode = getCodeFromEditor();
        if (newCode !== lastCode) {
          console.log('Sending code update:', newCode);
          socket.emit('codeChange', { room: currentRoom, code: newCode, username });
          lastCode = newCode;
        }
      }
    });

    editorObserver.observe(editorContainer, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log('Editor observer attached');
  } else {
    console.log('Editor container not found');
  }
}

function detachEditorObserver() {
  if (editorObserver) {
    editorObserver.disconnect();
    editorObserver = null;
    console.log('Editor observer detached');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  if (request.action === "connect") {
    connectToRoom(request.roomCode, request.username);
  } else if (request.action === "disconnect") {
    disconnectFromRoom();
  }
});

console.log('Content script loaded');