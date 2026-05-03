/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  addMonths,
  subMonths
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

interface PnLCalendarProps {
  dailyPnL: Record<string, number>;
}

export const PnLCalendar: React.FC<PnLCalendarProps> = ({ dailyPnL }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Monthly stats
  const monthlyPnL = Object.entries(dailyPnL).reduce((acc: number, [date, pnl]) => {
    if (isSameMonth(new Date(date), monthStart)) {
      return acc + (pnl as number);
    }
    return acc;
  }, 0);

  const winningDays = Object.entries(dailyPnL).filter(([date, pnl]) => 
    isSameMonth(new Date(date), monthStart) && (pnl as number) > 0
  ).length;

  const monthlyLoss = Math.abs(Object.entries(dailyPnL).reduce((acc: number, [date, pnl]) => {
    if (isSameMonth(new Date(date), monthStart) && (pnl as number) < 0) {
      return acc + (pnl as number);
    }
    return acc;
  }, 0));

  return (
    <div className="glass rounded-3xl overflow-hidden border border-white/5">
      <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Growth Calendar</h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-[10px] font-mono font-bold",
              monthlyPnL >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {monthlyPnL >= 0 ? '+' : ''}₹{monthlyPnL.toLocaleString()}
            </span>
            <span className="text-[8px] text-gray-500 uppercase font-black tracking-tighter">MTD Progress</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <span className="text-xs font-mono font-bold text-white uppercase">{format(currentMonth, 'MMMM yyyy')}</span>
           <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/5 group">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400" />
              </button>
              <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all border border-white/5 group">
                <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400" />
              </button>
           </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 mb-3">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="text-[9px] font-black text-gray-600 text-center uppercase tracking-widest">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const pnl = dailyPnL[dateStr] || 0;
            const isCurrentMonth = isSameMonth(day, monthStart);
            
            return (
              <div 
                key={i} 
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center p-1 relative transition-all duration-300 border border-transparent group",
                  !isCurrentMonth && "opacity-10 pointer-events-none",
                  isToday(day) && "border-cyan-500/50 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.1)]",
                  isCurrentMonth && pnl > 0 && "bg-green-500/10 border-green-500/20 hover:bg-green-500/20",
                  isCurrentMonth && pnl < 0 && "bg-red-500/10 border-red-500/20 hover:bg-red-500/20",
                  isCurrentMonth && pnl === 0 && !isToday(day) && "bg-white/[0.02] border-white/5 hover:bg-white/5"
                )}
              >
                <span className={cn(
                  "text-[10px] font-mono font-bold mb-0.5 transition-colors",
                  isToday(day) ? "text-cyan-400" : "text-gray-500 group-hover:text-white"
                )}>
                  {format(day, 'd')}
                </span>
                
                {pnl !== 0 && isCurrentMonth && (
                  <div className={cn(
                    "text-[8px] font-black tracking-tighter truncate w-full text-center px-1",
                    pnl > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {pnl > 0 ? '+' : ''}{pnl > 9999 ? `${(pnl/1000).toFixed(0)}k` : pnl > 999 ? `${(pnl/1000).toFixed(1)}k` : Math.round(pnl)}
                  </div>
                )}

                {/* Tooltip on Hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-[8px] text-white rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-2xl font-mono">
                  {format(day, 'MMM d, yyyy')}
                  <div className={cn("font-bold", pnl >= 0 ? "text-green-400" : "text-red-400")}>
                    PnL: {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 bg-white/[0.01] border-t border-white/5 grid grid-cols-3 gap-4">
        <div className="space-y-1">
           <span className="text-[8px] font-bold text-gray-500 uppercase block tracking-widest">Winning Days</span>
           <div className="text-xs font-mono font-bold text-green-500">{winningDays}</div>
        </div>
        <div className="space-y-1 border-x border-white/5 px-4">
           <span className="text-[8px] font-bold text-gray-500 uppercase block tracking-widest">Growth %</span>
           <div className="text-xs font-mono font-bold text-white">
             {((monthlyPnL / (Math.abs(monthlyPnL - monthlyLoss) || 1)) * 100).toFixed(1)}%
           </div>
        </div>
        <div className="space-y-1 text-right">
           <span className="text-[8px] font-bold text-gray-500 uppercase block tracking-widest">Status</span>
           <div className="text-[9px] font-black text-cyan-500 uppercase tracking-tighter">Verified</div>
        </div>
      </div>
    </div>
  );
};
