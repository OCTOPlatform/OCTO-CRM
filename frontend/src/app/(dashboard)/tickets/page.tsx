'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Ticket, TicketStatus, TicketPriority, WorkspaceMember, Contact } from '@/types';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  UserCheck,
  Send,
  Building,
  Phone,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  Tag,
  ShieldAlert,
  ArrowUpRight,
} from 'lucide-react';

const STATUS_CONFIG: Record<TicketStatus, { label: string; bg: string; text: string; border: string }> = {
  open: { label: 'Baru Masuk', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  in_progress: { label: 'Sedang Ditangani', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  escalated: { label: 'Dieskalasi ke Tim', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  resolved: { label: 'Selesai', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  closed: { label: 'Ditutup', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; badge: string }> = {
  low: { label: 'Rendah', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  medium: { label: 'Sedang', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'Tinggi', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  urgent: { label: 'Mendesak (SLA)', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export default function TicketsPage() {
  const { currentWorkspace, user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);

  // Create Ticket Form
  const [formSubject, setFormSubject] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('technical');
  const [formPriority, setFormPriority] = useState<TicketPriority>('medium');
  const [formDept, setFormDept] = useState('support');
  const [formContactId, setFormContactId] = useState('');
  const [formAssigneeId, setFormAssigneeId] = useState('');
  const [creating, setCreating] = useState(false);
  const [checkingSLA, setCheckingSLA] = useState(false);

  const handleCheckSLA = async () => {
    if (!currentWorkspace) return;
    try {
      setCheckingSLA(true);
      const res = await api.checkTicketSLA(currentWorkspace.id);
      if (res.escalated_count > 0) {
        alert(`Pengecekan SLA selesai: ${res.escalated_count} tiket terlambat otomatis dieskalasikan menjadi 'urgent'!`);
      } else {
        alert('Semua tiket terpantau aman! Tidak ada tiket yang melewati batas respon atau resolusi SLA.');
      }
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengecek SLA');
    } finally {
      setCheckingSLA(false);
    }
  };

  const getSLABadge = (t: Ticket) => {
    if (t.status === 'resolved' || t.status === 'closed') {
      return { text: 'Selesai Tepat Waktu', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (t.is_sla_breached) {
      return { text: '🚨 SLA Terlampaui', color: 'bg-rose-100 text-rose-700 border-rose-300 font-bold animate-pulse' };
    }
    const target = t.frt_due_at && !t.first_responded_at ? t.frt_due_at : t.sla_due_at;
    if (!target) return null;

    const diffMs = new Date(target).getTime() - Date.now();
    if (diffMs <= 0) {
      return { text: '🚨 SLA Terlampaui', color: 'bg-rose-100 text-rose-700 border-rose-300 font-bold' };
    }
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const timeStr = hours > 0 ? `${hours}j ${mins}m` : `${mins}m`;

    if (diffMins < 60) {
      return { text: `⚠️ Sisa: ${timeStr}`, color: 'bg-amber-100 text-amber-800 border-amber-300 font-bold' };
    }
    return { text: `⏱️ Sisa: ${timeStr}`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
  };

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [ticketList, memberList, contactList] = await Promise.all([
        api.listTickets(currentWorkspace.id, {
          status: statusFilter === 'all' ? undefined : statusFilter,
          priority: priorityFilter === 'all' ? undefined : priorityFilter,
          department: deptFilter === 'all' ? undefined : deptFilter,
          query: searchQuery || undefined,
        }),
        api.listMembers(currentWorkspace.id),
        api.listContacts(currentWorkspace.id, { per_page: 100 }),
      ]);
      setTickets(ticketList || []);
      setMembers(memberList || []);
      setContacts(contactList || []);

      if (selectedTicket) {
        const refreshed = await api.getTicket(currentWorkspace.id, selectedTicket.id);
        setSelectedTicket(refreshed);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace, statusFilter, priorityFilter, deptFilter, searchQuery]);

  const handleOpenDetail = async (ticket: Ticket) => {
    if (!currentWorkspace) return;
    try {
      const full = await api.getTicket(currentWorkspace.id, ticket.id);
      setSelectedTicket(full);
    } catch (e) {
      setSelectedTicket(ticket);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!currentWorkspace || !selectedTicket) return;
    try {
      const updated = await api.updateTicket(currentWorkspace.id, selectedTicket.id, { status });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      alert('Gagal memperbarui status');
    }
  };

  const handleUpdateAssignee = async (assigneeId: string) => {
    if (!currentWorkspace || !selectedTicket) return;
    try {
      const updated = await api.updateTicket(currentWorkspace.id, selectedTicket.id, {
        assigned_to_id: assigneeId ? assigneeId : undefined,
      });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      alert('Gagal mengalihkan penanggung jawab');
    }
  };

  const handleUpdateDepartment = async (department: string) => {
    if (!currentWorkspace || !selectedTicket) return;
    try {
      const updated = await api.updateTicket(currentWorkspace.id, selectedTicket.id, { department });
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      alert('Gagal mengubah departemen');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedTicket || !newNote.trim()) return;
    try {
      setSendingNote(true);
      await api.addTicketNote(currentWorkspace.id, selectedTicket.id, newNote.trim(), 'note');
      setNewNote('');
      const full = await api.getTicket(currentWorkspace.id, selectedTicket.id);
      setSelectedTicket(full);
      setTickets((prev) => prev.map((t) => (t.id === full.id ? full : t)));
    } catch (err) {
      alert('Gagal menambahkan catatan internal');
    } finally {
      setSendingNote(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !formSubject.trim()) return;
    try {
      setCreating(true);
      await api.createTicket(currentWorkspace.id, {
        subject: formSubject.trim(),
        description: formDescription.trim(),
        category: formCategory,
        priority: formPriority,
        department: formDept,
        contact_id: formContactId || undefined,
        assigned_to_id: formAssigneeId || undefined,
      });
      setShowCreateModal(false);
      setFormSubject('');
      setFormDescription('');
      setFormContactId('');
      setFormAssigneeId('');
      loadData();
    } catch (e: any) {
      alert(e?.message || 'Gagal membuat tiket bantuan');
    } finally {
      setCreating(false);
    }
  };

  // Metrics
  const totalCount = tickets.length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const escalatedCount = tickets.filter((t) => t.status === 'escalated' || t.priority === 'urgent').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <Navbar
        title="Tiket Bantuan (After-Sales Helpdesk)"
        subtitle="Alur penanganan kendala, komplain, eskalasi teknis, dan SLA purna jual"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* 1. Header & Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tiket Masuk</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalCount}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Semua kasus tercatat</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sedang Ditangani</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{inProgressCount}</h3>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Dalam proses solving</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eskalasi / Urgent</p>
              <h3 className="text-2xl font-black text-rose-600 mt-1">{escalatedCount}</h3>
              <p className="text-[11px] text-rose-500 mt-0.5">Prioritas tinggi & SLA</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tingkat Resolusi</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{resolutionRate}%</h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">{resolvedCount} terselesaikan</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 2. Action & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. tiket, subjek, atau deskripsi..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
            >
              <option value="all">Semua Status</option>
              <option value="open">Baru Masuk</option>
              <option value="in_progress">Sedang Ditangani</option>
              <option value="escalated">Dieskalasi</option>
              <option value="resolved">Selesai</option>
            </select>

            {/* Department Filter */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
            >
              <option value="all">Semua Departemen</option>
              <option value="support">Customer Support (L1)</option>
              <option value="technical">Tim Teknis / IT</option>
              <option value="billing">Billing & Finance</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
            >
              <option value="all">Semua Prioritas</option>
              <option value="low">Rendah</option>
              <option value="medium">Sedang</option>
              <option value="high">Tinggi</option>
              <option value="urgent">Mendesak (Urgent)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckSLA}
              disabled={checkingSLA}
              className="px-3.5 py-2 text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Periksa SLA FRT dan Resolusi semua tiket"
            >
              <Clock className={`w-3.5 h-3.5 ${checkingSLA ? 'animate-spin' : ''}`} />
              <span>{checkingSLA ? 'Mengecek...' : 'Cek & Eskalasi SLA'}</span>
            </button>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                Tabel
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 rounded-lg transition ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'}`}
              >
                Kanban
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-bold bg-[#00AFC4] hover:bg-[#009bb0] text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Tiket Baru</span>
            </button>
          </div>
        </div>

        {/* 3. Tickets View (Table or Kanban) */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#00AFC4] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Memuat data tiket bantuan...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Belum Ada Tiket yang Sesuai</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Tiket baru akan tercatat di sini saat keluhan pelanggan masuk via WhatsApp CS atau dibuat manual oleh agen.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 text-xs font-bold bg-[#00AFC4] text-white rounded-xl shadow-xs"
            >
              Buat Tiket Pertama
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">No. Tiket</th>
                    <th className="py-3 px-4">Subjek Masalah</th>
                    <th className="py-3 px-4">Pelanggan</th>
                    <th className="py-3 px-4">Departemen</th>
                    <th className="py-3 px-4">Prioritas</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Penanggung Jawab</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {tickets.map((t) => {
                    const st = STATUS_CONFIG[t.status] || STATUS_CONFIG.open;
                    const pr = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => handleOpenDetail(t)}
                        className="hover:bg-slate-50/80 cursor-pointer transition"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#00AFC4] whitespace-nowrap">
                          {t.ticket_number}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800 max-w-[260px] truncate">
                          {t.subject}
                          <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                            {t.description || 'Tidak ada deskripsi'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-medium text-slate-800">{t.contact_name || 'Umum'}</span>
                          {t.contact_phone && (
                            <p className="text-[11px] text-slate-400">{t.contact_phone}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                            {t.department}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${pr.badge}`}>
                              {pr.label}
                            </span>
                            {(() => {
                              const sla = getSLABadge(t);
                              if (!sla) return null;
                              return (
                                <span className={`px-2 py-0.5 rounded-md border text-[10px] ${sla.color}`}>
                                  {sla.text}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold inline-flex items-center gap-1 ${st.bg} ${st.text} ${st.border}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {st.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-[10px] font-bold flex items-center justify-center text-slate-700">
                              {(t.assigned_to_name || 'U')[0]}
                            </div>
                            <span className="text-slate-700 font-medium">
                              {t.assigned_to_name || 'Belum di-assign'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(t);
                            }}
                            className="text-[#00AFC4] font-bold hover:underline flex items-center gap-0.5 justify-end ml-auto"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            {(['open', 'in_progress', 'escalated', 'resolved'] as TicketStatus[]).map((colStatus) => {
              const colConfig = STATUS_CONFIG[colStatus];
              const colTickets = tickets.filter((t) => t.status === colStatus);

              return (
                <div key={colStatus} className="bg-slate-100/80 rounded-2xl p-3.5 border border-slate-200/60">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00AFC4]" />
                      {colConfig.label}
                    </span>
                    <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-md text-slate-500 shadow-2xs">
                      {colTickets.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {colTickets.map((t) => {
                      const pr = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleOpenDetail(t)}
                          className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md cursor-pointer transition space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-[#00AFC4]">
                              {t.ticket_number}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${pr.badge}`}>
                                {pr.label}
                              </span>
                              {(() => {
                                const sla = getSLABadge(t);
                                if (!sla) return null;
                                return (
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] border ${sla.color}`}>
                                    {sla.text}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          <h5 className="font-bold text-xs text-slate-800 line-clamp-2">{t.subject}</h5>

                          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                            <span className="truncate max-w-[110px]">{t.contact_name || 'Umum'}</span>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">
                              {t.department}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL DETAIL & MONITORING TIKET */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm bg-[#00AFC4]/10 text-[#00AFC4] px-2.5 py-0.5 rounded-md">
                    {selectedTicket.ticket_number}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${PRIORITY_CONFIG[selectedTicket.priority].badge}`}>
                    {PRIORITY_CONFIG[selectedTicket.priority].label}
                  </span>
                  {(() => {
                    const sla = getSLABadge(selectedTicket);
                    if (!sla) return null;
                    return (
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] ${sla.color}`}>
                        {sla.text}
                      </span>
                    );
                  })()}
                  <span className="text-xs text-slate-400 font-semibold">
                    Departemen: <span className="uppercase text-slate-700">{selectedTicket.department}</span>
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-800 mt-2">{selectedTicket.subject}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedTicket.description || 'Tidak ada deskripsi rinci'}</p>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Stepper Status Alur Kerja */}
            <div className="p-4 bg-white border-b border-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Monitoring Alur Penanganan Tiket:
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { key: 'open', label: '1. Baru Masuk' },
                  { key: 'in_progress', label: '2. Diproses' },
                  { key: 'escalated', label: '3. Eskalasi Tim' },
                  { key: 'resolved', label: '4. Selesai' },
                ].map((step, idx) => {
                  const isActive = selectedTicket.status === step.key;
                  return (
                    <button
                      key={step.key}
                      onClick={() => handleUpdateStatus(step.key as TicketStatus)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                        isActive
                          ? 'bg-[#00AFC4] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{step.label}</span>
                      {isActive && <CheckCircle className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body: Controls & Internal Chatter */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Row Handover & Assignment Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Alihkan / Assign ke Rekan Tim:
                  </label>
                  <select
                    value={selectedTicket.assigned_to_id || ''}
                    onChange={(e) => handleUpdateAssignee(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="">-- Belum Di-assign --</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name} ({m.department || m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Pindahkan Departemen (Eskalasi):
                  </label>
                  <select
                    value={selectedTicket.department}
                    onChange={(e) => handleUpdateDepartment(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="support">Customer Support (L1)</option>
                    <option value="technical">Tim Teknis / Engineering</option>
                    <option value="billing">Keuangan & Billing</option>
                    <option value="sales">Tim Sales (Pre-sales)</option>
                  </select>
                </div>
              </div>

              {/* Tektokan Tim / Internal Chatter Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-[#00AFC4]" />
                    <span>Catatan & Diskusi Internal Tim (Tektokan Helpdesk)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Hanya terbaca internal, tidak terlihat oleh customer WA
                  </span>
                </div>

                {/* Activity Feed */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 max-h-[220px] overflow-y-auto">
                  {selectedTicket.activities && selectedTicket.activities.length > 0 ? (
                    selectedTicket.activities.map((act) => (
                      <div key={act.id} className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00AFC4]" />
                            {act.user_name || 'Sistem'}
                          </span>
                          <span className="text-slate-400">
                            {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{act.note}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-xs text-slate-400 py-4">Belum ada catatan aktivitas internal.</p>
                  )}
                </div>

                {/* Form Tambah Catatan */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Tulis update progres / tektokan dengan tim terkait..."
                    className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                  />
                  <button
                    type="submit"
                    disabled={sendingNote || !newNote.trim()}
                    className="px-4 py-2 text-xs font-bold bg-[#00AFC4] hover:bg-[#009bb0] disabled:opacity-50 text-white rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Kirim Catatan</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL BUAT TIKET BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-[#00AFC4]" />
                <span>Buat Tiket Bantuan After-Sales</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Subjek Kasus / Kendala *
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Contoh: Kendala Tapping Smart Review di Toko Cabang 2"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Kategori Masalah
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="technical">Kendala Teknis</option>
                    <option value="billing">Tagihan / Faktur</option>
                    <option value="complaint">Komplain Layanan</option>
                    <option value="general">Pertanyaan Umum</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Prioritas & SLA
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as TicketPriority)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="low">Rendah (48 Jam)</option>
                    <option value="medium">Sedang (48 Jam)</option>
                    <option value="high">Tinggi (24 Jam)</option>
                    <option value="urgent">Mendesak (Immediate)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Departemen
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="support">Customer Support (L1)</option>
                    <option value="technical">Tim Teknis / IT</option>
                    <option value="billing">Billing & Finance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Penanggung Jawab
                  </label>
                  <select
                    value={formAssigneeId}
                    onChange={(e) => setFormAssigneeId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="">-- Pilih Anggota --</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Kontak Pelanggan Terkait (Opsional)
                </label>
                <select
                  value={formContactId}
                  onChange={(e) => setFormContactId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">-- Pilih Kontak CRM --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Rincian Deskripsi Kasus
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan detail komplain atau kendala teknis yang dihadapi pelanggan..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating || !formSubject.trim()}
                  className="px-5 py-2 text-xs font-bold bg-[#00AFC4] hover:bg-[#009bb0] disabled:opacity-50 text-white rounded-xl shadow-sm transition"
                >
                  {creating ? 'Menyimpan...' : 'Buat Tiket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
