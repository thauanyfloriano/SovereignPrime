import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import './Login.css';

const Login = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate a small delay for premium feel
    setTimeout(() => {
      const success = login(username, password);
      if (!success) {
        setError('Acesso negado. Credenciais inválidas.');
      }
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-visual-side">
        <div className="visual-content">
          <div className="logo-section">
             <div className="logo-symbol">G</div>
             <h1 className="outfit">Sovereign Gallery</h1>
          </div>
          <p>Architecting Financial Precision</p>
          <div className="visual-footer">
            <p>© 2026 Deepmind Financial Systems. All rights reserved.</p>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="form-wrapper">
          <div className="form-header">
            <h2 className="outfit">Portal de Acesso</h2>
            <p>Insira suas credenciais para gerenciar seus ativos.</p>
          </div>

          <form onSubmit={handleSubmit} className="premium-form">
            <div className="input-field">
              <label>Usuário</label>
              <div className="input-wrapper">
                <User className="input-icon" size={18} />
                <input 
                  type="text" 
                  placeholder="Seu usuário" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-field">
              <label>Senha</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="show-pass"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-submit-btn" disabled={isLoading}>
              {isLoading ? "Verificando..." : "Entrar no Sistema"}
            </button>

            <div className="form-footer">
              <div className="security-tag">
                <ShieldCheck size={14} />
                <span>Criptografia de 256 bits ativa</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
