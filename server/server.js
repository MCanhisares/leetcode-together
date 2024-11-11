/*
 * Author: Marcel Canhisares
 *
 * Released under the GNU AGPLv3 License
 * Copyright (c) 2024 Marcel Canhisares
 */

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const crypto = require("crypto");



const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let rooms = new Map();
let userSockets = new Map();

function clearRooms() {
  rooms.clear();
  userSockets.clear();
  console.log("All rooms cleared");
}

function hashPassword(password) {
  console.log({ type: typeof password, password });
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Clear rooms on server start
clearRooms();

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", ({ room, username, initialCode, password }) => {
    console.log(`Attempt to join: ${username} to room ${room}`);

    // Check if room exists and validate password
    if (rooms.has(room)) {
      if (rooms.get(room).password !== hashPassword(password)) {
        socket.emit("joinError", { message: "Incorrect password" });
        return;
      }
    }

    // Remove user from previous room if exists
    for (const [key, value] of userSockets.entries()) {
      if (value === socket.id) {
        const [oldUsername, oldRoom] = key.split("-");
        leaveRoom(socket, oldRoom, oldUsername);
        break;
      }
    }

    // Create new room or join existing
    socket.join(room);
    if (!rooms.has(room)) {
      rooms.set(room, {
        users: new Set(),
        code: initialCode || "",
        password: hashPassword(password),
      });
    }

    rooms.get(room).users.add(username);
    userSockets.set(`${username}-${room}`, socket.id);

    // First emit join success
    socket.emit('joinSuccess');
    
    // Then send initial code in a separate event
    socket.emit('initialCode', rooms.get(room).code);

    // Notify all users in the room about the new user
    io.to(room).emit("userJoined", {
      username,
      users: Array.from(rooms.get(room).users),
    });

    console.log(`${username} joined room ${room}`);
  });

  socket.on("codeChange", ({ room, code, username }) => {
    console.log(`Received code change from ${username} in room ${room}`);
    if (rooms.has(room)) {
      rooms.get(room).code = code;
      // Broadcast the update to all users in the room, including the sender
      io.to(room).emit("codeUpdate", { code, username });
      console.log(`Code updated in room ${room} by ${username}`);
    } else {
      console.log(`Room ${room} not found for code update`);
    }
  });

  socket.on("leaveRoom", ({ room, username }) => {
    leaveRoom(socket, room, username);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // Find and remove the disconnected user from all rooms
    for (const [key, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        const [username, room] = key.split("-");
        leaveRoom(socket, room, username);
        break;
      }
    }
  });
});

function leaveRoom(socket, room, username) {
  if (rooms.has(room)) {
    rooms.get(room).users.delete(username);
    userSockets.delete(`${username}-${room}`);
    if (rooms.get(room).users.size === 0) {
      rooms.delete(room);
      console.log(`Room ${room} deleted`);
    } else {
      io.to(room).emit("userLeft", {
        username,
        users: Array.from(rooms.get(room).users),
      });
    }
  }
  socket.leave(room);
  console.log(`${username} left room ${room}`);
}

// Add an endpoint to manually clear rooms (for testing/admin purposes)
app.get("/clear-rooms", (req, res) => {
  clearRooms();
  res.send("All rooms cleared");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Rooms cleared on server start");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Server is shutting down...");
  clearRooms();
  process.exit(0);
});
