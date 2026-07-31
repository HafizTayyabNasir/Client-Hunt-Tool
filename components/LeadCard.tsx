'use client';

import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Clock,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Instagram,
  Facebook,
  UserCheck
} from 'lucide-react';

export interface BusinessLead {
  business_name: string;
  category: string;
  sub_category?: string;
  business_email: string | null;
  owner_email: string | null;
  phone_number: string | null;
  phone_number_local: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  full_address: string;
  latitude: number | null;
  longitude: number | null;
  opening_hours: Record<string, string>;
  is_currently_open: boolean | null;
  rating: number | null;
  review_count: number | null;
  google_maps_url: string;
}

interface LeadCardProps {
  business: BusinessLead;
}

export const LeadCard: React.FC<LeadCardProps> = ({ business }) => {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(type);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const primaryEmail = business.business_email || business.owner_email;

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between relative group hover:border-emerald-500/40 transition">
      {/* Top Banner & Category */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg capitalize truncate">
            {business.category || 'Business Lead'}
          </span>

          {/* Rating Badge */}
          {business.rating !== null && business.rating > 0 ? (
            <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 text-amber-300 text-xs font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{business.rating}</span>
              {business.review_count !== null && (
                <span className="text-[10px] text-amber-400/80 font-normal">
                  ({business.review_count})
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">
              No rating
            </span>
          )}
        </div>

        {/* Business Title */}
        <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition line-clamp-2 mb-3">
          {business.business_name}
        </h3>

        {/* Primary Contact Info */}
        <div className="space-y-2 text-xs mb-4">
          {/* Phone */}
          {business.phone_number_local || business.phone_number ? (
            <a
              href={`tel:${business.phone_number || business.phone_number_local}`}
              className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-medium">{business.phone_number_local || business.phone_number}</span>
            </a>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>No phone listed</span>
            </div>
          )}

          {/* Business Email */}
          {business.business_email && (
            <div className="flex items-center justify-between bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 text-slate-200 truncate">
                <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate font-medium">{business.business_email}</span>
              </div>
              <button
                onClick={() => handleCopy(business.business_email!, 'biz')}
                className="p-1 text-slate-400 hover:text-emerald-400 transition shrink-0"
                title="Copy Business Email"
              >
                {copiedEmail === 'biz' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}

          {/* Owner Email */}
          {business.owner_email && business.owner_email !== business.business_email && (
            <div className="flex items-center justify-between bg-purple-950/30 px-2.5 py-1.5 rounded-lg border border-purple-800/40">
              <div className="flex items-center gap-2 text-purple-200 truncate">
                <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="truncate font-medium">{business.owner_email}</span>
              </div>
              <button
                onClick={() => handleCopy(business.owner_email!, 'owner')}
                className="p-1 text-slate-400 hover:text-purple-400 transition shrink-0"
                title="Copy Owner Email"
              >
                {copiedEmail === 'owner' ? (
                  <Check className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Address */}
        {business.full_address && (
          <div className="flex items-start gap-2 text-[11px] text-slate-400 mb-4 line-clamp-2">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{business.full_address}</span>
          </div>
        )}
      </div>

      {/* Social & Web Action Buttons Grid */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Website Button */}
          {business.website_url ? (
            <a
              href={business.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 text-xs font-medium text-slate-200 border border-slate-700/80 transition"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">Website</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/40 text-slate-600 text-xs border border-slate-800">
              <Globe className="w-3.5 h-3.5" />
              <span>No Website</span>
            </div>
          )}

          {/* Google Maps Link */}
          {business.google_maps_url ? (
            <a
              href={business.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-cyan-500/20 hover:text-cyan-300 text-xs font-medium text-slate-200 border border-slate-700/80 transition"
            >
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span>Google Maps</span>
            </a>
          ) : null}
        </div>

        {/* Direct Social Media Badges */}
        <div className="flex items-center gap-2">
          {/* Instagram Button */}
          {business.instagram_url ? (
            <a
              href={business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl instagram-gradient text-white font-semibold text-xs shadow-md hover:opacity-90 transition"
            >
              <Instagram className="w-3.5 h-3.5 fill-white text-transparent" />
              <span>Instagram</span>
            </a>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900/40 text-slate-600 text-xs border border-slate-800 opacity-60">
              <Instagram className="w-3.5 h-3.5" />
              <span>No Instagram</span>
            </div>
          )}

          {/* Facebook Button */}
          {business.facebook_url ? (
            <a
              href={business.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Facebook className="w-3.5 h-3.5 fill-white text-blue-600" />
              <span>Facebook</span>
            </a>
          ) : (
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900/40 text-slate-600 text-xs border border-slate-800 opacity-60">
              <Facebook className="w-3.5 h-3.5" />
              <span>No Facebook</span>
            </div>
          )}
        </div>

        {/* Hours Accordion */}
        {business.opening_hours && Object.keys(business.opening_hours).length > 0 && (
          <div>
            <button
              onClick={() => setShowHours(!showHours)}
              className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition py-1"
            >
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Business Hours</span>
              </span>
              {showHours ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showHours && (
              <div className="mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1 text-slate-300">
                {Object.entries(business.opening_hours).map(([day, hrs]) => (
                  <div key={day} className="flex justify-between">
                    <span className="font-semibold text-slate-400">{day}:</span>
                    <span>{hrs}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
