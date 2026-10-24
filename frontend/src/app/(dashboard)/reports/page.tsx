'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import {
  DashboardSummary,
  StageFunnelItem,
  LeadSourceItem,
  ActivitySummaryItem,
  SupportReportResponse,
} from '@/types';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  PieChart,
  Activity,
  Layers,
  LifeBuoy,
  Clock,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

export default function ReportsPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [reportTab, setReportTab] = useState<'sales' | 'support'>('sales');

  useEffect(() => {
    if (activeRole === 'sales') {
      setReportTab('sales');
    } else if (activeRole === 'support') {
      setReportTab('support');
    }
  }, [activeRole]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [funnel, setFunnel] = useState<StageFunnelItem[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceItem[]>([]);
  const [activities, setActivities] = useState<ActivitySummaryItem[]>([]);
  const [supportReport, setSupportReport] = useState<SupportReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    const loadReports = async () => {
      try {
        setLoading(true);
        const [sumData, funnelData, sourcesData, actData, suppData] = await Promise.all([
          api.getDashboardSummary(currentWorkspace.id),
          api.getPipelineFunnel(currentWorkspace.id),
          api.getLeadSources(currentWorkspace.id),
          api.getActivitySummary(currentWorkspace.id),
          api.getSupportReport(currentWorkspace.id),
        ]);
        setSummary(sumData);
        setFunnel(funnelData);
        setLeadSources(sourcesData);
        setActivities(actData);
        setSupportReport(suppData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [currentWorkspace]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Laporan & Analitik" />
        <div className="p-8 flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-3 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...funnel.map((f) => f.total_value), 1);

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Laporan & Analitik Bisnis"
        subtitle="Evaluasi performa tim penjualan (Pre-Sales) dan SLA layanan pelanggan (After-Sales)"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Tab Switcher: Pre-Sales vs After-Sales */}
        {activeRole === 'owner' ? (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setReportTab('sales')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                reportTab === 'sales'
                  ? 'bg-[#00AFC4] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Laporan Penjualan (Pre-Sales Pipeline)</span>
            </button>

            <button
              onClick={() => setReportTab('support')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                reportTab === 'support'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LifeBuoy className="w-4 h-4" />
              <span>Laporan Layanan & Tiket (After-Sales Helpdesk)</span>
            </button>
          </div>
        ) : activeRole === 'sales' ? (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold text-slate-800">
            <TrendingUp className="w-4 h-4 text-[#00AFC4]" />
            <span>Laporan Kinerja Penjualan & Funnel Pipeline (Pre-Sales)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold text-slate-800">
            <LifeBuoy className="w-4 h-4 text-purple-600" />
            <span>Laporan Kinerja Layanan & Kepatuhan SLA Tiket (After-Sales Helpdesk)</span>
          </div>
        )}

        {reportTab === 'sales' ? (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Konversi Keseluruhan (Win Rate)
                </span>
                <div className="text-3xl font-black text-emerald-600 mt-2">
                  {summary?.conversion_rate ? `${summary.conversion_rate.toFixed(1)}%` : '0%'}
                </div>
                <p className="text-[11px] text-[#586779] mt-1">
                  Rasio deal won dibanding total deal tertutup
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Nilai Deal Won (Tertutup)
                </span>
                <div className="text-3xl font-black text-[#142740] mt-2">
                  {formatCurrencyIDR(summary?.won_deal_value || 0)}
                </div>
                <p className="text-[11px] text-[#586779] mt-1">
                  Pendapatan deal berhasil dari penjualan
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Open Pipeline Value
                </span>
                <div className="text-3xl font-black text-[#00AFC4] mt-2">
                  {formatCurrencyIDR(summary?.open_pipeline_value || 0)}
                </div>
                <p className="text-[11px] text-[#586779] mt-1">
                  Potensi penjualan yang sedang berproses
                </p>
              </div>
            </div>

            {/* Funnel Conversion Analysis */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#142740] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00AFC4]" />
                  <span>Analisis Funnel Penjualan (Sales Pipeline Funnel)</span>
                </h3>
                <p className="text-xs text-[#586779] mt-0.5">
                  Lihat di tahap mana prospek paling banyak terkonsentrasi
                </p>
              </div>

              <div className="space-y-4 pt-2">
                {funnel.map((stage) => {
                  const pct = Math.min(100, Math.round((stage.total_value / maxVal) * 100));
                  return (
                    <div key={stage.stage_id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{stage.stage_name}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            {stage.deal_count} deal
                          </span>
                        </div>
                        <span className="font-extrabold text-[#142740]">
                          {formatCurrencyIDR(stage.total_value)}
                        </span>
                      </div>

                      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            stage.stage_name === 'Won'
                              ? 'bg-emerald-500'
                              : stage.stage_name === 'Lost'
                              ? 'bg-red-400'
                              : 'bg-[#00AFC4]'
                          }`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead Sources & Activity Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lead Sources Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-[#142740] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#00AFC4]" />
                  <span>Efektivitas Sumber Prospek (Lead Sources)</span>
                </h3>

                <div className="space-y-2.5">
                  {leadSources.map((ls, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{ls.lead_source}</span>
                      <span className="font-bold text-[#142740] bg-white px-3 py-1 rounded-lg border border-slate-200">
                        {ls.count} Kontak
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-[#142740] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00AFC4]" />
                  <span>Distribusi Aktivitas Tim Penjualan</span>
                </h3>

                <div className="space-y-2.5">
                  {activities.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada rekaman aktivitas interaksi.
                    </div>
                  ) : (
                    activities.map((act, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                          {act.type}
                        </span>
                        <span className="font-bold text-[#142740] bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {act.count} kali dilakukan
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* ================= AFTER-SALES / SUPPORT REPORT TAB ================= */
          <div className="space-y-6">
            {/* Support KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Tiket Masuk
                </span>
                <div className="text-3xl font-black text-slate-800 mt-2">
                  {supportReport?.total_tickets || 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Pengaduan tercatat</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Sedang Ditangani (CS L1)
                </span>
                <div className="text-3xl font-black text-amber-600 mt-2">
                  {supportReport?.in_progress_tickets || 0}
                </div>
                <p className="text-[11px] text-amber-600/80 mt-1">Dalam proses solving</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tingkat Resolusi Tiket
                </span>
                <div className="text-3xl font-black text-emerald-600 mt-2">
                  {supportReport?.resolution_rate ? `${supportReport.resolution_rate.toFixed(0)}%` : '0%'}
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-1">
                  {supportReport?.resolved_tickets || 0} kasus terselesaikan
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Rata-rata Waktu Resolusi
                </span>
                <div className="text-3xl font-black text-purple-600 mt-2">
                  {supportReport?.avg_resolution_hours
                    ? `${supportReport.avg_resolution_hours.toFixed(1)} Jam`
                    : '-'}
                </div>
                <p className="text-[11px] text-purple-500 mt-1">Kecepatan penanganan SLA</p>
              </div>
            </div>

            {/* Breakdown Charts / Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  <span>Kategori Masalah & Komplain</span>
                </h3>

                <div className="space-y-2.5">
                  {supportReport && Object.keys(supportReport.category_breakdown).length > 0 ? (
                    Object.entries(supportReport.category_breakdown).map(([cat, cnt]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                          {cat}
                        </span>
                        <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {cnt} Tiket
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada data kategori tiket.
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-rose-600" />
                  <span>Tingkat Prioritas (SLA)</span>
                </h3>

                <div className="space-y-2.5">
                  {supportReport && Object.keys(supportReport.priority_breakdown).length > 0 ? (
                    Object.entries(supportReport.priority_breakdown).map(([prio, cnt]) => (
                      <div
                        key={prio}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                          {prio}
                        </span>
                        <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {cnt} Tiket
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada data prioritas tiket.
                    </div>
                  )}
                </div>
              </div>

              {/* Department Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00AFC4]" />
                  <span>Alur Departemen Eskalasi</span>
                </h3>

                <div className="space-y-2.5">
                  {supportReport && Object.keys(supportReport.department_breakdown).length > 0 ? (
                    Object.entries(supportReport.department_breakdown).map(([dept, cnt]) => (
                      <div
                        key={dept}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
                          {dept}
                        </span>
                        <span className="font-bold text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                          {cnt} Tiket
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Belum ada data departemen tiket.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
