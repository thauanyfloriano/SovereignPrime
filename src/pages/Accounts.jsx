import React, { useState } from 'react';
import { 
  Plus, 
  History, 
  Building2,
  Wallet,
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
          <div className="summary-item">
            <p className="label">SALDO ATUAL DA CONTA</p>
            <h3 className="outfit">R${account.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        <div className="statement-container">
          <p className="section-label">Detalhamento de Lançamentos</p>
          {transactionsWithBalance.length > 0 ? (
            <div className="table-wrapper">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th className="text-right">Valor</th>
                    <th className="text-right">Saldo</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsWithBalance.map(tx => (
                    <tr key={tx.id} className="ledger-row">
                      <td className="date-cell">{new Date(tx.date).toLocaleDateString('pt-BR')}</td>
                      <td className="desc-cell">
                        <div className="desc-content">
                          <span className={`indicator-dot ${tx.type}`}></span>
                          {tx.description || 'Lançamento sem descrição'}
                        </div>
                      </td>
                      <td className="cat-cell">
                        <span className="cat-tag">{tx.category || 'Geral'}</span>
                      </td>
                      <td className={`amount-cell text-right ${tx.type}`}>
                        {tx.type === 'income' ? '+' : '-'} R$ {parseFloat(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="balance-cell text-right outfit">
                        R$ {tx.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="actions-cell text-center">
                        <button className="delete-tx-btn" onClick={() => onOpenConfirm(tx.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">Nenhuma movimentação encontrada para esta conta.</div>
          )}
        </div>
      </div>
    </div>
  );
};


const AccountCard = ({ name, bank, balance, onClick, onDelete }) => (
  <div className="account-premium-card" onClick={onClick}>
    <div className="card-top">
      <div className="bank-info">
        <div className="bank-logo">
          <Building2 size={18} />
        </div>
        <div>
          <p className="bank-name">{bank}</p>
          <h3 className="account-title">{name}</h3>
        </div>
      </div>
      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
        <button className="action-dot-btn" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>

    <div className="card-mid">
      <div className="account-number-display">
        <span>****</span>
        <span>****</span>
        <span>****</span>
        <span>0000</span>
      </div>
    </div>
    
    <div className="card-bottom">
      <div className="balance-info">
        <p className="label">SALDO DISPONÍVEL</p>
        <p className="value outfit">R${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>
      <div className="statement-link">
        <History size={16} />
      </div>
    </div>
  </div>
);

const Accounts = () => {
  const { accounts, addAccount, totalLiquidity, transactions, deleteTransaction, deleteAccount, searchQuery, loading } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingExtrato, setViewingExtrato] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, id: null });
  const [newAccount, setNewAccount] = useState({ name: '', bank: '', balance: '' });

  const filteredAccounts = accounts.filter(acc => 
    acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    acc.bank.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (loading) {
    return (
      <div className="accounts-page">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Sincronizando com o Trust Soberano...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-page">
      <header className="accounts-header">
        <div className="header-text">
          <h1 className="outfit">Contas & Cartões</h1>
          <p>Uma visão curada da sua liquidez arquitetural. Gerencie instituições conectadas e facilidades de crédito a partir de uma galeria unificada.</p>
        </div>
        <div className="mini-hero-card">
           <div className="hero-content">
             <p className="label">LIQUIDEZ TOTAL</p>
             <h2 className="value outfit">R${totalLiquidity.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
             <p className="trend positive">Saldo atual</p>
           </div>
           <div className="hero-icon">
              <Wallet size={32} />
           </div>
        </div>
      </header>


      <section className="institutions-section">
        <div className="section-header">
          <h2>Instituições Conectadas</h2>
          <button className="add-btn" onClick={() => setIsModalOpen(true)}>
             <Plus size={16} />
             <span>Nova Conta Corrente</span>
          </button>
        </div>
        
        <div className="accounts-grid">
          {filteredAccounts.length > 0 ? (
            filteredAccounts.map((acc) => (
              <AccountCard 
                key={acc.id}
                name={acc.name}
                bank={acc.bank}
                balance={acc.balance}
                onClick={() => setViewingExtrato(acc)}
                onDelete={() => deleteAccount(acc.id)}
              />
            ))
          ) : (
            <div className="empty-state">Nenhuma conta correspondente encontrada.</div>
          )}
          <button className="add-account-card" onClick={() => setIsModalOpen(true)}>
            <div className="plus-box">
              <Plus size={24} />
            </div>
            <p>Adicionar Nova Conta</p>
          </button>
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
