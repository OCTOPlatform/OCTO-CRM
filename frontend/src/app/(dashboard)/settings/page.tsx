'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatDateIndo, formatDateTimeIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { WorkspaceMember, AuditEvent, WorkspaceInvitation, WorkspaceAutomation } from '@/types';
import {
  Settings,
  Shield,
  Users,
  UserPlus,
  Clock,
  Globe,
  Building,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  Send,
  Mail,
  RefreshCw,
  XCircle,
  ExternalLink,
  MessageSquare,
  Zap,
  Bot,
  Smartphone,
  Sparkles,
  Share2,
} from 'lucide-react';

export default function SettingsPage() {
  const { currentWorkspace, user } = useAuth();
  const isOwnerOrAdmin =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.role === 'admin' ||
    Boolean(user?.is_superadmin);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [automations, setAutomations] = useState<WorkspaceAutomation[]>([]);
  const [togglingAuto, setTogglingAuto] = useState<string | null>(null);
  const [testingNFC, setTestingNFC] = useState(false);
  const [nfcSuccessMsg, setNfcSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Workspace form state
  const [wsName, setWsName] = useState('');
  const [wsTimezone, setWsTimezone] = useState('Asia/Jakarta');
  const [wsCurrency, setWsCurrency] = useState('IDR');
  const [savingWs, setSavingWs] = useState(false);

  // Invite modal (Model 2: Magic Token 7-Day Expiry)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<'sales' | 'support' | 'admin' | 'member' | 'viewer'>('sales');
  const [inviteDepartment, setInviteDepartment] = useState<'sales' | 'support'>('sales');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessData, setInviteSuccessData] = useState<WorkspaceInvitation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setWsName(currentWorkspace.name);
      setWsTimezone(currentWorkspace.timezone || 'Asia/Jakarta');
      setWsCurrency(currentWorkspace.currency || 'IDR');

      const [memberList, logList, inviteList, autoList] = await Promise.all([
        api.listMembers(currentWorkspace.id),
        api.listAuditLogs(currentWorkspace.id, 25).catch(() => []),
        api.listInvitations(currentWorkspace.id).catch(() => []),
        api.listAutomations(currentWorkspace.id).catch(() => []),
      ]);
      setMembers(memberList);
      setAuditLogs(logList);
      setInvitations(inviteList);
      setAutomations(autoList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutomation = async (autoType: string, currentEnabled: boolean) => {
    if (!currentWorkspace) return;
    try {
      setTogglingAuto(autoType);
      await api.updateAutomation(currentWorkspace.id, {
        automation_type: autoType,
        is_enabled: !currentEnabled,
      });
      setAutomations((prev) =>
        prev.map((a) => (a.automation_type === autoType ? { ...a, is_enabled: !currentEnabled } : a))
      );
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah status otomasi');
    } finally {
      setTogglingAuto(null);
    }
  };

  const handleTestNFCIntake = async () => {
    if (!currentWorkspace) return;
    try {
      setTestingNFC(true);
      setNfcSuccessMsg(null);
      const res = await api.ingestLead(currentWorkspace.id, {
        full_name: 'Bambang Wijaya (CEO PT Prima Perkasa)',
        phone: '+6281299887766',
        email: 'bambang.wijaya@primaperkasa.co.id',
        company_name: 'PT Prima Perkasa Internasional',
        form_type: 'OCTO Tap NFC Card',
        product_interest: 'OCTO Enterprise CRM + WA Omnichannel',
        company_size: '51-200',
        message: 'Tap kartu NFC pada Tech Expo ICE BSD. Tertarik implementasi deal pipeline dan CS ticketing.',
      });
      setNfcSuccessMsg(
        `Berhasil! Lead baru '${res.message}' dibuat. ID Kontak: ${res.contact_id.slice(0, 8)}..., Deal Pipeline ID: ${res.deal_id?.slice(0, 8) || '-'}...`
      );
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menjalankan simulasi intake lead');
    } finally {
      setTestingNFC(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !wsName) return;
    try {
      setSavingWs(true);
      await api.updateWorkspace(currentWorkspace.id, {
        name: wsName,
        timezone: wsTimezone,
        currency: wsCurrency,
      });
      alert('Pengaturan workspace berhasil diperbarui!');
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan perubahan');
    } finally {
      setSavingWs(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !inviteEmail.trim()) return;
    try {
      setInviting(true);
      const res = await api.inviteMember(currentWorkspace.id, {
        email: inviteEmail.trim(),
        full_name: inviteFullName.trim(),
        role: inviteRole,
        department: inviteDepartment,
      });
      setInviteSuccessData(res);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengundang anggota tim');
    } finally {
      setInviting(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    if (!currentWorkspace) return;
    try {
      const res = await api.resendInvitation(currentWorkspace.id, invitationId);
      alert(`Undangan berhasil dikirim ulang ke ${res.email}! Tautan baru aktif selama 7 hari.`);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengirim ulang undangan');
    }
  };

  const handleRevoke = async (invitationId: string, email: string) => {
    if (!currentWorkspace) return;
    if (!confirm(`Batalkan undangan untuk ${email}? Tautan aktivasi tidak akan bisa digunakan lagi.`)) return;
    try {
      await api.revokeInvitation(currentWorkspace.id, invitationId);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal membatalkan undangan');
    }
  };

  const copyToClipboard = (text: string, isWA = false) => {
    navigator.clipboard.writeText(text);
    if (isWA) {
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace.id, memberId, newRole);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah role');
    }
  };

  const handleDepartmentChange = async (memberId: string, newDept: string) => {
    if (!currentWorkspace) return;
    try {
      await api.updateMemberRole(currentWorkspace.id, memberId, undefined, newDept);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah divisi anggota');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!currentWorkspace) return;
    if (!confirm(`Hapus akses ${memberEmail} dari workspace ini?`)) return;
    try {
      await api.removeMember(currentWorkspace.id, memberId);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus');
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Pengaturan & Anggota Tim"
        subtitle="Kelola preferensi workspace, kontrol akses, dan log kepatuhan"
      />

      <div className="p-6 md:p-8 space-y-8 max-w-5xl">
        {/* Banner if not Owner/Admin */}
        {!isOwnerOrAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <div className="font-bold">Akses Terbatas: Hanya Pemilik (Owner) & Admin yang dapat mengelola hak akses</div>
              <p>
                Akun Anda saat ini login dengan hak akses operasional (role: <strong className="uppercase">{currentWorkspace?.role || 'member'}</strong>). 
                Untuk mengubah izin peran (RBAC), mengundang anggota baru, atau merubah konfigurasi workspace, silakan hubungi Owner perusahaan atau login dengan akun Administrator.
              </p>
            </div>
          </div>
        )}

        {/* 1. Workspace General Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F8FA] text-[#00AFC4] flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#142740]">Informasi Workspace & Bisnis</h3>
              <p className="text-xs text-[#586779]">Atur nama entitas dan zona waktu operasional</p>
            </div>
          </div>

          <form onSubmit={handleSaveWorkspace} className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Bisnis / Workspace
              </label>
              <input
                type="text"
                required
                disabled={!isOwnerOrAdmin}
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zona Waktu</label>
                <select
                  value={wsTimezone}
                  disabled={!isOwnerOrAdmin}
                  onChange={(e) => setWsTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="Asia/Jakarta">WIB (Asia/Jakarta, UTC+7)</option>
                  <option value="Asia/Makassar">WITA (Asia/Makassar, UTC+8)</option>
                  <option value="Asia/Jayapura">WIT (Asia/Jayapura, UTC+9)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Uang</label>
                <input
                  type="text"
                  disabled
                  value={wsCurrency}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500"
                />
              </div>
            </div>

            {isOwnerOrAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingWs}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white shadow-xs transition disabled:opacity-50"
                >
                  {savingWs ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* 2. Team Members & Roles */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#142740]">Anggota Tim & Hak Akses (RBAC)</h3>
                <p className="text-xs text-[#586779]">Kelola izin peran Owner, Admin, Member, dan Viewer</p>
              </div>
            </div>

            {isOwnerOrAdmin ? (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-3.5 py-2 text-xs font-semibold bg-[#142740] hover:bg-[#1e395e] text-white rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#00AFC4]" />
                <span>Undang Anggota</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold text-xs flex items-center gap-1.5 border border-slate-200">
                <Shield className="w-3.5 h-3.5 text-slate-400" /> Mode Lihat Saja (Read-Only)
              </span>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Nama & Email</th>
                  <th className="px-4 py-3">Departemen</th>
                  <th className="px-4 py-3">Peran (Role)</th>
                  <th className="px-4 py-3">Bergabung</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{m.full_name}</div>
                      <div className="text-[11px] text-slate-400">{m.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      {m.role === 'owner' ? (
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-100 text-slate-700">
                          Semua Divisi
                        </span>
                      ) : isOwnerOrAdmin ? (
                        <select
                          value={m.department === 'support' ? 'support' : 'sales'}
                          onChange={(e) => handleDepartmentChange(m.id, e.target.value)}
                          className={`px-2 py-1 text-xs rounded-lg border font-semibold ${
                            m.department === 'support'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-teal-50 text-[#00AFC4] border-teal-200'
                          }`}
                        >
                          <option value="sales">Pre-Sales (Sales)</option>
                          <option value="support">After-Sales (CS)</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase ${
                            m.department === 'support'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-teal-50 text-[#00AFC4]'
                          }`}
                        >
                          {m.department === 'support' ? 'After-Sales (CS)' : 'Pre-Sales (Sales)'}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {m.role === 'owner' ? (
                        <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] uppercase">
                          Owner
                        </span>
                      ) : isOwnerOrAdmin ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white capitalize"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                          {(m.role as string) === 'support' && <option value="support">Support Agent</option>}
                          {(m.role as string) === 'sales' && <option value="sales">Sales Agent</option>}
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          {m.role}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-500">
                      {formatDateIndo(m.joined_at)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      {isOwnerOrAdmin && m.role !== 'owner' ? (
                        <button
                          onClick={() => handleRemoveMember(m.id, m.email)}
                          className="text-slate-400 hover:text-red-500 transition p-1"
                          title="Hapus Anggota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pending Invitations (Model 2: 7-Day Magic Links) */}
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-[#142740]">
                  Undangan Menunggu Aktivasi (Pending Invites)
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {pendingInvitations.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Tautan aktivasi berlaku 7 hari dan dikirim otomatis via email
              </span>
            </div>

            {pendingInvitations.length === 0 ? (
              <div className="bg-slate-50/70 border border-dashed border-slate-200 rounded-xl p-4 text-center text-xs text-slate-400">
                Tidak ada undangan tim yang sedang menunggu aktivasi.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Calon Anggota</th>
                      <th className="px-4 py-2.5">Divisi & Peran</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Kedaluwarsa</th>
                      <th className="px-4 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingInvitations.map((inv) => {
                      const isExpired = new Date(inv.expires_at) < new Date();
                      const inviteUrl = inv.invite_url || (typeof window !== 'undefined' ? `${window.location.origin}/invite?token=${inv.token}` : `/invite?token=${inv.token}`);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-800">
                              {inv.full_name || inv.email.split('@')[0]}
                            </div>
                            <div className="text-[11px] text-slate-400">{inv.email}</div>
                          </td>

                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-100 text-slate-700">
                                {inv.role}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                                inv.department === 'support'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-[#00AFC4]/10 text-[#00AFC4]'
                              }`}>
                                {inv.department === 'support' ? 'CS' : 'Sales'}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-2.5">
                            {inv.status === 'accepted' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="w-3 h-3" /> Aktif
                              </span>
                            ) : isExpired || inv.status === 'expired' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                                <XCircle className="w-3 h-3" /> Kedaluwarsa
                              </span>
                            ) : inv.status === 'revoked' ? (
                              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Dibatalkan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 animate-spin" /> Menunggu Aktivasi
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-2.5 text-slate-500 text-[11px]">
                            {formatDateTimeIndo(inv.expires_at)}
                          </td>

                          <td className="px-4 py-2.5 text-right">
                            {inv.status === 'pending' && !isExpired && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(inviteUrl)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#00AFC4] hover:bg-slate-100 transition"
                                  title="Salin Link Aktivasi"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {isOwnerOrAdmin && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleResend(inv.id)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition"
                                      title="Kirim Ulang Email"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRevoke(inv.id, inv.email)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 transition"
                                      title="Batalkan Undangan"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {isOwnerOrAdmin && (isExpired || inv.status === 'revoked') && (
                              <button
                                type="button"
                                onClick={() => handleResend(inv.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-[#00AFC4] hover:bg-[#E8F8FA] rounded-md transition"
                              >
                                <RefreshCw className="w-3 h-3" /> Buat Tautan Baru
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 3. Workflow Automations & Enterprise Triggers (Pilar 1) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#142740]">Workflow Automations & Enterprise Triggers</h3>
              <p className="text-xs text-[#586779]">
                Automasi handover lintas divisi, salam di luar jam kantor, dan pembagian prospek adil
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Auto Trigger 1 */}
            {(() => {
              const auto = automations.find((a) => a.automation_type === 'deal_won_handover');
              const isEnabled = auto ? auto.is_enabled : true;

              return (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAutomation('deal_won_handover', isEnabled)}
                        disabled={!isOwnerOrAdmin || togglingAuto === 'deal_won_handover'}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition disabled:opacity-60 disabled:cursor-not-allowed ${
                          isEnabled
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {isEnabled ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                    <h4 className="font-bold text-xs text-[#142740]">Deal Won Handover to CS</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Saat deal ditandai WON oleh Sales, sistem otomatis membuat tiket CS baru untuk onboarding klien lengkap dengan catatan dan kontak.
                    </p>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded self-start">
                    Otomatis Lintas Divisi
                  </span>
                </div>
              );
            })()}

            {/* Auto Trigger 2 */}
            {(() => {
              const auto = automations.find((a) => a.automation_type === 'out_of_hours_greeting');
              const isEnabled = auto ? auto.is_enabled : true;

              return (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                        <Bot className="w-4 h-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAutomation('out_of_hours_greeting', isEnabled)}
                        disabled={!isOwnerOrAdmin || togglingAuto === 'out_of_hours_greeting'}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition disabled:opacity-60 disabled:cursor-not-allowed ${
                          isEnabled
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {isEnabled ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                    <h4 className="font-bold text-xs text-[#142740]">Out-of-Hours Auto Greeting</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Kirim salam otomatis saat klien chat di luar jam operasional (08:00 - 18:00 WIB atau akhir pekan) sehingga pelanggan tetap merasa dihargai.
                    </p>
                  </div>
                  <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded self-start">
                    Bot Respon WhatsApp
                  </span>
                </div>
              );
            })()}

            {/* Auto Trigger 3 */}
            {(() => {
              const auto = automations.find((a) => a.automation_type === 'round_robin_lead');
              const isEnabled = auto ? auto.is_enabled : true;

              return (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="p-2 bg-cyan-100 text-[#00AFC4] rounded-lg">
                        <RefreshCw className="w-4 h-4" />
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleAutomation('round_robin_lead', isEnabled)}
                        disabled={!isOwnerOrAdmin || togglingAuto === 'round_robin_lead'}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition disabled:opacity-60 disabled:cursor-not-allowed ${
                          isEnabled
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {isEnabled ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>
                    <h4 className="font-bold text-xs text-[#142740]">Round-Robin Lead Assignment</h4>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Mendistribusikan chat masuk dan prospek baru secara berputar seimbang kepada anggota tim sales / support yang bertugas.
                    </p>
                  </div>
                  <span className="text-[10px] text-[#00AFC4] font-semibold bg-[#E8F8FA] px-2 py-0.5 rounded self-start">
                    Beban Kerja Adil
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 4. Ecosystem Lead Intake (OCTO-WEB & OCTO-TAP NFC) (Pilar 6) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#142740]">Ecosystem Lead Intake (OCTO-WEB & OCTO-TAP NFC)</h3>
                <p className="text-xs text-[#586779]">
                  Integrasi instan dari tap kartu bisnis digital NFC expo maupun form landing page web
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestNFCIntake}
              disabled={testingNFC}
              className="px-3.5 py-2 text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {testingNFC ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mentap Kartu NFC...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Uji Tap Kartu NFC (Simulasi)</span>
                </>
              )}
            </button>
          </div>

          {nfcSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{nfcSuccessMsg}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <div className="text-slate-700 font-semibold flex items-center justify-between">
              <span>Endpoint Webhook Publik untuk Website / NFC Card</span>
              <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded">POST JSON</span>
            </div>
            <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 select-all overflow-x-auto">
              {typeof window !== 'undefined'
                ? `http://localhost:8080/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`
                : `/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}
            </div>
          </div>
        </div>

        {/* 5. Audit Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#142740]">Audit Log Keamanan & Kepatuhan</h3>
              <p className="text-xs text-[#586779]">
                Pencatatan tindakan penting seperti pembuatan, modifikasi hak akses, merge, dan ekspor
              </p>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Waktu</th>
                  <th className="px-4 py-2.5">Pengguna</th>
                  <th className="px-4 py-2.5">Tindakan</th>
                  <th className="px-4 py-2.5">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      Belum ada catatan audit log.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                        {formatDateTimeIndo(log.created_at)}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                        {log.user_name || 'System'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-[#00AFC4] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {log.description}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Invite Member (Model 2: 7-Day Magic Token Link + Email) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {inviteSuccessData ? (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#142740]">Undangan Berhasil Dibuat!</h3>
                    <p className="text-xs text-slate-500">
                      Email undangan telah dikirimkan ke <strong className="text-slate-700">{inviteSuccessData.email}</strong>.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-emerald-800 font-semibold">
                    <span>Tautan Aktivasi (Berlaku 7 Hari)</span>
                    <span className="text-[10px] bg-emerald-200/60 px-2 py-0.5 rounded-full font-bold">
                      Expired: 7 Hari
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-200 text-slate-600 font-mono text-[11px] break-all">
                    <span className="truncate flex-1">
                      {inviteSuccessData.invite_url || (typeof window !== 'undefined' ? `${window.location.origin}/invite?token=${inviteSuccessData.token}` : `/invite?token=${inviteSuccessData.token}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          inviteSuccessData.invite_url ||
                            (typeof window !== 'undefined' ? `${window.location.origin}/invite?token=${inviteSuccessData.token}` : `/invite?token=${inviteSuccessData.token}`)
                        )
                      }
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-semibold rounded-md flex items-center gap-1 transition shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Tersalin' : 'Salin'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kirim Cepat via WhatsApp</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const link = inviteSuccessData.invite_url || (typeof window !== 'undefined' ? `${window.location.origin}/invite?token=${inviteSuccessData.token}` : `/invite?token=${inviteSuccessData.token}`);
                        const text = `Halo ${inviteSuccessData.full_name || 'Rekan'},\n\nAnda diundang untuk bergabung ke workspace *${currentWorkspace?.name}* di OCTO-CRM sebagai *${inviteSuccessData.role.toUpperCase()}* (${inviteSuccessData.department === 'support' ? 'After-Sales/CS' : 'Pre-Sales/Sales'}).\n\nKlik tautan aktivasi berikut untuk membuat kata sandi Anda (berlaku 7 hari):\n${link}\n\nTerima kasih!`;
                        copyToClipboard(text, true);
                      }}
                      className="text-xs font-semibold text-[#00AFC4] hover:underline flex items-center gap-1"
                    >
                      {copiedWA ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedWA ? 'Teks WhatsApp Tersalin!' : 'Salin Format WA'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-lg border border-slate-200">
                    &quot;Halo {inviteSuccessData.full_name || 'Rekan'}, Anda diundang untuk bergabung ke workspace {currentWorkspace?.name} di OCTO-CRM. Klik tautan aktivasi berikut untuk membuat kata sandi Anda...&quot;
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteSuccessData(null);
                      setInviteEmail('');
                      setInviteFullName('');
                    }}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#142740] text-white hover:bg-[#1e395e] transition"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-base text-[#142740]">Undang Anggota Tim Baru</h3>
                    <p className="text-xs text-slate-500">
                      Sistem akan membuat tautan aktivasi 7 hari dan otomatis mengirimkan email.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Rekan
                    </label>
                    <input
                      type="text"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="Contoh: Rian Pratama"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Karyawan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="rian@perusahaan.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Departemen / Divisi</label>
                      <select
                        value={inviteDepartment}
                        onChange={(e: any) => setInviteDepartment(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                      >
                        <option value="sales">Pre-Sales (Sales)</option>
                        <option value="support">After-Sales (CS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Peran Akses (Role)</label>
                      <select
                        value={inviteRole}
                        onChange={(e: any) => setInviteRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                      >
                        <option value="sales">Sales Representative</option>
                        <option value="support">Support Agent (CS)</option>
                        <option value="admin">Administrator</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#00AFC4] shrink-0 mt-0.5" />
                    <span>
                      Setelah diundang, karyawan menerima tautan aktivasi mandiri yang kedaluwarsa dalam <strong>7 hari</strong>. Mereka cukup klik dan membuat password mereka sendiri.
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={inviting}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {inviting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Mengirim Undangan...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim Undangan</span>
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
    </div>
  );
}
