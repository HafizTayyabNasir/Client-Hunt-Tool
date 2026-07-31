'use client';

import React, { useState } from 'react';
import { Search, MapPin, Building2, Sliders, Play, Loader2, CheckCircle2 } from 'lucide-react';

interface SearchControlPanelProps {
  onStartScrape: (params: {
    city: string;
    category: string;
    maxResults: number;
    headless: boolean;
  }) => void;
  isLoading: boolean;
}

const PRESET_CITIES = [
  'Houston',
  'New York',
  'Los Angeles',
  'Chicago',
  'Miami',
  'Dallas',
  'London',
  'Dubai',
  'Toronto',
];

const PRESET_CATEGORIES = [
  'doctors',
  'dentists',
  'medical clinic',
  'restaurants',
  'gyms',
  'plumbers',
  'roofers',
  'real estate agents',
  'lawyers',
  'digital marketing agency',
];

export const SearchControlPanel: React.FC<SearchControlPanelProps> = ({
  onStartScrape,
  isLoading,
}) => {
  const [city, setCity] = useState('Houston');
  const [category, setCategory] = useState('doctors');
  const [maxResults, setMaxResults] = useState(25);
  const [headless, setHeadless] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!city.trim() || !category.trim()) return;
    onStartScrape({
      city: city.trim(),
      category: category.trim(),
      maxResults,
      headless,
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl border border-slate-800">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-slate-100">
              Lead Mining Control Panel
            </h2>
          </div>
          <div className="text-xs text-slate-400">
            Configure Target Location & Industry
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* City / Location Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target City / Area</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Houston, New York, London..."
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              required
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCity(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    city.toLowerCase() === c.toLowerCase()
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-medium'
                      : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Category Input */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Business Category / Industry</span>
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. doctors, dentists, plumbers..."
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              required
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {PRESET_CATEGORIES.slice(0, 6).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border capitalize transition ${
                    category.toLowerCase() === cat.toLowerCase()
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-medium'
                      : 'bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 border-t border-slate-800/80">
          {/* Max Results Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                Max Businesses Limit
              </span>
              <span className="font-bold text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                {maxResults} items
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="5"
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>10 (Fast test)</span>
              <span>100 (Deep hunt)</span>
              <span>200 (Max)</span>
            </div>
          </div>

          {/* Mode Option Toggles */}
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs font-medium text-slate-200">Headless Mode</div>
              <div className="text-[10px] text-slate-400">Hide browser during scrape</div>
            </div>
            <button
              type="button"
              onClick={() => setHeadless(!headless)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${
                headless ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Submit CTA */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 glow-button font-semibold text-sm text-white rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Extracting Businesses...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Start Extracting Leads</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
