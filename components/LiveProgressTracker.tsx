'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, CheckCircle, Clock, AlertTriangle, ShieldCheck, Mail, Phone, Globe, Instagram, Facebook } from 'lucide-react';

interface LiveProgressTrackerProps {
  logs: string[];
  isLoading: boolean;
  onCancel?: () => void;
}

export const LiveProgressTracker: React.FC<LiveProgressTrackerProps> = ({ logs, isLoading }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (!isLoading && logs.length === 0) return null;

  // Determine current active phase from logs
  const isPhase1 = logs.some(l => l.includes('Phase 1') || l.includes('Searching:'));
  const isPhase2 = logs.some(l => l.includes('Phase 2') || l.includes('Extracting data'));
  const isPhase4 = logs.some(l => l.includes('Phase 4') || l.includes('Email Extraction') || l.includes('Crawling'));
  const isDone = logs.some(l => l.includes('Done!') || l.includes('Saved to'));

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            <div className={`w-3 h-3 rounded-full absolute inset-0 ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {isDone ? 'Scraping Execution Completed' : 'Scraping Execution Active'}
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {logs.length} events logged
        </span>
      </div>

      {/* Visual Phase Stepper */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Phase 1 */}
        <div className={`p-3 rounded-xl border transition ${
          isPhase1 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">1</span>
            <span>Search & Scroll</span>
          </div>
          <p className="text-[10px] mt-1 opacity-80">Discover business links on Google Maps</p>
        </div>

        {/* Phase 2 */}
        <div className={`p-3 rounded-xl border transition ${
          isPhase2 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
            <span>Detail Extraction</span>
          </div>
          <p className="text-[10px] mt-1 opacity-80">Extract ratings, phone, address & hours</p>
        </div>

        {/* Phase 4 */}
        <div className={`p-3 rounded-xl border transition ${
          isPhase4 ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-slate-900/40 border-slate-800 text-slate-500'
        }`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px]">3</span>
            <span>Emails & Social Crawl</span>
          </div>
          <p className="text-[10px] mt-1 opacity-80">Extract emails, Instagram & Facebook</p>
        </div>
      </div>

      {/* Terminal Output Log Window */}
      <div className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 font-mono text-xs max-h-48 overflow-y-auto space-y-1">
        <div className="text-[10px] text-slate-500 pb-2 border-b border-slate-900 flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>Real-time Python Process Stdout Stream</span>
        </div>
        {logs.map((log, index) => (
          <div key={index} className="text-slate-300 leading-relaxed flex items-start gap-2">
            <span className="text-emerald-500 select-none">&gt;</span>
            <span className="break-all">{log}</span>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
