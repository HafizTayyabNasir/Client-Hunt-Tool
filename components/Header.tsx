'use client';

import React from 'react';
import { MapPin, Zap, Database, Globe } from 'lucide-react';

interface HeaderProps {
  onOpenHistory: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory, savedCount }) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-[2px] shadow-lg shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Google Maps Lead Scraper
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                v2.0 PRO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated Business Intelligence & Social Lead Generation Engine
            </p>
          </div>
        </div>

        {/* Right Status Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Historic Scrapes</span>
            {savedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded-md">
                {savedCount}
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Playwright + Async Engine</span>
          </div>
        </div>
      </div>
    </header>
  );
};
