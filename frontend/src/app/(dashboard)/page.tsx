'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, formatCurrencyIDR, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import {
  DashboardSummary,
  StageFunnelItem,
  LeadSourceItem,
  Activity,
  Task,
  SupportReportResponse,
} from '@/types';
import {
  TrendingUp,
  Award,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Calendar,
  PhoneCall,
  MessageSquare,
  FileText,
  Building,
  ArrowRight,
  PlusCircle,
  LifeBuoy,
  ShieldAlert,
} from 'lucide-react';

export default function DashboardPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const isOwner = currentWorkspace?.role === 'owner' || activeRole === 'owner';
  const isSalesDept = (activeRole === 'sales' || currentWorkspace?.department === 'sales') && !isOwner;
  const isSupportDept = (activeRole === 'support' || currentWorkspace?.department === 'support') && !isOwner;
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [funnel, setFunnel] = useState<StageFunnelItem[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [supportReport, setSupportReport] = useState<SupportReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [sumData, funnelData, sourcesData, activitiesData, tasksData, suppData] = await Promise.all([
        api.getDashboardSummary(currentWorkspace.id),
        api.getPipelineFunnel(currentWorkspace.id),
        api.getLeadSources(currentWorkspace.id),
        api.listRecentActivities(currentWorkspace.id, 6),
        api.listTasks(currentWorkspace.id, { due_filter: 'today' }),
        api.getSupportReport(currentWorkspace.id).catch(() => null),
      ]);

      setSummary(sumData);
      setFunnel(Array.isArray(funnelData) ? funnelData : []);
      setLeadSources(Array.isArray(sourcesData) ? sourcesData : []);
      setRecentActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setTodayTasks(Array.isArray(tasksData) ? tasksData : []);
      setSupportReport(suppData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentWorkspace]);

  const handleToggleTask = async (taskId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.toggleCompleteTask(currentWorkspace.id, taskId);
      loadDashboardData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Dashboard Ringkasan" subtitle="Memuat data performa..." />
        <div className="p-8 flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-3 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title={
          isSalesDept
            ? 'Dashboard Penjualan (Pre-Sales)'
            : isSupportDept
            ? 'Dashboard Layanan & Helpdesk (After-Sales)'
            : 'Dashboard Eksekutif Perusahaan'
        }
        subtitle={
          isSalesDept
            ? 'Monitoring target penjualan, prospek baru, dan deal closing'
            : isSupportDept
            ? 'Monitoring tiket masuk, kepatuhan SLA, dan kepuasan pelanggan'
            : `Workspace: ${currentWorkspace?.name} • Akses Penuh Super Admin`
        }
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Overdue alert banner if any */}
        {(summary?.overdue_tasks_count ?? 0) > 0 && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-800 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <span className="font-bold text-sm">
                  {summary?.overdue_tasks_count} Tindak Lanjut Terlambat (Overdue)
                </span>
                <p className="text-xs text-amber-700">
                  Ada prospek yang memerlukan kontak segera agar peluang penjualan tidak hilang.
                </p>
              </div>
            </div>
            <Link
              href="/today"
              className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0"
            >
              Lihat di Halaman Today
            </Link>
          </div>
        )}

        {/* 1. Stat Metric Cards */}
        {isSupportDept ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Tiket Masuk</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <LifeBuoy className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-800">
                {supportReport?.total_tickets || 0}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                <span>Seluruh pengaduan purna jual</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Sedang Ditangani</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600">
                {supportReport?.in_progress_tickets || 0}
              </div>
              <div className="text-[11px] text-amber-600 mt-1">
                <span>Dalam proses pemecahan masalah</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Tingkat Resolusi</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {supportReport?.resolution_rate ? `${supportReport.resolution_rate.toFixed(0)}%` : '0%'}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1">
                <span>{supportReport?.resolved_tickets || 0} kasus terselesaikan</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata Resolusi</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-purple-600">
                {supportReport?.avg_resolution_hours ? `${supportReport.avg_resolution_hours.toFixed(1)} Jam` : '-'}
              </div>
              <div className="text-[11px] text-purple-500 mt-1">
                <span>Kecepatan penanganan SLA</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Open Pipeline Value */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Open Pipeline</span>
                <div className="w-8 h-8 rounded-lg bg-[#E8F8FA] flex items-center justify-center text-[#00AFC4]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#142740]">
                {formatCurrencyIDR(summary?.open_pipeline_value || 0)}
              </div>
              <div className="text-[11px] text-[#586779] mt-1 flex items-center gap-1">
                <span>{summary?.total_deals_count || 0} total deals berjalan</span>
              </div>
            </div>

            {/* Won Deals Value */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Won Deals</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600">
                {formatCurrencyIDR(summary?.won_deal_value || 0)}
              </div>
              <div className="text-[11px] text-[#586779] mt-1 flex items-center gap-1">
                <span className="font-semibold text-emerald-700">
                  {summary?.conversion_rate ? `${summary.conversion_rate.toFixed(0)}%` : '0%'}
                </span>
                <span>konversi penjualan</span>
              </div>
            </div>

            {/* Active Contacts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Database Kontak</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#142740]">
                {summary?.total_contacts || 0}
              </div>
              <div className="text-[11px] text-[#586779] mt-1">
                <span>Pelanggan aktif & prospek tervalidasi</span>
              </div>
            </div>

            {/* Today & Overdue Tasks */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Tugas Hari Ini</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#142740]">
                {summary?.due_today_tasks_count || 0}
              </div>
              <div className="text-[11px] text-[#586779] mt-1 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#00AFC4]"></span>
                <span>{summary?.overdue_tasks_count || 0} overdue perlu perhatian</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Middle Section (Role-based) */}
        {isSupportDept ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <LifeBuoy className="w-4 h-4 text-purple-600" />
                    <span>Kategori Keluhan & Tiket Masuk</span>
                  </h3>
                  <p className="text-xs text-slate-500">Distribusi masalah yang dilaporkan pelanggan</p>
                </div>
                <Link
                  href="/tickets"
                  className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
                >
                  <span>Buka Helpdesk</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {supportReport && Object.keys(supportReport.category_breakdown).length > 0 ? (
                  Object.entries(supportReport.category_breakdown).map(([cat, cnt]) => (
                    <div key={cat} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{cat}</span>
                      <span className="text-xs font-extrabold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-purple-700">
                        {cnt} Tiket
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-8 text-center text-xs text-slate-400">
                    Belum ada data kategori tiket.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-200">After-Sales Helpdesk</span>
                <h4 className="text-lg font-black mt-2">Pusat Penanganan Tiket CS</h4>
                <p className="text-xs text-purple-100 mt-2 leading-relaxed">
                  Semua keluhan pelanggan dari live chat WhatsApp CS Hotline dapat dikonversikan menjadi tiket bantuan untuk dimonitor progresnya.
                </p>
              </div>

              <Link
                href="/tickets"
                className="mt-6 px-4 py-2.5 rounded-xl bg-white text-purple-700 font-bold text-xs text-center hover:bg-purple-50 transition shadow-xs"
              >
                Kelola Tiket Bantuan Sekarang
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pipeline Stage Funnel */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-[#142740]">Sales Funnel & Tahapan Pipeline</h3>
                  <p className="text-xs text-[#586779]">Distribusi peluang penjualan aktif per tahap</p>
                </div>
                <Link
                  href="/pipeline"
                  className="text-xs font-semibold text-[#00AFC4] hover:underline flex items-center gap-1"
                >
                  <span>Buka Kanban</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 mt-4">
                {(funnel || []).map((stage) => {
                  const maxVal = Math.max(...(funnel || []).map((f) => f.total_value), 1);
                  const percent = Math.min(100, Math.round((stage.total_value / maxVal) * 100));

                  return (
                    <div key={stage.stage_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 flex items-center gap-2">
                          {stage.stage_name}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                            {stage.deal_count} deal
                          </span>
                        </span>
                        <span className="font-bold text-[#142740]">
                          {formatCurrencyIDR(stage.total_value)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            stage.stage_name === 'Won'
                              ? 'bg-emerald-500'
                              : stage.stage_name === 'Lost'
                              ? 'bg-red-400'
                              : 'bg-[#00AFC4]'
                          }`}
                          style={{ width: `${Math.max(percent, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead Source Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="mb-4">
                <h3 className="font-bold text-sm text-[#142740]">Sumber Prospek (Lead Source)</h3>
                <p className="text-xs text-[#586779]">Kanal asal kontak pelanggan</p>
              </div>

              <div className="space-y-3 mt-3">
                {(leadSources || []).map((source, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00AFC4]"></span>
                      <span className="font-semibold text-slate-800">{source.lead_source}</span>
                    </div>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[#142740]">
                      {source.count} kontak
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Action Items Today & Recent Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today Tasks */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-[#142740]">Tindak Lanjut Hari Ini</h3>
                <p className="text-xs text-[#586779]">Tugas yang jatuh tempo hari ini</p>
              </div>
              <Link
                href="/today"
                className="text-xs font-semibold text-[#00AFC4] hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(todayTasks || []).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                Tidak ada tugas jatuh tempo hari ini. Semua beres!
              </div>
            ) : (
              <div className="space-y-2.5">
                {(todayTasks || []).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={t.status === 'completed'}
                      onChange={() => handleToggleTask(t.id)}
                      className="mt-0.5 rounded text-[#00AFC4] focus:ring-[#00AFC4] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs font-semibold ${
                          t.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {t.title}
                      </div>
                      {t.contact_name && (
                        <div className="text-[11px] text-[#586779] truncate mt-0.5">
                          Kontak: {t.contact_name}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        t.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : t.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity Stream */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="mb-4">
              <h3 className="font-bold text-sm text-[#142740]">Riwayat Aktivitas Terkini</h3>
              <p className="text-xs text-[#586779]">Interaksi dan pembaruan tim secara real-time</p>
            </div>

            <div className="space-y-3.5">
              {(recentActivities || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Belum ada aktivitas interaksi tercatat.
                </div>
              ) : (
                (recentActivities || []).map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-[#E8F8FA] text-[#00AFC4] flex items-center justify-center shrink-0 mt-0.5">
                      {act.type === 'call' && <PhoneCall className="w-3.5 h-3.5" />}
                      {act.type === 'whatsapp' && <MessageSquare className="w-3.5 h-3.5" />}
                      {act.type === 'meeting' && <Calendar className="w-3.5 h-3.5" />}
                      {act.type === 'status_change' && <Award className="w-3.5 h-3.5" />}
                      {act.type === 'note' && <FileText className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{act.subject}</div>
                      <div className="text-[11px] text-[#586779] line-clamp-1">{act.description}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {act.contact_name ? `Dengan ${act.contact_name} • ` : ''}
                        {formatDateIndo(act.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
