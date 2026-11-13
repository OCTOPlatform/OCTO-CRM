'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  TrendingUp,
  PieChart,
  Activity,
  Layers,
  LifeBuoy,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Rocket,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';

function getChannelBadge(source: string) {
  const s = (source || '').toLowerCase();
  if (s.includes('meta') || s.includes('instagram') || s.includes('ig')) {
    return {
      label: 'Meta Ads (Instagram)',
      icon: '📸',
      badgeClass: 'bg-gradient-to-r from-purple-50 to-pink-50 text-pink-700 border-pink-200/80',
      pillClass: 'bg-pink-500',
    };
  }
  if (s.includes('facebook') || s.includes('fb')) {
    return {
      label: 'Meta Ads (Facebook)',
      icon: '🔵',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
      pillClass: 'bg-blue-600',
    };
  }
  if (s.includes('google') || s.includes('gads')) {
    return {
      label: 'Google Ads (Search / PMax)',
      icon: '🔍',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      pillClass: 'bg-emerald-500',
    };
  }
  if (s.includes('tiktok')) {
    return {
      label: 'TikTok Ads (Lead Gen)',
      icon: '🎵',
      badgeClass: 'bg-slate-900 text-white border-slate-700',
      pillClass: 'bg-slate-800',
    };
  }
  if (s.includes('whatsapp') || s.includes('ctwa')) {
    return {
      label: 'WhatsApp Inbound / CTWA',
      icon: '💬',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      pillClass: 'bg-emerald-600',
    };
  }
  if (s.includes('tap')) {
    return {
      label: 'OCTO Tap (NFC / Networking)',
      icon: '⚡',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      pillClass: 'bg-amber-500',
    };
  }
  if (s.includes('webchat') || s.includes('web') || s.includes('contact')) {
    return {
      label: 'Website Contact / WebChat',
      icon: '🌐',
      badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      pillClass: 'bg-[#00AFC4]',
    };
  }
  if (s.includes('referral')) {
    return {
      label: 'Referral & Partner',
      icon: '🤝',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      pillClass: 'bg-indigo-500',
    };
  }
  return {
    label: source || 'Organic / Unspecified',
    icon: '🌱',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    pillClass: 'bg-slate-400',
  };
}

