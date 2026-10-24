'use client';

import React, { useState } from 'react';
import { InboxAuditEvent } from '@/types';
import { formatDateIndo } from '@/lib/auth-context';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Zap,
  Lock,
  Unlock,
  CheckCircle,
  Clock,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface AuditTrailViewProps {
  events: InboxAuditEvent[];
  loading: boolean;
  onRefresh: () => void;
}

export default function AuditTrailView({
  events,
  loading,
  onRefresh,
}: AuditTrailViewProps) {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events.filter((e) => {
    if (filterAction !== 'all') {
      if (filterAction === 'access' && e.action !== 'inbox.access_conversation') return false;
      if (filterAction === 'takeover' && e.action !== 'inbox.takeover') return false;
      if (filterAction === 'escalate' && e.action !== 'inbox.escalate') return false;
      if (filterAction === 'reassign' && e.action !== 'inbox.reassign') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = (e.description || '').toLowerCase().includes(q);
      const matchActor = (e.user_name || '').toLowerCase().includes(q);
      const matchAction = (e.action || '').toLowerCase().includes(q);
      return matchDesc || matchActor || matchAction;
    }

    return true;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'inbox.takeover':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
            <UserCheck className="w-3 h-3 text-amber-700" />
            <span>Ambil Alih Chat</span>
          </span>
        );
      case 'inbox.escalate':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 w-fit">
            <Zap className="w-3 h-3 text-rose-600" />
            <span>Eskalasi Kasus</span>
          </span>
        );
      case 'inbox.access_conversation':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1 w-fit">
            <Unlock className="w-3 h-3 text-indigo-600" />
            <span>Akses On-Demand</span>
          </span>
        );
      case 'inbox.reassign':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-300 flex items-center gap-1 w-fit">
            <UserCheck className="w-3 h-3 text-cyan-600" />
            <span>Ubah Penugasan</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 w-fit">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Akuntabilitas & Audit Trail Tata Kelola</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Log Aktivitas Tata Kelola & Akses Percakapan
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Seluruh tindakan manajerial termasuk pembukaan pesan di luar penugasan, pengambilalihan obrolan, eskalasi komplain, dan perubahan peran dicatat secara permanen.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Log</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Action Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pb-1 sm:pb-0">
          <button
            onClick={() => setFilterAction('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterAction === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Aksi ({events.length})
          </button>
          <button
            onClick={() => setFilterAction('access')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterAction === 'access'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Akses On-Demand
          </button>
          <button
            onClick={() => setFilterAction('takeover')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterAction === 'takeover'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ambil Alih (Takeover)
          </button>
          <button
            onClick={() => setFilterAction('escalate')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterAction === 'escalate'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Eskalasi
          </button>
          <button
            onClick={() => setFilterAction('reassign')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterAction === 'reassign'
                ? 'bg-[#00AFC4] text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Penugasan
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari aktor, keterangan, alasan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#00AFC4]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-xs text-slate-600">Belum ada riwayat audit yang sesuai dengan filter.</p>
            <p className="text-[11px] text-slate-400">Setiap tindakan pengawasan, eskalasi, dan pembukaan chat akan tercatat otomatis di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Waktu & Tanggal</th>
                  <th className="px-5 py-3.5">Aktor / Pengguna</th>
                  <th className="px-5 py-3.5">Jenis Tindakan</th>
                  <th className="px-5 py-3.5">Keterangan & Alasan Bisnis</th>
                  <th className="px-5 py-3.5">Alamat IP / Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDateIndo(ev.created_at)}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {ev.user_name || 'Sistem / Otomatis'}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {getActionBadge(ev.action)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{ev.description}</p>
                      {ev.metadata?.reason && (
                        <span className="text-[10px] text-indigo-700 font-medium block mt-0.5">
                          Alasan: &quot;{ev.metadata.reason}&quot;
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {ev.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
