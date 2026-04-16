import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('sovereign_auth') === 'true';
  });

  const [accounts, setAccounts] = useState(() => {
    const saved = localStorage.getItem('sovereign_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('sovereign_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sovereign_auth', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('sovereign_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('sovereign_transactions', JSON.stringify(transactions));
  }, [transactions]);

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

  const addAccount = (account) => {
    setAccounts([...accounts, { ...account, id: Date.now() }]);
  };

  const addTransaction = (transaction) => {
    const newTx = { ...transaction, id: Date.now(), date: new Date().toISOString() };
    setTransactions([newTx, ...transactions]);

    // Update account balance
    setAccounts(prev => prev.map(acc => {
      if (acc.name === transaction.accountName) {
        const amount = parseFloat(transaction.amount);
        return {
          ...acc,
          balance: transaction.type === 'income' ? acc.balance + amount : acc.balance - amount
        };
      }
      return acc;
    }));
  };

  const deleteTransaction = (id) => {
    const txToDelete = transactions.find(tx => tx.id === id);
    if (!txToDelete) return;

    // Reverse account balance update
    setAccounts(prev => prev.map(acc => {
      if (acc.name === txToDelete.accountName) {
        const amount = parseFloat(txToDelete.amount);
        return {
          ...acc,
          balance: txToDelete.type === 'income' ? acc.balance - amount : acc.balance + amount
        };
      }
      return acc;
    }));

    setTransactions(prev => prev.filter(tx => tx.id !== id));
  };

  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  
  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  const totalExpenses = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

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
      totalLiquidity,
      totalIncome,
      totalExpenses
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