function getMarketingRecommendation(item: LeadSourceItem) {
  const wonVal = item.total_value || 0;
  const winRate = item.conversion_rate || 0;
  const count = item.count || 0;
  const totalDeals = item.total_deals || 0;

  if (wonVal >= 25000000 || winRate >= 20) {
    return {
      tag: '🚀 Kencangkan Budget!',
      detail: 'ROI Prima, Siap Di-scale Up',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      icon: Rocket,
      iconColor: 'text-emerald-600',
    };
  }
  if (winRate > 0 || (wonVal > 0 && wonVal < 25000000)) {
    return {
      tag: '⚡ Pertahankan & Optimasi',
      detail: 'Konversi Sehat, Terus Jalankan',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-300',
      icon: Sparkles,
      iconColor: 'text-blue-600',
    };
  }
  if (count >= 5 && totalDeals > 0 && winRate === 0) {
    return {
      tag: '⚠️ Evaluasi Audiens / Iklan',
      detail: 'Banyak Leads Belum Closing',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    };
  }
  return {
    tag: '📈 Prospek Baru',
    detail: 'Perlu Follow-up Tim Sales',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: RefreshCw,
    iconColor: 'text-slate-500',
  };
}

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

  // Filters
  const [period, setPeriod] = useState<'7d' | '30d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comparePeriod, setComparePeriod] = useState(true);
  const [sourcesLoading, setSourcesLoading] = useState(false);

  // Data states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [funnel, setFunnel] = useState<StageFunnelItem[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSourceItem[]>([]);
  const [activities, setActivities] = useState<ActivitySummaryItem[]>([]);
  const [supportReport, setSupportReport] = useState<SupportReportResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    if (!currentWorkspace) return;
    const loadReports = async () => {
      try {
        setLoading(true);
        const [sumData, funnelData, sourcesData, actData, suppData] = await Promise.all([
          api.getDashboardSummary(currentWorkspace.id),
          api.getPipelineFunnel(currentWorkspace.id),
          api.getLeadSources(currentWorkspace.id, { period: '30d', compare: true }),
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

  // Refetch Lead Sources on Period / Filter change
  const reloadLeadSources = async (selectedPeriod = period, sDate = startDate, eDate = endDate) => {
    if (!currentWorkspace) return;
    try {
      setSourcesLoading(true);
      const data = await api.getLeadSources(currentWorkspace.id, {
        period: selectedPeriod,
        start_date: selectedPeriod === 'custom' ? sDate : undefined,
        end_date: selectedPeriod === 'custom' ? eDate : undefined,
        compare: comparePeriod,
      });
      setLeadSources(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSourcesLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: '7d' | '30d' | 'custom') => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      reloadLeadSources(newPeriod);
    }
  };

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      reloadLeadSources('custom', startDate, endDate);
    }
  };

  // Aggregations
  const totalLeadsVolume = useMemo(
    () => leadSources.reduce((acc, curr) => acc + (curr.count || 0), 0),
    [leadSources]
  );
  const totalWonRevenue = useMemo(
    () => leadSources.reduce((acc, curr) => acc + (curr.total_value || 0), 0),
    [leadSources]
  );
  const totalWonDealsCount = useMemo(
    () => leadSources.reduce((acc, curr) => acc + (curr.won_deals || 0), 0),
    [leadSources]
  );

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Laporan & Analitik Bisnis" />
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
        subtitle="Evaluasi performa tim penjualan (Pre-Sales), atribusi multi-channel leads, dan SLA After-Sales"
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
              <span>Laporan Penjualan & Atribusi Marketing (Pre-Sales)</span>
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
            <span>Laporan Kinerja Penjualan & Atribusi Leads (Pre-Sales)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold text-slate-800">
            <LifeBuoy className="w-4 h-4 text-purple-600" />
            <span>Laporan Kinerja Layanan & Kepatuhan SLA Tiket (After-Sales Helpdesk)</span>
          </div>
        )}

        {reportTab === 'sales' ? (
          <>
            {/* Filter Bar: 7 Hari, 30 Hari, Kustom Tanggal */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#142740] mr-2">
                  <Calendar className="w-4 h-4 text-[#00AFC4]" />
                  <span>Periode Evaluasi:</span>
                </div>

                <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handlePeriodChange('7d')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      period === '7d'
                        ? 'bg-white text-[#142740] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    7 Hari (Mingguan)
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePeriodChange('30d')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      period === '30d'
                        ? 'bg-white text-[#00AFC4] font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>30 Hari (Bulanan)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-100 text-[#00AFC4] font-bold">
                      Default
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePeriodChange('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      period === 'custom'
                        ? 'bg-white text-[#142740] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kustom Tanggal
                  </button>
                </div>

                {period === 'custom' && (
                  <form onSubmit={handleCustomApply} className="flex items-center gap-2 flex-wrap pl-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00AFC4] text-slate-700 bg-slate-50"
                    />
                    <span className="text-xs text-slate-400">s/d</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00AFC4] text-slate-700 bg-slate-50"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-bold text-white bg-[#00AFC4] hover:bg-[#009bb0] rounded-lg transition shadow-xs cursor-pointer"
                    >
                      Terapkan
                    </button>
                  </form>
                )}
              </div>

              {/* Compare Checkbox & Status */}
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={comparePeriod}
                    onChange={(e) => {
                      setComparePeriod(e.target.checked);
                      reloadLeadSources(period, startDate, endDate);
                    }}
                    className="w-4 h-4 text-[#00AFC4] rounded border-slate-300 focus:ring-[#00AFC4]"
                  />
                  <span>Bandingkan dengan Periode Sebelumnya (MoM / WoW)</span>
                </label>

                {sourcesLoading && (
                  <div className="flex items-center gap-1.5 text-xs text-[#00AFC4]">
                    <div className="w-3.5 h-3.5 border-2 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
                    <span>Memperbarui data...</span>
                  </div>
                )}
              </div>
            </div>

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
                  Persentase prospek tertutup menjadi penjualan sukses
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

            {/* ================= LEAD ATTRIBUTION & MARKETING ROI MATRIX ================= */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-slate-100 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-[#00AFC4]" />
                      <span>Matriks Atribusi & Efektivitas Sumber Prospek (Marketing ROI)</span>
                    </h3>
                    <p className="text-xs text-[#586779]">
                      Monitoring saluran masuk (Meta Ads, Google, TikTok, WA CTWA, Website, OCTO Tap) untuk mengevaluasi channel mana yang perlu <strong>dikencangkan anggarannya</strong>.
                    </p>
                  </div>

                  {/* Summary Capsules */}
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="text-slate-500">Total Prospek: </span>
                      <strong className="text-[#142740]">{totalLeadsVolume} Kontak</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                      <span className="text-emerald-700">Total Omset Won: </span>
                      <strong className="text-emerald-800">{formatCurrencyIDR(totalWonRevenue)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                      <th className="py-3 px-5">Saluran Prospek (Channel)</th>
                      <th className="py-3 px-4">Leads Masuk</th>
                      <th className="py-3 px-4">Pipeline Deals</th>
                      <th className="py-3 px-4">Deals Won</th>
                      <th className="py-3 px-4">Nilai Omset Won (IDR)</th>
                      <th className="py-3 px-4">Win Rate (%)</th>
                      <th className="py-3 px-5 text-right">Rekomendasi Evaluasi Marketing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {leadSources.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400">
                          Tidak ada data prospek pada periode ini.
                        </td>
                      </tr>
                    ) : (
                      leadSources.map((ls, idx) => {
                        const channel = getChannelBadge(ls.lead_source);
                        const rec = getMarketingRecommendation(ls);
                        const RecIcon = rec.icon;
                        const growth = ls.growth_pct ?? 0;
                        const prevCount = ls.previous_count ?? 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60 transition group">
                            {/* Channel Badge */}
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{channel.icon}</span>
                                <div>
                                  <div className="font-bold text-[#142740]">{channel.label}</div>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    tag: {ls.lead_source}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Leads Volume + Growth Indicator */}
                            <td className="py-3.5 px-4 font-semibold text-[#142740]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-extrabold">{ls.count}</span>
                                <span className="text-slate-400 text-[11px]">leads</span>
                              </div>
                              {comparePeriod && prevCount > 0 && (
                                <div
                                  className={`flex items-center text-[10px] font-bold mt-0.5 ${
                                    growth >= 0 ? 'text-emerald-600' : 'text-rose-500'
                                  }`}
                                >
                                  {growth >= 0 ? (
                                    <ArrowUpRight className="w-3 h-3 inline" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3 inline" />
                                  )}
                                  <span>{Math.abs(growth)}% vs periode lalu</span>
                                </div>
                              )}
                            </td>

                            {/* Pipeline Deals */}
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700">
                                {ls.total_deals ?? 0}
                              </span>
                            </td>

                            {/* Won Deals */}
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                {ls.won_deals ?? 0}
                              </span>
                            </td>

                            {/* Won Revenue (IDR) */}
                            <td className="py-3.5 px-4 font-extrabold text-[#142740]">
                              {formatCurrencyIDR(ls.total_value || 0)}
                            </td>

                            {/* Win Rate */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      (ls.conversion_rate || 0) >= 20
                                        ? 'bg-emerald-500'
                                        : (ls.conversion_rate || 0) > 0
                                        ? 'bg-[#00AFC4]'
                                        : 'bg-slate-300'
                                    }`}
                                    style={{ width: `${Math.min(100, ls.conversion_rate || 0)}%` }}
                                  ></div>
                                </div>
                                <span
                                  className={`font-black text-xs ${
                                    (ls.conversion_rate || 0) >= 20
                                      ? 'text-emerald-600'
                                      : (ls.conversion_rate || 0) > 0
                                      ? 'text-[#00AFC4]'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {(ls.conversion_rate || 0).toFixed(1)}%
                                </span>
                              </div>
                            </td>

                            {/* Recommendation Pill */}
                            <td className="py-3.5 px-5 text-right">
                              <div className="inline-flex flex-col items-end">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${rec.badgeClass}`}
                                >
                                  <RecIcon className={`w-3.5 h-3.5 ${rec.iconColor}`} />
                                  <span>{rec.tag}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {rec.detail}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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

            {/* Channel Visual Share & Activity Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Channel Share */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <h3 className="font-bold text-sm text-[#142740] flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#00AFC4]" />
                  <span>Pangsa Volume Sumber Prospek (% Leads Share)</span>
                </h3>

                <div className="space-y-3">
                  {leadSources.map((ls, idx) => {
                    const ch = getChannelBadge(ls.lead_source);
                    const pct = totalLeadsVolume > 0 ? Math.round((ls.count / totalLeadsVolume) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{ch.icon}</span>
                            <span className="font-bold text-slate-800">{ch.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#142740]">{ls.count} leads</span>
                            <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 rounded-md bg-slate-100">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${ch.pillClass}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
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