import React, { useState } from 'react';
import { login } from './services/api';

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const { token, user } = await login(email, senha);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      // Se senhaTemporaria, força troca de senha obrigatória
      if (user.senhaTemporaria) {
        window.location.href = '/trocar-senha-obrigatoria';
        return;
      }
      if (onLogin) onLogin(user);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 340, margin: '80px auto', padding: 24, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
      <h2 style={{ textAlign: 'center', color: '#1976d2' }}>DeskHelp - Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="Senha"
            required
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        <button
          type="submit"
          style={{ width: '100%', padding: 10, fontSize: 16, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        {erro && <div style={{ color: 'red', marginTop: 10, textAlign: 'center' }}>{erro}</div>}
      </form>
    </div>
  );
}

export default LoginPage;
