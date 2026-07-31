'use client';

import React, { useState, useMemo } from 'react';
import { LeadCard, BusinessLead } from './LeadCard';
import { Search, Filter, Mail, Globe, Instagram, Facebook, ArrowUpDown } from 'lucide-react';

interface LeadGridProps {
  businesses: BusinessLead[];
  onUpdateLead?: (index: number, updated: BusinessLead) => void;
}

export const LeadGrid: React.FC<LeadGridProps> = ({ businesses, onUpdateLead }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);
  const [filterWebsiteOnly, setFilterWebsiteOnly] = useState(false);
  const [filterInstagramOnly, setFilterInstagramOnly] = useState(false);
  const [filterFacebookOnly, setFilterFacebookOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'rating' | 'reviews' | 'name'>('rating');

  const filteredWithIndex = useMemo(() => {
    return businesses
      .map((b, originalIndex) => ({ b, originalIndex }))
      .filter(({ b }) => {
        // Search term matching
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          const matchName = b.business_name.toLowerCase().includes(term);
          const matchCategory = b.category.toLowerCase().includes(term);
          const matchAddress = b.full_address.toLowerCase().includes(term);
          const matchEmail = (b.business_email || '').toLowerCase().includes(term);
          if (!matchName && !matchCategory && !matchAddress && !matchEmail) {
            return false;
          }
        }
        if (filterEmailOnly && !b.business_email && !b.owner_email) return false;
        if (filterWebsiteOnly && !b.website_url) return false;
        if (filterInstagramOnly && !b.instagram_url) return false;
        if (filterFacebookOnly && !b.facebook_url) return false;
        return true;
      })
      .sort(({ b: a }, { b: b }) => {
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'reviews') {
          return (b.review_count || 0) - (a.review_count || 0);
        }
        if (sortBy === 'name') {
          return a.business_name.localeCompare(b.business_name);
        }
        return 0;
      });
  }, [
    businesses,
    searchTerm,
    filterEmailOnly,
    filterWebsiteOnly,
    filterInstagramOnly,
    filterFacebookOnly,
    sortBy,
  ]);

  if (businesses.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <Search className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200">No Business Leads Loaded Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Use the Lead Mining Control Panel above to start a live extraction or open a historic scrape file.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search leads by name, email..."
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Quick Badges */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterEmailOnly(!filterEmailOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              filterEmailOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Has Email</span>
          </button>

          <button
            onClick={() => setFilterWebsiteOnly(!filterWebsiteOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              filterWebsiteOnly
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Has Website</span>
          </button>

          <button
            onClick={() => setFilterInstagramOnly(!filterInstagramOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              filterInstagramOnly
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Has Instagram</span>
          </button>

          <button
            onClick={() => setFilterFacebookOnly(!filterFacebookOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              filterFacebookOnly
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Facebook className="w-3.5 h-3.5" />
            <span>Has Facebook</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="rating" className="bg-slate-900">Highest Rating</option>
              <option value="reviews" className="bg-slate-900">Most Reviews</option>
              <option value="name" className="bg-slate-900">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Display Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <div>
          Showing <span className="font-bold text-slate-200">{filteredWithIndex.length}</span> of{' '}
          <span className="font-bold text-slate-200">{businesses.length}</span> Business Lead Cards
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWithIndex.map(({ b, originalIndex }) => (
          <LeadCard
            key={originalIndex}
            business={b}
            onUpdate={(updated) => {
              if (onUpdateLead) {
                onUpdateLead(originalIndex, updated);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
};
