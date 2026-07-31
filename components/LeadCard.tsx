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
  UserCheck,
  Pencil,
  Plus,
  Save,
  X
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
  onUpdate?: (updated: BusinessLead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ business, onUpdate }) => {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<BusinessLead>({ ...business });

  // Inline single field edit state
  const [activeInline, setActiveInline] = useState<string | null>(null);
  const [inlineVal, setInlineVal] = useState('');

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(type);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSaveFullEdit = () => {
    setIsEditing(false);
    if (onUpdate) {
      onUpdate(editForm);
    }
  };

  const handleSaveInline = (field: keyof BusinessLead) => {
    const updated = {
      ...business,
      [field]: inlineVal.trim() ? inlineVal.trim() : null,
    };
    setActiveInline(null);
    setInlineVal('');
    if (onUpdate) {
      onUpdate(updated);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between relative group hover:border-emerald-500/40 transition">
      {/* Edit Toggle Button */}
      <div className="absolute top-4 right-4 flex items-center gap-1 z-10">
        <button
          onClick={() => {
            if (isEditing) {
              handleSaveFullEdit();
            } else {
              setEditForm({ ...business });
              setIsEditing(true);
            }
          }}
          className={`p-1.5 rounded-lg text-xs font-medium border transition ${
            isEditing
              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
              : 'bg-slate-800/80 text-slate-400 hover:text-slate-100 hover:bg-slate-700 border-slate-700'
          }`}
          title={isEditing ? 'Save Changes' : 'Edit Lead Card'}
        >
          {isEditing ? <Save className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isEditing ? (
        /* Full Edit Form Mode */
        <div className="space-y-3 text-xs pr-8">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">
            Editing Business Profile
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Business Name</label>
            <input
              type="text"
              value={editForm.business_name}
              onChange={(e) => setEditForm({ ...editForm, business_name: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Category</label>
            <input
              type="text"
              value={editForm.category}
              onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 font-semibold">Business Email</label>
              <input
                type="email"
                value={editForm.business_email || ''}
                onChange={(e) => setEditForm({ ...editForm, business_email: e.target.value })}
                placeholder="email@domain.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-semibold">Owner Email</label>
              <input
                type="email"
                value={editForm.owner_email || ''}
                onChange={(e) => setEditForm({ ...editForm, owner_email: e.target.value })}
                placeholder="owner@domain.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Phone Number</label>
            <input
              type="text"
              value={editForm.phone_number_local || editForm.phone_number || ''}
              onChange={(e) => setEditForm({ ...editForm, phone_number_local: e.target.value, phone_number: e.target.value })}
              placeholder="(555) 000-0000"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Website URL</label>
            <input
              type="url"
              value={editForm.website_url || ''}
              onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
              placeholder="https://example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-purple-300 font-semibold">Instagram URL</label>
              <input
                type="url"
                value={editForm.instagram_url || ''}
                onChange={(e) => setEditForm({ ...editForm, instagram_url: e.target.value })}
                placeholder="https://instagram.com/handle"
                className="w-full bg-slate-900 border border-purple-800/60 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-blue-300 font-semibold">Facebook URL</label>
              <input
                type="url"
                value={editForm.facebook_url || ''}
                onChange={(e) => setEditForm({ ...editForm, facebook_url: e.target.value })}
                placeholder="https://facebook.com/page"
                className="w-full bg-slate-900 border border-blue-800/60 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-semibold">Full Address</label>
            <input
              type="text"
              value={editForm.full_address || ''}
              onChange={(e) => setEditForm({ ...editForm, full_address: e.target.value })}
              placeholder="123 Street, City..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            onClick={handleSaveFullEdit}
            className="w-full mt-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-xs text-white rounded-lg transition"
          >
            Save All Changes
          </button>
        </div>
      ) : (
        /* Normal Display Mode */
        <div>
          {/* Top Banner & Category */}
          <div className="flex items-start justify-between gap-3 mb-2 pr-8">
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
            ) : activeInline === 'phone_number' ? (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-700">
                <input
                  type="text"
                  value={inlineVal}
                  onChange={(e) => setInlineVal(e.target.value)}
                  placeholder="Enter phone number..."
                  className="w-full bg-transparent px-2 text-xs text-white focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleSaveInline('phone_number')} className="p-1 text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setActiveInline(null)} className="p-1 text-slate-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-500 group/item">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span>No phone listed</span>
                </div>
                <button
                  onClick={() => { setActiveInline('phone_number'); setInlineVal(''); }}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Phone
                </button>
              </div>
            )}

            {/* Business Email */}
            {business.business_email ? (
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
            ) : activeInline === 'business_email' ? (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-cyan-800">
                <input
                  type="email"
                  value={inlineVal}
                  onChange={(e) => setInlineVal(e.target.value)}
                  placeholder="Enter business email..."
                  className="w-full bg-transparent px-2 text-xs text-white focus:outline-none"
                  autoFocus
                />
                <button onClick={() => handleSaveInline('business_email')} className="p-1 text-cyan-400"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setActiveInline(null)} className="p-1 text-slate-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-500 bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-slate-800/50">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  <span className="text-[11px]">No Email Found</span>
                </div>
                <button
                  onClick={() => { setActiveInline('business_email'); setInlineVal(''); }}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3 h-3" /> Add Email
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
          {business.full_address ? (
            <div className="flex items-start gap-2 text-[11px] text-slate-400 mb-4 line-clamp-2">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>{business.full_address}</span>
            </div>
          ) : null}
        </div>
      )}

      {/* Social & Web Action Buttons Grid */}
      <div className="pt-3 border-t border-slate-800/80 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Website Button / Add Website */}
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
          ) : activeInline === 'website_url' ? (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-emerald-800 col-span-2">
              <input
                type="url"
                value={inlineVal}
                onChange={(e) => setInlineVal(e.target.value)}
                placeholder="https://website.com..."
                className="w-full bg-transparent px-2 text-xs text-white focus:outline-none"
                autoFocus
              />
              <button onClick={() => handleSaveInline('website_url')} className="p-1 text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setActiveInline(null)} className="p-1 text-slate-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveInline('website_url'); setInlineVal(''); }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 text-xs border border-slate-800 transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Website</span>
            </button>
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

        {/* Direct Social Media Badges / Add Inline buttons */}
        <div className="space-y-2">
          {/* Instagram Slot */}
          {business.instagram_url ? (
            <a
              href={business.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl instagram-gradient text-white font-semibold text-xs shadow-md hover:opacity-90 transition"
            >
              <Instagram className="w-3.5 h-3.5 fill-white text-transparent" />
              <span className="truncate">{business.instagram_url.replace(/https?:\/\/(www\.)?instagram\.com\/?/, '@')}</span>
            </a>
          ) : activeInline === 'instagram_url' ? (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-purple-800">
              <input
                type="url"
                value={inlineVal}
                onChange={(e) => setInlineVal(e.target.value)}
                placeholder="https://instagram.com/handle"
                className="w-full bg-transparent px-2 text-xs text-white focus:outline-none"
                autoFocus
              />
              <button onClick={() => handleSaveInline('instagram_url')} className="p-1 text-purple-400"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setActiveInline(null)} className="p-1 text-slate-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveInline('instagram_url'); setInlineVal(''); }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-950/20 hover:bg-purple-900/40 text-purple-300 text-xs border border-purple-800/30 transition"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Instagram Link</span>
            </button>
          )}

          {/* Facebook Slot */}
          {business.facebook_url ? (
            <a
              href={business.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition"
            >
              <Facebook className="w-3.5 h-3.5 fill-white text-blue-600" />
              <span className="truncate">Facebook Profile</span>
            </a>
          ) : activeInline === 'facebook_url' ? (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-blue-800">
              <input
                type="url"
                value={inlineVal}
                onChange={(e) => setInlineVal(e.target.value)}
                placeholder="https://facebook.com/page"
                className="w-full bg-transparent px-2 text-xs text-white focus:outline-none"
                autoFocus
              />
              <button onClick={() => handleSaveInline('facebook_url')} className="p-1 text-blue-400"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => setActiveInline(null)} className="p-1 text-slate-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button
              onClick={() => { setActiveInline('facebook_url'); setInlineVal(''); }}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-950/20 hover:bg-blue-900/40 text-blue-300 text-xs border border-blue-800/30 transition"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Add Facebook Link</span>
            </button>
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
