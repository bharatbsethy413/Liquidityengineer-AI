
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import YahooFinance from 'yahoo-finance2';
import { GoogleGenAI, Type } from "@google/genai";

const yahooFinance = new YahooFinance();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Caching for market news
let newsCache: { data: any[], timestamp: number } | null = null;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Caching for market intelligence
let intelligenceCache: Record<string, { data: any, timestamp: number }> = {};
const INTEL_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Caching for asset search
let searchCache: Record<string, { data: any, timestamp: number }> = {};
const SEARCH_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is alive" });
  });

  app.get("/api/market/news", async (req, res) => {
    try {
      const now = Date.now();
      if (newsCache && (now - newsCache.timestamp) < CACHE_DURATION) {
        return res.json(newsCache.data);
      }

      console.log("Fetching fresh news from Gemini AI...");
      const prompt = `Search for the latest real-time stock market news from authoritative financial sources like Bloomberg, Reuters, CNBC, The Economic Times, and Moneycontrol.
      Focus on events affecting global and Indian indices (Nifty, Bank Nifty, Sensex, Finnifty, Nasdaq). 
      Prioritize high-impact news including:
      - Central Bank decisions (Fed, RBI)
      - Quarterly results of major firms
      - Geopolitical events affecting oil or currency
      - Technical breakouts in major indices
      
      Return the information as a JSON array of news objects. Each object must have:
      - id: unique string derived from title
      - title: high-authority headline
      - summary: 1-2 sentence professional summary
      - time: precise time offset (e.g. '5m ago', '1h ago')
      - impact: 'High' | 'Medium' | 'Low'
      - category: 'Macro', 'Indian Markets', 'Global Tech', or 'Commodities'`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                time: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                category: { type: Type.STRING },
              },
              required: ['id', 'title', 'summary', 'time', 'impact', 'category']
            }
          }
        },
      });

      if (response.text) {
        const news = JSON.parse(response.text);
        newsCache = { data: news, timestamp: now };
        return res.json(news);
      }
      res.json([]);
    } catch (error: any) {
      console.error("Error fetching news from Gemini:", error);
      // If we have cached news, return it even if expired as fallback
      if (newsCache) {
        return res.json(newsCache.data);
      }
      res.status(500).json({ error: "Failed to fetch news", details: error.message });
    }
  });

  app.get("/api/market/intelligence", async (req, res) => {
    try {
      const { symbol, timeframe } = req.query;
      if (!symbol) return res.status(400).json({ error: "Symbol is required" });

      const cacheKey = `${symbol}_${timeframe}`;
      const now = Date.now();
      if (intelligenceCache[cacheKey] && (now - intelligenceCache[cacheKey].timestamp) < INTEL_CACHE_DURATION) {
        return res.json(intelligenceCache[cacheKey].data);
      }

      console.log(`Fetching fresh intelligence for ${symbol}...`);
      const prompt = `
        Perform a "Neural-Synthesis" deep-dive technical and fundamental analysis for ${symbol} (${timeframe}).
        
        Asset Scope: This research covers all globally traded assets with a MANDATORY priority on NSE India (National Stock Exchange) for Indian scripts.
        
        Research Protocol:
        1. Institutional Truth: You MUST scrape/research latest data from nseindia.com, moneycontrol.com, and yahoo finance for ${symbol}.
        2. Sentiment Alignment: Scan TradingView (India) and specific SMC/ICT analysts on YouTube for the current session's sentiment.
        3. Fundamental Check: Focus on ForexFactory (Global) and Moneycontrol (India) for high-impact news.
        4. Market Precision: Identify if the asset is currently in a BREAKOUT, REVERSAL, or CONSOLIDATION.
        
        Technical Analysis Requirements:
        - Smart Money Concepts (SMC): Locate official NSE Order Blocks (OB), Fair Value Gaps (FVG), and Liquidity Pools.
        - Bias: Determine a clear BULLISH, BEARISH, or NEUTRAL bias based on Nifty/Asset correlation.
        - Strategy: Detail the specific setup (e.g., "Bullish OB Rejection at ${symbol}").
        - Execution Plan: Provide precise Entry, SL, and Target. Enforce a minimum 1:2 Risk-Reward ratio.
        
        IMPORTANT: Ensure the price and levels are consistent with the latest NSE website data.
        
        Provide a Neural Confidence score (0-100) based on cross-platform consensus and ML probability.
        
        Return JSON EXACTLY matching the required schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              bias: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "NEUTRAL"] },
              setupType: { type: Type.STRING, enum: ["BREAKOUT", "REVERSAL", "CONSOLIDATION"] },
              neuralConfidence: { type: Type.NUMBER },
              setup: { type: Type.STRING },
              stopLoss: { type: Type.NUMBER },
              target: { type: Type.NUMBER },
              rrRatio: { type: Type.STRING },
              strategy: { type: Type.STRING },
              insights: {
                type: Type.OBJECT,
                properties: {
                  tradingView: { type: Type.STRING },
                  youtubeSentiment: { type: Type.STRING },
                  pinterestVisuals: { type: Type.STRING },
                  aiAnalysis: { type: Type.STRING },
                  yahooFinance: { type: Type.STRING },
                  investingTech: { type: Type.STRING }
                },
                required: ["tradingView", "youtubeSentiment", "pinterestVisuals", "aiAnalysis", "yahooFinance", "investingTech"]
              },
              keyLevels: {
                type: Type.OBJECT,
                properties: {
                  fvg: { type: Type.ARRAY, items: { type: Type.STRING } },
                  ob: { type: Type.ARRAY, items: { type: Type.STRING } },
                  liquidity: { type: Type.ARRAY, items: { type: Type.STRING } },
                  pivotPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["fvg", "ob", "liquidity", "pivotPoints"]
              },
              economicCalendar: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    event: { type: Type.STRING },
                    impact: { type: Type.STRING, enum: ["HIGH", "MED", "LOW"] },
                    time: { type: Type.STRING },
                    source: { type: Type.STRING }
                  },
                  required: ["event", "impact", "time", "source"]
                }
              }
            },
            required: ["symbol", "bias", "setupType", "neuralConfidence", "setup", "stopLoss", "target", "rrRatio", "strategy", "insights", "keyLevels", "economicCalendar"]
          }
        }
      });

      if (response.text) {
        const intel = JSON.parse(response.text.trim());
        intelligenceCache[cacheKey] = { data: intel, timestamp: now };
        return res.json(intel);
      }
      res.json({});
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      res.status(500).json({ error: "Failed to fetch intelligence", details: error.message });
    }
  });

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
  app.get("/api/market/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.status(400).json({ error: "Query is required" });

      const query = q as string;
      const now = Date.now();
      if (searchCache[query] && (now - searchCache[query].timestamp) < SEARCH_CACHE_DURATION) {
        return res.json(searchCache[query].data);
      }

      console.log(`Searching asset for query: ${query}...`);
      const prompt = `Research the asset: "${query}". 
      This could be a stock (NSE/BSE, US), Index (Nifty, Dow), Commodity (Gold/XAUUSD), or Crypto (BTC, SOL).
      Provide the full name, current price, day's change, market cap (if applicable), P/E ratio (if applicable), 52-week high, 52-week low, trading volume, sector/category, and a brief 1-sentence description.
      IMPORTANT: If the asset is Indian, provide values in INR (₹). If global, provide values in their base currency (which will be converted later).
      Return the data as a JSON object matching this schema. If a metric is not applicable for the asset class, provide 0 or "N/A".
      {
        "symbol": "string (Main trading symbol)",
        "name": "string (full name)",
        "price": number,
        "change": number,
        "changePercent": number,
        "marketCap": "string (formatted with currency symbol)",
        "peRatio": number,
        "high52w": number,
        "low52w": number,
        "volume": "string",
        "sector": "string (e.g. Crypto, Metal, Tech)",
        "description": "string"
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        },
      });

      if (response.text) {
        const detail = JSON.parse(response.text);
        searchCache[query] = { data: detail, timestamp: now };
        return res.json(detail);
      }
      res.status(404).json({ error: "Asset not found" });
    } catch (error: any) {
      console.error("Asset Search Error:", error);
      res.status(500).json({ error: "Failed to search asset", details: error.message });
    }
  });

  app.post("/api/jarvis/command", async (req, res) => {
    try {
      const { command } = req.body;
      if (!command) return res.status(400).json({ error: "Command is required" });

      const navigateFunction: any = {
        name: "navigate",
        description: "Navigate to a different screen in the app.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            screen: {
              type: Type.STRING,
              description: "The name of the screen. Options: 'dashboard', 'market', 'options', 'news', 'journal', 'search', 'settings'",
              enum: ['dashboard', 'market', 'options', 'news', 'journal', 'search', 'settings']
            }
          },
          required: ["screen"]
        }
      };

      const fetchStockFunction: any = {
        name: "fetchStock",
        description: "Show real-time data or search for intelligence on a specific index or stock.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            symbol: {
              type: Type.STRING,
              description: "The stock symbol or index name (e.g., NIFTY, RELIANCE, TCS)"
            }
          },
          required: ["symbol"]
        }
      };

      const setAlertFunction: any = {
        name: "setPriceAlert",
        description: "Set a price alert for a specific symbol.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            symbol: {
              type: Type.STRING,
              description: "The stock symbol or index"
            },
            price: {
              type: Type.NUMBER,
              description: "The target price for the alert"
            }
          },
          required: ["symbol", "price"]
        }
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: command,
        config: {
          systemInstruction: "You are Jarvis, a sophisticated trading AI. Your goal is to help the user navigate and manage their trading dashboard. Be concise and professional. Use the provided tools to execute actions.",
          tools: [{ functionDeclarations: [navigateFunction, fetchStockFunction, setAlertFunction] }],
        },
      });

      const functionCalls = response.functionCalls;
      const message = response.text || "Executing your request, sir.";

      res.json({ functionCalls, message });
    } catch (error: any) {
      console.error("Jarvis Error:", error);
      res.status(500).json({ error: "Jarvis could not process command", details: error.message });
    }
  });

  // Mapping symbols to Yahoo Finance symbols
  const SYMBOL_MAP: Record<string, string> = {
    'NIFTY 50': '^NSEI',
    'BANK NIFTY': '^NSEBANK',
    'FIN NIFTY': '^CNXFIN',
    'NIFTY NEXT 50': '^NSMIDCP',
    'SENSEX': '^BSESN',
    'RELIANCE': 'RELIANCE.NS',
    'TCS': 'TCS.NS',
    'HDFC BANK': 'HDFCBANK.NS',
    'ICICI BANK': 'ICICIBANK.NS',
    'INFY': 'INFY.NS',
    'SBIN': 'SBIN.NS',
    'BHARTIARTL': 'BHARTIARTL.NS',
    'ADANIENT': 'ADANIENT.NS',
    'TATA MOTORS': 'TATAMOTORS.NS',
    'XAUUSD': 'GC=F',
    'SILVER': 'SI=F',
    'BTCUSD': 'BTC-USD',
    'ETHUSD': 'ETH-USD',
    'SOLUSD': 'SOL-USD',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDJPY': 'JPY=X',
    'DOW JONES': '^DJI',
    'NASDAQ': '^IXIC',
    'CRUDE OIL': 'CL=F',
  };

  // Helper to ensure NSE symbols are correctly formatted
  const formatSymbol = (s: string) => {
    const upper = s.toUpperCase();
    if (SYMBOL_MAP[upper]) return SYMBOL_MAP[upper];
    if (upper.includes('.') || upper.includes('=') || upper.startsWith('^')) return upper;
    
    // Known non-NSE tickers that are just letters
    const nonNSEMapping: Record<string, string> = {
      'BTC': 'BTC-USD', 'ETH': 'ETH-USD', 'SOL': 'SOL-USD', 'XAU': 'GC=F', 'GOLD': 'GC=F'
    };
    for (const [key, val] of Object.entries(nonNSEMapping)) {
      if (upper.startsWith(key)) return val;
    }

    // If it looks like an Indian stock (mostly letters, 2-10 chars), add .NS
    if (/^[A-Z]{2,10}$/.test(upper)) {
      return `${upper}.NS`;
    }
    return upper;
  };

  // API Route to fetch live market data
  app.get("/api/market/quotes", async (req, res) => {
    try {
      const { symbols: querySymbols } = req.query;
      let symbolsToFetch: string[] = [];

      if (querySymbols && typeof querySymbols === 'string') {
        symbolsToFetch = querySymbols.split(',').map(s => formatSymbol(s));
      } else {
        // Default dashboard symbols
        symbolsToFetch = [
          '^NSEI', '^NSEBANK', '^CNXFIN', '^NSMIDCP', '^BSESN', 
          'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
          'GC=F', 'SI=F', 'CL=F', 'BTC-USD', 'ETH-USD', '^IXIC'
        ];
      }

      const results = await yahooFinance.quote(symbolsToFetch) as any[];
      
      if (!results || !Array.isArray(results)) {
        return res.json([]);
      }

      // Fetch USDINR rate for conversion
      let usdinr = 83.5; // Fallback
      try {
        const rateResult = await yahooFinance.quote('USDINR=X') as any;
        if (rateResult && rateResult.regularMarketPrice) {
          usdinr = rateResult.regularMarketPrice;
        }
      } catch (e) {
        console.warn("Could not fetch USDINR rate, using fallback", usdinr);
      }

      const response = results.map(quote => {
        const name = Object.keys(SYMBOL_MAP).find(key => SYMBOL_MAP[key] === quote.symbol) || quote.symbol || "";
        const isUSD = quote.currency === 'USD' || quote.symbol.endsWith('-USD') || quote.symbol.endsWith('=F');
        
        const convert = (val: number) => isUSD ? val * usdinr : val;

        return {
          name,
          symbol: quote.symbol,
          price: convert(quote.regularMarketPrice || 0),
          change: convert(quote.regularMarketChange || 0),
          changePercent: quote.regularMarketChangePercent || 0,
          isUp: (quote.regularMarketChange || 0) >= 0,
          basePrice: convert((quote.regularMarketPrice || 0) - (quote.regularMarketChange || 0)),
          currency: 'INR'
        };
      });

      res.json(response);
    } catch (error: any) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "Failed to fetch market data", details: error.message });
    }
  });

  // API Route to fetch historical data (candles)
  app.get("/api/market/history", async (req, res) => {
    const { symbol, timeframe } = req.query;
    if (!symbol) return res.status(400).json({ error: "Symbol is required" });

    try {
      const yahooSymbol = formatSymbol(symbol as string);
      
      // Map timeframe to Yahoo Finance intervals
      const intervalMap: Record<string, string> = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '1d': '1d'
      };
      
      const interval = (intervalMap[timeframe as string] || '1d') as any;
      const period1 = Math.floor(Date.now() / 1000) - (86400 * 7); // Last 7 days

      const results = await yahooFinance.chart(yahooSymbol, {
        period1,
        interval
      }) as any;

      if (!results || !results.quotes) {
        return res.json([]);
      }

      // Fetch USDINR rate for conversion
      let usdinr = 83.5; // Fallback
      try {
        const rateResult = await yahooFinance.quote('USDINR=X') as any;
        if (rateResult && rateResult.regularMarketPrice) {
          usdinr = rateResult.regularMarketPrice;
        }
      } catch (e) {
        console.warn("Could not fetch USDINR rate, using fallback", usdinr);
      }

      const isUSD = yahooSymbol.endsWith('-USD') || yahooSymbol.endsWith('=F') || yahooSymbol.endsWith('=X');
      const convert = (val: number) => (isUSD && val) ? val * usdinr : val;

      const candles = results.quotes.map((q: any) => ({
        time: new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        open: convert(q.open || 0),
        high: convert(q.high || 0),
        low: convert(q.low || 0),
        close: convert(q.close || 0),
        volume: q.volume || 0
      })).slice(-100);

      res.json(candles);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
