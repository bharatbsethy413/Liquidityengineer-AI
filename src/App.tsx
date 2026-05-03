import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  LayoutDashboard, 
  BarChart2, 
  Newspaper, 
  Settings as SettingsIcon,
  Search,
  Bell,
  Cpu,
  ArrowUpRight,
  ChevronRight,
  MoreVertical,
  Activity,
  User,
  Volume2,
  Lock,
  Eye,
  Settings,
  X,
  BookOpen,
  Plus,
  Youtube,
  Pin
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ComposedChart, 
  Bar, 
  Line, 
  Cell,
  ReferenceArea
} from 'recharts';
import { format, isWeekend } from 'date-fns';
import { useLiveMarketData, MarketData as LiveMarketData, useOptionChain, OptionStrike, useMarketHistory } from './services/marketService';
import { fetchLiveMarketNews, MarketNews } from './services/newsService';
import { processJarvisCommand, JarvisAction } from './services/jarvisService';
import { useTradeJournal, Trade, Segment } from './services/journalService';
import { searchStock, StockDetail } from './services/searchService';
import { AdvancedChart } from './components/AdvancedChart';
import { getMarketIntelligence, MarketIntelligence } from './services/intelligenceService';
import { PnLCalendar } from './components/PnLCalendar';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { createAlert, deleteAlert, markAlertAsTriggered, useAlerts, Alert as PriceAlert } from './services/alertService';

// --- Types ---
type Screen = 'dashboard' | 'market' | 'options' | 'news' | 'journal' | 'search' | 'settings';

const TIMELINE_EVENTS = [
  { time: '06:30', title: 'Morning Brief', description: 'Global sentiment analysis complete.' },
  { time: '08:30', title: 'Commute', description: 'Ready for market open.' },
  { time: '09:30', title: 'Punch-in', description: 'Monitoring volatility spikes.' },
  { time: '13:30', title: 'Europe Open', description: 'Liquidity shifts detected.' },
  { time: '15:30', title: 'Market Close', description: 'Daily performance review.' },
  { time: '18:30', title: 'Punch-out', description: 'Evening summary synced.' },
];

const INITIAL_NEWS: MarketNews[] = [
  { id: 'fomc-1', title: 'Fed Holds Rates Unchanged', summary: 'The Federal Reserve maintains status quo, highlighting "lack of further progress" on inflation targets.', time: '2h ago', impact: 'High', category: 'Macro' },
  { id: 'gst-2', title: 'Record GST Collection in April', summary: 'India’s GST collections hit a historic high of ₹2.10 lakh crore, up 12.4% YoY.', time: '5h ago', impact: 'High', category: 'Indian Markets' },
  { id: 'earnings-3', title: 'Apple Q2 Earnings Beat', summary: 'Apple stock rises after surpassing earnings estimates and announcing a $110 billion buyback.', time: '12h ago', impact: 'Medium', category: 'Global Tech' },
];

// --- Components ---

// --- Utils ---
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const GlassCard: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
  <motion.div 
    whileTap={onClick ? { scale: 0.98 } : undefined}
    onClick={onClick}
    className={cn("glass rounded-3xl p-5 overflow-hidden relative", className)}
  >
    {children}
  </motion.div>
);

const JarvisButton: React.FC<{ isListening: boolean; onClick: () => void }> = ({ isListening, onClick }) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="relative group perspective-1000">
      {/* Outer Pulse Rings */}
      <AnimatePresence>
        {isListening && (
          <React.Fragment>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-cyan-500/30"
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-cyan-400/20"
            />
          </React.Fragment>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={cn(
          "relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 overflow-hidden",
          "bg-cyan-500/10 border border-cyan-500/50",
          "shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)]",
          isListening && "border-cyan-400 shadow-[0_0_60px_-5px_rgba(6,182,212,0.8)]"
        )}
      >
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.2),transparent_70%)]" />
        
        {/* Animated Waveform Inside */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              animate={isListening ? { 
                height: [8, 24, 12, 32, 16, 28, 8][(i + Math.floor(Math.random() * 5)) % 7] 
              } : { height: 16 }}
              transition={{ 
                repeat: Infinity, 
                duration: 0.8, 
                ease: "easeInOut",
                delay: i * 0.1 
              }}
              className="w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
          ))}
        </div>
      </motion.button>
    </div>
    <motion.p 
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ repeat: Infinity, duration: 2 }}
      className="mt-6 text-cyan-400/80 font-mono text-xs tracking-widest uppercase"
    >
      {isListening ? "Listening..." : "Tap Jarvis"}
    </motion.p>
  </div>
);

