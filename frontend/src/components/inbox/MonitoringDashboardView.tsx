'use client';

import React from 'react';
import { MonitoringStats, Conversation } from '@/types';
import { formatDateIndo } from '@/lib/auth-context';
import {
  Activity,
  AlertTriangle,
  Clock,
  Users,
  CheckCircle2,
  Zap,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  MessageSquare,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface MonitoringDashboardViewProps {
  stats: MonitoringStats | null;
  loading: boolean;
  onRefresh: () => void;
  deptFilter: string;
  setDeptFilter: (dept: 'all' | 'sales' | 'support') => void;
  conversations: Conversation[];
  onOpenConversation: (convId: string) => void;
  onTakeover: (conv: Conversation) => void;
  activeRole: string;
}

export default function MonitoringDashboardView({
  stats,
  loading,
  onRefresh,
  deptFilter,
  setDeptFilter,
  conversations,
  onOpenConversation,
  onTakeover,
  activeRole,
}: MonitoringDashboardViewProps) {
  // Exceptions queue: Breached SLA, critical/negative sentiment, unassigned, or escalated
  const exceptionConversations = conversations.filter(
    (c) =>
      c.is_sla_breached ||
      c.sentiment === 'critical' ||
      c.sentiment === 'negative' ||
      c.priority === 'urgent' ||
      c.priority === 'high' ||
      Boolean(c.escalated_to_id) ||
      !c.assigned_to_id
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 space-y-6">
      {/* Top Banner & Control */}
      <div className="bg-gradient-to-r from-[#0E1E38] via-[#142740] to-[#00AFC4]/80 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold text-cyan-200">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-300" />
            <span>Executive & Supervisor Governance View</span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Team Inbox Monitoring & Access Governance
          </h2>
          <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
            Prinsip utama: <strong>Monitoring berbasis kebutuhan bisnis, bukan surveillance karyawan</strong>.
            Tampilan difokuskan pada ringkasan kinerja tim, penanganan SLA, dan eskalasi kasus yang membutuhkan intervensi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Department Filter */}
          <div className="flex items-center bg-white/10 backdrop-blur-md p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDeptFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                deptFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-200 hover:text-white'
              }`}
            >
              Semua Divisi
            </button>
            <button
              onClick={() => setDeptFilter('sales')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                deptFilter === 'sales' ? 'bg-[#00AFC4] text-white shadow-xs' : 'text-slate-200 hover:text-white'
              }`}
            >
              Pre-Sales
            </button>
            <button
              onClick={() => setDeptFilter('support')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                deptFilter === 'support' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-200 hover:text-white'
              }`}
            >
              After-Sales (CS)
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition cursor-pointer disabled:opacity-50"
            title="Muat ulang metrik real-time"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Chat Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Chat Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-50 text-[#00AFC4] flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.open_conversations ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span>{stats?.pending_conversations ?? 0} pending</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">{stats?.resolved_conversations ?? 0} selesai</span>
          </div>
        </div>

        {/* 2. Unassigned Chats */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Belum Ada Agen</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${(stats?.unassigned_count ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {stats?.unassigned_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {(stats?.unassigned_count ?? 0) > 0 ? 'Perlu penugasan segera' : 'Semua percakapan tertugaskan'}
          </div>
        </div>

        {/* 3. SLA Breached */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">SLA Terlewati</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${(stats?.sla_breached_count ?? 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-900'}`}>
            {stats?.sla_breached_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {(stats?.sla_breached_count ?? 0) > 0 ? 'Melewati first response time' : 'Target SLA tercapai'}
          </div>
        </div>

        {/* 4. Komplain & Sentimen Kritis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Komplain / Kritis</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${(stats?.complaints_count ?? 0) > 0 ? 'text-purple-700' : 'text-slate-900'}`}>
            {stats?.complaints_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {stats?.escalated_count ?? 0} kasus dieskalasi
          </div>
        </div>

        {/* 5. SLA Compliance Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kepatuhan SLA</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {stats?.sla_compliance_rate ?? 100}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, stats?.sla_compliance_rate ?? 100)}%` }}
            ></div>
          </div>
        </div>

        {/* 6. First Response Time (FRT) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rata2 Respon (FRT)</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats?.avg_first_response_minutes ?? 0} <span className="text-xs font-bold text-slate-500">mnt</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Target SLA: &lt; 15 menit
          </div>
        </div>
      </div>

      {/* Main 2-Column Split: Exception Queue & Agent Workloads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exception-Based Monitoring Queue (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertOctagon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Antrean Kasus Membutuhkan Perhatian (Exceptions Queue)
                </h3>
                <p className="text-xs text-slate-500">
                  Percakapan yang melewati batas SLA, ditandai komplain, belum ada penugasan, atau dieskalasi
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
              {exceptionConversations.length} Kasus
            </span>
          </div>

          {exceptionConversations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-70" />
              <p className="font-semibold text-xs text-slate-700">
                Luar biasa! Tidak ada percakapan yang membutuhkan eskalasi atau melewati SLA.
              </p>
              <p className="text-[11px] text-slate-400">
                Semua tiket dan obrolan pelanggan saat ini ditangani sesuai standar SLA perusahaan.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 divide-y divide-slate-100">
              {exceptionConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="pt-3 first:pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group hover:bg-slate-50/70 p-3 rounded-2xl transition border border-transparent hover:border-slate-200"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {conv.contact_name || conv.channel_identifier}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {conv.channel === 'whatsapp' ? '🟢 WhatsApp' : '✉️ Email'}
                      </span>

                      {/* Status Exception Badges */}
                      {conv.is_sla_breached && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                          <Clock className="w-2.5 h-2.5" />
                          <span>SLA Breached</span>
                        </span>
                      )}

                      {conv.escalated_to_name && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />
                          <span>Dieskalasi ke {conv.escalated_to_name}</span>
                        </span>
                      )}

                      {!conv.assigned_to_id && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Belum Ditugaskan
                        </span>
                      )}

                      {(conv.sentiment === 'critical' || conv.sentiment === 'negative' || conv.priority === 'urgent') && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white">
                          Komplain / Urgent
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-1">
                      {conv.last_message_content || conv.subject || 'Percakapan pelanggan'}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>Agen: <strong className="text-slate-600">{conv.assigned_to_name || 'Kosong'}</strong></span>
                      <span>•</span>
                      <span>Pesan terakhir: {formatDateIndo(conv.last_message_at).slice(0, 16)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenConversation(conv.id)}
                      className="px-3 py-1.5 rounded-xl bg-[#00AFC4] hover:bg-[#0096a8] text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <span>Buka Chat</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    {(activeRole === 'owner' || activeRole === 'supervisor' || activeRole === 'admin' || !conv.assigned_to_id) && (
                      <button
                        type="button"
                        onClick={() => onTakeover(conv)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1 border border-amber-300 cursor-pointer shadow-2xs"
                        title="Ambil alih percakapan ini"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                        <span className="hidden sm:inline">Ambil Alih</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team Workload Distribution (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Distribusi Beban Kerja Tim
                </h3>
                <p className="text-xs text-slate-500">
                  Keseimbangan penugasan obrolan aktif antar staf
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {(!stats?.agent_workloads || stats.agent_workloads.length === 0) ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada anggota tim terdaftar di workspace.
              </div>
            ) : (
              stats.agent_workloads.map((agent) => {
                const isOverloaded = agent.active_chats > 8;
                const isModerate = agent.active_chats >= 4 && agent.active_chats <= 8;

                return (
                  <div
                    key={agent.user_id}
                    className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#142740] text-[#00AFC4] font-bold flex items-center justify-center text-xs shrink-0">
                          {agent.full_name ? agent.full_name.charAt(0) : 'U'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {agent.full_name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            {agent.role} • {agent.department}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isOverloaded
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isModerate
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {isOverloaded ? '🔴 Beban Berat' : isModerate ? '🟡 Beban Padat' : '🟢 Beban Ideal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block">Aktif</span>
                        <strong className="text-xs font-black text-slate-800">{agent.active_chats}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Pending</span>
                        <strong className="text-xs font-bold text-slate-600">{agent.pending_chats}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Selesai</span>
                        <strong className="text-xs font-bold text-emerald-600">{agent.resolved_chats}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Breach SLA</span>
                        <strong className={`text-xs font-bold ${agent.sla_breached > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {agent.sla_breached}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Governance & Privacy Charter Summary */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E8F8FA] text-[#00AFC4] flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Prinsip Tata Kelola Monitoring & Privasi OCTO CRM
            </h3>
            <p className="text-xs text-slate-500">
              Standar operasional monitoring berbasis nilai bisnis, akuntabilitas, dan transparansi (Bukan surveillance)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-xs text-slate-800 block">1. Visibility by Default</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Owner dan supervisor memantau metrik performa, tren kecepatan, dan volume beban kerja, bukan otomatis membaca riwayat percakapan karyawan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-xs text-slate-800 block">2. Access on Demand & Auditability</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Isi percakapan di luar penugasan dibuka hanya saat ada kebutuhan bisnis sah (komplain, pendampingan kasus). Setiap akses tercatat permanen di Audit Trail.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
            <span className="font-bold text-xs text-slate-800 block">3. Exception-Based Action</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Sistem secara otomatis menyoroti kasus penting seperti chat melewati SLA atau keluhan kritis agar manajer dapat memberikan asistensi dan supervisi tepat waktu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
