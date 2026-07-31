'use client';

import React, { useState } from 'react';
import { BusinessLead } from './LeadCard';
import { Download, FileSpreadsheet, FileCode, Copy, Check } from 'lucide-react';

interface ExportToolbarProps {
  businesses: BusinessLead[];
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({ businesses }) => {
  const [copiedEmails, setCopiedEmails] = useState(false);

  if (businesses.length === 0) return null;

  const handleExportCSV = () => {
    const headers = [
      'Business Name',
      'Category',
      'Business Email',
      'Owner Email',
      'Phone Number',
      'Website URL',
      'Instagram URL',
      'Facebook URL',
      'Address',
      'Rating',
      'Review Count',
      'Google Maps URL',
    ];

    const rows = businesses.map((b) => [
      `"${(b.business_name || '').replace(/"/g, '""')}"`,
      `"${(b.category || '').replace(/"/g, '""')}"`,
      `"${b.business_email || ''}"`,
      `"${b.owner_email || ''}"`,
      `"${b.phone_number_local || b.phone_number || ''}"`,
      `"${b.website_url || ''}"`,
      `"${b.instagram_url || ''}"`,
      `"${b.facebook_url || ''}"`,
      `"${(b.full_address || '').replace(/"/g, '""')}"`,
      `"${b.rating || ''}"`,
      `"${b.review_count || ''}"`,
      `"${b.google_maps_url || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(businesses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `leads_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyAllEmails = () => {
    const emails = businesses
      .flatMap((b) => [b.business_email, b.owner_email])
      .filter((e): e is string => Boolean(e));

    const uniqueEmails = Array.from(new Set(emails));
    if (uniqueEmails.length === 0) return;

    navigator.clipboard.writeText(uniqueEmails.join(', '));
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2000);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Download className="w-5 h-5 text-emerald-400" />
        <div>
          <h4 className="text-sm font-semibold text-slate-200">Bulk Data Export Suite</h4>
          <p className="text-[11px] text-slate-400">Export scraped lead profiles into CSV or JSON</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleCopyAllEmails}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition"
        >
          {copiedEmails ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Emails Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy All Scraped Emails</span>
            </>
          )}
        </button>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={handleExportJSON}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
        >
          <FileCode className="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>
    </div>
  );
};
