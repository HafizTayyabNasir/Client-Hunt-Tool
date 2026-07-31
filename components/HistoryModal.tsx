'use client';

import React, { useEffect, useState } from 'react';
import { X, Database, MapPin, Building2, Calendar, FileText, Loader2, ArrowRight } from 'lucide-react';
import { BusinessLead } from './LeadCard';

interface ScrapeFileMeta {
  filename: string;
  city: string;
  category: string;
  total_businesses: number;
  total_with_email: number;
  total_with_phone: number;
  total_with_website: number;
  total_with_instagram: number;
  total_with_facebook: number;
  scrape_started: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (data: BusinessLead[], meta: any) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, onSelectFile }) => {
  const [files, setFiles] = useState<ScrapeFileMeta[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistoryList();
    }
  }, [isOpen]);

  const fetchHistoryList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history');
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (filename: string) => {
    try {
      const res = await fetch(`/api/history?file=${encodeURIComponent(filename)}`);
      const data = await res.json();
      if (data.data && data.data.businesses) {
        onSelectFile(data.data.businesses, data.data.metadata);
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 border border-slate-800 space-y-6 max-h-[85vh] flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">Saved Historic Lead Batches</h3>
              <p className="text-xs text-slate-400">Load previously extracted business data instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Fetching saved files...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No historic JSON scrapes found in output directory.
            </div>
          ) : (
            files.map((file, idx) => (
              <div
                key={idx}
                onClick={() => handleOpenFile(file.filename)}
                className="bg-slate-900/60 hover:bg-slate-800/80 p-4 rounded-xl border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 rounded-md capitalize">
                      {file.category}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      {file.city}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{file.filename}</span>
                  </div>

                  {/* Scrape Stats Badges */}
                  <div className="flex flex-wrap gap-2 text-[10px] pt-1">
                    <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md">
                      {file.total_businesses} Leads
                    </span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      {file.total_with_email} Emails
                    </span>
                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-md border border-purple-500/20">
                      {file.total_with_instagram} Instagram
                    </span>
                    <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md border border-blue-500/20">
                      {file.total_with_facebook} Facebook
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition">
                  <span>Load Leads</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
