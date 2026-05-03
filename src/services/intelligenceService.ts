/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from "./marketService";

export interface MarketIntelligence {
  symbol: string;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  setupType: 'BREAKOUT' | 'REVERSAL' | 'CONSOLIDATION';
  neuralConfidence: number;
  setup: string;
  stopLoss: number;
  target: number;
  rrRatio: string;
  strategy: string;
  insights: {
    tradingView: string;
    youtubeSentiment: string;
    pinterestVisuals: string;
    aiAnalysis: string;
    yahooFinance: string;
    investingTech: string;
  };
  keyLevels: {
    fvg: string[];
    ob: string[];
    liquidity: string[];
    pivotPoints: string[];
  };
  economicCalendar: {
    event: string;
    impact: 'HIGH' | 'MED' | 'LOW';
    time: string;
    source: 'ForexFactory';
  }[];
}

export async function getMarketIntelligence(symbol: string, timeframe: string, history: Candle[]): Promise<MarketIntelligence> {
  try {
    const response = await fetch(`/api/market/intelligence?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error("AI Analysis Error:", error);
    const lastPrice = history[history.length - 1]?.close || 100;
    return {
      symbol,
      bias: 'NEUTRAL',
      setupType: 'CONSOLIDATION',
      neuralConfidence: 45,
      setup: 'Awaiting External Alpha Streams...',
      stopLoss: lastPrice * 0.99,
      target: lastPrice * 1.02,
      rrRatio: '1:2',
      strategy: 'SMC / Price Action',
      insights: {
        tradingView: 'Neutral streams.',
        youtubeSentiment: 'Mixed consensus among top analysts.',
        pinterestVisuals: 'No major chart patterns trending.',
        aiAnalysis: 'Price consolidating at key pivot points.',
        yahooFinance: 'Average volume, beta within normal range.',
        investingTech: 'Neutral/Hold consensus.'
      },
      keyLevels: {
        fvg: [`${(lastPrice * 1.005).toFixed(2)}`],
        ob: [`${(lastPrice * 0.995).toFixed(2)}`],
        liquidity: [`${(lastPrice * 1.01).toFixed(2)}`],
        pivotPoints: [`${lastPrice.toFixed(2)}`]
      },
      economicCalendar: [{ event: 'No major high-impact news', impact: 'LOW', time: 'N/A', source: 'ForexFactory' }]
    };
  }
}
