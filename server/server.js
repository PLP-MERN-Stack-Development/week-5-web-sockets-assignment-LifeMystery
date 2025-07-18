const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const users = {};
const messages = [];
const typingUsers = {};
const registeredUsers = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a room
  socket.on('join_room', ({ room, username }) => {
    socket.join(room);
    users[socket.id] = { username, room, id: socket.id };

    io.to(room).emit('user_list', getUsersInRoom(room));
    io.to(room).emit('user_joined', { username, id: socket.id, room });

    // 🔔 Send notification
    io.to(room).emit('notification', `${username} has joined ${room}`);
  });

  // General user join (used by connect)
  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.id };
  });

  // Room-scoped messages
  socket.on('send_message', ({ room, message }) => {
    const sender = users[socket.id];
    const msg = {
      id: Date.now(),
      sender: sender?.username || 'Anonymous',
      senderId: socket.id,
      message,
      room,
      timestamp: new Date().toISOString(),
    };

    messages.push(msg);
    if (messages.length > 100) messages.shift();

    io.to(room).emit('receive_message', msg);
  });

  // Typing
  socket.on('typing', ({ isTyping, room }) => {
    const username = users[socket.id]?.username;
    if (!username) return;

    if (isTyping) {
      typingUsers[socket.id] = username;
    } else {
      delete typingUsers[socket.id];
    }

    io.to(room).emit('typing_users', Object.values(typingUsers));
  });

  // Private message
  socket.on('private_message', ({ to, message }) => {
    const sender = users[socket.id];
    const msg = {
      id: Date.now(),
      sender: sender?.username || 'Anonymous',
      senderId: socket.id,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };

    socket.to(to).emit('private_message', msg);
    socket.emit('private_message', msg);

    // 🔔 Notify recipient
    socket.to(to).emit('notification', `New private message from ${msg.sender}`);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) {
      io.to(user.room).emit('user_left', user);
      io.to(user.room).emit('user_list', getUsersInRoom(user.room));
      io.to(user.room).emit('notification', `${user.username} has left the room`);
    }

    delete typingUsers[socket.id];
    delete users[socket.id];
  });
});

function getUsersInRoom(room) {
  return Object.values(users).filter((u) => u.room === room);
}

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };
