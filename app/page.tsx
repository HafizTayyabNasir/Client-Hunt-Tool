'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { SearchControlPanel } from '@/components/SearchControlPanel';
import { LiveProgressTracker } from '@/components/LiveProgressTracker';
import { LeadGrid } from '@/components/LeadGrid';
import { BusinessLead } from '@/components/LeadCard';
import { ExportToolbar } from '@/components/ExportToolbar';
import { HistoryModal } from '@/components/HistoryModal';
import { Zap, Sparkles } from 'lucide-react';

export default function Home() {
  const [businesses, setBusinesses] = useState<BusinessLead[]>([]);
  const [activeMeta, setActiveMeta] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    // Load most recent scrape on mount
    loadLatestScrape();
  }, []);

  const loadLatestScrape = async () => {
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setSavedCount(data.files.length);
        const latestFile = data.files[0].filename;
        const fileRes = await fetch(`/api/history?file=${encodeURIComponent(latestFile)}`);
        const fileData = await fileRes.json();
        if (fileData.data && fileData.data.businesses) {
          setBusinesses(fileData.data.businesses);
          setActiveMeta(fileData.data.metadata);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateLead = (index: number, updatedLead: BusinessLead) => {
    setBusinesses((prev) => {
      const next = [...prev];
      next[index] = updatedLead;
      return next;
    });
  };

  const handleStartScrape = async (params: {
    city: string;
    category: string;
    maxResults: number;
    headless: boolean;
  }) => {
    setIsLoading(true);
    setLogs([]);
    setBusinesses([]);
    setActiveMeta(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.body) {
        throw new Error('No stream response from server');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          let eventName = 'log';
          let eventDataRaw = '';

          const eventMatch = line.match(/^event:\s*(.+)$/m);
          if (eventMatch) eventName = eventMatch[1].trim();

          const dataMatch = line.match(/^data:\s*(.+)$/m);
          if (dataMatch) eventDataRaw = dataMatch[1].trim();

          if (!eventDataRaw) continue;

          try {
            const parsed = JSON.parse(eventDataRaw);

            if (eventName === 'log') {
              setLogs((prev) => [...prev, parsed.message]);
            } else if (eventName === 'complete') {
              if (parsed.data && parsed.data.businesses) {
                setBusinesses(parsed.data.businesses);
                setActiveMeta(parsed.data.metadata);
                setLogs((prev) => [...prev, 'Scrape payload successfully loaded!']);
              }
              setIsLoading(false);
              loadLatestScrape();
            } else if (eventName === 'error') {
              setLogs((prev) => [...prev, `[ERROR] ${parsed.error}`]);
              setIsLoading(false);
            }
          } catch (err) {
            console.error('SSE JSON parse error:', err);
          }
        }
      }
    } catch (error: any) {
      setLogs((prev) => [...prev, `[FATAL] ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100">
      {/* Top Glass Header */}
      <Header onOpenHistory={() => setShowHistory(true)} savedCount={savedCount} />

      {/* Main Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Banner Title Section */}
        <div className="text-center space-y-3 py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered B2B Lead Mining System</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Extract Verified Business Leads with{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Emails & Social Handles
            </span>
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Deep scrape local businesses from Google Maps with phone numbers, verified business & owner emails, Instagram profiles, and Facebook pages.
          </p>
        </div>

        {/* Search Control Panel */}
        <SearchControlPanel onStartScrape={handleStartScrape} isLoading={isLoading} />

        {/* Live SSE Execution Progress Tracker */}
        <LiveProgressTracker logs={logs} isLoading={isLoading} />

        {/* Active Batch Summary Metadata Header */}
        {activeMeta && (
          <div className="glass-panel rounded-xl p-4 border border-emerald-500/30 bg-emerald-950/20 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">
                Active Batch: {activeMeta.category} in {activeMeta.city}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <span>Total: <b>{activeMeta.total_businesses}</b></span>
              <span>Emails: <b className="text-emerald-400">{activeMeta.total_with_email}</b></span>
              <span>Instagram: <b className="text-purple-400">{activeMeta.total_with_instagram}</b></span>
              <span>Facebook: <b className="text-blue-400">{activeMeta.total_with_facebook}</b></span>
            </div>
          </div>
        )}

        {/* Export Suite */}
        <ExportToolbar businesses={businesses} />

        {/* Product Cards Lead Grid with Live Editing */}
        <LeadGrid businesses={businesses} onUpdateLead={handleUpdateLead} />
      </main>

      {/* History Modal */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onSelectFile={(b, meta) => {
          setBusinesses(b);
          setActiveMeta(meta);
        }}
      />
    </div>
  );
}
