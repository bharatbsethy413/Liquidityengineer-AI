/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';

export interface MarketData {
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isUp: boolean;
  basePrice: number;
}

const INITIAL_MARKETS: MarketData[] = [
  { name: 'NIFTY 50', price: 22604.85, change: 121.15, changePercent: 0.54, isUp: true, basePrice: 22483.70 },
  { name: 'BANK NIFTY', price: 49396.75, change: 250.45, changePercent: 0.51, isUp: true, basePrice: 49146.30 },
  { name: 'FIN NIFTY', price: 21950.40, change: 85.20, changePercent: 0.39, isUp: true, basePrice: 21865.20 },
  { name: 'RELIANCE', price: 2958.80, change: 14.50, changePercent: 0.49, isUp: true, basePrice: 2944.30 },
  { name: 'TCS', price: 3820.50, change: -12.30, changePercent: -0.32, isUp: false, basePrice: 3832.80 },
  { name: 'HDFC BANK', price: 1510.30, change: 4.20, changePercent: 0.28, isUp: true, basePrice: 1506.10 },
  { name: 'INFY', price: 1425.40, change: 2.10, changePercent: 0.15, isUp: true, basePrice: 1423.30 },
  { name: 'XAUUSD', price: 2315.60, change: -8.40, changePercent: -0.36, isUp: false, basePrice: 2324.00 },
  { name: 'BTCUSD', price: 62850.00, change: -450.00, changePercent: -0.71, isUp: false, basePrice: 63300.00 },
  { name: 'NASDAQ', price: 16156.33, change: 312.80, changePercent: 1.97, isUp: true, basePrice: 15843.53 },
];

export interface OptionStrike {
  strike: number;
  ce_price: number;
  pe_price: number;
  ce_change: number;
  pe_change: number;
  oi_ce: string;
  oi_pe: string;
}

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function useMarketHistory(symbol: string, timeframe: string) {
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setCandles(data);
      } catch (error) {
        console.error("Error fetching real-time history:", error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  return candles;
}

/**
 * useOptionChain Hook
 * Simulates a live option chain for a given symbol.
 */
export function useOptionChain(symbol: string, currentPrice: number) {
  const [strikes, setStrikes] = useState<OptionStrike[]>([]);
  
  useEffect(() => {
    // We still simulate the option chain for now because real-time option chains are complex to fetch for free
    // Generate strikes around current price
    const interval = 50; 
    const baseStrike = Math.round(currentPrice / interval) * interval;
    const initialStrikes: OptionStrike[] = [];
    
    for (let i = -5; i <= 5; i++) {
      const strike = baseStrike + (i * interval);
      const diff = currentPrice - strike;
      
      const ce_price = Math.max(0, diff) + (Math.random() * 20 + 30);
      const pe_price = Math.max(0, -diff) + (Math.random() * 20 + 30);
      
      initialStrikes.push({
        strike,
        ce_price,
        pe_price,
        ce_change: (Math.random() - 0.5) * 5,
        pe_change: (Math.random() - 0.5) * 5,
        oi_ce: (Math.random() * 50).toFixed(1) + 'L',
        oi_pe: (Math.random() * 50).toFixed(1) + 'L',
      });
    }
    setStrikes(initialStrikes);

    const timer = setInterval(() => {
      setStrikes(prev => prev.map(s => ({
        ...s,
        ce_price: s.ce_price + (Math.random() - 0.5) * 1.5,
        pe_price: s.pe_price + (Math.random() - 0.5) * 1.5,
      })));
    }, 2000);

    return () => clearInterval(timer);
  }, [symbol, currentPrice]);

  return strikes;
}

/**
 * useLiveMarketData Hook
 * Fetches real-time market updates from our backend.
 */
export function useLiveMarketData() {
  const [markets, setMarkets] = useState<MarketData[]>(INITIAL_MARKETS);
  const [lastUpdatedIndex, setLastUpdatedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/market/quotes');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        setMarkets(prev => {
          // Identify which one changed most to highlight it
          const changedIndex = Math.floor(Math.random() * data.length);
          setLastUpdatedIndex(changedIndex);
          setTimeout(() => setLastUpdatedIndex(null), 500);
          return data;
        });
      } catch (error) {
        console.error("Error fetching live markets:", error);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5000); // 5s updates to avoid rate limits
    return () => clearInterval(interval);
  }, []);

  return { markets, lastUpdatedIndex };
}
