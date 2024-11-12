/*
 * Author: Marcel Canhisares
 *
 * Released under the GNU AGPLv3 License
 * Copyright (c) 2024 Marcel Canhisares
 */
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import { 
  Room, 
  ServerToClientEvents, 
  ClientToServerEvents,
  InterServerEvents,
  SocketData
} from '@shared/types';

const app = express();
app.use(cors());
const server = createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map<string, Room>();
const userSockets = new Map<string, string>();

function clearRooms(): void {
  rooms.clear();
  userSockets.clear();
  console.log('All rooms cleared');
}

function hashPassword(password: string): string {
  console.log({ type: typeof password, password });
  return crypto.createHash('sha256').update(password).digest('hex');
}

function leaveRoom(socket: Socket, room: string, username: string): void {
  if (rooms.has(room)) {
    const roomData = rooms.get(room)!;
    roomData.users.delete(username);
    userSockets.delete(`${username}-${room}`);
    
    if (roomData.users.size === 0) {
      rooms.delete(room);
      console.log(`Room ${room} deleted`);
    } else {
      io.to(room).emit('userLeft', {
        username,
        users: Array.from(roomData.users)
      });
    }
  }
  socket.leave(room);
  console.log(`${username} left room ${room}`);
}

// Clear rooms on server start
clearRooms();

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('join', ({ room, username, initialCode, password }) => {
    console.log(`Attempt to join: ${username} to room ${room}`);
    
    // Check if room exists and validate password
    if (rooms.has(room)) {
      if (rooms.get(room)!.password !== hashPassword(password)) {
        socket.emit('joinError', { message: 'Incorrect password' });
        return;
      }
    }

    // Remove user from previous room if exists
    for (const [key, value] of userSockets.entries()) {
      if (value === socket.id) {
        const [oldUsername, oldRoom] = key.split('-');
        leaveRoom(socket, oldRoom, oldUsername);
        break;
      }
    }

    // Create new room or join existing
    socket.join(room);
    if (!rooms.has(room)) {
      rooms.set(room, {
        users: new Set(),
        code: initialCode || '',
        password: hashPassword(password)
      });
    }

    const roomData = rooms.get(room)!;
    roomData.users.add(username);
    userSockets.set(`${username}-${room}`, socket.id);

    // First emit join success
    socket.emit('joinSuccess');
    
    // Then send initial code in a separate event
    socket.emit('initialCode', roomData.code);

    // Notify all users in the room about the new user
    io.to(room).emit('userJoined', {
      username,
      users: Array.from(roomData.users)
    });

    console.log(`${username} joined room ${room}`);
  });

  socket.on('codeChange', ({ room, code, username }) => {
    console.log(`Received code change from ${username} in room ${room}`);
    if (rooms.has(room)) {
      const roomData = rooms.get(room)!;
      roomData.code = code;
      io.to(room).emit('codeUpdate', { code, username });
      console.log(`Code updated in room ${room} by ${username}`);
    } else {
      console.log(`Room ${room} not found for code update`);
    }
  });

  socket.on('leaveRoom', ({ room, username }) => {
    leaveRoom(socket, room, username);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    // Find and remove the disconnected user from all rooms
    for (const [key, socketId] of userSockets.entries()) {
      if (socketId === socket.id) {
        const [username, room] = key.split('-');
        leaveRoom(socket, room, username);
        break;
      }
    }
  });
});

// Add an endpoint to manually clear rooms (for testing/admin purposes)
app.get('/clear-rooms', (_req, res) => {
  clearRooms();
  res.send('All rooms cleared');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Rooms cleared on server start');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Server is shutting down...');
  clearRooms();
  process.exit(0);
});