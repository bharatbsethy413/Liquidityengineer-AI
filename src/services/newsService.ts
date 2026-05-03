/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MarketNews {
  id: string;
  title: string;
  summary: string;
  time: string;
  impact: 'High' | 'Medium' | 'Low';
  category: string;
}

/**
 * fetchLiveMarketNews
 * Fetches real-time market news from the server (which uses Gemini with Search grounding and caching).
 */
export async function fetchLiveMarketNews(): Promise<MarketNews[]> {
  try {
    const response = await fetch('/api/market/news');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching live news:", error);
    // Fallback if API fails
    return [
      { id: 'err', title: 'Intel Sync Error', summary: 'Could not connect to live global intelligence. Check connection.', time: 'Now', impact: 'Low', category: 'System' }
    ];
  }
}
