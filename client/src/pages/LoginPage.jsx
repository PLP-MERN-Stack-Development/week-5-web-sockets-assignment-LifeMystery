// client/src/pages/LoginPage.jsx
import { useState } from 'react';
import { login, useSocket } from '../socket/socket';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const { connect, error } = useSocket();

  const handleLogin = async () => {
    try {
      await login(username);     // Calls POST /api/login
      connect(username);         // Connects socket and emits user_join
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login to Chat</h2>
      <input
        type="text"
        placeholder="Enter a username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={handleLogin} style={{ marginLeft: 10 }}>Join</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default LoginPage;
