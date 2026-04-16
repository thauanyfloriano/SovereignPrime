import React, { useState } from 'react';
import { 
  Plus, 
  History, 
  ArrowRight,
  Landmark,
  Building2,
  Wallet,
  MoreHorizontal,
  ChevronRight,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  Download
} from 'lucide-react';
import './Accounts.css';
import { useApp } from '../context/AppContext';

const StatementModal = ({ account, transactions, onClose, onOpenConfirm }) => {
  const accountTransactions = [...transactions]
    .filter(tx => tx.accountName === account.name)
    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort oldest first for balance calc

  // Calculate progressive balances
  let runningBalance = 0;
  const transactionsWithBalance = accountTransactions.map(tx => {
    const amt = parseFloat(tx.amount);
    runningBalance += tx.type === 'income' ? amt : -amt;
    return { ...tx, currentBalance: runningBalance };
  }).reverse(); // Reverse back to newest first for display

  const downloadCSV = () => {
    const headers = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor', 'Saldo'];
    const rows = transactionsWithBalance.map(tx => [
      new Date(tx.date).toLocaleDateString('pt-BR'),
      tx.description || '-',
      tx.category || '-',
      tx.type === 'income' ? 'Entrada' : 'Saida',
      tx.amount,
      tx.currentBalance.toFixed(2)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extrato_${account.name.toLowerCase()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay">
      <div className="premium-card modal-content statement-modal">
        <div className="modal-header">
          <div>
            <h2>Extrato: {account.name}</h2>
            <p className="subtitle">{account.bank}</p>
          </div>
          <div className="header-actions">
            <button className="export-btn" onClick={downloadCSV}>
              <Download size={16} /> Exportar CSV
            </button>
            <button onClick={onClose} className="close-btn"><X size={20} /></button>
          </div>
        </div>
        
        <div className="statement-summary">
          <p className="label">SALDO TOTAL DA CONTA</p>
          <h3 className="outfit">R${account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
        </div>

        <div className="statement-list">
          <p className="section-label">Detalhamento de Lançamentos</p>
          {transactionsWithBalance.length > 0 ? (
            transactionsWithBalance.map(tx => (
              <div key={tx.id} className="statement-item">
                <div className={`tx-indicator ${tx.type}`}>
                   {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </div>
                <div className="tx-details">
                  <div className="tx-row-top">
                    <p className="description">{tx.description || 'Lançamento sem descrição'}</p>
                    <span className="tx-tag">{tx.category || 'Geral'}</span>
                  </div>
                  <p className="date">{new Date(tx.date).toLocaleDateString('pt-BR')} • Saldo após: R${tx.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="tx-right">
                  <div className={`tx-amount outfit ${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}R${parseFloat(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <button className="delete-btn-sm" onClick={() => onOpenConfirm(tx.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Nenhuma movimentação encontrada para esta conta.</div>
          )}
        </div>
      </div>
    </div>
  );
};

const CreditCard = ({ type, brand, lastFour, balance, limit, color }) => (
  <div className={`credit-card ${color}`}>
    <div className="card-header">
      <div className="card-type">
        <p className="type-label">{type}</p>
        <p className="brand-name">{brand}</p>
      </div>
      <div className="chip"></div>
    </div>
    
    <div className="card-number">
      <span>• • • •</span>
      <span>• • • •</span>
      <span>• • • •</span>
      <span>{lastFour}</span>
    </div>
    
    <div className="card-details">
      <div className="detail">
        <p className="label">BALANCE</p>
        <p className="value outfit">R${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="detail">
        <p className="label">LIMIT</p>
        <p className="value light outfit">R${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
    </div>
  </div>
);

const InstitutionItem = ({ name, bank, balance, onClick }) => (
  <div className="institution-row" onClick={onClick} style={{ cursor: 'pointer' }}>
    <div className="inst-info">
      <div className="inst-icon">
        <Landmark size={20} />
      </div>
      <div className="inst-text">
        <h3>{name}</h3>
        <p>{bank} ••••0000</p>
      </div>
    </div>
    
    <div className="inst-actions">
      <div className="inst-balance">
        <p className="label">AVAILABLE</p>
        <p className="value outfit">R${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="btn-group">
        <button className="icon-circle">
          <History size={16} />
        </button>
        <button className="icon-circle">
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  </div>
);

const Accounts = () => {
  const { accounts, addAccount, totalLiquidity, transactions, deleteTransaction } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingExtrato, setViewingExtrato] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [newAccount, setNewAccount] = useState({ name: '', bank: '', balance: '' });

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.bank) return;
    
    addAccount({ 
      ...newAccount, 
      balance: parseFloat(newAccount.balance) || 0 
    });
    setNewAccount({ name: '', bank: '', balance: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="accounts-page">
      <header className="accounts-header">
        <div className="header-text">
          <h1 className="outfit">Accounts & Cards</h1>
          <p>A curated overview of your architectural liquidity. Manage connected institutions and credit facilities from one unified gallery.</p>
        </div>
        <div className="mini-hero-card">
           <div className="hero-content">
             <p className="label">TOTAL LIQUIDITY</p>
             <h2 className="value outfit">R${totalLiquidity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
             <p className="trend positive">Current balance</p>
           </div>
           <div className="hero-icon">
              <Wallet size={32} />
           </div>
        </div>
      </header>

      <section className="cards-section">
        <div className="section-header">
          <h2>Active Credit Lines</h2>
          <button className="add-btn">
             <Plus size={16} />
             <span>New Facility</span>
          </button>
        </div>
        
        <div className="cards-grid">
          <CreditCard 
            type="INFINITE PRIVILEGE"
            brand="Sovereign Prime"
            lastFour="0000"
            balance={0.00}
            limit={0}
            color="navy"
          />
          <CreditCard 
            type="BUSINESS BLACK"
            brand="Founders Corporate"
            lastFour="0000"
            balance={0.00}
            limit={0}
            color="dark"
          />
          <button className="add-card-placeholder">
            <div className="plus-box">
              <Plus size={24} />
            </div>
            <p>Link New Card</p>
          </button>
        </div>
      </section>

      <section className="institutions-section">
        <div className="section-header">
          <h2>Connected Institutions</h2>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
             <Plus size={16} />
             <span>Nova Conta Corrente</span>
          </button>
        </div>
        
        <div className="premium-card institutions-list">
          {accounts.length > 0 ? (
            accounts.map((acc) => (
              <InstitutionItem 
                key={acc.id}
                name={acc.name}
                bank={acc.bank}
                balance={acc.balance}
                onClick={() => setViewingExtrato(acc)}
              />
            ))
          ) : (
            <div className="empty-state">No connected institutions.</div>
          )}
        </div>
      </section>

      {viewingExtrato && (
        <StatementModal 
          account={viewingExtrato} 
          transactions={transactions} 
          onClose={() => setViewingExtrato(null)} 
          onOpenConfirm={(id) => setConfirmDelete({ isOpen: true, id })}
        />
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="premium-card modal-content">
            <div className="modal-header">
              <h2>Adicionar Conta Corrente</h2>
              <button onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddAccount} className="modal-form">
              <div className="form-group">
                <label>Nome da Conta</label>
                <input 
                  type="text" 
                  placeholder="Ex: Conta Principal" 
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Banco</label>
                <input 
                  type="text" 
                  placeholder="Ex: Sovereign Trust" 
                  value={newAccount.bank}
                  onChange={(e) => setNewAccount({...newAccount, bank: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Saldo Inicial</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({...newAccount, balance: e.target.value})}
                />
              </div>
              <button type="submit" className="submit-btn">Salvar Conta</button>
            </form>
          </div>
        </div>
      )}

      {confirmDelete.isOpen && (
        <div className="modal-overlay">
          <div className="premium-card modal-content confirm-modal">
            <div className="modal-header">
              <h2>Confirmar Exclusão</h2>
              <button onClick={() => setConfirmDelete({ isOpen: false, id: null })}><X size={20} /></button>
            </div>
            <p className="confirm-text">Você tem certeza que deseja excluir este lançamento? Esta ação irá reverter o saldo da conta associada.</p>
            <div className="confirm-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setConfirmDelete({ isOpen: false, id: null })}
              >
                Cancelar
              </button>
              <button 
                className="delete-action-btn" 
                onClick={() => {
                  deleteTransaction(confirmDelete.id);
                  setConfirmDelete({ isOpen: false, id: null });
                }}
              >
                Excluir Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Accounts;
