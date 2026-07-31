'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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

  // Extract progress metrics from structured logs
  const progressState = useMemo(() => {
    let current = 0;
    let total = 0;
    let percent = 0;
    let label = 'Initializing...';

    for (const log of logs) {
      const progMatch = log.match(/PROGRESS:\s*Business\s*(\d+)\/(\d+)\s*\((.+?)%\)/i);
      if (progMatch) {
        current = parseInt(progMatch[1], 10);
        total = parseInt(progMatch[2], 10);
        percent = parseInt(progMatch[3], 10);
        label = `Phase 2: Extracting Business Details (${current}/${total})`;
      }

      const crawlMatch = log.match(/CRAWL_PROGRESS:\s*Website\s*(\d+)\/(\d+)\s*\((.+?)%\)/i);
      if (crawlMatch) {
        current = parseInt(crawlMatch[1], 10);
        total = parseInt(crawlMatch[2], 10);
        percent = parseInt(crawlMatch[3], 10);
        label = `Phase 4: Crawling Websites for Emails & Socials (${current}/${total})`;
      }
    }

    return { current, total, percent, label };
  }, [logs]);

  // Filter out redundant raw PROGRESS lines from raw terminal text for clean viewing
  const cleanLogs = useMemo(() => {
    return logs.filter((log) => {
      // Show clean logs, filter out repetitive spinner frames
      if (log.includes('PROGRESS:') || log.includes('CRAWL_PROGRESS:')) {
        return true;
      }
      // Ignore raw ascii spinner frames
      if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]\s*/.test(log.trim())) {
        return false;
      }
      return true;
    });
  }, [logs]);

  if (!isLoading && logs.length === 0) return null;

  const isPhase1 = logs.some(l => l.includes('Phase 1') || l.includes('Searching:') || l.includes('Loaded'));
  const isPhase2 = logs.some(l => l.includes('Phase 2') || l.includes('PROGRESS: Business'));
  const isPhase4 = logs.some(l => l.includes('Phase 4') || l.includes('CRAWL_PROGRESS'));
  const isDone = logs.some(l => l.includes('Done!') || l.includes('Saved to'));

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
            <div className={`w-3 h-3 rounded-full absolute inset-0 ${isDone ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">
            {isDone ? 'Scraping Execution Completed' : 'Scraping Execution Active'}
          </h3>
        </div>

        <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          {isDone ? '100% Completed' : progressState.label}
        </div>
      </div>

      {/* Modern Glowing Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-slate-300 font-medium">
          <span>{progressState.label}</span>
          <span className="font-bold text-emerald-400">{isDone ? 100 : progressState.percent}%</span>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/20"
            style={{ width: `${isDone ? 100 : Math.max(progressState.percent, isLoading ? 5 : 0)}%` }}
          />
        </div>
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
        <div className="text-[10px] text-slate-500 pb-2 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Structured Execution Stream</span>
          </div>
          <span>{cleanLogs.length} events</span>
        </div>
        {cleanLogs.map((log, index) => (
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
