import React, { useState } from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Wallet, 
  Landmark, 
  Plus, 
  PlusCircle,
  Bell,
  Search,
  User,
  Settings,
  X,
  LogOut
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Login from './pages/Login';
import './App.css';
import { useApp } from './context/AppContext';

const Sidebar = () => {
  const { logout, currentUser } = useApp();
  return (
    <aside className="sidebar">
      <div className="logo-container">
        <div className="logo-icon">A</div>
        <h1 className="outfit">Sovereign</h1>
      </div>

      <nav className="nav-menu">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Painel Principal</span>
        </NavLink>
        <NavLink to="/accounts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Landmark size={20} />
          <span>Contas & Ativos</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-link logout-btn" onClick={logout}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
        <div className="user-profile">
          <div className="avatar">{currentUser ? currentUser[0] : 'A'}</div>
          <div className="user-info">
            <p className="user-name">{currentUser || 'ABDALA'}</p>
            <p className="user-role">Gestor Soberano</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = ({ onAddRecord }) => {
  const { searchQuery, setSearchQuery } = useApp();
  
  return (
    <header className="top-bar">
      <div className="search-container">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar patrimônio, ativos ou dados..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <div className="actions">
        <button className="icon-btn">
          <Bell size={20} />
          <div className="badge"></div>
        </button>
        <button className="icon-btn">
          <Settings size={20} />
        </button>
        <button className="add-record-btn" onClick={onAddRecord}>
          <Plus size={18} />
          <span>Adicionar Lançamento</span>
        </button>
      </div>
    </header>
  );
};

const AddRecordModal = ({ isOpen, onClose }) => {
  const { accounts, addTransaction, currentUser } = useApp();
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    accountName: '',
    targetAccount: '',
    category: 'Geral',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.accountName) return;
    
    addTransaction(formData);
    onClose();
    setFormData({ 
      type: 'expense', 
      amount: '', 
      accountName: '', 
      targetAccount: '', 
      category: 'Geral', 
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="modal-overlay">
      <div className="premium-card modal-content">
        <div className="modal-header">
          <h2>Adicionar Registro</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="type-toggle">
            <button 
              type="button"
              className={`toggle-btn income ${formData.type === 'income' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, type: 'income'})}
            >
              Entrada
            </button>
            <button 
              type="button"
              className={`toggle-btn expense ${formData.type === 'expense' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, type: 'expense'})}
            >
              Saída
            </button>
            <button 
              type="button"
              className={`toggle-btn transfer ${formData.type === 'transfer' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, type: 'transfer'})}
            >
              Transferência
            </button>
          </div>

          <div className="form-group">
            <label>Valor (R$)</label>
            <input 
              type="number" 
              step="0.01"
              placeholder="0,00" 
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
            {((formData.type === 'income' && formData.accountName === 'ABDALA') || 
               (formData.type === 'transfer' && formData.targetAccount === 'ABDALA')) && 
               formData.amount > 0 && currentUser !== 'jef' && (
              <p className="helper-text tithe-preview">
                Dedução de 10% (R${(formData.amount * 0.1).toFixed(2)}) será destinada à conta DOAÇÃO.
              </p>
            )}
          </div>

          <div className="form-group">
            <label>{formData.type === 'transfer' ? 'Conta de Origem' : 'Conta'}</label>
            <select 
              value={formData.accountName} 
              onChange={(e) => setFormData({...formData, accountName: e.target.value})}
              required
            >
              <option value="">Selecione uma conta</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.name}>{acc.name} (R${acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</option>
              ))}
            </select>
          </div>

          {formData.type === 'transfer' && (
            <div className="form-group">
              <label>Conta de Destino</label>
              <select 
                value={formData.targetAccount} 
                onChange={(e) => setFormData({...formData, targetAccount: e.target.value})}
                required
              >
                <option value="">Selecione o destino</option>
                {accounts.filter(acc => acc.name !== formData.accountName).map(acc => (
                  <option key={acc.id} value={acc.name}>{acc.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Categoria</label>
            <select 
              value={formData.category} 
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            >
              <option value="Geral">Geral</option>
              <option value="Alimentação">Alimentação</option>
              <option value="Moradia">Moradia</option>
              <option value="Transporte">Transporte</option>
              <option value="Lazer">Lazer</option>
              <option value="Negócios">Negócios</option>
              <option value="Investimentos">Investimentos</option>
              <option value="Transferência">Transferência</option>
            </select>
          </div>

          <div className="form-group">
            <label>Data</label>
            <input 
              type="date" 
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Descrição</label>
            <input 
              type="text" 
              placeholder="Ex: Compra de ativos ou serviço" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={accounts.length === 0}>
            {accounts.length === 0 ? "Adicione uma conta primeiro" : "Salvar Registro"}
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const { isAuthenticated } = useApp();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="layout">
      <Sidebar />
      <div className="content">
        <Header onAddRecord={() => setIsRecordModalOpen(true)} />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts" element={<Accounts />} />
          </Routes>
        </main>
      </div>
      
      <AddRecordModal 
        isOpen={isRecordModalOpen} 
        onClose={() => setIsRecordModalOpen(false)} 
      />
    </div>
  );
};

export default App;