const MarketCard: React.FC<{ data: LiveMarketData; isFlashing?: boolean }> = ({ data, isFlashing }) => (
  <GlassCard className={cn(
    "min-w-[140px] flex-1 transition-all duration-300",
    isFlashing && (data.isUp ? "ring-1 ring-green-500/50 bg-green-500/5" : "ring-1 ring-red-500/50 bg-red-500/5")
  )}>
    <div className="flex justify-between items-start mb-3">
      <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{data.name}</span>
      {data.isUp ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
    </div>
    <div className="space-y-0.5">
      <motion.div 
        key={data.price}
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
        className="text-[15px] font-mono font-bold tracking-tighter"
      >
        {formatCurrency(data.price)}
      </motion.div>
      <div className={cn("text-[10px] font-mono font-semibold", data.isUp ? "text-green-400" : "text-red-400")}>
        {data.change >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
      </div>
    </div>
  </GlassCard>
);

const InsightPanel = () => (
  <GlassCard className="mt-6 bg-gradient-to-br from-indigo-900/20 to-cyan-900/20 border-cyan-500/20">
    <div className="flex items-center gap-2 mb-4">
      <Cpu className="w-5 h-5 text-cyan-400" />
      <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">AI Market Analysis</h3>
    </div>
    
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Market Bias</label>
          <div className="flex items-center gap-2">
            <span className="text-green-400 font-bold">Bullish</span>
            <ArrowUpRight className="w-4 h-4 text-green-400" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Liquidity</label>
          <div className="text-sm">High Cluster @ 22,600</div>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Volatility Score</label>
          <div className="text-lg font-mono text-cyan-400">84/100</div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">PDH / PDL Status</label>
          <div className="text-sm text-gray-300">Above PDH (Bullish)</div>
        </div>
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 neon-glow-green" />
        <span className="text-[10px] text-green-500/80 uppercase font-mono">Live Intel Sync</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-500" />
    </div>
  </GlassCard>
);

const VerticalTimeline = () => (
  <div className="mt-10 px-2">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-8 px-2">Daily Timeline</h3>
    <div className="space-y-8 relative">
      <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-500/40 via-blue-500/20 to-transparent" />
      {TIMELINE_EVENTS.map((event, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex gap-6 items-start"
        >
          <div className={cn(
            "w-4 h-4 rounded-full border-2 flex-shrink-0 z-10 transition-colors",
            i === 3 ? "bg-cyan-500 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]" : "bg-black border-white/20"
          )} />
          <div className="flex-1 -mt-1">
            <div className="flex justify-between items-baseline mb-1">
              <h4 className={cn("text-sm font-bold", i === 3 ? "text-cyan-400" : "text-white")}>{event.title}</h4>
              <span className="text-[10px] font-mono text-gray-500">{event.time}</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-light">{event.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const SetAlertModal = ({ symbol, currentPrice, onClose }: { symbol: string, currentPrice: number, onClose: () => void }) => {
  const [targetPrice, setTargetPrice] = React.useState(currentPrice.toString());
  const [condition, setCondition] = React.useState<'above' | 'below'>(targetPrice > currentPrice.toString() ? 'above' : 'below');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSetAlert = async () => {
    setIsSubmitting(true);
    try {
      await createAlert(symbol, condition, Number(targetPrice));
      onClose();
    } catch (error) {
      alert("Failed to set alert. Are you logged in?");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
    >
      <GlassCard className="w-full max-w-sm p-6 border-cyan-500/30">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white uppercase tracking-widest">Set Price Alert</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Symbol</label>
            <div className="text-xl font-mono font-bold text-cyan-400">{symbol}</div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Current Price</label>
            <div className="text-lg font-mono text-white">{formatCurrency(currentPrice)}</div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Trigger Condition</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setCondition('above')}
                className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all", condition === 'above' ? "bg-green-500 text-black border-green-400" : "bg-white/5 text-gray-500 border-white/10")}
              >
                Above
              </button>
              <button 
                onClick={() => setCondition('below')}
                className={cn("flex-1 py-2 rounded-xl text-[10px] font-bold uppercase border transition-all", condition === 'below' ? "bg-red-500 text-black border-red-400" : "bg-white/5 text-gray-500 border-white/10")}
              >
                Below
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Target Price</label>
            <input 
              type="number" 
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-cyan-500/40 outline-none"
            />
          </div>

          <button 
            disabled={isSubmitting}
            onClick={handleSetAlert}
            className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/20 active:scale-95 transition-all mt-4"
          >
            {isSubmitting ? "Syncing..." : "Confirm Alert"}
          </button>
        </div>
      </GlassCard>
    </motion.div>
  );
};

const AlertSystem = ({ markets }: { markets: LiveMarketData[] }) => {
  const [activeAlerts, setActiveAlerts] = React.useState<PriceAlert[]>([]);
  const [notifications, setNotifications] = React.useState<{ id: string, message: string }[]>([]);

  React.useEffect(() => {
    const unsub = useAlerts((alerts) => {
      setActiveAlerts(alerts);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (activeAlerts.length === 0 || markets.length === 0) return;

    activeAlerts.forEach(alert => {
      const market = markets.find(m => m.name === alert.symbol);
      if (!market) return;

      let triggered = false;
      if (alert.condition === 'above' && market.price >= alert.targetPrice) triggered = true;
      if (alert.condition === 'below' && market.price <= alert.targetPrice) triggered = true;

      if (triggered) {
        // Trigger notification
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message: `${alert.symbol} crossed ${alert.targetPrice} (${alert.condition})` }]);
        
        // Mark as triggered in DB
        markAlertAsTriggered(alert.id);

        // Sound effect (optional audio requested)
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log("Audio play blocked", e));
      }
    });
  }, [markets, activeAlerts]);

  return (
    <div className="fixed top-20 right-4 z-[200] space-y-2 pointer-events-none w-64">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div 
            key={n.id}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setNotifications(prev => prev.filter(item => item.id !== n.id)), 5000)}
            className="p-4 glass border-cyan-500/40 bg-cyan-500/10 rounded-2xl pointer-events-auto"
          >
            <div className="flex gap-3 items-center">
              <Bell className="w-4 h-4 text-cyan-400 animate-bounce" />
              <div className="flex-1">
                <div className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">Price Alert Triggered</div>
                <div className="text-xs font-bold text-white leading-tight mt-0.5">{n.message}</div>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                className="p-1 hover:bg-white/10 rounded-full"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const OptionChainTable = ({ strikes, currentPrice }: { strikes: OptionStrike[], currentPrice: number }) => (
  <div className="w-full mt-4 glass overflow-hidden rounded-2xl border border-white/5">
    <div className="grid grid-cols-5 bg-white/10 border-b border-white/10 py-3 px-2 text-center items-center">
      <div className="flex flex-col">
          <span className="text-[9px] font-bold text-green-400 uppercase tracking-tighter">Calls CE</span>
          <span className="text-[7px] text-gray-500 uppercase tracking-widest font-mono">Price</span>
      </div>
      <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center justify-center">OI</span>
      <span className="text-[10px] font-black text-white uppercase flex items-center justify-center">Strike</span>
      <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center justify-center">OI</span>
      <div className="flex flex-col">
          <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">Puts PE</span>
          <span className="text-[7px] text-gray-500 uppercase tracking-widest font-mono">Price</span>
      </div>
    </div>
    <div className="divide-y divide-white/5 max-h-[480px] overflow-y-auto scrollbar-hide">
      {strikes.map((s) => {
        const ce_itm = s.strike < currentPrice;
        const pe_itm = s.strike > currentPrice;
        return (
          <div key={s.strike} className="grid grid-cols-5 py-3 px-2 text-center items-center hover:bg-white/5 transition-colors relative">
            {/* Call Side */}
            <div className={cn("relative h-full flex items-center justify-center", ce_itm && "bg-green-500/5")}>
              {ce_itm && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500/30" />}
              <motion.span 
                key={s.ce_price}
                initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
                className={cn(
                  "text-[11px] font-mono font-bold",
                  ce_itm ? "text-green-400" : "text-green-400/60"
                )}
              >
                {formatCurrency(s.ce_price)}
              </motion.span>
            </div>
            
            <span className="text-[10px] text-gray-500 font-mono italic">{s.oi_ce}</span>
            
            {/* Strike */}
            <div className="relative flex items-center justify-center py-1">
                 <span className="text-[11px] font-bold text-white/90 z-10 font-mono">{s.strike}</span>
                 {Math.abs(s.strike - currentPrice) < 30 && (
                     <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full" />
                 )}
            </div>
            
            <span className="text-[10px] text-gray-500 font-mono italic">{s.oi_pe}</span>

            {/* Put Side */}
            <div className={cn("relative h-full flex items-center justify-center", pe_itm && "bg-red-500/5")}>
              {pe_itm && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-red-500/30" />}
              <motion.span 
                key={s.pe_price}
                initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
                className={cn(
                  "text-[11px] font-mono font-bold",
                  pe_itm ? "text-red-400" : "text-red-400/60"
                )}
              >
                {formatCurrency(s.pe_price)}
              </motion.span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const OptionChainView = ({ markets }: { markets: LiveMarketData[] }) => {
  const [selectedSymbol, setSelectedSymbol] = React.useState('Nifty 50');
  const symbols = ['Nifty 50', 'Bank Nifty', 'Sensex', 'Finnifty'];
  const currentMarket = markets.find(m => m.name === selectedSymbol) || markets[0];
  const strikes = useOptionChain(selectedSymbol, currentMarket.price);

  return (
    <div className="flex-1 p-5 pb-32">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Option Chain</h1>
        <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/10 overflow-x-auto scrollbar-hide max-w-[200px]">
          {symbols.map(sym => (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                selectedSymbol === sym ? "bg-white text-black shadow-lg" : "text-gray-500 hover:text-white"
              )}
            >
              {sym.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="mb-6 py-4 flex items-center justify-between border-cyan-500/10">
        <div>
          <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{selectedSymbol} Spot</div>
          <motion.div 
            key={currentMarket.price}
            className="text-xl font-mono font-bold text-glow-cyan"
          >
            {formatCurrency(currentMarket.price)}
          </motion.div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Net Change</div>
          <div className={cn("text-xs font-bold", currentMarket.isUp ? "text-green-400" : "text-red-400")}>
            {currentMarket.change >= 0 ? '+' : ''}{currentMarket.change.toFixed(2)}
          </div>
        </div>
      </GlassCard>

      <OptionChainTable strikes={strikes} currentPrice={currentMarket.price} />

      <div className="mt-6 p-4 glass rounded-2xl border-cyan-500/10 flex gap-3 items-center">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
          <Lock className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
             <h4 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Weekly Expiry</h4>
             <span className="text-[10px] text-gray-500 font-mono tracking-tighter">16 MAY 24</span>
          </div>
          <p className="text-[10px] text-gray-500 leading-tight mt-1">IV Skew detected in OTM Puts. Monitor carefully.</p>
        </div>
      </div>
    </div>
  );
};

const ExchangeStatus = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const isNSEOpen = () => {
      const now = new Date();
      // IST is UTC+5:30
      const istTime = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
      const day = istTime.getDay();
      const hour = istTime.getHours();
      const min = istTime.getMinutes();
      const totalMin = hour * 60 + min;
      
      // Mon-Fri, 9:15 AM - 3:30 PM
      return day >= 1 && day <= 5 && totalMin >= (9 * 60 + 15) && totalMin <= (15 * 60 + 30);
    };
    
    setIsOpen(isNSEOpen());
    const timer = setInterval(() => setIsOpen(isNSEOpen()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
      <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isOpen ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
      <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">NSE {isOpen ? 'Live' : 'Closed'}</span>
    </div>
  );
};

const DashboardView = ({ 
  markets, 
  lastUpdatedIndex, 
  isListening, 
  toggleAssistant,
  onSignalClick,
  onSetAlert
}: { 
  markets: LiveMarketData[], 
  lastUpdatedIndex: number | null, 
  isListening: boolean, 
  toggleAssistant: () => void,
  onSignalClick: (symbol: string) => void,
  onSetAlert: (data: LiveMarketData) => void
}) => (
  <div className="flex-1 space-y-8 pb-32 pt-6">
    {/* Market Grid - Broad Coverage */}
    <div className="px-5">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-3">
          <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
            Global Alpha Stream
          </h2>
          <ExchangeStatus />
        </div>
        <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
          <Activity className="w-2.5 h-2.5 text-green-500" />
          <span className="text-[8px] font-bold text-green-500 uppercase tracking-tighter">Live Real-Time</span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {markets.map((data, i) => (
          <div key={data.name} className="relative group">
            <MarketCard data={data} isFlashing={lastUpdatedIndex === i} />
            <button 
              onClick={() => onSetAlert(data)}
              className="absolute -top-1 -right-1 p-1.5 bg-black border border-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-cyan-500 group-hover:block"
            >
              <Bell className="w-2.5 h-2.5 text-gray-400 group-hover:text-black" />
            </button>
          </div>
        ))}
      </div>
    </div>

    {/* Neural Alpha Radar - Real Market Signals */}
    <div className="px-5">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
          Index Conditions & Signals
        </h2>
        <span className="text-[9px] font-mono text-gray-600">v4.0 NEURAL SYNC</span>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {[
          { symbol: 'XAUUSD', type: 'REVERSAL', confidence: 88, bias: 'BULLISH', strategy: 'SMC Discovery', status: 'Breaking Out' },
          { symbol: 'BTCUSD', type: 'BREAKOUT', confidence: 92, bias: 'BULLISH', strategy: 'Liquidity Sweep', status: 'Reversal Signal' },
          { symbol: 'NIFTY 50', type: 'REVERSAL', confidence: 76, bias: 'BEARISH', strategy: 'FVG Rejection', status: 'Consolidating' },
        ].map((signal) => (
          <GlassCard 
            key={signal.symbol} 
            onClick={() => onSignalClick(signal.symbol)}
            className="group cursor-pointer border-cyan-500/10 hover:border-cyan-500/40 transition-all p-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                 <div className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs",
                   signal.bias === 'BULLISH' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                 )}>
                   {signal.bias === 'BULLISH' ? 'BUY' : 'SELL'}
                 </div>
                 <div>
                   <h4 className="text-sm font-black font-mono tracking-tighter">{signal.symbol}</h4>
                   <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-500">{signal.status}</span>
                      <div className="w-1 h-1 rounded-full bg-gray-700" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{signal.strategy}</span>
                   </div>
                 </div>
              </div>
              <div className="text-right">
                <div className="relative w-12 h-12">
                   <svg className="w-full h-full -rotate-90">
                     <circle cx="24" cy="24" r="20" className="fill-none stroke-white/5" strokeWidth="4" />
                     <circle cx="24" cy="24" r="20" className="fill-none stroke-cyan-500 transition-all duration-1000" strokeWidth="4" strokeDasharray={`${signal.confidence * 1.25}, 125`} strokeLinecap="round" />
                   </svg>
                   <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-cyan-400">
                     {signal.confidence}%
                   </div>
                </div>
                <div className="text-[7px] text-gray-600 font-bold uppercase tracking-tighter mt-1">SMC Confidence</div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5 uppercase font-bold">YouTube Consensus</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 border border-white/5 uppercase font-bold">Real-Time Pulse</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>

    {/* Watchlist Section */}
    <div className="px-5">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Personal Watchlist</h2>
        <button className="text-[9px] font-bold text-cyan-400">EDIT</button>
      </div>
      <div className="space-y-2">
        {[
          { symbol: 'RELIANCE', price: '2,945.20', change: '+1.2%', isUp: true },
          { symbol: 'TCS', price: '3,890.15', change: '-0.4%', isUp: false },
          { symbol: 'HDFCBANK', price: '1,542.80', change: '+0.8%', isUp: true },
        ].map((item) => (
          <GlassCard key={item.symbol} className="py-3 px-4 flex items-center justify-between border-current/[0.03]">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-cyan-500/20" />
              <span className="text-sm font-bold font-mono tracking-tight">{item.symbol}</span>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold">₹{item.price}</div>
              <div className={cn("text-[8px] font-bold", item.isUp ? "text-green-500" : "text-red-500")}>{item.change}</div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>

    {/* AI Panel */}
    <div className="px-5">
      <InsightPanel />
    </div>

    {/* Jarvis Button Section */}
    <JarvisButton isListening={isListening} onClick={toggleAssistant} />

    {/* Timeline */}
    <div className="px-5">
      <VerticalTimeline />
    </div>
  </div>
);

const IndexBadge = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void, key?: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
      active ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "glass text-gray-500"
    )}
  >
    {label}
  </button>
);

const MarketView = ({ selectedIndex, setSelectedIndex }: { selectedIndex: string, setSelectedIndex: (s: string) => void }) => {
  const [timeframe, setTimeframe] = React.useState('15m');
  const history = useMarketHistory(selectedIndex, timeframe);
  const [intel, setIntel] = React.useState<MarketIntelligence | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  
  const isMarketOpen = React.useMemo(() => {
    const hours = new Date().getHours();
    const minutes = new Date().getMinutes();
    const time = hours * 100 + minutes;
    return time >= 915 && time <= 1530; // NSE hours 9:15 to 15:30
  }, []);

  const pdh = React.useMemo(() => history.length > 0 ? Math.max(...history.slice(0, history.length-10).map(c => c.high)) : undefined, [history]);
  const pdl = React.useMemo(() => history.length > 0 ? Math.min(...history.slice(0, history.length-10).map(c => c.low)) : undefined, [history]);

  const runAnalysis = async () => {
    if (history.length === 0) return;
    setIsAnalyzing(true);
    const result = await getMarketIntelligence(selectedIndex, timeframe, history);
    setIntel(result);
    setIsAnalyzing(false);
  };

  React.useEffect(() => {
    setIntel(null);
    const timer = setTimeout(() => runAnalysis(), 1000);
    return () => clearTimeout(timer);
  }, [selectedIndex, timeframe]);

  return (
    <div className="flex-1 flex flex-col h-full bg-black overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.03),transparent_70%)] pointer-events-none" />
      
      {/* Chart Header Controls */}
      <div className="p-4 border-b border-white/5 space-y-4 relative z-10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className={cn(
               "w-2 h-2 rounded-full animate-pulse",
               isMarketOpen ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
             )} />
             <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
               {isMarketOpen ? "Live Alpha Engine" : "Market Recon Mode"}
             </span>
           </div>
           <div className="flex items-center gap-1.5">
             {(['1m', '5m', '15m', '1h', '4h'] as const).map((t) => (
               <button 
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-lg text-[9px] font-bold uppercase transition-all",
                  timeframe === t ? "text-cyan-400 bg-cyan-400/15 border border-cyan-400/30" : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
               >
                 {t}
               </button>
             ))}
           </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {['XAUUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'NIFTY 50', 'BANK NIFTY', 'NASDAQ', 'DAX'].map((idx) => (
            <IndexBadge 
              key={idx} 
              label={idx} 
              active={selectedIndex === idx} 
              onClick={() => setSelectedIndex(idx)} 
            />
          ))}
        </div>
      </div>

      {/* Main Terminal View */}
      <div className="flex-1 relative bg-[#010101] flex flex-col md:flex-row">
         <div className="flex-1 relative">
            <AdvancedChart data={history} pdh={pdh} pdl={pdl} symbol={selectedIndex} />
            
            {/* Intel Overlay */}
            <AnimatePresence>
            {intel && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 left-4 p-4 glass rounded-2xl border border-white/5 space-y-3 max-w-[280px] shadow-2xl z-20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <div className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase",
                      intel.bias === 'BULLISH' ? "bg-green-500 text-black" : "bg-red-500 text-white"
                    )}>
                      {intel.bias}
                    </div>
                    <div className="px-2 py-0.5 rounded bg-cyan-500 text-black text-[8px] font-black tracking-widest uppercase">
                      {intel.setupType}
                    </div>
                  </div>
                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">NEURAL ALPHA</div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-tight">{intel.strategy}</h4>
                    <span className="text-[10px] font-mono font-black text-cyan-400">{intel.neuralConfidence}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${intel.neuralConfidence}%` }}
                      className="h-full bg-cyan-500"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed italic mt-2">"{intel.setup}"</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  <div>
                    <span className="text-[8px] text-gray-600 block uppercase font-bold">Stop Loss</span>
                    <span className="text-[11px] font-mono font-bold text-red-400">{intel.stopLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-gray-600 block uppercase font-bold">Target (1:2)</span>
                    <span className="text-[11px] font-mono font-bold text-green-400">{intel.target.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
                    YouTube Consensus
                  </div>
                  <div className="text-[9px] text-gray-500 leading-tight line-clamp-2">
                    {intel.insights.youtubeSentiment}
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>

            {isAnalyzing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-30">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-t-2 border-cyan-500 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-b-2 border-blue-500 animate-spin-reverse" />
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 animate-pulse tracking-[0.3em] uppercase">Synthesizing Alpha...</span>
                </div>
              </div>
            )}
         </div>

         {/* Side Intelligence Panel (Desktop or Scroll) */}
         <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/5 bg-black/20 overflow-y-auto max-h-[300px] md:max-h-none scrollbar-hide">
            <div className="p-4 space-y-6">
              <section>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center justify-between">
                  Institutional Levels
                  <span className="text-[8px] text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded leading-none">ICT/SMC</span>
                </h3>
                <div className="space-y-3">
                  {intel?.keyLevels.ob.map((level, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02] border border-white/5 group hover:border-cyan-500/30 transition-colors">
                      <span className="text-[9px] font-bold text-cyan-500">OB</span>
                      <span className="text-[10px] font-mono font-bold text-white tracking-widest">{level}</span>
                    </div>
                  ))}
                  {intel?.keyLevels.fvg.map((level, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02] border border-white/5 group hover:border-amber-500/30 transition-colors">
                      <span className="text-[9px] font-bold text-amber-500">FVG</span>
                      <span className="text-[10px] font-mono font-bold text-white tracking-widest">{level}</span>
                    </div>
                  ))}
                  {intel?.keyLevels.pivotPoints.map((level, i) => (
                    <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.02] border border-white/5 group hover:border-blue-500/30 transition-colors">
                      <span className="text-[9px] font-bold text-blue-500">PVT</span>
                      <span className="text-[10px] font-mono font-bold text-white tracking-widest">{level}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 flex items-center justify-between">
                  Economic Calendar
                  <span className="text-[8px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded leading-none">ForexFactory</span>
                </h3>
                <div className="space-y-2">
                  {intel?.economicCalendar.map((item, i) => (
                    <div key={i} className="p-2 rounded-lg bg-white/[0.02] border border-white/5">
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-[8px] font-black px-1.5 py-0.5 rounded",
                          item.impact === 'HIGH' ? "bg-red-500 text-white" : item.impact === 'MED' ? "bg-orange-500 text-white" : "bg-gray-500 text-white"
                        )}>{item.impact} IMPACT</span>
                        <span className="text-[8px] text-gray-500 font-mono">{item.time}</span>
                      </div>
                      <p className="text-[9px] font-bold text-white leading-tight">{item.event}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                    <label className="text-[7px] text-gray-500 font-black uppercase">Investing.com</label>
                    <div className="text-[9px] font-bold text-cyan-400 truncate">{intel?.insights.investingTech}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
                    <label className="text-[7px] text-gray-500 font-black uppercase">Yahoo Finance</label>
                    <div className="text-[9px] font-bold text-white truncate">{intel?.insights.yahooFinance}</div>
                  </div>
                </div>

                <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3">Global Pulse</h3>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[8px] text-red-400 font-bold uppercase flex items-center gap-1">
                        <Youtube className="w-2.5 h-2.5" /> Youtube Traders
                      </label>
                      <p className="text-[9px] text-gray-500 leading-relaxed font-medium line-clamp-3">"{intel?.insights.youtubeSentiment}"</p>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] text-pink-400 font-bold uppercase flex items-center gap-1">
                        <Pin className="w-2.5 h-2.5" /> Pinterest Flux
                      </label>
                      <p className="text-[9px] text-gray-500 leading-relaxed font-medium line-clamp-3">"{intel?.insights.pinterestVisuals}"</p>
                   </div>
                </div>
              </section>
            </div>
         </div>
      </div>

      {/* Terminal Stats Footer */}
      <div className="px-5 pb-24 pt-4 grid grid-cols-3 gap-3 bg-black/80 backdrop-blur-xl border-t border-white/5">
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
          <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">Vol Delta</label>
          <div className="text-xs font-mono font-bold text-white tracking-widest">+12.4K</div>
        </div>
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
          <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">RSI (14)</label>
          <div className="text-xs font-mono font-bold text-cyan-400 tracking-widest">62.8</div>
        </div>
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
          <label className="text-[8px] text-gray-500 uppercase font-black tracking-widest block mb-1">ATR</label>
          <div className="text-xs font-mono font-bold text-white tracking-widest">4.12</div>
        </div>
      </div>
    </div>
  );
};

const NewsView = ({ 
  news, 
  isNewsLoading, 
  refreshNews 
}: { 
  news: MarketNews[], 
  isNewsLoading: boolean, 
  refreshNews: () => void 
}) => {
  const [selectedImpact, setSelectedImpact] = React.useState<string | 'All'>('All');
  const [selectedCat, setSelectedCat] = React.useState<string | 'All'>('All');

  const categories = ['All', ...Array.from(new Set(news.map(item => item.category)))];
  const impacts = ['All', 'High', 'Medium', 'Low'];

  const filteredNews = news.filter(item => {
    const matchImpact = selectedImpact === 'All' || item.impact === selectedImpact;
    const matchCat = selectedCat === 'All' || item.category === selectedCat;
    return matchImpact && matchCat;
  });

  return (
    <div className="flex-1 p-5 pb-32 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Live Pulse</h1>
        <button 
          onClick={refreshNews}
          disabled={isNewsLoading}
          className={cn(
            "w-10 h-10 rounded-full glass flex items-center justify-center transition-all",
            isNewsLoading && "animate-spin opacity-50"
          )}
        >
          <Zap className={cn("w-4 h-4", !isNewsLoading && "text-cyan-400")} />
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {impacts.map(impact => (
            <button
              key={impact}
              onClick={() => setSelectedImpact(impact)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                selectedImpact === impact 
                  ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" 
                  : "bg-white/5 border border-white/10 text-gray-500 hover:text-white"
              )}
            >
              {impact}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 border-b border-white/5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                selectedCat === cat 
                  ? "bg-white text-black shadow-lg" 
                  : "text-gray-500 hover:text-white"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isNewsLoading && (
        <div className="text-center py-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-cyan-500/20 text-cyan-400 text-xs font-mono">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Zap className="w-3 h-3" /></motion.div>
            Consulting Global Intel...
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {filteredNews.length > 0 ? filteredNews.map((item) => (
          <GlassCard key={item.id} className="p-4 border-l-2 border-l-cyan-500">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{item.category}</span>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tighter",
                item.impact === 'High' ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
              )}>
                {item.impact} IMPACT
              </div>
            </div>
            <h3 className="font-bold text-sm mb-1 leading-snug">{item.title}</h3>
            <p className="text-xs text-gray-500 mb-3 font-light leading-relaxed">{item.summary}</p>
            <div className="flex justify-between items-center text-[10px] text-gray-600 font-mono">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{item.time}</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400/60">
                <Zap className="w-3 h-3" />
                <span>Jarvis Intelligence</span>
              </div>
            </div>
          </GlassCard>
        )) : !isNewsLoading && (
          <div className="text-center py-20 text-gray-600 text-xs font-mono uppercase tracking-widest">
            No matching intelligence found
          </div>
        )}
      </div>
    </div>
  );
};

interface UserProfile {
  name: string;
  email: string;
  plan: string;
  voiceSpeed: number;
  voiceFeedback: boolean;
  notifications: boolean;
  marketSessions: boolean;
  themePreference: 'auto' | 'light' | 'dark';
}

const StockDetailsCard = ({ 
  stock, 
  intel,
  onTrade 
}: { 
  stock: StockDetail, 
  intel: MarketIntelligence | null,
  onTrade: (side: 'BUY' | 'SELL') => void 
}) => {
  return (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
    <GlassCard className="p-5 border-cyan-500/20">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{stock.sector}</span>
          <h2 className="text-2xl font-bold">{stock.name}</h2>
          <p className="text-xs font-mono text-gray-500">{stock.symbol}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold">
            {formatCurrency(stock.price)}
          </div>
          <div className={cn("text-xs font-bold", stock.change >= 0 ? "text-green-400" : "text-red-400")}>
            {stock.change >= 0 ? '+' : ''}{formatCurrency(Math.abs(stock.change))} ({stock.changePercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-400 leading-relaxed mb-6 italic">"{stock.description}"</p>

      {intel && (
        <div className="mb-6 p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                intel.bias === 'BULLISH' ? "bg-green-500 text-black" : "bg-red-500 text-white"
              )}>{intel.bias} SIGNAL</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500 text-black text-[8px] font-black uppercase">{intel.setupType}</span>
            </div>
            <div className="text-[9px] font-mono text-cyan-400 font-black">{intel.neuralConfidence}% CONFIDENCE</div>
          </div>
          <div className="space-y-1">
             <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{intel.strategy}</h4>
             <p className="text-[10px] text-gray-400 italic">"{intel.setup}"</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
             <div>
                <label className="text-[7px] text-gray-500 uppercase block mb-1">Target Entry/Exit</label>
                <div className="text-xs font-mono font-bold text-green-400">Target: {intel.target.toLocaleString()}</div>
                <div className="text-xs font-mono font-bold text-red-400">Stop: {intel.stopLoss.toLocaleString()}</div>
             </div>
             <div className="text-right">
                <label className="text-[7px] text-gray-500 uppercase block mb-1">Risk Reward</label>
                <div className="text-xs font-mono font-bold text-cyan-400">{intel.rrRatio} Ratio</div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-[8px] text-gray-500 uppercase block mb-1">Market Cap</label>
            <p className="text-sm font-mono text-current tracking-widest">{stock.marketCap}</p>
          </div>
          <div>
            <label className="text-[8px] text-gray-500 uppercase block mb-1">52W High/Low</label>
            <p className="text-xs font-mono text-current">H: {stock.high52w} | L: {stock.low52w}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[8px] text-gray-500 uppercase block mb-1">P/E Ratio</label>
            <p className="text-sm font-mono text-current">{stock.peRatio}</p>
          </div>
          <div>
            <label className="text-[8px] text-gray-500 uppercase block mb-1">Volume</label>
            <p className="text-sm font-mono text-current">{stock.volume}</p>
          </div>
        </div>
      </div>
    </GlassCard>

    <div className="flex gap-3">
      <button 
        onClick={() => onTrade('BUY')}
        className="flex-1 py-4 rounded-2xl bg-green-500 text-black font-black text-sm tracking-[0.2em] uppercase shadow-lg shadow-green-500/20 active:scale-95 transition-transform"
      >
        BUY
      </button>
      <button 
        onClick={() => onTrade('SELL')}
        className="flex-1 py-4 rounded-2xl bg-red-500 text-black font-black text-sm tracking-[0.2em] uppercase shadow-lg shadow-red-500/20 active:scale-95 transition-transform"
      >
        SELL
      </button>
    </div>
  </div>
  );
};

const SearchView = ({ onTrade }: { onTrade: (stock: StockDetail, side: 'BUY' | 'SELL') => void }) => {
  const [query, setQuery] = React.useState('');
  const [result, setResult] = React.useState<StockDetail | null>(null);
  const [intel, setIntel] = React.useState<MarketIntelligence | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);
    setIntel(null);
    const stock = await searchStock(query);
    if (stock) {
      setResult(stock);
      // Fetch intelligence for the searched asset
      const analysis = await getMarketIntelligence(stock.symbol, '1d', []);
      setIntel(analysis);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex-1 p-5 pb-32 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Market Intelligence</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none">Access Global & Indian Multi-cap Research</p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Symbol (e.g. RELIANCE, ZOMATO)"
          className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
        />
        <button type="submit" className="hidden" />
      </form>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500"
          />
          <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em] animate-pulse">Scanning Terminals...</span>
        </div>
      )}

      {result && <StockDetailsCard stock={result} intel={intel} onTrade={(side) => onTrade(result, side)} />}

      {!result && !isLoading && (
        <div className="p-8 border border-current/5 rounded-3xl bg-current/[0.02] text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-current/5 flex items-center justify-center mx-auto">
             <Eye className="w-8 h-8 text-gray-400" />
          </div>
          <div className="space-y-1">
             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Global Watchlist Active</h4>
             <p className="text-[10px] text-gray-500 leading-relaxed px-4">Search any large, mid, or small cap Indian stock for real-time fundamental & technical debriefs.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em] px-1">Recent Research</h3>
        {['RELIANCE', 'TATASTEEL', 'ZOMATO'].map((s) => (
          <button 
            key={s}
            onClick={() => { setQuery(s); handleSearch({ preventDefault: () => {} } as any); }}
            className="w-full p-4 glass flex justify-between items-center hover:bg-white/5 transition-colors border-white/5"
          >
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-[10px] font-bold text-cyan-400">{s[0]}</div>
               <span className="text-sm font-mono font-bold">{s}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        ))}
      </div>
    </div>
  );
};

const JournalView = () => {
  const { trades, stats, addTrade, setInitialBalance } = useTradeJournal();
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    symbol: '',
    segment: 'FnO' as Segment,
    entryPrice: '',
    exitPrice: '',
    quantity: '',
    lotSize: '1',
    reasonEntry: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleSubmit = () => {
    if (!formData.symbol || !formData.entryPrice || !formData.exitPrice || !formData.quantity) return;
    
    addTrade({
      symbol: formData.symbol.toUpperCase(),
      segment: formData.segment,
      entryPrice: Number(formData.entryPrice),
      exitPrice: Number(formData.exitPrice),
      quantity: Number(formData.quantity),
      lotSize: Number(formData.lotSize),
      reasonEntry: formData.reasonEntry,
      reasonExit: '',
      mistakes: '',
      remarks: '',
      date: formData.date
    });
    
    setFormData({
      symbol: '',
      segment: 'FnO',
      entryPrice: '',
      exitPrice: '',
      quantity: '',
      lotSize: '1',
      reasonEntry: '',
      date: format(new Date(), 'yyyy-MM-dd')
    });
    setShowForm(false);
  };

  return (
    <div className="flex-1 p-5 pb-32 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trade Journal</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"
        >
          {showForm ? <X className="w-5 h-5 text-black" /> : <Plus className="w-5 h-5 text-black" />}
        </button>
      </div>

      {/* Account Performance */}
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4 border-cyan-500/10">
          <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Funded Capital</label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono font-bold leading-none">₹</span>
            <input 
              type="number" 
              value={stats.initialBalance || ''} 
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              placeholder="0.00"
              className="bg-transparent text-lg font-mono font-bold leading-none w-full outline-none focus:text-cyan-400 transition-colors"
            />
          </div>
          <div className="mt-2 text-[9px] text-gray-400">Total Eq: {formatCurrency(stats.currentBalance)}</div>
        </GlassCard>
        <GlassCard className="p-4 border-cyan-500/10">
          <label className="text-[9px] text-gray-500 uppercase tracking-widest block mb-1">Total PnL</label>
          <div className={cn(
            "text-lg font-mono font-bold leading-none",
            stats.totalPnL >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {stats.totalPnL >= 0 ? '+' : ''}{formatCurrency(stats.totalPnL)}
          </div>
          <div className="mt-2 text-[9px] text-gray-400">Win Rate: {stats.winRate.toFixed(1)}%</div>
        </GlassCard>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 glass border-white/5 rounded-2xl flex flex-col items-center">
          <span className="text-[7px] text-gray-600 font-black uppercase mb-1">Profit Factor</span>
          <span className="text-xs font-mono font-bold text-cyan-400">{stats.profitFactor.toFixed(2)}</span>
        </div>
        <div className="p-3 glass border-white/5 rounded-2xl flex flex-col items-center">
          <span className="text-[7px] text-gray-600 font-black uppercase mb-1">Avg Win/Loss</span>
          <span className={cn(
            "text-xs font-mono font-bold",
            stats.avgWin > stats.avgLoss ? "text-green-500" : "text-white"
          )}>{(stats.avgWin / (stats.avgLoss || 1)).toFixed(1)}:1</span>
        </div>
        <div className="p-3 glass border-white/5 rounded-2xl flex flex-col items-center">
          <span className="text-[7px] text-gray-600 font-black uppercase mb-1">Max Drawdown</span>
          <span className="text-xs font-mono font-bold text-red-400">-{stats.maxDrawdownPercent.toFixed(1)}%</span>
        </div>
      </div>

      <PnLCalendar dailyPnL={stats.dailyPnL} />

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="mb-6 p-5 border-cyan-500/30 space-y-4">
              <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Post New Intelligence</h3>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Symbol (e.g. NIFTY)" 
                  value={formData.symbol}
                  onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                  className="bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30 placeholder:text-gray-500" 
                />
                <select 
                  value={formData.segment}
                  onChange={(e) => setFormData({...formData, segment: e.target.value as Segment})}
                  className="bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30"
                >
                  <option value="FnO" className="bg-black text-white">FnO</option>
                  <option value="Equity" className="bg-black text-white">Equity</option>
                  <option value="Commodity" className="bg-black text-white">Commodity</option>
                  <option value="Currency" className="bg-black text-white">Currency</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Entry Price" 
                  type="number" 
                  value={formData.entryPrice}
                  onChange={(e) => setFormData({...formData, entryPrice: e.target.value})}
                  className="bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30 placeholder:text-gray-500" 
                />
                <input 
                  placeholder="Exit Price" 
                  type="number" 
                  value={formData.exitPrice}
                  onChange={(e) => setFormData({...formData, exitPrice: e.target.value})}
                  className="bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30 placeholder:text-gray-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  placeholder="Quantity" 
                  type="number" 
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30 placeholder:text-gray-500" 
                />
                <input 
                  placeholder="Date" 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30 placeholder:text-gray-500" 
                />
              </div>
              <textarea 
                placeholder="Reason for Entry & Exit..." 
                rows={2} 
                value={formData.reasonEntry}
                onChange={(e) => setFormData({...formData, reasonEntry: e.target.value})}
                className="w-full bg-current/10 border border-current/10 rounded-xl px-3 py-2 text-xs text-current outline-none focus:border-cyan-500/30 placeholder:text-gray-500" 
              />
              <button 
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl bg-cyan-500 text-black font-bold text-xs uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/20"
              >
                Log Signal
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 flex justify-between items-center">
          Mission Log
          <span className="text-[10px] text-gray-600 font-mono tracking-tighter">ALL EXECUTIONS</span>
        </h3>
        {trades.map((trade) => (
          <GlassCard key={trade.id} className="p-0 overflow-hidden border-current/5 hover:border-cyan-500/20 transition-all">
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
              <div className="flex items-center gap-3">
                 <div className={cn(
                   "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                   trade.pnl >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                 )}>
                   {trade.pnl >= 0 ? 'W' : 'L'}
                 </div>
                 <div>
                   <div className="flex items-center gap-2">
                     <span className="text-[9px] text-cyan-500 font-bold uppercase tracking-tight">{trade.segment}</span>
                     <span className="text-[9px] text-gray-500 font-mono tracking-tighter">{trade.date}</span>
                   </div>
                   <h4 className="font-bold text-sm tracking-tight">{trade.symbol}</h4>
                 </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "font-mono font-black text-sm",
                  trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                </div>
                <div className="text-[8px] text-gray-600 font-bold uppercase tracking-tighter">Net Result</div>
              </div>
            </div>
            
            <div className="p-3 grid grid-cols-3 gap-3 bg-white/[0.01]">
              <div className="space-y-1">
                <label className="text-[7px] text-gray-500 uppercase block font-black mb-1">Execution</label>
                <div className="flex flex-col gap-0.5">
                   <span className="text-[10px] text-gray-300 font-mono flex items-center gap-1.5">
                     <div className="w-1 h-1 rounded-full bg-cyan-500" />
                     {trade.entryPrice.toLocaleString()}
                   </span>
                   <span className="text-[10px] text-gray-300 font-mono flex items-center gap-1.5">
                     <div className="w-1 h-1 rounded-full bg-orange-500" />
                     {trade.exitPrice.toLocaleString()}
                   </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-gray-500 uppercase block font-black mb-1">Position</label>
                <div className="text-[10px] text-white font-mono">
                  {trade.quantity} <span className="text-gray-500 text-[8px]">UNITS</span>
                </div>
                <div className="text-[8px] text-gray-600 font-bold">RR: {(Math.abs(trade.pnl) / (trade.entryPrice * 0.01 * trade.quantity) || 1).toFixed(1)}x</div>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] text-gray-500 uppercase block font-black mb-1">Narrative</label>
                <p className="text-[10px] text-gray-500 leading-tight line-clamp-2 italic">"{trade.reasonEntry || 'No intelligence logged'}"</p>
              </div>
            </div>

            <div className="px-3 py-1.5 bg-cyan-500/5 flex items-center justify-between border-t border-white/5">
              <span className="text-[8px] text-gray-600 font-mono uppercase font-black">Trade ID: {trade.id}</span>
              <button className="text-[8px] text-cyan-400 font-black tracking-widest flex items-center gap-1 group">
                DEBRIEF <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

const SettingsView = ({ 
  profile, 
  setProfile 
}: { 
  profile: UserProfile, 
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>> 
}) => {
  const [apiKey, setApiKey] = React.useState('••••••••••••••••');
  const [isEditingApi, setIsEditingApi] = React.useState(false);

  return (
    <div className="flex-1 p-5 pb-32 space-y-8">
      <div className="flex flex-col items-center py-6">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-full border border-cyan-500/30 p-1">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-800 to-blue-900 flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-current flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold">{profile.name}</h2>
        <p className="text-xs text-cyan-500 font-mono tracking-widest">{profile.plan} · ACTIVE</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Interface Appearance</h3>
          <GlassCard className="p-0 overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SettingsIcon className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col">
                  <span className="text-sm">Display Theme</span>
                  <span className="text-[10px] text-gray-500">Manual or Auto (6PM Dark)</span>
                </div>
              </div>
              <div className="flex bg-current/5 p-1 rounded-lg border border-current/10">
                {(['auto', 'light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setProfile({...profile, themePreference: t})}
                    className={cn(
                      "px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all",
                      profile.themePreference === t 
                        ? "bg-cyan-500 text-black shadow-lg" 
                        : "text-gray-500 hover:text-cyan-500/50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Account Details */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Account Vault</h3>
          <GlassCard className="p-4 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Email</span>
              <span className="font-mono">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-4 border-t border-current/5">
              <span className="text-gray-500">Member Since</span>
              <span className="font-mono">MAY 2024</span>
            </div>
          </GlassCard>
        </section>

        {/* Trading Preferences */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Tactical Preferences</h3>
          <GlassCard className="p-0 overflow-hidden">
            <div className="divide-y divide-white/5">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-sm">Real-time Notifications</span>
                    <span className="text-[10px] text-gray-500">Signals & Alert Pings</span>
                  </div>
                </div>
                <button 
                  onClick={() => setProfile({...profile, notifications: !profile.notifications})}
                  className={cn(
                    "w-10 h-5 rounded-full p-1 transition-colors duration-300",
                    profile.notifications ? "bg-cyan-500 flex justify-end" : "bg-current/10 flex justify-start"
                  )}
                >
                  <motion.div layout className="w-3 h-3 bg-white rounded-full shadow-lg" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="text-sm">Market Sessions</span>
                    <span className="text-[10px] text-gray-500">Enable session overlays</span>
                  </div>
                </div>
                <button 
                  onClick={() => setProfile({...profile, marketSessions: !profile.marketSessions})}
                  className={cn(
                    "w-10 h-5 rounded-full p-1 transition-colors duration-300",
                    profile.marketSessions ? "bg-cyan-500 flex justify-end" : "bg-current/10 flex justify-start"
                  )}
                >
                  <motion.div layout className="w-3 h-3 bg-white rounded-full shadow-lg" />
                </button>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* Audio & Interface */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1">Audio Systems</h3>
          <GlassCard className="p-0 overflow-hidden">
            <div className="divide-y divide-white/5">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">Voice Speed</span>
                </div>
                <div className="flex items-center gap-4">
                   <button onClick={() => setProfile({...profile, voiceSpeed: Math.max(0.5, profile.voiceSpeed - 0.1)})} className="text-gray-500 text-lg">-</button>
                   <span className="text-xs text-cyan-400 font-mono">{profile.voiceSpeed.toFixed(1)}x</span>
                   <button onClick={() => setProfile({...profile, voiceSpeed: Math.min(2.0, profile.voiceSpeed + 0.1)})} className="text-gray-500 text-lg">+</button>
                </div>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* API Settings */}
        <section>
          <div className="flex justify-between items-center mb-3 px-1">
             <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Global API Feed</h3>
             <Lock className="w-3 h-3 text-cyan-400 opacity-50" />
          </div>
          <GlassCard className="p-4 relative group">
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400 font-medium">Broker Service (NSE/BSE)</span>
                <button 
                  onClick={() => setIsEditingApi(!isEditingApi)}
                  className="text-[10px] text-cyan-400 uppercase font-bold tracking-tighter"
                >
                  {isEditingApi ? 'SAVE KEY' : 'RE-BIND'}
                </button>
             </div>
             <div className="relative">
                <input 
                  type={isEditingApi ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  readOnly={!isEditingApi}
                  className={cn(
                    "w-full bg-current/10 border border-current/10 rounded-xl px-4 py-3 text-sm font-mono tracking-widest",
                    isEditingApi && "border-cyan-500/30 text-current outline-none"
                  )}
                />
             </div>
             <p className="mt-3 text-[9px] text-gray-600 leading-relaxed">
               Encryption active. API key is stored in your device's secure enclave and never transmitted to our cloud.
             </p>
          </GlassCard>
        </section>

        <button className="w-full py-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-500 text-xs font-bold tracking-[0.2em] uppercase hover:bg-red-500/10 transition-colors">
          Self Destruct / Sign Out
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [activeScreen, setActiveScreen] = React.useState<Screen>('dashboard');
  const [marketSymbol, setMarketSymbol] = React.useState('XAUUSD');
  const [isListening, setIsListening] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [news, setNews] = React.useState<MarketNews[]>(INITIAL_NEWS);
  const [isNewsLoading, setIsNewsLoading] = React.useState(false);
  const [alerts, setAlerts] = React.useState<{ symbol: string; price: number }[]>([]);
  const [jarvisMessage, setJarvisMessage] = React.useState<string | null>(null);
  const [commandText, setCommandText] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [alertSymbol, setAlertSymbol] = React.useState<LiveMarketData | null>(null);
  const [currentUser, setCurrentUser] = React.useState<FirebaseUser | null>(null);
  
  const [userProfile, setUserProfile] = React.useState<UserProfile>({
    name: "Trading Admin",
    email: "lilubunty@gmail.com",
    plan: "PRO ACCESS",
    voiceSpeed: 1.2,
    voiceFeedback: true,
    notifications: true,
    marketSessions: true,
    themePreference: 'auto'
  });

  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark');

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setUserProfile(prev => ({
          ...prev,
          name: user.displayName || "Trader",
          email: user.email || prev.email
        }));
      }
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    const updateTheme = () => {
      const hours = new Date().getHours();
      // Auto: 6 PM (18) to 6 AM (6) is dark
      const isNight = hours >= 18 || hours < 6;
      
      const currentTheme = userProfile.themePreference === 'auto' 
        ? (isNight ? 'dark' : 'light') 
        : userProfile.themePreference;
        
      setTheme(currentTheme);
      document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    };

    updateTheme();
    const interval = setInterval(updateTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [userProfile.themePreference]);
  
  // Real-time Market Hook
  const { markets, lastUpdatedIndex } = useLiveMarketData();

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    // Initial news fetch
    refreshNews();
    return () => clearInterval(timer);
  }, []);

  // Journal Hook
  const { trades, stats, addTrade } = useTradeJournal();

  const handleQuickTrade = (stock: StockDetail, side: 'BUY' | 'SELL') => {
    addTrade({
      date: format(new Date(), 'yyyy-MM-dd'),
      symbol: stock.symbol,
      segment: 'Equity',
      entryPrice: stock.price,
      exitPrice: side === 'BUY' ? stock.price * 1.02 : stock.price * 0.98, // Simulated
      quantity: 1,
      lotSize: 1,
      reasonEntry: `Manual ${side} order from Intelligence Terminal.`,
      reasonExit: 'Simulated closure.',
      mistakes: 'None detected.',
      remarks: 'Quick trade from search.',
    });
    setActiveScreen('journal');
  };

  const refreshNews = async () => {
    setIsNewsLoading(true);
    const freshNews = await fetchLiveMarketNews();
    if (freshNews.length > 0 && freshNews[0].id !== 'err') {
      setNews(freshNews);
    }
    setIsNewsLoading(false);
  };

  const toggleAssistant = () => {
    if (isListening) {
      setIsListening(false);
      setCommandText('');
      return;
    }
    setIsListening(true);
    setJarvisMessage(null);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim()) return;

    setIsProcessing(true);
    const action = await processJarvisCommand(commandText);
    
    if (action) {
      setJarvisMessage(action.message);
      
      // Execute internal actions
      setTimeout(() => {
        if (action.type === 'NAVIGATE' && action.payload?.screen) {
          setActiveScreen(action.payload.screen);
        } else if (action.type === 'FETCH_STOCK' && action.payload?.symbol) {
          setActiveScreen('search');
          // We can't easily trigger the search inside SearchView from here without more complex state lifting,
          // but at least we navigate there. 
        } else if (action.type === 'SET_ALERT' && action.payload?.price) {
          if (currentUser) {
            createAlert(action.payload.symbol, action.payload.price > (markets.find(m => m.name === action.payload.symbol)?.price || 0) ? 'above' : 'below', action.payload.price);
          } else {
            setJarvisMessage("Please sign in to set persistent price alerts.");
          }
        }
        
        // Auto-close overlay after 2.5 seconds if successful
        setTimeout(() => {
          setIsListening(false);
          setJarvisMessage(null);
          setCommandText('');
        }, 2500);
      }, 1000);
    } else {
      setJarvisMessage("I encountered an error communicating with global systems.");
    }
    setIsProcessing(false);
  };

  return (
    <div className={cn(
      "flex flex-col h-screen font-sans max-w-md mx-auto relative shadow-2xl transition-colors duration-700",
      theme === 'dark' ? "bg-black text-white shadow-indigo-500/20" : "bg-gray-50 text-gray-900 shadow-gray-200"
    )}>
      {/* Jarvis Intelligence Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] glass backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
          >
            <button 
              onClick={() => setIsListening(false)}
              className="absolute top-6 right-6 p-2 rounded-full glass hover:bg-white/10"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>

            <div className="w-32 h-32 relative mb-8">
               <motion.div 
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 90, 180, 270, 360],
                    borderWidth: [2, 4, 2]
                  }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute inset-0 rounded-full border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.3)]"
               />
               <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-900/50 to-blue-900/50 flex items-center justify-center">
                  <Cpu className="w-12 h-12 text-cyan-400 animate-pulse" />
               </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
              {isProcessing ? "Processing Intelligence..." : "Listening to your command..."}
            </h2>
            
            {jarvisMessage ? (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-cyan-400 font-mono text-sm leading-relaxed max-w-xs"
              >
                {jarvisMessage}
              </motion.p>
            ) : (
              <form onSubmit={handleCommand} className="w-full max-w-xs">
                <input 
                  autoFocus
                  value={commandText}
                  onChange={(e) => setCommandText(e.target.value)}
                  placeholder="e.g. 'Navigate to market'"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-all text-center placeholder:text-gray-600"
                />
                <button type="submit" className="hidden" />
                <p className="mt-4 text-[10px] text-gray-500 uppercase tracking-widest animate-pulse font-mono">
                  Press Enter to Submit
                </p>
              </form>
            )}

            {alerts.length > 0 && (
              <div className="mt-8 flex gap-2 overflow-x-auto w-full justify-center scrollbar-hide">
                {alerts.slice(-3).map((a, i) => (
                  <div key={i} className="px-3 py-1 rounded-full glass border-cyan-500/30 text-[9px] text-cyan-400 font-mono whitespace-nowrap">
                    ALERT: {a.symbol} @ {a.price}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top Header */}
      <header className={cn(
        "px-5 pt-6 pb-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-lg border-b transition-colors duration-500",
        theme === 'dark' ? "bg-black/60 border-white/5" : "bg-white/60 border-black/5"
      )}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Online</span>
          </div>
          <h1 className={cn(
            "text-sm font-bold uppercase tracking-[0.2em] mt-0.5",
            theme === 'dark' ? "text-cyan-400" : "text-gray-900"
          )}>Liquidity Engineer AI</h1>
          <span className="text-[8px] text-gray-600 font-black uppercase tracking-tighter -mt-1">by Bharat B Sethy</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-mono font-bold leading-none">{format(currentTime, 'HH:mm:ss')}</div>
          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-1">{format(currentTime, 'EEE, dd MMM')}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="min-h-full"
          >
            {activeScreen === 'dashboard' && (
              <DashboardView 
                markets={markets} 
                lastUpdatedIndex={lastUpdatedIndex} 
                isListening={isListening} 
                toggleAssistant={toggleAssistant} 
                onSignalClick={(sym) => {
                  setMarketSymbol(sym);
                  setActiveScreen('market');
                }}
                onSetAlert={(data) => {
                   if (!currentUser) {
                      signInWithGoogle().catch(console.error);
                   } else {
                      setAlertSymbol(data);
                   }
                }}
              />
            )}
            {activeScreen === 'market' && <MarketView selectedIndex={marketSymbol} setSelectedIndex={setMarketSymbol} />}
            {activeScreen === 'search' && <SearchView onTrade={handleQuickTrade} />}
            {activeScreen === 'options' && <OptionChainView markets={markets} />}
            {activeScreen === 'news' && <NewsView news={news} isNewsLoading={isNewsLoading} refreshNews={refreshNews} />}
            {activeScreen === 'journal' && <JournalView />}
            {activeScreen === 'settings' && (
              <div className="flex-1 p-5 pb-32 flex flex-col items-center justify-center space-y-6">
                {!currentUser ? (
                  <GlassCard className="max-w-xs p-8 text-center space-y-6 border-cyan-500/20">
                     <div className="w-20 h-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-10 h-10 text-cyan-400" />
                     </div>
                     <div>
                       <h2 className="text-xl font-bold uppercase tracking-tight">Access Secure Systems</h2>
                       <p className="text-xs text-gray-500 mt-2">Sign in with Google to sync your PnL journal and price alerts across neural terminals.</p>
                     </div>
                     <button 
                        onClick={() => signInWithGoogle()}
                        className="w-full py-4 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                     >
                        <User className="w-4 h-4" /> Sign In with Google
                     </button>
                  </GlassCard>
                ) : (
                  <React.Fragment>
                     <SettingsView profile={userProfile} setProfile={setUserProfile} />
                     <button 
                        onClick={() => signOut(auth)}
                        className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-4 opacity-50 hover:opacity-100"
                     >
                        Log Out Session
                     </button>
                  </React.Fragment>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {currentUser && <AlertSystem markets={markets} />}
      <AnimatePresence>
        {alertSymbol && (
          <SetAlertModal 
            symbol={alertSymbol.name} 
            currentPrice={alertSymbol.price} 
            onClose={() => setAlertSymbol(null)} 
          />
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 max-w-md mx-auto h-20 backdrop-blur-2xl border-t px-6 flex items-center justify-between z-50 transition-colors duration-500",
        theme === 'dark' ? "bg-black/80 border-white/5" : "bg-white/80 border-black/5"
      )}>
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'search', icon: Search, label: 'Invest' },
          { id: 'journal', icon: BookOpen, label: 'PnL' },
          { id: 'news', icon: Newspaper, label: 'News' },
          { id: 'settings', icon: SettingsIcon, label: 'Settings' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id as Screen)}
              className="flex flex-col items-center gap-1 group relative"
            >
              {isActive && (
                <motion.div 
                  layoutId="nav-active"
                  className="absolute -top-10 w-12 h-1 bg-cyan-500 rounded-full shadow-[0_4px_20px_rgba(6,182,212,1)]" 
                />
              )}
              <Icon className={cn(
                "w-6 h-6 transition-all duration-300",
                isActive ? "text-cyan-500 scale-110" : "text-gray-400 group-hover:text-gray-500",
                isActive && theme === 'light' && "text-cyan-600"
              )} />
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest transition-colors",
                isActive ? (theme === 'dark' ? "text-cyan-400" : "text-cyan-600") : (theme === 'dark' ? "text-gray-600" : "text-gray-400")
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Aesthetic Overlays */}
      <div className={cn(
        "fixed inset-0 pointer-events-none z-[100] border-[16px] rounded-[40px] transition-colors duration-500",
        theme === 'dark' ? "border-black" : "border-gray-50"
      )} />
    </div>
  );
}
