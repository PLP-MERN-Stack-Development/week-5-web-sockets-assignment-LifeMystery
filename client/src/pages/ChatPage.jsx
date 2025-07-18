import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../socket/socket';

const ChatPage = () => {
  const {
    connect,
    socket,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    messages,
    users,
    typingUsers,
    notifications
  } = useSocket();

  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [input, setInput] = useState('');
  const [joined, setJoined] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    if (!document.hasFocus()) {
      setUnread((prev) => prev + 1);
    } else {
      setUnread(0);
    }
  }, [messages]);

  // Reset unread count when window focused
  useEffect(() => {
    const resetUnread = () => setUnread(0);
    window.addEventListener('focus', resetUnread);
    return () => window.removeEventListener('focus', resetUnread);
  }, []);

  const handleJoin = () => {
    if (!username || !room) return alert('Username and room are required');

    connect(username);
    socket.emit('join_room', { username, room });
    setJoined(true);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage({ room, message: input });
    setInput('');
    setTyping({ isTyping: false, room });
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    setTyping({ isTyping: true, room });
  };

  const handlePrivate = (toId) => {
    const msg = prompt('Private message:');
    if (msg) sendPrivateMessage(toId, msg);
  };

  const highlightMentions = (text) => {
    return text.split(' ').map((word, i) =>
      word.startsWith('@') && word.includes(username)
        ? <strong key={i} style={{ color: 'orange' }}>{word} </strong>
        : <span key={i}>{word} </span>
    );
  };

  const handleReact = (msgId) => {
    socket.emit('react_message', { room, msgId, emoji: '👍' });
  };

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <div>
          <h2>Join Room</h2>
          <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ marginRight: 10 }} />
          <input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
          <button onClick={handleJoin} style={{ marginLeft: 10 }}>Join</button>
        </div>
      ) : (
        <div>
          <h2>
            Room: {room} {unread > 0 && <span style={{ color: 'red' }}>({unread} new)</span>}
          </h2>

          {notifications.map((n) => (
            <p key={n.id} style={{ background: '#e0ffe0', padding: 5 }}>🔔 {n.message}</p>
          ))}

          <div style={{ border: '1px solid #ccc', padding: 10, height: 300, overflowY: 'auto' }}>
            {messages
              .filter((m) => m.room === room || m.isPrivate || m.system)
              .map((m) => (
                <div key={m.id}>
                  <span>
                    <strong>{m.system ? 'System' : m.sender}:</strong>{' '}
                    {m.system
                      ? m.message
                      : highlightMentions(m.message)}
                    {m.reaction && <span style={{ marginLeft: 10 }}>{m.reaction}</span>}
                    {!m.system && !m.isPrivate && (
                      <button onClick={() => handleReact(m.id)} style={{ marginLeft: 10 }}>👍</button>
                    )}
                  </span>
                </div>
              ))}
            <div ref={messagesEndRef} />
          </div>

          <input
            value={input}
            onChange={handleTyping}
            onBlur={() => setTyping({ isTyping: false, room })}
            placeholder="Type..."
            style={{ width: '70%', marginTop: 10 }}
          />
          <button onClick={handleSend} style={{ marginLeft: 10 }}>Send</button>

          {typingUsers.length > 0 && <p>{typingUsers.join(', ')} typing...</p>}

          <h4>Users in Room</h4>
          <ul>
            {users.map((u) => (
              <li key={u.id}>
                {u.username}
                {u.id !== socket.id && (
                  <button onClick={() => handlePrivate(u.id)} style={{ marginLeft: 10 }}>
                    Private
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
