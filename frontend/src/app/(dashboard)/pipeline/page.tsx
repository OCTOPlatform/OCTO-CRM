'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth, formatCurrencyIDR, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import DealDetailModal from '@/components/deals/DealDetailModal';
import { Deal, Pipeline, PipelineStage, Contact, Company, Task } from '@/types';
import {
  Kanban,
  Table as TableIcon,
  Plus,
  DollarSign,
  User,
  Building,
  Calendar,
  Clock,
  Star,
  CheckCircle,
  XCircle,
  MoreVertical,
  Trash2,
  Filter,
  Search,
  Tag,
  TrendingUp,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  LifeBuoy,
} from 'lucide-react';

export default function PipelinePage() {
  const { currentWorkspace, user, activeRole } = useAuth();
  const isOwner = currentWorkspace?.role === 'owner' || activeRole === 'owner';
  const isAfterSales =
    (activeRole === 'support' || currentWorkspace?.department === 'support') && !isOwner;
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: 'kanban' | 'list'
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Search & Filter (Odoo Control Panel)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'high_priority' | 'overdue' | 'today' | 'won' | 'lost' | 'my_deals'>('all');

  // Active Deal Modal (Odoo Form View & Chatter)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Inline Quick-Add in Stage Column (Odoo Quick Create)
  const [quickAddStageId, setQuickAddStageId] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickValue, setQuickValue] = useState<number>(10000000);
  const [quickContactId, setQuickContactId] = useState('');

  // Full Create Deal Modal
  const [showAddDealModal, setShowAddDealModal] = useState(false);
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState<number>(10000000);
  const [dealStageId, setDealStageId] = useState('');
  const [dealContactId, setDealContactId] = useState('');
  const [dealCompanyId, setDealCompanyId] = useState('');
  const [dealPriority, setDealPriority] = useState<number>(0);
  const [dealTagsInput, setDealTagsInput] = useState('Hot Lead');
  const [dealCloseDate, setDealCloseDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [dealNotes, setDealNotes] = useState('');

  // Lost Reason Modal
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedDealForLost, setSelectedDealForLost] = useState<Deal | null>(null);
  const [lostReason, setLostReason] = useState('Harga melebihi anggaran klien');

  const loadPipelineData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [pipes, dealList, contactList, companyList, taskList] = await Promise.all([
        api.listPipelines(currentWorkspace.id),
        api.listDeals(currentWorkspace.id),
        api.listContacts(currentWorkspace.id),
        api.listCompanies(currentWorkspace.id),
        api.listTasks(currentWorkspace.id),
      ]);

      if (pipes.length > 0) {
        setPipeline(pipes[0]);
        if (pipes[0].stages && pipes[0].stages.length > 0) {
          setDealStageId(pipes[0].stages[0].id);
        }
      }
      setDeals(dealList);
      setContacts(contactList);
      setCompanies(companyList);
      setTasks(taskList);
    } catch (e) {
      console.error('Failed to load pipeline data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipelineData();
  }, [currentWorkspace]);

  // Traffic Light Activity Status for each Deal (Odoo Clock Traffic Light)
  const getDealActivityStatus = (dealId: string) => {
    const dealTasks = tasks.filter((t) => t.deal_id === dealId && t.status !== 'completed');
    if (dealTasks.length === 0) return { status: 'none', count: 0, label: 'Belum ada aktivitas' };

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const hasOverdue = dealTasks.some((t) => t.due_date && new Date(t.due_date) < now && t.due_date.slice(0, 10) !== todayStr);
    if (hasOverdue) {
      return { status: 'overdue', count: dealTasks.length, label: 'Aktivitas Terlambat!' };
    }

    const hasToday = dealTasks.some((t) => t.due_date && t.due_date.slice(0, 10) === todayStr);
    if (hasToday) {
      return { status: 'today', count: dealTasks.length, label: 'Aktivitas Hari Ini' };
    }

    return { status: 'planned', count: dealTasks.length, label: 'Aktivitas Terencana' };
  };

  // Filtered Deals based on Search & Active Odoo Filter
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // For CS After-Sales role: strictly only WON deals!
      if (isAfterSales) {
        const isWon =
          deal.status === 'won' ||
          (pipeline?.stages &&
            pipeline.stages.some(
              (s) => s.id === deal.stage_id && (s.is_won || s.name.toLowerCase().includes('won'))
            ));
        if (!isWon) return false;
      }

      // Search text filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = deal.title.toLowerCase().includes(q);
        const matchesContact = deal.contact_name?.toLowerCase().includes(q) ?? false;
        const matchesCompany = deal.company_name?.toLowerCase().includes(q) ?? false;
        if (!matchesTitle && !matchesContact && !matchesCompany) return false;
      }

      // Quick filter
      if (activeFilter === 'high_priority') {
        return (deal.priority || 0) >= 2;
      }
      if (activeFilter === 'won') {
        return deal.status === 'won';
      }
      if (activeFilter === 'lost') {
        return deal.status === 'lost';
      }
      if (activeFilter === 'my_deals') {
        return user?.id && deal.owner_id === user.id;
      }
      if (activeFilter === 'overdue') {
        const act = getDealActivityStatus(deal.id);
        return act.status === 'overdue';
      }
      if (activeFilter === 'today') {
        const act = getDealActivityStatus(deal.id);
        return act.status === 'today';
      }

      return true;
    });
  }, [deals, searchQuery, activeFilter, tasks, user]);

  const allStages = pipeline?.stages || [];
  const stages = useMemo(() => {
    if (isAfterSales) {
      const wonStages = allStages.filter(
        (s) => s.is_won || s.name.toLowerCase().includes('won') || s.name.toLowerCase().includes('closing')
      );
      return wonStages.length > 0 ? wonStages : allStages.slice(-1);
    }
    return allStages;
  }, [allStages, isAfterSales]);

  // Stage Move handler
  const handleMoveStage = async (dealId: string, newStageId: string) => {
    if (!currentWorkspace || !pipeline?.stages) return;

    const targetStage = pipeline.stages.find((s) => s.id === newStageId);
    if (!targetStage) return;

    if (targetStage.is_lost) {
      const deal = deals.find((d) => d.id === dealId);
      if (deal) {
        setSelectedDealForLost(deal);
        setShowLostModal(true);
      }
      return;
    }

    try {
      await api.updateDealStage(currentWorkspace.id, dealId, newStageId);
      loadPipelineData();
    } catch (e: any) {
      alert(e.message || 'Gagal memindahkan tahap');
    }
  };

  // Quick Inline Add handler (Odoo column quick-create)
  const handleInlineQuickAdd = async (stageId: string) => {
    if (!currentWorkspace || !quickTitle.trim()) return;
    try {
      await api.createDeal(currentWorkspace.id, {
        title: quickTitle.trim(),
        value: Number(quickValue) || 0,
        stage_id: stageId,
        pipeline_id: pipeline!.id,
        contact_id: quickContactId || undefined,
        priority: 1,
        tags: ['New Lead'],
      });
      setQuickTitle('');
      setQuickValue(10000000);
      setQuickContactId('');
      setQuickAddStageId(null);
      loadPipelineData();
    } catch (e: any) {
      alert(e.message || 'Gagal menambahkan peluang cepat');
    }
  };

  // Set Deal Priority directly from card
  const handleTogglePriority = async (e: React.MouseEvent, dealId: string, currentPriority: number, targetStar: number) => {
    e.stopPropagation();
    if (!currentWorkspace) return;
    const newPriority = currentPriority === targetStar ? targetStar - 1 : targetStar;
    try {
      await api.updateDealPriority(currentWorkspace.id, dealId, newPriority);
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, priority: newPriority } : d))
      );
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah prioritas');
    }
  };

  // Confirm Lost
  const handleConfirmLost = async () => {
    if (!currentWorkspace || !selectedDealForLost || !pipeline?.stages) return;
    const lostStage = pipeline.stages.find((s) => s.is_lost);
    if (!lostStage) return;

    try {
      await api.updateDealStage(
        currentWorkspace.id,
        selectedDealForLost.id,
        lostStage.id,
        'lost',
        lostReason
      );
      setShowLostModal(false);
      setSelectedDealForLost(null);
      loadPipelineData();
    } catch (e: any) {
      alert(e.message || 'Gagal menandai lost');
    }
  };

  // Full Deal Creation
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !dealTitle || !dealStageId) return;

    const tagsArray = dealTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await api.createDeal(currentWorkspace.id, {
        title: dealTitle,
        value: Number(dealValue),
        stage_id: dealStageId,
        pipeline_id: pipeline!.id,
        contact_id: dealContactId || undefined,
        company_id: dealCompanyId || undefined,
        priority: dealPriority,
        tags: tagsArray,
        expected_close_date: dealCloseDate,
        notes: dealNotes,
      });

      setShowAddDealModal(false);
      setDealTitle('');
      setDealValue(10000000);
      setDealNotes('');
      loadPipelineData();
    } catch (e: any) {
      alert(e.message || 'Gagal membuat deal');
    }
  };

  const handleDeleteDeal = async (e: React.MouseEvent, dealId: string) => {
    e.stopPropagation();
    if (!currentWorkspace) return;
    if (!confirm('Hapus peluang penjualan ini?')) return;
    try {
      await api.deleteDeal(currentWorkspace.id, dealId);
      loadPipelineData();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Sales Pipeline & Kanban (Odoo Style)" />
        <div className="p-8 flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-3 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Summary Metrics
  const totalOpenValue = filteredDeals
    .filter((d) => d.status === 'open')
    .reduce((acc, d) => acc + d.value, 0);

  const totalProratedValue = filteredDeals
    .filter((d) => d.status === 'open')
    .reduce((acc, d) => {
      const prob = d.probability ?? d.stage_probability ?? 0;
      return acc + (d.value * prob) / 100;
    }, 0);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
      <Navbar
        title="Sales Pipeline (Odoo CRM)"
        subtitle={`Pipeline: ${pipeline?.name || 'Utama'} • ${filteredDeals.length} Peluang`}
        onQuickAddDeal={() => setShowAddDealModal(true)}
      />

      {/* ================= ODOO CRM CONTROL PANEL / SEARCH & VIEW SWITCHER ================= */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
        {/* Left: Search & Filter Tag Buttons */}
        <div className="flex items-center flex-wrap gap-2 flex-1">
          {/* Search Bar */}
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari peluang, kontak, perusahaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:bg-white transition"
            />
          </div>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Odoo Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Semua ({deals.length})
            </button>

            <button
              onClick={() => setActiveFilter('high_priority')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeFilter === 'high_priority'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              Prioritas Tinggi
            </button>

            <button
              onClick={() => setActiveFilter('overdue')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeFilter === 'overdue'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Overdue Tasks
            </button>

            <button
              onClick={() => setActiveFilter('today')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeFilter === 'today'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Hari Ini
            </button>

            <button
              onClick={() => setActiveFilter('my_deals')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeFilter === 'my_deals'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Peluang Saya
            </button>

            <button
              onClick={() => setActiveFilter('won')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                activeFilter === 'won'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Won
            </button>
          </div>
        </div>

        {/* Right: Revenue Summary & View Switcher */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-3 text-xs pr-2 border-r border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px]">Nilai Terbuka:</span>
              <span className="font-bold text-slate-800">{formatCurrencyIDR(totalOpenValue)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Estimasi Prorata:</span>
              <span className="font-bold text-emerald-700">{formatCurrencyIDR(Math.round(totalProratedValue))}</span>
            </div>
          </div>

          {/* Odoo View Mode Switcher: Kanban vs List */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Kanban (Papan)"
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan List (Tabel)"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
          </div>

          {!isAfterSales && (
            <button
              onClick={() => setShowAddDealModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00AFC4] hover:bg-[#0096a8] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Peluang Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* CS Contextual Banner for Won Deals Analysis */}
      {isAfterSales && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-purple-50 border border-purple-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xs text-purple-900 block">
                Akses Khusus CS After-Sales: Pelanggan Aktif (Closing Won)
              </span>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Menampilkan data transaksi yang telah berhasil closing. Klik pada kartu client untuk menganalisis riwayat deal, nilai kontrak, serta catatan serah terima yang ditinggalkan oleh tim sales.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-purple-200/80 text-purple-800 text-xs font-bold shrink-0">
            {filteredDeals.length} Pelanggan Won
          </span>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      {viewMode === 'kanban' ? (
        /* KANBAN VIEW (ODOO BOARD) */
        <div className="p-6 flex-1 overflow-x-auto flex gap-4 bg-[#F8FAFC] items-start">
          {stages.map((stage) => {
            const stageDeals = filteredDeals.filter((d) => d.stage_id === stage.id);
            const stageTotalVal = stageDeals.reduce((acc, d) => acc + d.value, 0);
            const stageProratedVal = Math.round(stageTotalVal * (stage.probability / 100));
            const isQuickAddOpen = quickAddStageId === stage.id;

            return (
              <div
                key={stage.id}
                className="w-80 shrink-0 bg-slate-100/90 rounded-2xl p-3 flex flex-col max-h-[calc(100vh-9.5rem)] border border-slate-200 shadow-xs"
              >
                {/* Stage Header */}
                <div className="mb-2.5 pb-2.5 border-b border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          stage.is_won
                            ? 'bg-emerald-500'
                            : stage.is_lost
                            ? 'bg-rose-500'
                            : 'bg-[#00AFC4]'
                        }`}
                      ></span>
                      <span className="font-bold text-xs text-slate-800 truncate">{stage.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white text-slate-600 font-bold border border-slate-200">
                        {stageDeals.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {stage.probability}%
                      </span>
                      {/* Odoo Quick Add (+) Button in Stage Column */}
                      {!isAfterSales && (
                        <button
                          onClick={() => setQuickAddStageId(isQuickAddOpen ? null : stage.id)}
                          className={`p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition cursor-pointer ${
                            isQuickAddOpen ? 'bg-indigo-100 text-indigo-700' : ''
                          }`}
                          title="Tambah peluang cepat di tahap ini"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 mt-1.5 pl-4">
                    <span>{formatCurrencyIDR(stageTotalVal)}</span>
                    {stage.probability > 0 && stage.probability < 100 && (
                      <span className="text-[10px] font-normal text-emerald-700">
                        Prorata: {formatCurrencyIDR(stageProratedVal)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Quick Add Form in Column (Odoo signature feature) */}
                {isQuickAddOpen && (
                  <div className="mb-3 p-3 bg-white rounded-xl border-2 border-[#00AFC4] shadow-md animate-in fade-in">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Tambah Cepat (Quick Opportunity)
                    </span>
                    <input
                      type="text"
                      placeholder="Nama kesepakatan / deal..."
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#00AFC4] mb-2"
                      autoFocus
                    />
                    <input
                      type="number"
                      placeholder="Nilai estimasi (Rp)"
                      value={quickValue}
                      onChange={(e) => setQuickValue(Number(e.target.value))}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#00AFC4] mb-2"
                    />
                    <select
                      value={quickContactId}
                      onChange={(e) => setQuickContactId(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white mb-2.5 text-slate-700"
                    >
                      <option value="">-- Pilih Kontak / Customer (Opsional) --</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name || `${c.first_name} ${c.last_name}`}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickAddStageId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded-md cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInlineQuickAdd(stage.id)}
                        disabled={!quickTitle.trim()}
                        className="px-3 py-1 bg-[#00AFC4] hover:bg-[#0096a8] disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer"
                      >
                        Tambah
                      </button>
                    </div>
                  </div>
                )}

                {/* Deals Cards List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {stageDeals.map((deal) => {
                    const activityInfo = getDealActivityStatus(deal.id);

                    return (
                      <div
                        key={deal.id}
                        onClick={() => setSelectedDealId(deal.id)}
                        className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs hover:border-[#00AFC4] hover:shadow-md transition group relative cursor-pointer"
                      >
                        {/* Tags Badges */}
                        {deal.tags && deal.tags.length > 0 && (
                          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                            {deal.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Title & Action */}
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-xs text-slate-900 line-clamp-2 group-hover:text-[#00AFC4] transition">
                            {deal.title}
                          </span>
                          <button
                            onClick={(e) => handleDeleteDeal(e, deal.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition ml-1 p-0.5 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Expected Revenue */}
                        <div className="text-sm font-extrabold text-slate-900 mt-1">
                          {formatCurrencyIDR(deal.value)}
                        </div>

                        {/* Contact & Company Details */}
                        {deal.contact_name && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1.5">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{deal.contact_name}</span>
                          </div>
                        )}

                        {deal.company_name && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{deal.company_name}</span>
                          </div>
                        )}

                        {/* ODOO CARD FOOTER: PRIORITY STARS + ACTIVITY TRAFFIC LIGHT CLOCK + OWNER */}
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          {/* Priority Stars (0-3 clickable stars) */}
                          <div className="flex items-center gap-0.5" title="Ubah prioritas peluang">
                            {[1, 2, 3].map((starVal) => (
                              <button
                                key={starVal}
                                type="button"
                                onClick={(e) => handleTogglePriority(e, deal.id, deal.priority || 0, starVal)}
                                className="p-0.5 hover:scale-120 transition cursor-pointer"
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    (deal.priority || 0) >= starVal
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'text-slate-200 hover:text-amber-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>

                          {/* Activity Clock (Traffic Light Odoo Engine) */}
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                activityInfo.status === 'overdue'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : activityInfo.status === 'today'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : activityInfo.status === 'planned'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}
                              title={activityInfo.label}
                            >
                              <Clock className="w-3 h-3" />
                              {activityInfo.count > 0 && <span>{activityInfo.count}</span>}
                            </div>

                            {/* Owner Avatar */}
                            <div
                              className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0 border border-white shadow-2xs"
                              title={`Penanggung jawab: ${deal.owner_name || 'Belum ditugaskan'}`}
                            >
                              {deal.owner_name ? deal.owner_name.charAt(0) : 'U'}
                            </div>
                          </div>
                        </div>

                        {/* Move stage dropdown */}
                        <div
                          className="mt-2 pt-1.5 border-t border-slate-100/60 flex items-center justify-between"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="text-[9px] text-slate-400">Pindah:</label>
                          <select
                            value={deal.stage_id}
                            onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                            className="text-[10px] font-semibold rounded border border-slate-200 bg-slate-50 text-slate-700 py-0.5 px-1 focus:ring-1 focus:ring-[#00AFC4] cursor-pointer"
                          >
                            {stages.map((stg) => (
                              <option key={stg.id} value={stg.id}>
                                {stg.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}

                  {stageDeals.length === 0 && (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                      Tidak ada peluang
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW (ODOO TABLE) */
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-12">Prioritas</th>
                  <th className="py-3 px-4">Peluang Kesepakatan</th>
                  <th className="py-3 px-4">Kontak / Customer</th>
                  <th className="py-3 px-4">Perusahaan</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Tahap (Stage)</th>
                  <th className="py-3 px-4">Aktivitas</th>
                  <th className="py-3 px-4">Target Tutup</th>
                  <th className="py-3 px-4 text-right">Nilai (Rp)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => {
                  const actInfo = getDealActivityStatus(deal.id);
                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setSelectedDealId(deal.id)}
                      className="hover:bg-slate-50 cursor-pointer transition"
                    >
                      {/* Priority Stars */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3].map((starVal) => (
                            <button
                              key={starVal}
                              onClick={(e) => handleTogglePriority(e, deal.id, deal.priority || 0, starVal)}
                              className="p-0.5 hover:scale-115 cursor-pointer"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  (deal.priority || 0) >= starVal
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-slate-200'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {deal.title}
                        {deal.tags && deal.tags.length > 0 && (
                          <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-normal bg-indigo-50 text-indigo-700">
                            {deal.tags[0]}
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3 px-4 text-slate-600">{deal.contact_name || '-'}</td>

                      {/* Company */}
                      <td className="py-3 px-4 text-slate-500">{deal.company_name || '-'}</td>

                      {/* Owner */}
                      <td className="py-3 px-4 text-slate-600">{deal.owner_name || 'Unassigned'}</td>

                      {/* Stage Dropdown */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={deal.stage_id}
                          onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                          className="text-xs font-semibold rounded-md border border-slate-200 bg-white text-slate-700 py-1 px-2 focus:ring-1 focus:ring-[#00AFC4] cursor-pointer"
                        >
                          {stages.map((stg) => (
                            <option key={stg.id} value={stg.id}>
                              {stg.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Activity Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            actInfo.status === 'overdue'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : actInfo.status === 'today'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : actInfo.status === 'planned'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {actInfo.label}
                        </span>
                      </td>

                      {/* Close Date */}
                      <td className="py-3 px-4 text-slate-500">
                        {deal.expected_close_date ? formatDateIndo(deal.expected_close_date) : '-'}
                      </td>

                      {/* Value */}
                      <td className="py-3 px-4 font-bold text-slate-900 text-right">
                        {formatCurrencyIDR(deal.value)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {deal.status === 'won' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            WON
                          </span>
                        ) : deal.status === 'lost' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            LOST
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                            OPEN
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredDeals.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada data kesepakatan yang cocok dengan filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ODOO DETAIL FLYOUT / MODAL WITH CHATTER ================= */}
      {selectedDealId && (
        <DealDetailModal
          dealId={selectedDealId}
          workspaceId={currentWorkspace!.id}
          stages={stages}
          contacts={contacts}
          companies={companies}
          currentUser={user}
          onClose={() => setSelectedDealId(null)}
          onDealUpdated={loadPipelineData}
        />
      )}

      {/* ================= MODAL: CREATE DEAL FULL ================= */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00AFC4]" />
              Buat Peluang Penjualan Baru (Deal)
            </h3>

            <form onSubmit={handleCreateDeal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Peluang / Opportunity <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Contoh: Pengadaan 50 Lisensi CRM Enterprise"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nilai Estimasi (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500000}
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tahap Pipeline
                  </label>
                  <select
                    value={dealStageId}
                    onChange={(e) => setDealStageId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    {stages.map((stg) => (
                      <option key={stg.id} value={stg.id}>
                        {stg.name} ({stg.probability}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hubungkan Kontak
                  </label>
                  <select
                    value={dealContactId}
                    onChange={(e) => setDealContactId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="">-- Tanpa Kontak --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name || `${c.first_name} ${c.last_name}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hubungkan Perusahaan
                  </label>
                  <select
                    value={dealCompanyId}
                    onChange={(e) => setDealCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="">-- Tanpa Perusahaan --</option>
                    {companies.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estimasi Tanggal Tutup
                  </label>
                  <input
                    type="date"
                    value={dealCloseDate}
                    onChange={(e) => setDealCloseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioritas (Odoo Stars)
                  </label>
                  <select
                    value={dealPriority}
                    onChange={(e) => setDealPriority(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value={0}>Normal (0 Bintang)</option>
                    <option value={1}>Rendah (⭐ 1 Bintang)</option>
                    <option value={2}>Tinggi (⭐⭐ 2 Bintang)</option>
                    <option value={3}>Mendesak (⭐⭐⭐ 3 Bintang)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags (Pisahkan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Hot Lead, Enterprise, Hardware"
                  value={dealTagsInput}
                  onChange={(e) => setDealTagsInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Kebutuhan
                </label>
                <textarea
                  rows={2}
                  value={dealNotes}
                  onChange={(e) => setDealNotes(e.target.value)}
                  placeholder="Kebutuhan spesifik klien..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00AFC4] hover:bg-[#0096a8] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Buat Peluang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: MARK LOST ================= */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in">
            <h3 className="font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Tandai Kesepakatan Gagal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pilih alasan kegagalan untuk menganalisis konversi sales funnel.
            </p>

            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 mb-4"
            >
              <option value="Harga melebihi anggaran klien">Harga melebihi anggaran klien</option>
              <option value="Klien memilih kompetitor lain">Klien memilih kompetitor lain</option>
              <option value="Kebutuhan fitur belum terpenuhi">Kebutuhan fitur belum terpenuhi</option>
              <option value="Klien tidak dapat dihubungi">Klien tidak dapat dihubungi</option>
              <option value="Proyek dibatalkan oleh klien">Proyek dibatalkan oleh klien</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowLostModal(false);
                  setSelectedDealForLost(null);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLost}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
              >
                Simpan Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
