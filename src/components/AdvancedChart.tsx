/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Candle } from '../services/marketService';
import { LineChart, Activity, Trash2, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface AdvancedChartProps {
  data: Candle[];
  pdh?: number;
  pdl?: number;
}

interface Trendline {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export const AdvancedChart: React.FC<AdvancedChartProps> = ({ data, pdh, pdl }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [activeTool, setActiveTool] = useState<'cursor' | 'trendline'>('cursor');
  const [trendlines, setTrendlines] = useState<Trendline[]>([]);
  const [currentLine, setCurrentLine] = useState<Trendline | null>(null);
  const [showSMA, setShowSMA] = useState(false);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { width, height } = dimensions;
  const padding = { top: 60, bottom: 40, left: 20, right: 80 };

  const chartData = useMemo(() => {
    if (data.length === 0 || width === 0) return null;

    const minPrice = Math.min(...data.map(d => d.low), pdl || Infinity);
    const maxPrice = Math.max(...data.map(d => d.high), pdh || -Infinity);
    const priceRange = maxPrice - minPrice;
    const verticalScale = (height - padding.top - padding.bottom) / (priceRange || 1);
    const candleWidth = (width - padding.left - padding.right) / data.length;

    // SMA 20 Calculation
    const sma20 = data.map((_, i) => {
      if (i < 19) return null;
      const slice = data.slice(i - 19, i + 1);
      const sum = slice.reduce((acc, d) => acc + d.close, 0);
      const price = sum / 20;
      const x = padding.left + i * candleWidth + (candleWidth * 0.4);
      const y = height - padding.bottom - (price - minPrice) * verticalScale;
      return { x, y };
    }).filter(v => v !== null) as { x: number; y: number }[];

    return {
      minPrice,
      maxPrice,
      priceRange,
      verticalScale,
      candleWidth,
      sma20,
      candles: data.map((d, i) => {
        const x = padding.left + i * candleWidth;
        const yOpen = height - padding.bottom - (d.open - minPrice) * verticalScale;
        const yClose = height - padding.bottom - (d.close - minPrice) * verticalScale;
        const yHigh = height - padding.bottom - (d.high - minPrice) * verticalScale;
        const yLow = height - padding.bottom - (d.low - minPrice) * verticalScale;
        const isUp = d.close >= d.open;

        return {
          id: i,
          x,
          yOpen,
          yClose,
          yHigh,
          yLow,
          isUp,
          width: candleWidth * 0.8,
          raw: d
        };
      }),
      yAxis: Array.from({ length: 7 }).map((_, i) => {
        const price = minPrice + (priceRange / 6) * i;
        const y = height - padding.bottom - (price - minPrice) * verticalScale;
        return { price: Number(price.toFixed(2)), y };
      }),
      pdhY: pdh ? height - padding.bottom - (pdh - minPrice) * verticalScale : null,
      pdlY: pdl ? height - padding.bottom - (pdl - minPrice) * verticalScale : null,
    };
  }, [data, width, height, pdh, pdl]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // Find nearest candle
    const index = Math.floor((x - padding.left) / chartData.candleWidth);
    if (index >= 0 && index < data.length) {
      setHoveredCandle(data[index]);
    } else {
      setHoveredCandle(null);
    }

    if (activeTool === 'trendline' && currentLine) {
      setCurrentLine({ ...currentLine, endX: x, endY: y });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'trendline' && mousePos) {
      setCurrentLine({
        id: Math.random().toString(),
        startX: mousePos.x,
        startY: mousePos.y,
        endX: mousePos.x,
        endY: mousePos.y
      });
    }
  };

  const handleMouseUp = () => {
    if (activeTool === 'trendline' && currentLine) {
      setTrendlines([...trendlines, currentLine]);
      setCurrentLine(null);
    }
  };

  const clearLines = () => setTrendlines([]);

  if (!chartData) return <div ref={containerRef} className="w-full h-full flex items-center justify-center text-gray-500 font-mono">Initializing Terminal...</div>;

  return (
    <div ref={containerRef} className="w-full h-full bg-[#010101] relative overflow-hidden select-none">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
        <button 
          onClick={() => setActiveTool('cursor')}
          className={cn("p-2 rounded-lg transition-all", activeTool === 'cursor' ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "text-gray-500 hover:text-white")}
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => setActiveTool('trendline')}
          className={cn("p-2 rounded-lg transition-all", activeTool === 'trendline' ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "text-gray-500 hover:text-white")}
        >
          <LineChart className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button 
          onClick={() => setShowSMA(!showSMA)}
          className={cn("p-2 rounded-lg transition-all", showSMA ? "text-cyan-400 bg-cyan-400/10" : "text-gray-500 hover:text-white")}
        >
          <Activity className="w-4 h-4" />
        </button>
        <button 
          onClick={clearLines}
          className="p-2 rounded-lg text-gray-500 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* OHLC Mini Overlay */}
      <AnimatePresence>
        {hoveredCandle && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 left-4 z-20 flex gap-4 p-2.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md font-mono text-[9px] pointer-events-none"
          >
            <div className="flex gap-1.5"><span className="text-gray-500 font-bold uppercase">O:</span><span className="text-white">{hoveredCandle.open.toFixed(2)}</span></div>
            <div className="flex gap-1.5"><span className="text-gray-500 font-bold uppercase">H:</span><span className="text-green-400">{hoveredCandle.high.toFixed(2)}</span></div>
            <div className="flex gap-1.5"><span className="text-gray-500 font-bold uppercase">L:</span><span className="text-red-400">{hoveredCandle.low.toFixed(2)}</span></div>
            <div className="flex gap-1.5"><span className="text-gray-500 font-bold uppercase">C:</span><span className={hoveredCandle.close >= hoveredCandle.open ? "text-green-400" : "text-red-400"}>{hoveredCandle.close.toFixed(2)}</span></div>
          </motion.div>
        )}
      </AnimatePresence>

      <svg 
        width={width} 
        height={height} 
        className="absolute inset-0 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setMousePos(null); setHoveredCandle(null); }}
      >
        {/* Grid Lines */}
        {chartData.yAxis.map((grid, i) => (
          <g key={i}>
            <line 
              x1={padding.left} 
              y1={grid.y} 
              x2={width - padding.right} 
              y2={grid.y} 
              className="stroke-white/5" 
              strokeDasharray="2,4"
            />
            <text 
              x={width - padding.right + 10} 
              y={grid.y + 4} 
              className="fill-gray-600 font-mono text-[9px] font-bold"
            >
              {grid.price}
            </text>
          </g>
        ))}

        {/* PDH / PDL Lines */}
        {chartData.pdhY !== null && (
          <g>
             <line 
                x1={padding.left} 
                y1={chartData.pdhY} 
                x2={width - padding.right} 
                y2={chartData.pdhY} 
                className="stroke-cyan-500/30" 
                strokeWidth={1}
                strokeDasharray="4,4"
             />
             <text x={padding.left + 5} y={chartData.pdhY - 5} className="fill-cyan-400/60 text-[8px] font-bold uppercase tracking-widest">PDH</text>
          </g>
        )}
        {chartData.pdlY !== null && (
          <g>
             <line 
                x1={padding.left} 
                y1={chartData.pdlY} 
                x2={width - padding.right} 
                y2={chartData.pdlY} 
                className="stroke-red-500/30" 
                strokeWidth={1}
                strokeDasharray="4,4"
             />
             <text x={padding.left + 5} y={chartData.pdlY + 12} className="fill-red-400/60 text-[8px] font-bold uppercase tracking-widest">PDL</text>
          </g>
        )}

        {/* SMA 20 */}
        {showSMA && chartData.sma20.length > 1 && (
          <path 
            d={`M ${chartData.sma20.map(p => `${p.x} ${p.y}`).join(' L ')}`}
            className="fill-none stroke-cyan-400/60"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Candlesticks */}
        {chartData.candles.map((c) => (
          <g key={c.id}>
            <line 
              x1={c.x + c.width / 2} 
              y1={c.yHigh} 
              x2={c.x + c.width / 2} 
              y2={c.yLow} 
              className={c.isUp ? "stroke-green-500/40" : "stroke-red-500/40"}
              strokeWidth={1}
            />
            <rect 
              x={c.x} 
              y={Math.min(c.yOpen, c.yClose)} 
              width={c.width} 
              height={Math.max(1, Math.abs(c.yOpen - c.yClose))}
              className={c.isUp ? "fill-green-500" : "fill-red-500"}
              rx={1}
            />
          </g>
        ))}

        {/* Trendlines */}
        {trendlines.map((line) => (
          <line 
            key={line.id}
            x1={line.startX}
            y1={line.startY}
            x2={line.endX}
            y2={line.endY}
            className="stroke-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            strokeWidth={2}
          />
        ))}
        {currentLine && (
          <line 
            x1={currentLine.startX}
            y1={currentLine.startY}
            x2={currentLine.endX}
            y2={currentLine.endY}
            className="stroke-cyan-500/50"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
        )}

        {/* Crosshair */}
        {mousePos && (
          <g className="pointer-events-none">
            <line 
              x1={padding.left} 
              y1={mousePos.y} 
              x2={width - padding.right} 
              y2={mousePos.y} 
              className="stroke-white/20" 
              strokeWidth={1} 
              strokeDasharray="4,4" 
            />
            <line 
              x1={mousePos.x} 
              y1={padding.top} 
              x2={mousePos.x} 
              y2={height - padding.bottom} 
              className="stroke-white/20" 
              strokeWidth={1} 
              strokeDasharray="4,4" 
            />
            {/* Price Tag */}
            <rect 
              x={width - padding.right} 
              y={mousePos.y - 10} 
              width={80} 
              height={20} 
              className="fill-cyan-600 shadow-xl" 
            />
            <text 
              x={width - padding.right + 5} 
              y={mousePos.y + 4} 
              className="fill-white font-mono text-[9px] font-bold"
            >
              {(chartData.minPrice + (height - padding.bottom - mousePos.y) / chartData.verticalScale).toFixed(2)}
            </text>
          </g>
        )}
      </svg>
      
      {/* Real-time Indicator Labels */}
      <div className="absolute bottom-16 left-4 flex gap-4 pointer-events-none">
        {showSMA && (
           <div className="flex items-center gap-1.5 opacity-60">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[8px] font-bold text-white uppercase tracking-widest font-mono">SMA 20</span>
           </div>
        )}
      </div>

      {/* Current Price Tracker */}
      <div className="absolute top-4 right-4 bg-black/60 border border-white/10 px-4 py-1.5 rounded-xl backdrop-blur-md z-40">
         <span className="text-[10px] text-gray-500 uppercase font-black mr-3 tracking-widest">SPOT</span>
         <span className="text-sm font-mono font-black text-white tracking-[0.1em]">
           {data[data.length-1]?.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}
         </span>
      </div>
    </div>
  );
};
