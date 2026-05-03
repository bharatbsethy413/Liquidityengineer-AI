/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export type Segment = 'Equity' | 'FnO' | 'Commodity' | 'Currency';

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  segment: Segment;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  lotSize: number; // For FnO
  reasonEntry: string;
  reasonExit: string;
  mistakes: string;
  remarks: string;
  pnl: number;
  chartUrl?: string;
}

export interface JournalStats {
  initialBalance: number;
  currentBalance: number;
  totalPnL: number;
  winRate: number;
  totalTrades: number;
  dailyPnL: Record<string, number>;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
}

const INITIAL_TRADES: Trade[] = [];

export function useTradeJournal() {
  const [trades, setTrades] = useState<Trade[]>(INITIAL_TRADES);
  const [initialBalance, setInitialBalance] = useState(0);

  const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
  const currentBalance = initialBalance + totalPnL;
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const totalProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = totalLoss === 0 ? totalProfit : totalProfit / totalLoss;

  const avgWin = wins.length > 0 ? totalProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

  // Calculate Max Drawdown
  let maxBalance = initialBalance;
  let currentRunningBalance = initialBalance;
  let maxDD = 0;

  // Sort trades by date for drawdown calculation
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  sortedTrades.forEach(trade => {
    currentRunningBalance += trade.pnl;
    if (currentRunningBalance > maxBalance) {
      maxBalance = currentRunningBalance;
    }
    const dd = maxBalance - currentRunningBalance;
    if (dd > maxDD) {
      maxDD = dd;
    }
  });

  const maxDrawdownPercent = maxBalance > 0 ? (maxDD / maxBalance) * 100 : 0;

  const dailyPnL = trades.reduce((acc, t) => {
    const date = t.date;
    acc[date] = (acc[date] || 0) + t.pnl;
    return acc;
  }, {} as Record<string, number>);

  const addTrade = (trade: Omit<Trade, 'id' | 'pnl'>) => {
    const pnl = (trade.exitPrice - trade.entryPrice) * trade.quantity;
    const newTrade: Trade = {
      ...trade,
      id: Math.random().toString(36).substring(2, 9),
      pnl
    };
    setTrades(prev => [newTrade, ...prev]);
  };

  return {
    trades,
    stats: {
      initialBalance,
      currentBalance,
      totalPnL,
      winRate,
      totalTrades: trades.length,
      dailyPnL,
      profitFactor,
      avgWin,
      avgLoss,
      maxDrawdown: maxDD,
      maxDrawdownPercent
    },
    addTrade,
    setInitialBalance
  };
}
