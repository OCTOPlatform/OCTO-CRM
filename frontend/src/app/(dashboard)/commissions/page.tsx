'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import {
  SalesCommission,
  SalesCommissionPlan,
  CommissionSummary,
  CreateCommissionPlanRequest,
} from '@/types';
import {
  Award,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  Search,
  ExternalLink,
  Sliders,
  FileCheck,
  ShieldAlert,
  ArrowRight,
  Trophy,
  Sparkles,
} from 'lucide-react';

export default function CommissionsPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [commissions, setCommissions] = useState<SalesCommission[]>([]);
  const [plans, setPlans] = useState<SalesCommissionPlan[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'transactions' | 'plans'>('transactions');
  const [periodFilter, setPeriodFilter] = useState('2026-11');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Plan Modal Form
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState<CreateCommissionPlanRequest>({
    name: '',
    calculation_type: 'tiered_threshold',
    base_rate: 3.0,
    threshold_amount: 50000000,
    bonus_rate: 5.0,
    is_active: true,
  });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Status Action Modal / State
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    try {
      const [commRes, plansRes, sumRes] = await Promise.all([
        api.listCommissions(currentWorkspace.id, {
          period: periodFilter === 'all' ? undefined : periodFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        api.listCommissionPlans(currentWorkspace.id),
        api.getCommissionSummary(
          currentWorkspace.id,
          periodFilter === 'all' ? undefined : periodFilter
        ),
      ]);
      setCommissions(commRes);
      setPlans(plansRes);
      setSummary(sumRes);
    } catch (err) {
      console.error('Failed to load commissions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace?.id, periodFilter, statusFilter]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!currentWorkspace?.id) return;
    setActionLoading(true);
    try {
      await api.updateCommissionStatus(
        currentWorkspace.id,
        id,
        status,
        status === 'approved' ? 'Disetujui oleh manager' : 'Ditolak'
      );
      setSuccessMessage(`Komisi berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status komisi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    setActionLoading(true);
    try {
      if (editingPlanId) {
        await api.updateCommissionPlan(currentWorkspace.id, editingPlanId, planForm);
        setSuccessMessage('Skema komisi berhasil diperbarui!');
      } else {
        await api.createCommissionPlan(currentWorkspace.id, planForm);
        setSuccessMessage('Skema komisi baru berhasil dibuat!');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowPlanModal(false);
      setEditingPlanId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan skema komisi');
    } finally {
      setActionLoading(false);
    }
  };

  const openCreatePlanModal = () => {
    setEditingPlanId(null);
    setPlanForm({
      name: '',
      calculation_type: 'tiered_threshold',
      base_rate: 3.0,
      threshold_amount: 50000000,
      bonus_rate: 5.0,
      is_active: true,
    });
    setShowPlanModal(true);
  };

  const openEditPlanModal = (p: SalesCommissionPlan) => {
    setEditingPlanId(p.id);
    setPlanForm({
      name: p.name,
      calculation_type: p.calculation_type,
      base_rate: p.base_rate,
      threshold_amount: p.threshold_amount,
      bonus_rate: p.bonus_rate,
      is_active: p.is_active,
    });
    setShowPlanModal(true);
  };

  const filteredCommissions = commissions.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.deal_title?.toLowerCase().includes(q) ||
      c.user_name?.toLowerCase().includes(q) ||
      c.user_email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 text-slate-900">
      <Navbar title="Komisi Penjualan & Insentif" />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner Success Notification */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-sm">{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-emerald-500 hover:text-emerald-700 text-xs"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-7 h-7 text-indigo-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Komisi Penjualan & Insentif Closing
              </h1>
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Perhitungan komisi otomatis saat invoice dibayar / deal closing, terhubung langsung ke HRIS Payroll & Live Sales War-Room.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/war-room"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium rounded-xl shadow-sm transition-all shadow-amber-200"
            >
              <Trophy className="w-4 h-4" />
              <span>Buka Sales War-Room TV</span>
            </Link>
            <Link
              href="/payroll"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-xl border border-indigo-200 transition-colors"
            >
              <FileCheck className="w-4 h-4" />
              <span>Slip Gaji HRIS</span>
            </Link>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Accrued */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total Akumulasi Komisi
              </span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrencyIDR(summary?.total_accrued || 0)}
              </span>
              <p className="text-xs text-slate-500 mt-1">Semua komisi aktif periode ini</p>
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Menunggu Persetujuan
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-600">
                {formatCurrencyIDR(summary?.total_pending || 0)}
              </span>
              <p className="text-xs text-slate-500 mt-1">Perlu review manager penjualan</p>
            </div>
          </div>

          {/* Card 3: Approved */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Telah Disetujui
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-600">
                {formatCurrencyIDR(summary?.total_approved || 0)}
              </span>
              <p className="text-xs text-slate-500 mt-1">Siap dicairkan di slip gaji HRIS</p>
            </div>
          </div>

          {/* Card 4: Top Earner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Top Sales Earner
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-lg font-bold text-slate-900 truncate block">
                {summary?.top_earner_name && summary.top_earner_name !== 'None'
                  ? summary.top_earner_name
                  : '-'}
              </span>
              <p className="text-xs text-purple-600 font-semibold mt-1">
                {summary?.top_earner_amount
                  ? formatCurrencyIDR(summary.top_earner_amount)
                  : 'Rp 0'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 font-medium text-sm rounded-xl transition-all ${
                activeTab === 'transactions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Transaksi Komisi ({commissions.length})
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 font-medium text-sm rounded-xl transition-all ${
                activeTab === 'plans'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Skema & Aturan Komisi ({plans.length})
            </button>
          </div>

          {activeTab === 'plans' && (
            <button
              onClick={openCreatePlanModal}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Skema Baru</span>
            </button>
          )}
        </div>

        {/* TAB 1: TRANSAKSI KOMISI */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama sales atau judul deal..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Review</option>
                    <option value="approved">Disetujui</option>
                    <option value="paid_in_payroll">Masuk Slip Gaji</option>
                    <option value="rejected">Ditolak</option>
                  </select>
                </div>

                <div>
                  <select
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl text-sm px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="2026-11">Periode: Nov 2026</option>
                    <option value="2026-10">Periode: Okt 2026</option>
                    <option value="all">Semua Periode</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Menampilkan {filteredCommissions.length} transaksi komisi
              </div>
            </div>

            {/* Commissions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Sales Representative</th>
                      <th className="py-3.5 px-4">Deal / Penjualan</th>
                      <th className="py-3.5 px-4 text-right">Nilai Deal</th>
                      <th className="py-3.5 px-4 text-center">Rate</th>
                      <th className="py-3.5 px-4 text-right">Komisi Diterima</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Memuat data komisi...
                        </td>
                      </tr>
                    ) : filteredCommissions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Belum ada transaksi komisi pada filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredCommissions.map((c) => {
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                                  {c.user_name ? c.user_name.substring(0, 2) : 'SR'}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {c.user_name || 'Sales Rep'}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {c.user_email || '-'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800 line-clamp-1">
                                {c.deal_title || 'Deal Penjualan'}
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">
                                Skema: {c.plan_name || 'Standard'} • Periode: {c.period}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                              {formatCurrencyIDR(c.deal_amount)}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                {c.commission_rate}%
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-indigo-600">
                              {formatCurrencyIDR(c.commission_amount)}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {c.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Disetujui
                                </span>
                              )}
                              {c.status === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Menunggu Review
                                </span>
                              )}
                              {c.status === 'paid_in_payroll' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                                  Masuk Slip Gaji
                                </span>
                              )}
                              {c.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                  Ditolak
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {c.status === 'pending' && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleUpdateStatus(c.id, 'approved')}
                                    disabled={actionLoading}
                                    title="Setujui Komisi"
                                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(c.id, 'rejected')}
                                    disabled={actionLoading}
                                    title="Tolak Komisi"
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {c.status === 'approved' && (
                                <span className="text-xs text-slate-400 italic">
                                  Siap Payroll
                                </span>
                              )}
                              {c.status === 'paid_in_payroll' && (
                                <span className="text-xs text-blue-600 font-medium">
                                  Lunas di Slip
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SKEMA & ATURAN KOMISI */}
        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        p.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {p.is_active ? 'Aktif' : 'Non-Aktif'}
                    </span>
                    <button
                      onClick={() => openEditPlanModal(p)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Edit Skema
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-900 text-lg mt-3">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    Tipe: {p.calculation_type.replace('_', ' ')}
                  </p>

                  <div className="mt-4 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Base Commission:</span>
                      <span className="font-bold text-slate-800">{p.base_rate}%</span>
                    </div>

                    {p.calculation_type === 'tiered_threshold' && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Target Threshold:</span>
                          <span className="font-semibold text-slate-800">
                            {formatCurrencyIDR(p.threshold_amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Bonus Over-Target:</span>
                          <span className="font-bold text-purple-600">+{p.bonus_rate}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Dibuat: {new Date(p.created_at).toLocaleDateString('id-ID')}</span>
                  <span className="text-indigo-600 font-medium">Default Rule</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL BUAT / EDIT SKEMA KOMISI */}
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-scale-in">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900">
                    {editingPlanId ? 'Edit Skema Komisi' : 'Buat Skema Komisi Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Nama Skema Komisi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Skema Tiering Sales 2026"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Tipe Kalkulasi Komisi
                  </label>
                  <select
                    value={planForm.calculation_type}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        calculation_type: e.target.value as
                          | 'tiered_threshold'
                          | 'percentage_deal'
                          | 'fixed_amount',
                      })
                    }
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="tiered_threshold">
                      Tiered Threshold (Base Rate + Bonus jika melebihi target)
                    </option>
                    <option value="percentage_deal">
                      Percentage Deal (Persentase tetap dari nilai deal)
                    </option>
                    <option value="fixed_amount">
                      Fixed Amount (Bonus tetap per deal closing)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      Base Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={planForm.base_rate}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, base_rate: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {planForm.calculation_type === 'tiered_threshold' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                        Bonus Rate Over-Target (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={planForm.bonus_rate}
                        onChange={(e) =>
                          setPlanForm({ ...planForm, bonus_rate: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {planForm.calculation_type === 'tiered_threshold' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                      Threshold Target Omset (Rp)
                    </label>
                    <input
                      type="number"
                      value={planForm.threshold_amount}
                      onChange={(e) =>
                        setPlanForm({
                          ...planForm,
                          threshold_amount: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Nilai omset di mana bonus rate ekstra mulai dihitung.
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700">
                    Aktifkan skema ini untuk perhitungan otomatis
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    {actionLoading ? 'Menyimpan...' : 'Simpan Skema'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
