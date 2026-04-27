import React, { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  MoreHorizontal,
  ChevronRight,
  ArrowUpRight,
  CreditCard as CardIcon,
  Building,
  Coffee,
  Zap,
  ArrowDownRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import './Dashboard.css';
import { useApp } from '../context/AppContext';

const formatCurrency = (value) => {
  const isNegative = value < 0;
  const formatted = Math.abs(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNegative ? '-' : ''}R$ ${formatted}`;
};

const spendData = [
  { name: 'Mon', value: 40 },
  { name: 'Tue', value: 70 },
  { name: 'Wed', value: 45 },
  { name: 'Thu', value: 55 },
  { name: 'Fri', value: 85 },
  { name: 'Sat', value: 30 },
  { name: 'Sun', value: 95 },
];

const Dashboard = () => {
  const { totalLiquidity, totalReceivable, totalIncome, totalExpenses, transactions, accounts, loading, currentUser } = useApp();

  if (loading) {
    return (
      <div className="dashboard-grid">
        <div className="loading-container">
          <div className="loader"></div>
          <p>Lendo dados do Livro Soberano...</p>
        </div>
      </div>
    );
  }

  const allocationData = [
    { name: 'Operações de Negócio', value: accounts.filter(a => a.name.includes('Business')).length || 1, color: '#021d49' },
    { name: 'Estilo de Vida & Viagem', value: 1, color: '#10b981' },
    { name: 'Ativos Fixos', value: 1, color: '#cbd5e1' },
  ];

  return (
    <div className="dashboard-grid">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="navy-hero">
          <div className="hero-header">
            <p className="label">LIQUIDEZ TOTAL</p>
            <div className="user-greeting">
              <span className="greeting-text">Bem-vindo,</span>
              <span className="user-name">{currentUser}</span>
            </div>
          </div>
          <h1 className="amount outfit">{formatCurrency(totalLiquidity)}</h1>
          <div className="hero-stats">
            <div className="stat-pill">
              <span className="pill-label">RENDIMENTO MENSAL</span>
              <span className="pill-value">{(totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0)}%</span>
            </div>
            <div className="stat-pill">
              <span className="pill-label">ATIVOS ATIVOS</span>
              <span className="pill-value">{accounts.length}</span>
            </div>
          </div>
        </div>
        
        <div className="premium-card health-card">
          <div className="card-header">
            <h3>Saúde do Portfólio</h3>
            <p className="subtitle">Desempenho do seu portfólio baseado na liquidez atual e transações.</p>
          </div>
          <div className="health-metrics">
            <div className="risk-label">
              <span>FATOR DE RISCO</span>
              <span className="risk-value low">{totalLiquidity > totalExpenses ? 'BAIXO' : 'MÉDIO'}</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: totalLiquidity > 0 ? '60%' : '0%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Summary Row */}
      <section className="summary-row">
        <div className="premium-card mini-stat">
          <div className="stat-icon income">
            <TrendingUp size={18} />
          </div>
          <div className="stat-content">
            <p className="label">ENTRADAS</p>
            <h3>{formatCurrency(totalIncome)}</h3>
            <p className="trend positive">Ganhos totais</p>
          </div>
        </div>

        <div className="premium-card mini-stat">
          <div className="stat-icon expense">
            <TrendingDown size={18} />
          </div>
          <div className="stat-content">
            <p className="label">SAÍDAS</p>
            <h3>{formatCurrency(totalExpenses)}</h3>
            <p className="trend neutral">Gastos totais</p>
          </div>
        </div>

        <div className="premium-card mini-stat">
          <div className="stat-icon receivable">
            <Activity size={18} />
          </div>
          <div className="stat-content">
            <p className="label">TOTAL A RECEBER</p>
            <h3>{formatCurrency(totalReceivable)}</h3>
            <p className="trend highlight">Capital de terceiros</p>
          </div>
        </div>

        <div className="premium-card chart-stat">
          <div className="card-header-compact">
            <p className="label">VELOCIDADE DE GASTOS</p>
            <div className="dots">
               <span className="dot teal"></span>
               <span className="dot navy"></span>
            </div>
          </div>
          <div className="mini-chart">
            <ResponsiveContainer width="100%" height={60}>
              <BarChart data={spendData}>
                <Bar dataKey="value" fill="#021d49" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Bottom Grid */}
      <section className="main-grid">
        <div className="premium-card transactions-card">
          <div className="card-header-between">
            <h2>Transações Recentes</h2>
            <button className="link-btn">VER LIVRO CAIXA</button>
          </div>
          <div className="transaction-list">
            {transactions.length > 0 ? (
              transactions.map((tx, idx) => (
                <TransactionItem 
                  key={tx.id}
                  icon={tx.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                  name={tx.description || tx.accountName}
                  account={tx.accountName}
                  category={tx.category || 'Sem Categoria'}
                  amount={`${tx.type === 'income' ? '+' : '-'}${formatCurrency(parseFloat(tx.amount)).replace('-', '')}`}
                  date={new Date(tx.date).toLocaleDateString('pt-BR')}
                  positive={tx.type === 'income'}
                />
              ))
            ) : (
              <div className="empty-state">Nenhuma atividade recente detectada.</div>
            )}
          </div>
        </div>

        <div className="premium-card allocation-card">
          <div className="card-header-between">
            <h2>Alocação</h2>
          </div>
          <div className="allocation-content">
            <div className="donut-wrapper">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={accounts.length > 0 ? accounts.map(a => ({ name: a.name, value: a.balance })) : [{name: 'Vazio', value: 1}]}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {accounts.length > 0 ? (
                      accounts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#021d49' : '#10b981'} stroke="none" />
                      ))
                    ) : (
                      <Cell key="empty" fill="#f1f5f9" stroke="none" />
                    )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <p className="label">ATIVOS</p>
                <p className="value outfit">{accounts.length}</p>
              </div>
            </div>
            <div className="legend">
              {accounts.map((acc, index) => (
                <div key={acc.id} className="legend-item">
                  <div className="legend-main">
                    <span className="dot" style={{ backgroundColor: index % 2 === 0 ? '#021d49' : '#10b981' }}></span>
                    <span className="label">{acc.name}</span>
                  </div>
                  <span className="value outfit">{formatCurrency(acc.balance)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


const TransactionItem = ({ icon, name, account, category, amount, date, positive }) => (
  <div className="transaction-item">
    <div className={`icon-box ${positive ? 'positive' : 'negative'}`}>
      {icon}
    </div>
    <div className="tx-info">
      <div className="tx-header">
        <div className="tx-title-group">
          <p className="name">{name}</p>
          <span className="account-badge">{account}</span>
        </div>
        <div className="tx-right-side">
          <p className={`amount outfit ${positive ? 'positive' : ''}`}>{amount}</p>
        </div>
      </div>
      <div className="tx-footer">
        <p className="category">{category}</p>
        <p className="date">{date}</p>
      </div>
    </div>
  </div>
);

export default Dashboard;
