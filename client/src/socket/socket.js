import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export const login = async (username) => {
  const res = await fetch(`${SOCKET_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Login failed');
  }

  return await res.json();
};

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);

  const connect = (username) => {
    socket.connect();
    socket.emit('user_join', username);
  };

  const sendMessage = ({ room, message }) => {
    socket.emit('send_message', { room, message });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  const setTyping = ({ isTyping, room }) => {
    socket.emit('typing', { isTyping, room });
  };

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('receive_message', (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    });

    socket.on('private_message', (message) => {
      setLastMessage(message);
      setMessages((prev) => [...prev, message]);
    });

    socket.on('user_list', (userList) => setUsers(userList));

    socket.on('user_joined', (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} joined`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on('user_left', (user) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          system: true,
          message: `${user.username} left`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    // ✅ Handle notification events
    socket.on('notification', (msg) => {
      setNotifications((prev) => [...prev, { id: Date.now(), message: msg }]);
    });

    socket.on('typing_users', (usersTyping) => setTypingUsers(usersTyping));
    socket.on('user_error', (errMsg) => setError(errMsg));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
      socket.off('private_message');
      socket.off('user_list');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('notification');
      socket.off('typing_users');
      socket.off('user_error');
    };
  }, []);

  return {
    socket,
    isConnected,
    lastMessage,
    messages,
    users,
    typingUsers,
    notifications,
    error,
    connect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
  };
};
