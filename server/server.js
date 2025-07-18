// server.js - Main server file for Socket.io chat application

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory stores
const users = {}; // socket.id -> { username, online, lastSeen }
const messages = [];
const typingUsers = {};
const registeredUsers = {}; // username -> { username }

// --- Socket.io connection logic ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('user_join', (username) => {
    if (!username || Object.values(users).some(u => u.username === username)) {
      socket.emit('user_error', 'Username taken or invalid');
      return;
    }

    const user = {
      id: socket.id,
      username,
      online: true,
      lastSeen: null,
    };

    users[socket.id] = user;
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', user);
    console.log(`${username} joined the chat`);
  });

  socket.on('send_message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      timestamp: new Date().toISOString(),
    };

    messages.push(message);
    if (messages.length > 100) messages.shift();
    io.emit('receive_message', message);
  });

  socket.on('typing', (isTyping) => {
    const username = users[socket.id]?.username;
    if (!username) return;

    if (isTyping) {
      typingUsers[socket.id] = username;
    } else {
      delete typingUsers[socket.id];
    }

    io.emit('typing_users', Object.values(typingUsers));
  });

  socket.on('private_message', ({ to, message }) => {
    const messageData = {
      id: Date.now(),
      sender: users[socket.id]?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };

    socket.to(to).emit('private_message', messageData);
    socket.emit('private_message', messageData);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      user.online = false;
      user.lastSeen = new Date().toISOString();
      io.emit('user_left', user);
      io.emit('user_list', Object.values(users));
      console.log(`${user.username} left the chat`);
    }

    delete typingUsers[socket.id];
  });
});

// --- REST API Routes ---
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

app.get('/api/users', (req, res) => {
  res.json(Object.values(users));
});

app.post('/api/login', (req, res) => {
  const { username } = req.body;

  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  if (Object.values(users).find(u => u.username === username && u.online)) {
    return res.status(409).json({ error: 'Username is already taken' });
  }

  registeredUsers[username] = { username };
  res.json({ success: true, username });
});

app.get('/', (req, res) => {
  res.send('Socket.io Chat Server is running');
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
