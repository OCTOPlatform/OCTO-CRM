'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatDateIndo, formatDateTimeIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { WorkspaceMember, AuditEvent, WorkspaceInvitation, WorkspaceAutomation, WorkspaceBotSettings } from '@/types';
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
  Save,
  AlertCircle,
  Lock,
  BookOpen,
  Code,
  FileText,
} from 'lucide-react';

export default function SettingsPage() {
  const { currentWorkspace, user, activeRole } = useAuth();
  const isOwnerOrAdmin =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.role === 'admin' ||
    currentWorkspace?.role === 'supervisor' ||
    activeRole === 'owner' ||
    activeRole === 'admin' ||
    activeRole === 'supervisor' ||
    Boolean(user?.is_superadmin);
  const [activeTab, setActiveTab] = useState<'workspace' | 'chatbot' | 'automations'>('workspace');
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

  // Chatbot Settings state
  const [botSettings, setBotSettings] = useState<WorkspaceBotSettings | null>(null);
  const [savingBot, setSavingBot] = useState(false);
  const [botSuccessMsg, setBotSuccessMsg] = useState<string | null>(null);
  const [botErrorMsg, setBotErrorMsg] = useState<string | null>(null);

  const [botEnabled, setBotEnabled] = useState(true);
  const [botName, setBotName] = useState('Asisten Virtual OCTO');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [menu1Title, setMenu1Title] = useState('Informasi Produk & Layanan');
  const [menu1Keywords, setMenu1Keywords] = useState('produk,fitur,layanan,keunggulan');
  const [menu1Response, setMenu1Response] = useState('');
  const [menu2Title, setMenu2Title] = useState('Paket Harga & Penawaran');
  const [menu2Keywords, setMenu2Keywords] = useState('harga,paket,biaya,tarif,langganan');
  const [menu2Response, setMenu2Response] = useState('');
  const [menu3Title, setMenu3Title] = useState('Jam Operasional & Alamat Kantor');
  const [menu3Keywords, setMenu3Keywords] = useState('jam operasional,jam kerja,alamat,kantor');
  const [menu3Response, setMenu3Response] = useState('');
  const [menu4Title, setMenu4Title] = useState('Hubungi Tim Customer Service (CS) Manusia');
  const [menu4Keywords, setMenu4Keywords] = useState('cs,agen,manusia,bantuan,komplain');
  const [menu4Response, setMenu4Response] = useState('');
  const [handoffMessage, setHandoffMessage] = useState('');
  const [previewTab, setPreviewTab] = useState<'greeting' | 'menu1' | 'menu2' | 'menu3' | 'handoff'>('greeting');

  // IFA Developer Documentation Modal
  const [showIFAModal, setShowIFAModal] = useState(false);
  const [ifaTab, setIfaTab] = useState<'js' | 'elementor' | 'php' | 'curl' | 'schema'>('js');
  const [copiedIFAText, setCopiedIFAText] = useState(false);

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteDepartment, setInviteDepartment] = useState<'sales' | 'support'>('sales');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccessData, setInviteSuccessData] = useState<WorkspaceInvitation | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWA, setCopiedWA] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'chatbot' || tabParam === 'bot') {
        setActiveTab('chatbot');
      } else if (tabParam === 'automations') {
        setActiveTab('automations');
      }
    }
  }, []);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      setWsName(currentWorkspace.name);
      setWsTimezone(currentWorkspace.timezone || 'Asia/Jakarta');
      setWsCurrency(currentWorkspace.currency || 'IDR');

      const [memberList, logList, inviteList, autoList, botData] = await Promise.all([
        api.listMembers(currentWorkspace.id),
        api.listAuditLogs(currentWorkspace.id, 25).catch(() => []),
        api.listInvitations(currentWorkspace.id).catch(() => []),
        api.listAutomations(currentWorkspace.id).catch(() => []),
        api.getBotSettings(currentWorkspace.id).catch(() => null),
      ]);
      setMembers(memberList);
      setAuditLogs(logList);
      setInvitations(inviteList);
      setAutomations(autoList);

      if (botData) {
        setBotSettings(botData);
        setBotEnabled(botData.bot_enabled);
        setBotName(botData.bot_name || 'Asisten Virtual OCTO');
        setGreetingMessage(botData.greeting_message || '');
        setMenu1Title(botData.menu_1_title || 'Informasi Produk & Layanan');
        setMenu1Keywords(botData.menu_1_keywords || 'produk,fitur,layanan,keunggulan');
        setMenu1Response(botData.menu_1_response || '');
        setMenu2Title(botData.menu_2_title || 'Paket Harga & Penawaran');
        setMenu2Keywords(botData.menu_2_keywords || 'harga,paket,biaya,tarif,langganan');
        setMenu2Response(botData.menu_2_response || '');
        setMenu3Title(botData.menu_3_title || 'Jam Operasional & Alamat Kantor');
        setMenu3Keywords(botData.menu_3_keywords || 'jam operasional,jam kerja,alamat,kantor');
        setMenu3Response(botData.menu_3_response || '');
        setMenu4Title(botData.menu_4_title || 'Hubungi Tim Customer Service (CS) Manusia');
        setMenu4Keywords(botData.menu_4_keywords || 'cs,agen,manusia,bantuan,komplain');
        setMenu4Response(botData.menu_4_response || '');
        setHandoffMessage(botData.handoff_message || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    if (!isOwnerOrAdmin) {
      alert('Hanya Admin dan Super Admin / Owner yang berwenang mengubah template chatbot.');
      return;
    }
    try {
      setSavingBot(true);
      setBotSuccessMsg(null);
      setBotErrorMsg(null);
      const updated = await api.updateBotSettings(currentWorkspace.id, {
        bot_enabled: botEnabled,
        bot_name: botName,
        greeting_message: greetingMessage,
        menu_1_title: menu1Title,
        menu_1_keywords: menu1Keywords,
        menu_1_response: menu1Response,
        menu_2_title: menu2Title,
        menu_2_keywords: menu2Keywords,
        menu_2_response: menu2Response,
        menu_3_title: menu3Title,
        menu_3_keywords: menu3Keywords,
        menu_3_response: menu3Response,
        menu_4_title: menu4Title,
        menu_4_keywords: menu4Keywords,
        menu_4_response: menu4Response,
        handoff_message: handoffMessage,
      });
      setBotSettings(updated);
      setBotSuccessMsg('Template chatbot perusahaan Anda berhasil diperbarui dan aktif secara langsung!');
    } catch (err: any) {
      setBotErrorMsg(err.message || 'Gagal menyimpan template chatbot');
    } finally {
      setSavingBot(false);
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

      <div className="p-6 md:p-8 space-y-6 max-w-6xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'workspace'
                ? 'bg-[#142740] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>🏢 Profil & Anggota Tim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chatbot')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'chatbot'
                ? 'bg-[#00AFC4] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>🤖 Template Chatbot WhatsApp</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-[10px] rounded-full">Perusahaan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('automations')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'automations'
                ? 'bg-[#142740] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>⚡ Otomasi & Audit Log</span>
          </button>
        </div>

        {/* Banner if not Owner/Admin */}
        {!isOwnerOrAdmin && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <div className="font-bold">Akses Terbatas: Hanya Pemilik (Owner) & Admin yang dapat mengelola pengaturan & template</div>
              <p>
                Akun Anda saat ini login dengan hak akses operasional (role: <strong className="uppercase">{currentWorkspace?.role || 'member'}</strong>). 
                Pengaturan hak akses, undangan tim, dan pengubahan template chatbot WhatsApp hanya dapat dilakukan oleh Admin (Lead / Supervisor CS & Sales) atau Super Admin / Owner.
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: WORKSPACE & TEAM */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">

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
                        <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-[10px] uppercase flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" />
                          <span>Owner (Super Admin)</span>
                        </span>
                      ) : isOwnerOrAdmin ? (
                        <select
                          value={m.role === 'supervisor' ? 'admin' : (m.role === 'viewer' ? 'member' : m.role)}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                        >
                          <option value="admin">Admin (Lead / Supervisor)</option>
                          <option value="member">Member (Staff CS & Sales)</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                          m.role === 'admin' || m.role === 'supervisor'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.role === 'admin' || m.role === 'supervisor' ? 'Admin' : 'Member'}
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
      </div>
    )}

    {/* TAB 2: CHATBOT TEMPLATES */}
    {activeTab === 'chatbot' && (
      <div className="space-y-6">
        {/* Header Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00AFC4] flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#142740]">Template & Konfigurasi Chatbot WhatsApp ({wsName})</h3>
                <p className="text-xs text-[#586779]">
                  Sesuaikan template pesan sapaan, menu produk, penawaran harga, dan alur eskalasi khusus perusahaan Anda (Dapat dikelola oleh Owner & Admin / Lead CS).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-700">Status Chatbot:</span>
              <button
                type="button"
                disabled={!isOwnerOrAdmin}
                onClick={() => setBotEnabled(!botEnabled)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                  botEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-600 border border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${botEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{botEnabled ? 'Bot Aktif 24/7' : 'Bot Nonaktif'}</span>
              </button>
            </div>
          </div>

          {botSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{botSuccessMsg}</span>
            </div>
          )}

          {botErrorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{botErrorMsg}</span>
            </div>
          )}
        </div>

        {/* Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
            <form onSubmit={handleSaveBotSettings} className="space-y-6">
              {/* Bot Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Bot / Identitas Pengirim WhatsApp
                </label>
                <input
                  type="text"
                  required
                  disabled={!isOwnerOrAdmin}
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="Contoh: Asisten Virtual OCTO"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] disabled:bg-slate-50 disabled:text-slate-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Nama ini muncul sebagai identitas pengirim pesan bot otomatis.</p>
              </div>

              {/* Greeting Message */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pesan Sapaan Utama & Daftar Menu (Greeting)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Placeholder: {'{name}'}, {'{company}'}</span>
                </div>
                <textarea
                  rows={6}
                  required
                  disabled={!isOwnerOrAdmin}
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] disabled:bg-slate-50 disabled:text-slate-500 font-sans"
                  placeholder="Pesan sapaan otomatis saat pelanggan pertama kali menyapa..."
                />
              </div>

              {/* Menu 1 */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <span className="px-2 py-0.5 bg-[#00AFC4] text-white rounded-md text-[10px]">Menu 1</span>
                  <span>Informasi Produk & Layanan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Menu</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu1Title}
                      onChange={(e) => setMenu1Title(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kata Kunci Deteksi (CSV)</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu1Keywords}
                      onChange={(e) => setMenu1Keywords(e.target.value)}
                      placeholder="produk, fitur, layanan, keunggulan"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pesan Jawaban Bot</label>
                  <textarea
                    rows={4}
                    disabled={!isOwnerOrAdmin}
                    value={menu1Response}
                    onChange={(e) => setMenu1Response(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Menu 2 */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <span className="px-2 py-0.5 bg-[#00AFC4] text-white rounded-md text-[10px]">Menu 2</span>
                  <span>Paket Harga & Penawaran</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Menu</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu2Title}
                      onChange={(e) => setMenu2Title(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kata Kunci Deteksi (CSV)</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu2Keywords}
                      onChange={(e) => setMenu2Keywords(e.target.value)}
                      placeholder="harga, paket, biaya, pricelist"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pesan Jawaban Bot</label>
                  <textarea
                    rows={4}
                    disabled={!isOwnerOrAdmin}
                    value={menu2Response}
                    onChange={(e) => setMenu2Response(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Menu 3 */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                  <span className="px-2 py-0.5 bg-[#00AFC4] text-white rounded-md text-[10px]">Menu 3</span>
                  <span>Jam Operasional & Alamat</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Judul Menu</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu3Title}
                      onChange={(e) => setMenu3Title(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kata Kunci Deteksi (CSV)</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu3Keywords}
                      onChange={(e) => setMenu3Keywords(e.target.value)}
                      placeholder="jam operasional, kantor, lokasi, alamat"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pesan Jawaban Bot</label>
                  <textarea
                    rows={4}
                    disabled={!isOwnerOrAdmin}
                    value={menu3Response}
                    onChange={(e) => setMenu3Response(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Menu 4 & Handoff */}
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <span className="px-2 py-0.5 bg-amber-600 text-white rounded-md text-[10px]">Menu 4 & Eskalasi</span>
                  <span>Pengalihan ke Customer Service Manusia</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">Judul Menu</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu4Title}
                      onChange={(e) => setMenu4Title(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-900 mb-1">Kata Kunci Deteksi (CSV)</label>
                    <input
                      type="text"
                      disabled={!isOwnerOrAdmin}
                      value={menu4Keywords}
                      onChange={(e) => setMenu4Keywords(e.target.value)}
                      placeholder="cs, agen, manusia, bantuan, komplain"
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs bg-white disabled:bg-slate-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Pesan Penutup Pengalihan ke CS (Handoff Message)
                  </label>
                  <textarea
                    rows={4}
                    disabled={!isOwnerOrAdmin}
                    value={handoffMessage}
                    onChange={(e) => setHandoffMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 text-xs bg-white disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Action buttons */}
              {isOwnerOrAdmin ? (
                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    disabled={savingBot}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingBot ? 'Menyimpan Template...' : 'Simpan Template Chatbot'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-500 font-semibold text-center">
                  🔒 Tombol simpan dinonaktifkan karena akun Anda memiliki peran Member (bukan Admin/Owner).
                </div>
              )}
            </form>
          </div>

          {/* Right: Live Interactive WhatsApp Mockup (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#142740] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Pratinjau Percakapan WhatsApp</span>
                </span>
                <span className="text-[10px] text-slate-400">Live Preview</span>
              </div>

              {/* Phone Frame */}
              <div className="bg-[#0b141a] p-3 rounded-3xl shadow-xl border-4 border-slate-800">
                {/* Top WA Header */}
                <div className="bg-[#1f2c34] p-3 rounded-2xl flex items-center gap-3 text-white">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                    🤖
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs truncate">{botName || 'Asisten Virtual'}</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      <span>online (Bot WhatsApp)</span>
                    </div>
                  </div>
                </div>

                {/* Chat Body */}
                <div className="bg-[#0b141a] p-3 rounded-2xl space-y-3 min-h-[360px] max-h-[440px] overflow-y-auto text-xs my-2">
                  {/* Customer message */}
                  <div className="flex justify-end">
                    <div className="bg-[#005c4b] text-white p-2.5 rounded-2xl rounded-tr-xs max-w-[85%] text-xs shadow-xs">
                      Halo admin, mau tanya info
                      <div className="text-[9px] text-emerald-200 text-right mt-1">10:00</div>
                    </div>
                  </div>

                  {/* Bot greeting preview */}
                  <div className="flex justify-start">
                    <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-xs max-w-[90%] text-xs shadow-xs whitespace-pre-wrap leading-relaxed">
                      {greetingMessage
                        ? greetingMessage
                            .replace('{name}', 'Bambang Pamungkas')
                            .replace('{company}', wsName || 'OCTO-CRM')
                            .replace('{menu_1_title}', menu1Title)
                            .replace('{menu_2_title}', menu2Title)
                            .replace('{menu_3_title}', menu3Title)
                            .replace('{menu_4_title}', menu4Title)
                        : 'Memuat template...'}
                      <div className="text-[9px] text-slate-400 text-right mt-1">10:00</div>
                    </div>
                  </div>

                  {/* Interactive preview selection */}
                  {previewTab === 'menu1' && (
                    <>
                      <div className="flex justify-end">
                        <div className="bg-[#005c4b] text-white p-2 rounded-xl text-xs">1</div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-xs max-w-[90%] text-xs whitespace-pre-wrap">
                          {menu1Response || 'Informasi Produk...'}
                        </div>
                      </div>
                    </>
                  )}

                  {previewTab === 'menu2' && (
                    <>
                      <div className="flex justify-end">
                        <div className="bg-[#005c4b] text-white p-2 rounded-xl text-xs">2</div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-xs max-w-[90%] text-xs whitespace-pre-wrap">
                          {menu2Response || 'Informasi Harga...'}
                        </div>
                      </div>
                    </>
                  )}

                  {previewTab === 'menu3' && (
                    <>
                      <div className="flex justify-end">
                        <div className="bg-[#005c4b] text-white p-2 rounded-xl text-xs">3</div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-xs max-w-[90%] text-xs whitespace-pre-wrap">
                          {menu3Response || 'Jam Operasional...'}
                        </div>
                      </div>
                    </>
                  )}

                  {previewTab === 'handoff' && (
                    <>
                      <div className="flex justify-end">
                        <div className="bg-[#005c4b] text-white p-2 rounded-xl text-xs">Mau komplain kendala scanner</div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-[#202c33] text-amber-200 p-2.5 rounded-2xl rounded-tl-xs max-w-[90%] text-xs whitespace-pre-wrap border border-amber-600/40">
                          {(handoffMessage || menu4Response || '')
                            .replace('{name}', 'Bambang Pamungkas')}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Simulation Menu Bar */}
                <div className="bg-[#1f2c34] p-2 rounded-xl text-slate-300 text-[11px] space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-semibold px-1">Klik untuk menguji simulasi respon:</div>
                  <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-center">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('greeting')}
                      className={`py-1 rounded-md transition cursor-pointer ${previewTab === 'greeting' ? 'bg-[#00AFC4] text-white' : 'bg-[#2a3942] hover:bg-[#32424b] text-slate-200'}`}
                    >
                      Sapaan
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('menu1')}
                      className={`py-1 rounded-md transition cursor-pointer ${previewTab === 'menu1' ? 'bg-[#00AFC4] text-white' : 'bg-[#2a3942] hover:bg-[#32424b] text-slate-200'}`}
                    >
                      Menu 1
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('menu2')}
                      className={`py-1 rounded-md transition cursor-pointer ${previewTab === 'menu2' ? 'bg-[#00AFC4] text-white' : 'bg-[#2a3942] hover:bg-[#32424b] text-slate-200'}`}
                    >
                      Menu 2
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('menu3')}
                      className={`py-1 rounded-md transition cursor-pointer ${previewTab === 'menu3' ? 'bg-[#00AFC4] text-white' : 'bg-[#2a3942] hover:bg-[#32424b] text-slate-200'}`}
                    >
                      Menu 3
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('handoff')}
                      className={`py-1 rounded-md transition cursor-pointer ${previewTab === 'handoff' ? 'bg-amber-600 text-white' : 'bg-[#2a3942] hover:bg-[#32424b] text-amber-200'}`}
                    >
                      Handoff
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* TAB 3: AUTOMATIONS & AUDIT LOG */}
    {activeTab === 'automations' && (
      <div className="space-y-6">

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

        {/* 4. Inbound Lead Intake: OCTO-TAP for PT OCTO Technologies, Generic Website Form for Tenants */}
        {(() => {
          const isOctoTechnologies =
            currentWorkspace?.id === '0c700000-0000-0000-0000-000000000000' ||
            Boolean(currentWorkspace?.name?.toLowerCase().includes('octo technologies')) ||
            Boolean(user?.is_superadmin);

          return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isOctoTechnologies ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-[#00AFC4]'
                  }`}>
                    {isOctoTechnologies ? <Smartphone className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#142740]">
                      {isOctoTechnologies
                        ? 'Ecosystem Lead Intake (OCTO-WEB & OCTO-TAP NFC)'
                        : 'Integrasi Formulir Website (Inbound Leads Webhook)'}
                    </h3>
                    <p className="text-xs text-[#586779]">
                      {isOctoTechnologies
                        ? 'Khusus PT OCTO Technologies Indonesia: Integrasi tap kartu pintar NFC expo & form landing page web OCTO'
                        : 'Hubungkan formulir kontak atau landing page website perusahaan Anda agar calon klien otomatis masuk ke CRM'}
                    </p>
                  </div>
                </div>

                {isOctoTechnologies && (
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
                )}
              </div>

              {isOctoTechnologies && nfcSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{nfcSuccessMsg}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                <div className="text-slate-700 font-semibold flex items-center justify-between">
                  <span>
                    {isOctoTechnologies
                      ? 'Endpoint Webhook Publik untuk Website / NFC Card'
                      : 'Endpoint Webhook Publik untuk Formulir Website Perusahaan Anda'}
                  </span>
                  <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded">POST JSON</span>
                </div>
                <div className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 select-all overflow-x-auto">
                  {typeof window !== 'undefined'
                    ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}/workspaces/${currentWorkspace?.id}/integrations/lead-intake`
                    : `/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}
                </div>
                {!isOctoTechnologies && (
                  <p className="text-[11px] text-slate-500">
                    Kirimkan payload JSON berisi <code>full_name</code>, <code>phone</code>, <code>email</code>, <code>company_name</code>, dan <code>message</code> saat pengunjung website Anda mengirim formulir kontak.
                  </p>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIFAModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#00AFC4] text-xs font-bold border border-teal-200 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>📘 Buka Dokumen IFA & Panduan Developer Website</span>
                  </button>
                  <span className="text-[11px] text-slate-400">Format standar untuk developer & webmaster</span>
                </div>
              </div>
            </div>
          );
        })()}

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
    )}
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
                        <option value="member">Member (Staff CS & Sales - Operasional)</option>
                        <option value="admin">Admin (Lead / Supervisor - Manajerial & Template Bot)</option>
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

      {/* MODAL: IFA & Developer Guide */}
      {showIFAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#00AFC4] flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#142740]">
                    Dokumen IFA (Interface Agreement) & Panduan Pengembang
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dokumentasi API resmi untuk pengembang website ({wsName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIFAModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Endpoint Summary Card */}
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>METODE HTTP: POST</span>
                  <span className="text-emerald-400">Content-Type: application/json</span>
                </div>
                <div className="text-xs text-amber-300 break-all select-all font-semibold">
                  {typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`
                    : `https://api-crm.octocrm.id/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}
                </div>
              </div>

              {/* Language Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIfaTab('js')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    ifaTab === 'js' ? 'bg-[#00AFC4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  JavaScript (Fetch)
                </button>
                <button
                  type="button"
                  onClick={() => setIfaTab('elementor')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    ifaTab === 'elementor' ? 'bg-[#00AFC4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  WordPress / Elementor
                </button>
                <button
                  type="button"
                  onClick={() => setIfaTab('php')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    ifaTab === 'php' ? 'bg-[#00AFC4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  PHP (cURL)
                </button>
                <button
                  type="button"
                  onClick={() => setIfaTab('curl')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    ifaTab === 'curl' ? 'bg-[#00AFC4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  cURL
                </button>
                <button
                  type="button"
                  onClick={() => setIfaTab('schema')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    ifaTab === 'schema' ? 'bg-[#00AFC4] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kamus Data (Schema)
                </button>
              </div>

              {/* Tab 1: JavaScript */}
              {ifaTab === 'js' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-700 font-semibold">
                    <span>Pasang di event submit form website Anda:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = `fetch("${typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake` : `https://api-crm.octocrm.id/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    full_name: document.getElementById("name").value,
    phone: document.getElementById("phone").value,
    email: document.getElementById("email").value,
    company_name: document.getElementById("company").value,
    message: document.getElementById("message").value,
    form_type: "Website Contact Form",
    consent_given: true
  })
}).then(res => res.json()).then(data => {
  if (data.success) {
    alert("Terima kasih! Pesan Anda telah terkirim.");
  }
});`;
                        navigator.clipboard.writeText(code);
                        setCopiedIFAText(true);
                        setTimeout(() => setCopiedIFAText(false), 2000);
                      }}
                      className="text-xs font-semibold text-[#00AFC4] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedIFAText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedIFAText ? 'Tersalin!' : 'Salin Kode JS'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
{`// 1. Ambil nilai input dari form website
const payload = {
  full_name: document.getElementById("name").value,       // Wajib
  phone: document.getElementById("phone").value,          // Wajib
  email: document.getElementById("email").value,          // Opsional
  company_name: document.getElementById("company").value, // Opsional
  message: document.getElementById("message").value,       // Opsional
  form_type: "Website Contact Form",
  consent_given: true
};

// 2. Kirim ke OCTO-CRM Webhook Endpoint
fetch("${typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake` : `https://api-crm.octocrm.id/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    console.log("Kontak & Deal berhasil dibuat di CRM:", data.data.contact_id);
    alert("Terima kasih, tim kami akan segera menghubungi Anda!");
  }
});`}
                  </pre>
                </div>
              )}

              {/* Tab 2: Elementor */}
              {ifaTab === 'elementor' && (
                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <h4 className="font-bold text-sm text-slate-800">Panduan No-Code (WordPress Elementor Pro):</h4>
                  <ol className="list-decimal list-inside space-y-2 text-slate-600 text-[11px] leading-relaxed">
                    <li>Buka halaman website Anda di <strong>Elementor Editor</strong>.</li>
                    <li>Klik elemen <strong>Formulir Kontak (Form Widget)</strong>.</li>
                    <li>Di panel pengaturan kiri, buka menu <strong>Actions After Submit</strong>, lalu tambahkan <strong>Webhook</strong>.</li>
                    <li>Akan muncul sub-menu baru <strong>Webhook</strong> di bawahnya. Masukkan URL berikut:
                      <div className="p-2 bg-white border border-slate-300 rounded font-mono text-[11px] text-slate-800 select-all my-1.5 break-all">
                        {typeof window !== 'undefined'
                          ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`
                          : `https://api-crm.octocrm.id/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}
                      </div>
                    </li>
                    <li>Pastikan ID pada masing-masing field form diatur sebagai:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5 font-mono text-slate-700">
                        <li><code>full_name</code> (untuk Nama Lengkap)</li>
                        <li><code>phone</code> (untuk No HP / WhatsApp)</li>
                        <li><code>email</code> (untuk Email)</li>
                        <li><code>company_name</code> (untuk Perusahaan)</li>
                        <li><code>message</code> (untuk Pesan / Kebutuhan)</li>
                      </ul>
                    </li>
                    <li>Klik <strong>Update / Publish</strong>. Formulir sekarang sudah terhubung 100% ke OCTO-CRM!</li>
                  </ol>
                </div>
              )}

              {/* Tab 3: PHP */}
              {ifaTab === 'php' && (
                <div className="space-y-2">
                  <div className="text-slate-700 font-semibold">Implementasi PHP cURL (Backend / Custom WordPress):</div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
{`<?php
$url = "${typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake` : `https://api-crm.octocrm.id/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}";

$data = [
    'full_name'    => $_POST['name'],
    'phone'        => $_POST['phone'],
    'email'        => $_POST['email'],
    'company_name' => $_POST['company'],
    'message'      => $_POST['message'],
    'form_type'    => 'Website PHP Form',
    'consent_given'=> true
];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code === 201) {
    echo "Pesan berhasil masuk ke CRM!";
}
?>`}
                  </pre>
                </div>
              )}

              {/* Tab 4: cURL */}
              {ifaTab === 'curl' && (
                <div className="space-y-2">
                  <div className="text-slate-700 font-semibold">Uji coba langsung via Terminal atau Postman:</div>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto font-mono text-[11px] leading-relaxed">
{`curl -X POST "${typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake` : `https://api-crm.octocrm.id/api/v1/workspaces/${currentWorkspace?.id}/integrations/lead-intake`}" \\
     -H "Content-Type: application/json" \\
     -d '{
       "full_name": "Budi Santoso",
       "phone": "+6281295099738",
       "email": "budi.santoso@rejeki.com",
       "company_name": "PT Sumber Rejeki",
       "message": "Halo, saya butuh penawaran paket interior kantor.",
       "form_type": "cURL Testing"
     }'`}
                  </pre>
                </div>
              )}

              {/* Tab 5: Schema */}
              {ifaTab === 'schema' && (
                <div className="space-y-3">
                  <div className="text-slate-700 font-semibold">Kamus Parameter JSON (Data Schema):</div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2">Parameter</th>
                          <th className="px-3 py-2">Tipe</th>
                          <th className="px-3 py-2">Wajib?</th>
                          <th className="px-3 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr>
                          <td className="px-3 py-2 font-mono text-teal-700 font-bold">full_name</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-rose-600 font-bold">YA</td>
                          <td className="px-3 py-2">Nama lengkap calon klien</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-teal-700 font-bold">phone</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-rose-600 font-bold">YA</td>
                          <td className="px-3 py-2">No telepon atau WhatsApp aktif</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono">email</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-slate-400">Opsional</td>
                          <td className="px-3 py-2">Alamat email calon klien</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono">company_name</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-slate-400">Opsional</td>
                          <td className="px-3 py-2">Nama perusahaan / organisasi</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono">product_interest</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-slate-400">Opsional</td>
                          <td className="px-3 py-2">Layanan yang diminati</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono">message</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-slate-400">Opsional</td>
                          <td className="px-3 py-2">Catatan atau rincian kebutuhan</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono">utm_source</td>
                          <td className="px-3 py-2">String</td>
                          <td className="px-3 py-2 text-slate-400">Opsional</td>
                          <td className="px-3 py-2">Sumber iklan (Google Ads, IG, dll)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-2xl">
              <span className="text-[11px] text-slate-500">
                Dokumen IFA lengkap: <code>docs/IFA_INBOUND_LEADS_WEBHOOK.md</code>
              </span>
              <button
                type="button"
                onClick={() => setShowIFAModal(false)}
                className="px-4 py-2 bg-[#142740] hover:bg-[#1e395e] text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
