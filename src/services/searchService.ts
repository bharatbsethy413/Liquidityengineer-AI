/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StockDetail {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  peRatio: number;
  high52w: number;
  low52w: number;
  volume: string;
  sector: string;
  description: string;
}

/**
 * searchStock
 * Fetches asset information from the server (which uses Gemini with Search grounding and caching).
 */
export async function searchStock(query: string): Promise<StockDetail | null> {
  try {
    const response = await fetch(`/api/market/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const detail = await response.json();

    // Try to get even more real-time price from our quotes API if it's a known symbol
    try {
      const quoteRes = await fetch(`/api/market/quotes?symbols=${detail.symbol}`);
      if (quoteRes.ok) {
        const quotes = await quoteRes.json();
        if (quotes && quotes.length > 0) {
          detail.price = quotes[0].price;
          detail.change = quotes[0].change;
          detail.changePercent = quotes[0].changePercent;
        }
      }
    } catch (e) { /* Fallback to AI price if API fails */ }

    return detail;
  } catch (error) {
    console.error("Error searching stock:", error);
    return null;
  }
}
