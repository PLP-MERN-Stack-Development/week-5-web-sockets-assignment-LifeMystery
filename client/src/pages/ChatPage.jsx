import { useState } from 'react';
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
    typingUsers
  } = useSocket();

  const [username, setUsername] = useState('');
  const [room, setRoom] = useState('');
  const [input, setInput] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    if (!username || !room) {
      alert('Username and room are required');
      return;
    }

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

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <div>
          <h2>Join Room</h2>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginRight: 10 }}
          />
          <input
            placeholder="Room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={handleJoin} style={{ marginLeft: 10 }}>
            Join
          </button>
        </div>
      ) : (
        <div>
          <h2>Room: {room}</h2>

          <div style={{ border: '1px solid #ccc', padding: 10, height: 300, overflowY: 'auto' }}>
            {messages
              .filter((m) => m.room === room || m.isPrivate)
              .map((m) => (
                <div key={m.id}>
                  <strong>{m.sender}:</strong> {m.message}{' '}
                  {m.isPrivate && <em>(private)</em>}
                </div>
              ))}
          </div>

          <input
            value={input}
            onChange={handleTyping}
            onBlur={() => setTyping({ isTyping: false, room })}
            placeholder="Type..."
            style={{ width: '70%', marginTop: 10 }}
          />
          <button onClick={handleSend} style={{ marginLeft: 10 }}>Send</button>

          {typingUsers.length > 0 && (
            <p>{typingUsers.join(', ')} typing...</p>
          )}

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
