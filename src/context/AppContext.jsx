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
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem('sovereign_user') || null;
  });


  useEffect(() => {
    localStorage.setItem('sovereign_auth', isAuthenticated);
    if (currentUser) {
      localStorage.setItem('sovereign_user', currentUser);
    } else {
      localStorage.removeItem('sovereign_user');
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('*')
          .eq('owner', currentUser)
          .order('name');
          
        if (accountsData && accountsData.length === 0 && currentUser) {
          // Seed default accounts for new user
          const { data: seeded } = await supabase.from('accounts').insert([
            { name: 'ABDALA', bank: 'Trust Soberano', balance: 0, owner: currentUser },
            { name: 'DOAÇÃO', bank: 'Social Soberano', balance: 0, owner: currentUser }
          ]).select();
          if (seeded) setAccounts(seeded);
        } else if (accountsData) {
          setAccounts(accountsData);
        }
        
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('owner', currentUser)
          .order('date', { ascending: false });
        
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

    if (isAuthenticated && currentUser) {
      fetchData();
    }
  }, [isAuthenticated, currentUser]);

  const login = (username, password) => {
    if (username === 'ABDALA' && password === 'Abdala@123') {
      setIsAuthenticated(true);
      setCurrentUser('ABDALA');
      return true;
    }
    if (username === 'jef' && password === 'Jef@123') {
      setIsAuthenticated(true);
      setCurrentUser('jef');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAccounts([]);
    setTransactions([]);
  };

  const addAccount = async (account) => {
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...account, balance: parseFloat(account.balance) || 0, owner: currentUser }])
      .select();

    if (data) {
      setAccounts([...accounts, data[0]]);
    }
  };

  const addTransaction = async (transaction) => {
    const amount = parseFloat(transaction.amount);
    const date = transaction.date ? new Date(transaction.date).toISOString() : new Date().toISOString();
    let txsToInsert = [];

    // TITHE LOGIC: Apply to Income into ABDALA OR Transfer into ABDALA
    // EXCEPTION: User 'jef' is exempt from the 10% rule
    const isTargetingAbdala = transaction.accountName === 'ABDALA' || transaction.targetAccount === 'ABDALA';
    const shouldTithe = isTargetingAbdala && 
                       (transaction.type === 'income' || transaction.type === 'transfer') && 
                       currentUser !== 'jef';

    if (shouldTithe) {
      const titheAmount = amount * 0.1;
      const netAmount = amount - titheAmount;

      if (transaction.type === 'income') {
        // Normal Income with Tithe
        txsToInsert.push({
          ...transaction,
          amount: amount,
          date
        });
      } else {
        // Transfer into ABDALA with Tithe
        const originAccount = transaction.accountName;
        // 1. Transfer Out from Origin
        txsToInsert.push({
          type: 'expense',
          amount: amount,
          account_name: originAccount,
          category: 'Transferência',
          description: `Transferência para ABDALA: ${transaction.description || ''}`,
          date
        });
        // 2. Transfer In to ABDALA (Full amount initially)
        txsToInsert.push({
          type: 'income',
          amount: amount,
          account_name: 'ABDALA',
          category: 'Transferência',
          description: `Transferência de ${originAccount}: ${transaction.description || ''}`,
          date
        });
        
        await supabase.rpc('increment_balance', { account_name: originAccount, amount: -amount, owner_name: currentUser });
      }

      // Shared Tithe Accounting for both Income and Transfer
      // 1. Deduction Record from ABDALA
      txsToInsert.push({
        type: 'expense',
        amount: titheAmount,
        account_name: 'ABDALA',
        category: 'Doação',
        description: `10% Doação (automático de: ${transaction.description || 'Entrada'})`,
        date,
        owner: currentUser
      });

      // 2. Income Record in DOAÇÃO
      txsToInsert.push({
        type: 'income',
        amount: titheAmount,
        account_name: 'DOAÇÃO',
        category: 'Doação',
        description: `Recebimento 10% de: ABDALA`,
        date,
        owner: currentUser
      });

      // Update Balances
      // For both Income and Transfer into ABDALA, the account gains the Net Amount (Total - 10%)
      await supabase.rpc('increment_balance', { account_name: 'ABDALA', amount: netAmount, owner_name: currentUser });
      await supabase.rpc('increment_balance', { account_name: 'DOAÇÃO', amount: titheAmount, owner_name: currentUser });

    } else if (transaction.type === 'transfer') {
      const targetAccountName = transaction.targetAccount;
      
      txsToInsert.push({
        type: 'expense',
        amount: amount,
        account_name: transaction.accountName,
        category: 'Transferência',
        description: `Transferência para ${targetAccountName}: ${transaction.description || ''}`,
        date,
        owner: currentUser
      });
      
      txsToInsert.push({
        type: 'income',
        amount: amount,
        account_name: targetAccountName,
        category: 'Transferência',
        description: `Transferência de ${transaction.accountName}: ${transaction.description || ''}`,
        date,
        owner: currentUser
      });

      await supabase.rpc('increment_balance', { account_name: transaction.accountName, amount: -amount, owner_name: currentUser });
      await supabase.rpc('increment_balance', { account_name: targetAccountName, amount: amount, owner_name: currentUser });

    } else {
      txsToInsert.push({
        ...transaction,
        amount: amount,
        date,
        owner: currentUser
      });

      const balanceChange = transaction.type === 'income' ? amount : -amount;
      await supabase.rpc('increment_balance', { account_name: transaction.accountName, amount: balanceChange, owner_name: currentUser });
    }

    const formattedTxs = txsToInsert.map(tx => ({
      type: tx.type,
      amount: tx.amount,
      account_name: tx.accountName || tx.account_name,
      category: tx.category,
      description: tx.description,
      date: tx.date,
      owner: tx.owner || currentUser
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
    
    // If it's a transfer, we might want to find and delete the other side too
    // For now, let's at least ensure the balance of the current account is reverted
    const balanceChange = txToDelete.type === 'income' ? -amount : amount;
    await supabase.rpc('increment_balance', { account_name: txToDelete.account_name, amount: balanceChange, owner_name: currentUser });
    
    // Handle linked transfer deletion if description contains the pattern
    if (txToDelete.category === 'Transferência') {
      // Find the "matching" transaction: same amount, same date (approx), opposite type
      const otherSide = transactions.find(tx => 
        tx.id !== id && 
        parseFloat(tx.amount) === amount && 
        tx.type !== txToDelete.type &&
        tx.category === 'Transferência' &&
        Math.abs(new Date(tx.date) - new Date(txToDelete.date)) < 10000 && // within 10 seconds
        tx.owner === currentUser
      );

      if (otherSide) {
        const otherBalanceChange = otherSide.type === 'income' ? -amount : amount;
        await supabase.rpc('increment_balance', { account_name: otherSide.account_name, amount: otherBalanceChange, owner_name: currentUser });
        await supabase.from('transactions').delete().eq('id', otherSide.id);
      }
    }

    await supabase.from('transactions').delete().eq('id', id);

    // Refresh state
    await fetchData();
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
      currentUser,
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
