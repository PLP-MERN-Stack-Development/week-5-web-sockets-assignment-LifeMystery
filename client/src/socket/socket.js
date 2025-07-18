import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

// Socket.io connection URL
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Create socket instance
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Login API
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

// Custom hook for using socket.io
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [lastMessage, setLastMessage] = useState(null);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);

  const connect = (username) => {
    socket.connect();
    socket.emit('user_join', username);
  };

  const disconnect = () => {
    socket.disconnect();
  };

  const sendMessage = (message) => {
    socket.emit('send_message', { message });
  };

  const sendPrivateMessage = (to, message) => {
    socket.emit('private_message', { to, message });
  };

  const setTyping = (isTyping) => {
    socket.emit('typing', isTyping);
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
          message: `${user.username} joined the chat`,
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
          message: `${user.username} left the chat`,
          timestamp: new Date().toISOString(),
        },
      ]);
    });

    socket.on('typing_users', (users) => setTypingUsers(users));

    socket.on('user_error', (errMsg) => {
      setError(errMsg);
      console.error('User error:', errMsg);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message');
      socket.off('private_message');
      socket.off('user_list');
      socket.off('user_joined');
      socket.off('user_left');
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
    error,
    connect,
    disconnect,
    sendMessage,
    sendPrivateMessage,
    setTyping,
  };
};

export default socket;
