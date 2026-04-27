import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('sovereign_auth') === 'true';
  });

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('sovereign_auth', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: accountsData } = await supabase.from('accounts').select('*').order('name');
        const { data: transactionsData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
        
        if (accountsData) setAccounts(accountsData);
        if (transactionsData) {
          const mappedTxs = transactionsData.map(tx => ({
            ...tx,
            accountName: tx.account_name
          }));
          setTransactions(mappedTxs);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const login = (username, password) => {
    if (username === 'ABDALA' && password === 'Abdala@123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const addAccount = async (account) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...account, balance: parseFloat(account.balance) || 0 }])
      .select();

    if (data) {
      setAccounts([...accounts, data[0]]);
    }
  };

  const addTransaction = async (transaction) => {
    const amount = parseFloat(transaction.amount);
    const date = new Date().toISOString();
    
    let updatedAccounts = [...accounts];
    let txsToInsert = [];

    if (transaction.type === 'income' && transaction.accountName === 'ABDALA' && transaction.category !== 'Transferência') {
      const titheAmount = amount * 0.10;
      const netAmount = amount - titheAmount;

      // 1. Primary Income (Net)
      txsToInsert.push({
        ...transaction,
        amount: netAmount,
        date
      });

      // 2. Tithe Deduction Record
      txsToInsert.push({
        type: 'expense',
        amount: titheAmount,
        account_name: 'ABDALA',
        category: 'Doação',
        description: `10% Doação (automático de: ${transaction.description || 'Entrada'})`,
        date
      });

      // 3. Donation Income Record
      txsToInsert.push({
        type: 'income',
        amount: titheAmount,
        account_name: 'DOAÇÃO',
        category: 'Doação',
        description: `Recebimento 10% de: ABDALA`,
        date
      });

      // Update Local Balances
      await supabase.rpc('increment_balance', { account_name: 'ABDALA', amount: netAmount });
      await supabase.rpc('increment_balance', { account_name: 'DOAÇÃO', amount: titheAmount });

    } else if (transaction.type === 'transfer') {
      const targetAccountName = transaction.targetAccount;
      
      // Transfer Out
      txsToInsert.push({
        type: 'expense',
        amount: amount,
        account_name: transaction.accountName,
        category: 'Transferência',
        description: `Transferência para ${targetAccountName}: ${transaction.description || ''}`,
        date
      });
      
      // Transfer In
      txsToInsert.push({
        type: 'income',
        amount: amount,
        account_name: targetAccountName,
        category: 'Transferência',
        description: `Transferência de ${transaction.accountName}: ${transaction.description || ''}`,
        date
      });

      await supabase.rpc('increment_balance', { account_name: transaction.accountName, amount: -amount });
      await supabase.rpc('increment_balance', { account_name: targetAccountName, amount: amount });

    } else {
      // Normal transaction
      txsToInsert.push({
        ...transaction,
        amount: amount,
        date
      });

      const balanceChange = transaction.type === 'income' ? amount : -amount;
      await supabase.rpc('increment_balance', { account_name: transaction.accountName, amount: balanceChange });
    }

    // Insert all transactions
    const formattedTxs = txsToInsert.map(tx => ({
      type: tx.type,
      amount: tx.amount,
      account_name: tx.accountName || tx.account_name,
      category: tx.category,
      description: tx.description,
      date: tx.date
    }));

    const { data: newTxs } = await supabase.from('transactions').insert(formattedTxs).select();
    
    // Refresh all data to ensure consistency
    const { data: refreshedAccounts } = await supabase.from('accounts').select('*').order('name');
    const { data: refreshedTxs } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    
    if (refreshedAccounts) setAccounts(refreshedAccounts);
    if (refreshedTxs) {
      const mappedTxs = refreshedTxs.map(tx => ({
        ...tx,
        accountName: tx.account_name
      }));
      setTransactions(mappedTxs);
    }
  };

  const deleteTransaction = async (id) => {
    const txToDelete = transactions.find(tx => tx.id === id);
    if (!txToDelete) return;

    const amount = parseFloat(txToDelete.amount);
    const balanceChange = txToDelete.type === 'income' ? -amount : amount;

    await supabase.rpc('increment_balance', { account_name: txToDelete.account_name, amount: balanceChange });
    await supabase.from('transactions').delete().eq('id', id);

    setTransactions(prev => prev.filter(tx => tx.id !== id));
    const { data: refreshedAccounts } = await supabase.from('accounts').select('*').order('name');
    if (refreshedAccounts) setAccounts(refreshedAccounts);
  };

  const deleteAccount = async (id) => {
    const accountToDelete = accounts.find(acc => acc.id === id);
    if (!accountToDelete) return;

    if (accountToDelete.name === 'ABDALA' || accountToDelete.name === 'DOAÇÃO') {
      alert("Contas do sistema (ABDALA/DOAÇÃO) não podem ser excluídas.");
      return;
    }

    if (window.confirm(`Tem certeza que deseja excluir a conta "${accountToDelete.name}"? Todos os seus lançamentos também serão removidos.`)) {
      await supabase.from('accounts').delete().eq('id', id);
      setAccounts(prev => prev.filter(acc => acc.id !== id));
      setTransactions(prev => prev.filter(tx => tx.account_name !== accountToDelete.name));
    }
  };

  const totalLiquidity = accounts
    .filter(acc => acc.name === 'ABDALA')
    .reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0);
  
  const totalIncome = transactions
    .filter(tx => tx.type === 'income' && tx.account_name !== 'DOAÇÃO' && tx.category !== 'Transferência')
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const totalExpenses = transactions
    .filter(tx => tx.type === 'expense' && tx.category !== 'Doação' && tx.category !== 'Transferência')
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  const totalReceivable = accounts
    .filter(acc => acc.name !== 'ABDALA' && acc.name !== 'DOAÇÃO')
    .reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0);

  return (
    <AppContext.Provider value={{ 
      isAuthenticated,
      login,
      logout,
      accounts, 
      transactions, 
      addAccount, 
      addTransaction,
      deleteTransaction,
      deleteAccount,
      totalLiquidity,
      totalReceivable,
      totalIncome,
      totalExpenses,
      searchQuery,
      setSearchQuery,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
