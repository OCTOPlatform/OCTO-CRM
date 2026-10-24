'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { MasterWorkspaceSummary, ProvisionCompanyRequest } from '@/types';
import {
  Building2,
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  MessageSquare,
  Kanban,
  LifeBuoy,
  Copy,
  ExternalLink,
  Ban,
  Sparkles,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

export default function MasterTenantsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<MasterWorkspaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro' | 'enterprise'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    company: MasterWorkspaceSummary;
    invite_url: string;
  } | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [maxUsers, setMaxUsers] = useState(15);
  const [maxChannels, setMaxChannels] = useState(3);
  const [ownerFullName, setOwnerFullName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  const [copiedLink, setCopiedLink] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterWorkspaceSummary | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.listMasterWorkspaces();
      setTenants(data || []);
    } catch (e: any) {
      console.error('Failed to load master workspaces:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePlanPresetChange = (plan: 'starter' | 'pro' | 'enterprise') => {
    setSubscriptionPlan(plan);
    if (plan === 'starter') {
      setMaxUsers(5);
      setMaxChannels(1);
    } else if (plan === 'pro') {
      setMaxUsers(15);
      setMaxChannels(3);
    } else {
      setMaxUsers(50);
      setMaxChannels(10);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !ownerFullName.trim() || !ownerEmail.trim()) {
      alert('Harap lengkapi semua data wajib formulir pendaftaran.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.provisionCompany({
        company_name: companyName.trim(),
        subscription_plan: subscriptionPlan,
        max_users: maxUsers,
        max_channels: maxChannels,
        owner_full_name: ownerFullName.trim(),
        owner_email: ownerEmail.trim(),
      });

      setSuccessResult(res);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mendaftarkan perusahaan klien');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tenant: MasterWorkspaceSummary) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    const actionText = newStatus === 'suspended' ? 'menangguhkan (suspend)' : 'mengaktifkan kembali';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} akses untuk "${tenant.name}"?`)) return;

    try {
      setActionLoading(tenant.id);
      await api.updateCompanyMasterStatus(tenant.id, {
        status: newStatus,
      });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal memperbarui status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleInitiateDelete = (tenant: MasterWorkspaceSummary) => {
    if (tenant.slug === 'octo-technologies' || tenant.id === '0c700000-0000-0000-0000-000000000000') {
      alert('Perusahaan utama platform (PT OCTO Technologies Indonesia) tidak dapat dihapus.');
      return;
    }
    setDeleteTarget(tenant);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await api.deleteMasterWorkspace(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus perusahaan');
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resetForm = () => {
    setCompanyName('');
    setSubscriptionPlan('pro');
    setMaxUsers(15);
    setMaxChannels(3);
    setOwnerFullName('');
    setOwnerEmail('');
    setSuccessResult(null);
    setShowModal(false);
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      t.owner_name.toLowerCase().includes(q) ||
      t.owner_email.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchPlan = planFilter === 'all' || t.subscription_plan === planFilter;

    return matchQuery && matchStatus && matchPlan;
  });

  // Calculate Metrics
  const totalCompanies = tenants.length;
  const activeCompanies = tenants.filter((t) => t.status === 'active').length;
  const suspendedCompanies = tenants.filter((t) => t.status === 'suspended').length;
  const totalPlatformUsers = tenants.reduce((acc, t) => acc + (t.total_members || 1), 0);

  if (authLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-[#00AFC4] mb-3" />
        <p className="text-xs text-slate-500 font-medium">Memverifikasi otentikasi Superadmin...</p>
      </div>
    );
  }

  if (!user?.is_superadmin || user?.email?.toLowerCase() !== 'egichandrapratama@gmail.com') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 min-h-screen">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <Ban className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Akses Dibatasi</h2>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          Halaman ini khusus untuk Platform Master Admin OCTO (egichandrapratama@gmail.com). Akun Anda tidak memiliki izin untuk mengelola pendaftaran perusahaan.
        </p>
        <Link
          href="/"
          className="mt-6 px-4 py-2 bg-[#00AFC4] text-white text-xs font-semibold rounded-xl hover:bg-[#0096a8] transition shadow-xs"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      <Navbar
        title="OCTO Master Platform • Kelola Perusahaan Klien"
        subtitle="Pusat kontrol onboarding, whitelist, paket langganan, dan manajemen tenant"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Banner Top Header */}
        <div className="bg-gradient-to-r from-[#091E42] via-[#0D2B59] to-[#00AFC4] rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                Platform Operator Control
              </span>
              <span className="text-xs text-white/80">• Sistem Multi-Tenant Terisolasi</span>
            </div>
            <h2 className="text-xl font-extrabold">Manajemen Klien & Whitelist Perusahaan</h2>
            <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
              Daftarkan perusahaan klien baru, tetapkan kuota akun, dan sistem akan langsung mengirimkan email aktivasi resmi ke Direktur / Owner perusahaan secara otomatis.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#091E42] hover:bg-slate-100 font-bold text-xs rounded-xl shadow-lg transition shrink-0 active:scale-98"
          >
            <Plus className="w-4 h-4 text-[#00AFC4]" />
            <span>Daftarkan Perusahaan Baru</span>
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Perusahaan</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">{totalCompanies}</div>
            <span className="text-[11px] text-slate-400">Tenant terdaftar di sistem</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Perusahaan Aktif</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">{activeCompanies}</div>
            <span className="text-[11px] text-emerald-600/80 font-medium">Di-whitelist & beroperasi</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Ditangguhkan</span>
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-2">{suspendedCompanies}</div>
            <span className="text-[11px] text-rose-600/80 font-medium">Akses dibekukan</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Pengguna</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-[#00AFC4] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-[#142740] mt-2">{totalPlatformUsers}</div>
            <span className="text-[11px] text-slate-400">Karyawan & staf aktif</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama perusahaan, slug, atau email owner..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#00AFC4] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="active">🟢 Di-Whitelist (Aktif)</option>
              <option value="suspended">🔴 Ditangguhkan (Suspended)</option>
            </select>

            <select
              value={planFilter}
              onChange={(e: any) => setPlanFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="all">Semua Paket</option>
              <option value="starter">Paket Starter</option>
              <option value="pro">Paket Pro</option>
              <option value="enterprise">Paket Enterprise</option>
            </select>

            <button
              onClick={loadData}
              className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#142740]">Daftar Perusahaan Terdaftar ({filteredTenants.length})</h3>
            <span className="text-[11px] text-slate-400">Multi-tenant database terisolasi penuh</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Perusahaan & Slug</th>
                  <th className="px-4 py-3">Owner / Penanggung Jawab</th>
                  <th className="px-4 py-3">Paket & Batas Kuota</th>
                  <th className="px-4 py-3">Statistik Penggunaan</th>
                  <th className="px-4 py-3">Status Akses</th>
                  <th className="px-5 py-3 text-right">Aksi Kontrol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#00AFC4]" />
                      Memuat daftar perusahaan...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      Tidak ada perusahaan yang cocok dengan pencarian / filter.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const isSuspended = t.status === 'suspended';
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition">
                        {/* Company & Slug */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <span>{t.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            slug: {t.slug}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            IDR • Asia/Jakarta
                          </div>
                        </td>

                        {/* Owner / Contact */}
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-800">{t.owner_name}</div>
                          <div className="text-[11px] text-[#00AFC4] font-medium mt-0.5">{t.owner_email}</div>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                            Super Admin Klien
                          </span>
                        </td>

                        {/* Plan & Quotas */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              t.subscription_plan === 'enterprise'
                                ? 'bg-purple-100 text-purple-700'
                                : t.subscription_plan === 'pro'
                                ? 'bg-cyan-100 text-[#00AFC4]'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {t.subscription_plan || 'PRO'} PLAN
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1.5 space-y-0.5">
                            <div>• Kuota User: <strong className="text-slate-700">{t.max_users || 15} Akun</strong></div>
                            <div>• Kuota WA: <strong className="text-slate-700">{t.max_channels || 3} Nomor</strong></div>
                          </div>
                        </td>

                        {/* Realtime Usage */}
                        <td className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t.total_members || 1} User</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Kanban className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{t.total_deals || 0} Deals</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <LifeBuoy className="w-3.5 h-3.5 text-purple-500" />
                              <span>{t.total_tickets || 0} Tiket</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3.5 h-3.5 text-[#00AFC4]" />
                              <span>{t.total_channels || 0} WA</span>
                            </div>
                          </div>
                        </td>

                        {/* Whitelist Status */}
                        <td className="px-4 py-4">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Ditangguhkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Di-Whitelist (Aktif)
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Tombol Buka Akses / Tangguhkan */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(t)}
                              disabled={actionLoading === t.id || deleteLoading}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                isSuspended
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                              }`}
                              title={isSuspended ? 'Buka kembali akses untuk perusahaan ini' : 'Tangguhkan sementara akses perusahaan ini'}
                            >
                              {isSuspended ? (
                                <>
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Buka Akses</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Tangguhkan</span>
                                </>
                              )}
                            </button>

                            {/* Tombol Hapus Perusahaan */}
                            {t.slug !== 'octo-technologies' && t.id !== '0c700000-0000-0000-0000-000000000000' && (
                              <button
                                type="button"
                                onClick={() => handleInitiateDelete(t)}
                                disabled={actionLoading === t.id || deleteLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 disabled:opacity-50"
                                title="Hapus permanen perusahaan ini beserta seluruh datanya"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            )}
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
      </div>

      {/* MODAL: DAFTARKAN PERUSAHAAN BARU (PROVISIONING) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {successResult ? (
              <div className="space-y-5 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-slate-800">
                    Perusahaan Berhasil Didaftarkan & Di-Whitelist!
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Workspace <strong>{successResult.company.name}</strong> telah aktif. Email aktivasi otomatis dikirimkan ke <strong>{successResult.company.owner_email}</strong> melalui Brevo.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Tautan Aktivasi Akun Owner (Cadangan):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={successResult.invite_url}
                      className="flex-1 bg-white px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(successResult.invite_url)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                        copiedLink ? 'bg-emerald-600 text-white' : 'bg-[#00AFC4] text-white hover:bg-[#0096a8]'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink ? 'Tersalin!' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full py-2.5 bg-[#091E42] hover:bg-[#142740] text-white text-xs font-bold rounded-xl transition"
                  >
                    Selesai & Tutup
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#00AFC4]" />
                      <span>Daftarkan Perusahaan Klien Baru</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Provisioning tenant terisolasi & kirim undangan owner otomatis
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleProvisionSubmit} className="space-y-4">
                  {/* Company Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Perusahaan Klien <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Contoh: PT Sukses Mandiri Abadi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] focus:outline-none"
                    />
                  </div>

                  {/* Plan Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Paket Langganan Klien
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(['starter', 'pro', 'enterprise'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePlanPresetChange(p)}
                          className={`p-3 rounded-xl border text-left transition ${
                            subscriptionPlan === p
                              ? 'border-[#00AFC4] bg-[#E8F8FA] text-[#091E42] ring-1 ring-[#00AFC4]'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="font-extrabold text-xs uppercase">{p}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {p === 'starter' ? '5 User • 1 WA' : p === 'pro' ? '15 User • 3 WA' : '50 User • 10 WA'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Quotas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Batas Kuota Pengguna (Users)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={maxUsers}
                        onChange={(e) => setMaxUsers(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Batas Saluran WA
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={maxChannels}
                        onChange={(e) => setMaxChannels(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 my-2"></div>

                  {/* Client Owner Info */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kontak Owner / Direktur Klien
                    </span>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Lengkap Owner <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ownerFullName}
                        onChange={(e) => setOwnerFullName(e.target.value)}
                        placeholder="Contoh: Hendra Wijaya"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Resmi Owner <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={ownerEmail}
                        onChange={(e) => setOwnerEmail(e.target.value)}
                        placeholder="hendra@perusahaanklien.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Auto-email Notice */}
                  <div className="p-3 bg-cyan-50/70 border border-cyan-100 rounded-xl text-[11px] text-[#091E42] flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-[#00AFC4] shrink-0 mt-0.5" />
                    <span>
                      Sistem akan membuat database pipeline perusahaan dan <strong>mengirimkan email aktivasi resmi via Brevo</strong> ke email owner tersebut untuk membuat password akun.
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-[#00AFC4] hover:bg-[#0096a8] text-white text-xs font-bold transition shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mendaftarkan & Mengirim Email...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Daftarkan & Whitelist Perusahaan</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      {/* MODAL: KONFIRMASI HAPUS PERUSAHAAN */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-extrabold text-base text-slate-900 text-center">
              Hapus Perusahaan Klien?
            </h3>
            
            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              Anda akan menghapus permanen perusahaan <strong>"{deleteTarget.name}"</strong> (slug: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-700">{deleteTarget.slug}</code>).
            </p>

            <div className="my-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Peringatan Data Permanen:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-rose-700 pl-1">
                <li>Seluruh data kontak, deals, tiket support, dan chat WhatsApp akan terhapus.</li>
                <li>Akun pengguna dan akses login tim perusahaan ini akan dicabut.</li>
                <li>Tindakan ini <strong>TIDAK DAPAT DIBATALKAN</strong>.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Permanen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
