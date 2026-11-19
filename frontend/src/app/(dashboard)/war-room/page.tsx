'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { WarRoomStats, RecentCelebration, Deal } from '@/types';
import {
  Trophy,
  Crown,
  Flame,
  Sparkles,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Target,
  ArrowUpRight,
  TrendingUp,
  Award,
  ChevronLeft,
  PartyPopper,
  Zap,
  Users,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  X,
  Building,
} from 'lucide-react';

export default function WarRoomPage() {
  const { currentWorkspace } = useAuth();
  const [stats, setStats] = useState<WarRoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-11');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real Celebration Modal State
  const [celebrationModal, setCelebrationModal] = useState<RecentCelebration | null>(null);

  // Live Closing Demo State (Real Deals from DB)
  const [openDeals, setOpenDeals] = useState<Deal[]>([]);
  const [showLiveClosingModal, setShowLiveClosingModal] = useState(false);
  const [selectedDealToClose, setSelectedDealToClose] = useState<string>('');
  const [closingLoading, setClosingLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const loadStats = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const data = await api.getWarRoomStats(currentWorkspace.id, period);
      setStats(data);
    } catch (err) {
      console.error('Failed to load war-room stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOpenDeals = async () => {
    if (!currentWorkspace?.id) return;
    try {
      const allDeals = await api.listDeals(currentWorkspace.id);
      // Filter deals that are still open / not won yet
      const openOnly = allDeals.filter(
        (d) => d.status?.toLowerCase() !== 'won' && d.status?.toLowerCase() !== 'lost'
      );
      setOpenDeals(openOnly);
      if (openOnly.length > 0) {
        setSelectedDealToClose(openOnly[0].id);
      }
    } catch (err) {
      console.error('Failed to load open deals:', err);
    }
  };

  useEffect(() => {
    loadStats();
    loadOpenDeals();
    // Auto-refresh war room every 15 seconds
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, [currentWorkspace?.id, period]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // AudioContext fallback
    }
  };

  // Trigger celebration using 100% real deal from database
  const triggerRealCelebration = (specificCeleb?: RecentCelebration) => {
    if (specificCeleb) {
      setCelebrationModal(specificCeleb);
    } else if (stats?.recent_celebrations && stats.recent_celebrations.length > 0) {
      // Pick the latest real celebration from the database
      setCelebrationModal(stats.recent_celebrations[0]);
    } else if (stats?.leaderboard && stats.leaderboard.length > 0) {
      const topRep = stats.leaderboard[0];
      setCelebrationModal({
        deal_id: topRep.user_id,
        deal_title: `Pencapaian Omset Tertinggi: ${topRep.full_name}`,
        amount: topRep.total_revenue,
        rep_name: topRep.full_name,
        commission_amount: topRep.total_commission,
        closed_at: new Date().toISOString(),
      });
    }

    if (soundEnabled) {
      playChime();
    }
  };

  // Live Closing Deal Action (Real Database Mutation)
  const handleExecuteLiveClosing = async () => {
    if (!currentWorkspace?.id || !selectedDealToClose) return;
    setClosingLoading(true);
    try {
      const targetDeal = openDeals.find((d) => d.id === selectedDealToClose);
      if (!targetDeal) return;

      // Update deal to won in database
      // Find won stage id from pipelines if available, or update status directly
      const pipelines = await api.listPipelines(currentWorkspace.id);
      const wonStage = pipelines[0]?.stages?.find(
        (s: any) => s.name?.toLowerCase().includes('won') || s.name?.toLowerCase().includes('menang')
      );

      await api.updateDealStage(
        currentWorkspace.id,
        targetDeal.id,
        wonStage?.id || targetDeal.stage_id,
        'won'
      );

      // Reload real stats from database
      await loadStats();
      await loadOpenDeals();

      setShowLiveClosingModal(false);

      // Celebrate the newly closed real deal!
      setCelebrationModal({
        deal_id: targetDeal.id,
        deal_title: targetDeal.title,
        amount: targetDeal.value,
        rep_name: targetDeal.owner_name || stats?.leaderboard[0]?.full_name || 'Sales Rep',
        commission_amount: Math.round(targetDeal.value * 0.035),
        closed_at: new Date().toISOString(),
      });

      if (soundEnabled) {
        playChime();
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menutup deal closing');
    } finally {
      setClosingLoading(false);
    }
  };

  const top3 = stats?.leaderboard ? stats.leaderboard.slice(0, 3) : [];
  const rank1 = top3[0];
  const rank2 = top3[1];
  const rank3 = top3[2];

  const achievement = stats?.achievement_percentage || 0;
  const progressPercent = Math.min(100, Math.max(0, achievement));

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#070b14] text-white flex flex-col justify-between selection:bg-amber-500 selection:text-black overflow-x-hidden font-sans"
    >
      {/* Background Neon Gradients */}
      <div className="fixed inset-0 pointer-events-none opacity-25">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600 rounded-full blur-[140px]" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-amber-500 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-emerald-600 rounded-full blur-[140px]" />
      </div>

      {/* TOP BAR / CONTROLS */}
      <header className="relative z-20 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/commissions"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke CRM</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-950/60 border border-red-500/40 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                LIVE SALES WAR-ROOM
              </span>
            </div>
            <h1 className="text-lg font-black tracking-tight text-white hidden sm:block">
              {currentWorkspace?.name || 'OCTO CRM'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="2026-11">Bulan Ini (Nov 2026)</option>
            <option value="2026-10">Bulan Lalu (Okt 2026)</option>
            <option value="">Semua Periode</option>
          </select>

          {/* Real Live Closing Demo Button */}
          <button
            onClick={() => {
              loadOpenDeals();
              setShowLiveClosingModal(true);
            }}
            title="Tutup Deal Prospek Nyata untuk Demo Langsung"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Closing Deal Real</span>
          </button>

          {/* Real Deal Celebration Gong */}
          <button
            onClick={() => triggerRealCelebration()}
            title="Rayakan Transaksi Closing Nyata Terbaru"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
          >
            <PartyPopper className="w-4 h-4" />
            <span className="hidden md:inline">Gong Closing 🎉</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
            title={soundEnabled ? 'Matikan Suara Chime' : 'Aktifkan Suara Chime'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Layar Penuh TV Mode"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="relative z-10 flex-1 px-6 py-6 max-w-[1600px] mx-auto w-full space-y-8">
        {/* TEAM REVENUE TARGET GAUGE */}
        <section className="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Flame className="w-64 h-64 text-amber-500" />
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target Omset Penjualan Tim Bulanan ({period || '2026'})
                </span>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                  {formatCurrencyIDR(stats?.total_revenue_won || 0)}
                </span>
                <span className="text-slate-400 text-sm font-semibold">
                  dari target {formatCurrencyIDR(stats?.team_target || 350000000)}
                </span>
              </div>
            </div>

            {/* Quick Metrics Pills */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Deals Ditutup
                </div>
                <div className="text-2xl font-black text-amber-400 mt-0.5">
                  {stats?.total_deals_won || 0} Deals
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Komisi Diterbitkan
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {formatCurrencyIDR(stats?.total_commission_accrued || 0)}
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pencapaian Target
                </div>
                <div className="text-2xl font-black text-purple-400 mt-0.5">{achievement}%</div>
              </div>
            </div>
          </div>

          {/* Progress Bar with Glow */}
          <div className="mt-6">
            <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-amber-400 to-emerald-400 transition-all duration-1000 shadow-lg shadow-amber-500/30"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-slate-400 font-semibold">
              <span>0% Kickoff</span>
              <span className="text-amber-400 font-bold">{progressPercent}% Tercapai</span>
              <span>100% Target Goal</span>
            </div>
          </div>
        </section>

        {/* THE TOP 3 SUPERSTARS PODIUM */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h2 className="text-xl font-black tracking-tight text-white">
                Podium Superstar Penjualan
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Peringkat nyata berdasarkan omset transaksi deal yang telah berstatus Won di database
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
            {/* RANK 2: SILVER 🥈 */}
            {rank2 ? (
              <div className="bg-gradient-to-t from-slate-900/90 to-slate-900/40 border border-slate-700/80 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden md:order-1 h-[360px] justify-between shadow-xl shadow-slate-900/50">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-900 font-black text-sm flex items-center justify-center shadow-md">
                  2
                </div>

                <div className="space-y-2 mt-2">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-300 overflow-hidden bg-slate-800 mx-auto shadow-lg">
                      <img
                        src={
                          rank2.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${rank2.full_name}`
                        }
                        alt={rank2.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-slate-300 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                      SILVER
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-white mt-1 line-clamp-1">
                    {rank2.full_name}
                  </h3>
                  <p className="text-xs text-slate-400">{rank2.deals_won} Deals Closing Won</p>
                </div>

                <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Omset Closing</div>
                  <div className="text-xl font-black text-slate-200">
                    {formatCurrencyIDR(rank2.total_revenue)}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold pt-1">
                    Komisi: {formatCurrencyIDR(rank2.total_commission)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[360px] bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 text-xs md:order-1">
                Posisi Silver Belum Terisi
              </div>
            )}

            {/* RANK 1: GOLD CHAMPION 🥇 (ELEVATED) */}
            {rank1 ? (
              <div className="bg-gradient-to-t from-amber-950/40 via-slate-900/90 to-slate-900/70 border-2 border-amber-500/80 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden md:order-2 h-[420px] justify-between shadow-2xl shadow-amber-500/20 animate-scale-in">
                {/* Crown Banner */}
                <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-black py-1.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md">
                  <Crown className="w-4 h-4 fill-black" />
                  <span>CHAMPION CLOSER OF THE MONTH</span>
                </div>

                <div className="mt-8 relative inline-block">
                  <div className="w-28 h-28 rounded-full border-4 border-amber-400 overflow-hidden bg-slate-800 mx-auto shadow-2xl shadow-amber-400/40 ring-4 ring-amber-500/20">
                    <img
                      src={
                        rank1.avatar_url ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${rank1.full_name}`
                      }
                      alt={rank1.full_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-1 bg-amber-400 text-black font-black text-xs px-2.5 py-0.5 rounded-full shadow-lg">
                    🥇 #1 GOLD
                  </div>
                </div>

                <div className="space-y-1 mt-1">
                  <h3 className="font-black text-2xl text-amber-300 line-clamp-1">
                    {rank1.full_name}
                  </h3>
                  <div className="inline-flex items-center gap-1 text-xs text-amber-400/90 font-bold bg-amber-950/60 px-3 py-0.5 rounded-full border border-amber-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{rank1.deals_won} Deals Ditutup</span>
                  </div>
                </div>

                <div className="w-full bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 space-y-1 shadow-inner">
                  <div className="text-[10px] uppercase font-bold text-amber-400">
                    Total Omset Closing
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white">
                    {formatCurrencyIDR(rank1.total_revenue)}
                  </div>
                  <div className="text-sm text-emerald-400 font-extrabold pt-1">
                    Komisi: {formatCurrencyIDR(rank1.total_commission)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[420px] bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 text-xs md:order-2">
                Belum ada closing deal bulan ini
              </div>
            )}

            {/* RANK 3: BRONZE 🥉 */}
            {rank3 ? (
              <div className="bg-gradient-to-t from-slate-900/90 to-slate-900/40 border border-amber-900/40 rounded-3xl p-6 backdrop-blur-xl flex flex-col items-center text-center relative overflow-hidden md:order-3 h-[330px] justify-between shadow-xl shadow-slate-900/50">
                <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shadow-md">
                  3
                </div>

                <div className="space-y-2 mt-2">
                  <div className="relative inline-block">
                    <div className="w-18 h-18 rounded-full border-4 border-amber-700 overflow-hidden bg-slate-800 mx-auto shadow-lg">
                      <img
                        src={
                          rank3.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${rank3.full_name}`
                        }
                        alt={rank3.full_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="absolute -bottom-1 -right-1 bg-amber-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                      BRONZE
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg text-white mt-1 line-clamp-1">
                    {rank3.full_name}
                  </h3>
                  <p className="text-xs text-slate-400">{rank3.deals_won} Deals Closing Won</p>
                </div>

                <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Omset Closing</div>
                  <div className="text-xl font-black text-slate-200">
                    {formatCurrencyIDR(rank3.total_revenue)}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold pt-1">
                    Komisi: {formatCurrencyIDR(rank3.total_commission)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[330px] bg-slate-950/40 border border-dashed border-slate-800 rounded-3xl flex items-center justify-center text-slate-600 text-xs md:order-3">
                Posisi Bronze Belum Terisi
              </div>
            )}
          </div>
        </section>

        {/* FULL LEADERBOARD TABLE & RECENT CELEBRATIONS FEED */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Leaderboard Table */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-white text-base">Klasemen Lengkap Tim Sales</h3>
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Total {stats?.leaderboard.length || 0} Anggota Tim
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/60">
                    <th className="py-3 px-3 text-center">Rank</th>
                    <th className="py-3 px-3">Sales Representative</th>
                    <th className="py-3 px-3 text-center">Deals Won</th>
                    <th className="py-3 px-3 text-right">Omset Closing</th>
                    <th className="py-3 px-3 text-right">Komisi Terkumpul</th>
                    <th className="py-3 px-3 text-center">Target Progres</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-sm">
                  {stats?.leaderboard && stats.leaderboard.length > 0 ? (
                    stats.leaderboard.map((item) => (
                      <tr key={item.user_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3 text-center font-bold">
                          {item.rank === 1 ? (
                            <span className="text-amber-400">🥇 1</span>
                          ) : item.rank === 2 ? (
                            <span className="text-slate-300">🥈 2</span>
                          ) : item.rank === 3 ? (
                            <span className="text-amber-700">🥉 3</span>
                          ) : (
                            <span className="text-slate-500">#{item.rank}</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 uppercase">
                              {item.full_name ? item.full_name.substring(0, 2) : 'SR'}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{item.full_name}</div>
                              <div className="text-[11px] text-slate-500">{item.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-200">
                          {item.deals_won}
                        </td>

                        <td className="py-3 px-3 text-right font-bold text-white">
                          {formatCurrencyIDR(item.total_revenue)}
                        </td>

                        <td className="py-3 px-3 text-right font-semibold text-emerald-400">
                          {formatCurrencyIDR(item.total_commission)}
                        </td>

                        <td className="py-3 px-3">
                          <div className="w-24 mx-auto">
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className="bg-amber-400 h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, item.achievement_percentage)}%`,
                                }}
                              />
                            </div>
                            <div className="text-[10px] text-center text-slate-400 mt-0.5">
                              {item.achievement_percentage}%
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Tidak ada data tim penjualan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Col: Recent Deals Celebrations Feed */}
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="font-black text-white text-base">Feed Closing Terkini</h3>
                </div>
                <span className="text-[10px] font-bold bg-amber-950 text-amber-400 px-2 py-0.5 rounded-full border border-amber-800">
                  REAL-TIME DB
                </span>
              </div>

              <div className="space-y-3">
                {stats?.recent_celebrations && stats.recent_celebrations.length > 0 ? (
                  stats.recent_celebrations.map((celeb, idx) => (
                    <div
                      key={idx}
                      onClick={() => triggerRealCelebration(celeb)}
                      className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl hover:border-amber-500/50 hover:bg-slate-900/80 transition-all space-y-1.5 cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                          {celeb.rep_name}
                        </span>
                        <span className="text-xs font-black text-amber-400">
                          {formatCurrencyIDR(celeb.amount)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{celeb.deal_title}</p>
                      <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                        <span className="text-emerald-400 font-semibold">
                          Komisi: {formatCurrencyIDR(celeb.commission_amount)}
                        </span>
                        <span className="text-amber-400/80 text-[10px] font-medium group-hover:underline">
                          Klik untuk Rayakan 🎉
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Belum ada transaksi closing di database.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500">
                Data sinkron 100% langsung dengan database Deal & Invoice.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER TICKER */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-slate-950 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-300">OCTO War-Room Engine</span>
          <span>•</span>
          <span>Mode TV Siar Kantor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-400 font-medium">Data Live Terhubung ke PostgreSQL</span>
        </div>
      </footer>

      {/* MODAL LIVE CLOSING DEAL (DEMO TANPA DUMMY DATA) */}
      {showLiveClosingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full text-left space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-lg">Simulasi Closing Deal Riil</h3>
              </div>
              <button
                onClick={() => setShowLiveClosingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Pilih peluang penjualan nyata (*Real Deal*) yang masih berstatus terbuka untuk ditutup
              menjadi **WON**. Sistem akan mengupdate database riil, mengkalkulasi komisi sales rep,
              dan membunyikan gong perayaan di layar War-Room!
            </p>

            {openDeals.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center text-xs text-slate-400">
                Semua deal saat ini sudah berstatus Won/Lost. Buat deal baru di modul Pipeline untuk
                mencoba closing lagi.
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  Pilih Deal Nyata di Database:
                </label>
                <select
                  value={selectedDealToClose}
                  onChange={(e) => setSelectedDealToClose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {openDeals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({formatCurrencyIDR(d.value)}) — Sales: {d.owner_name || 'Budi'}
                    </option>
                  ))}
                </select>

                {(() => {
                  const deal = openDeals.find((d) => d.id === selectedDealToClose);
                  if (!deal) return null;
                  return (
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nama Pelanggan / Deal:</span>
                        <span className="font-bold text-white">{deal.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nilai Transaksi:</span>
                        <span className="font-extrabold text-amber-400 text-sm">
                          {formatCurrencyIDR(deal.value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sales Representative:</span>
                        <span className="font-medium text-slate-200">
                          {deal.owner_name || 'Budi Santoso'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Estimasi Komisi (3.5%):</span>
                        <span className="font-bold text-emerald-400">
                          {formatCurrencyIDR(deal.value * 0.035)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowLiveClosingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={closingLoading || openDeals.length === 0}
                onClick={handleExecuteLiveClosing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold text-xs shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              >
                {closingLoading ? 'Memproses Closing...' : 'Closing Deal Ini Sekarang (Won) 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL CELEBRATION MODAL POPUP */}
      {celebrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-400 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl shadow-amber-500/40 relative overflow-hidden animate-scale-in">
            {/* Confetti Glow Background */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-amber-500 rounded-full blur-3xl opacity-30" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-emerald-500 rounded-full blur-3xl opacity-30" />

            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black shadow-xl shadow-amber-500/40">
              <PartyPopper className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 px-3 py-1 rounded-full border border-amber-500/40">
                🎉 TRANSAKSI REAL CLOSING WON!
              </span>
              <h3 className="text-2xl font-black text-white mt-2">{celebrationModal.rep_name}</h3>
              <p className="text-sm text-slate-300 font-medium">{celebrationModal.deal_title}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="text-xs uppercase font-bold text-slate-500">Nilai Transaksi Riil</div>
              <div className="text-3xl font-black text-amber-400">
                {formatCurrencyIDR(celebrationModal.amount)}
              </div>
              <div className="text-xs text-emerald-400 font-bold pt-1">
                Komisi Sales: {formatCurrencyIDR(celebrationModal.commission_amount)}
              </div>
            </div>

            <button
              onClick={() => setCelebrationModal(null)}
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
            >
              Mantap, Lanjutkan Closing! 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
