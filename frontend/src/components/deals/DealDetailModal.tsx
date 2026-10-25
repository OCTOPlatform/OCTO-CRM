'use client';

import React, { useState, useEffect } from 'react';
import { Deal, PipelineStage, Contact, Company, Activity, Task, User, Quotation, WorkspaceMember } from '@/types';
import { api } from '@/lib/api';
import { formatCurrencyIDR, formatDateIndo } from '@/lib/auth-context';
import {
  X,
  Star,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  Phone,
  Mail,
  Building,
  User as UserIcon,
  MessageSquare,
  FileText,
  Send,
  Plus,
  AlertCircle,
  Check,
  ChevronRight,
  Tag,
  DollarSign,
  TrendingUp,
  Printer,
  ExternalLink,
  Share2,
  CheckCircle2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface DealDetailModalProps {
  dealId: string;
  workspaceId: string;
  stages: PipelineStage[];
  contacts: Contact[];
  companies: Company[];
  currentUser: User | null;
  onClose: () => void;
  onDealUpdated: () => void;
}

export default function DealDetailModal({
  dealId,
  workspaceId,
  stages,
  contacts,
  companies,
  currentUser,
  onClose,
  onDealUpdated,
}: DealDetailModalProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [dealTasks, setDealTasks] = useState<Task[]>([]);
  
  // Chatter active tab: 'note' | 'activity'
  const [chatterTab, setChatterTab] = useState<'note' | 'activity'>('note');
  
  // Note Form
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Activity Schedule Form
  const [activityType, setActivityType] = useState<'call' | 'meeting' | 'email' | 'whatsapp' | 'note'>('call');
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDueDate, setActivityDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [activityPriority, setActivityPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // Lost Reason Modal
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReasonChoice, setLostReasonChoice] = useState('Harga melebihi anggaran klien');
  const [customLostReason, setCustomLostReason] = useState('');

  // Editable deal values
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState<number>(0);
  const [editingProbability, setEditingProbability] = useState(false);
  const [probabilityInput, setProbabilityInput] = useState<number>(0);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [updatingOwner, setUpdatingOwner] = useState(false);

  // CPQ Quotations (Pilar 3)
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState('');
  const [quoteItems, setQuoteItems] = useState<Array<{ item_name: string; description: string; quantity: number; unit_price: number }>>([
    { item_name: 'Paket Solusi Bisnis OCTO-CRM', description: 'Paket Tahunan Multi-Channel & Sales Pipeline', quantity: 1, unit_price: 15000000 },
  ]);
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteTax, setQuoteTax] = useState<number>(11);
  const [quoteNotes, setQuoteNotes] = useState('Pembayaran dilakukan via transfer bank dalam 14 hari kalender.');
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [sendingQuoteWA, setSendingQuoteWA] = useState<string | null>(null);

  const loadDealDetail = async () => {
    try {
      setLoading(true);
      const [dealData, actList, taskList, quoteList, memberList] = await Promise.all([
        api.getDeal(workspaceId, dealId),
        api.listDealActivities(workspaceId, dealId),
        api.listTasks(workspaceId, { deal_id: dealId }),
        api.listQuotations(workspaceId, dealId).catch(() => []),
        api.listMembers(workspaceId).catch(() => []),
      ]);
      setDeal(dealData);
      setTitleInput(dealData.title);
      setValueInput(dealData.value);
      setProbabilityInput(dealData.probability ?? dealData.stage_probability ?? 0);
      setActivities(actList);
      setDealTasks(taskList);
      setQuotations(quoteList || []);
      setMembers(memberList || []);
      setQuoteTitle(`Penawaran Resmi: ${dealData.title}`);
    } catch (err) {
      console.error('Failed to load deal detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { item_name: '', description: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveQuoteItem = (idx: number) => {
    if (quoteItems.length <= 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== idx));
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deal) return;
    try {
      setCreatingQuote(true);
      const res = await api.createQuotation(workspaceId, {
        deal_id: deal.id,
        contact_id: deal.contact_id || undefined,
        title: quoteTitle,
        client_name: deal.contact_name || 'Klien',
        client_email: deal.contact_email || undefined,
        client_phone: deal.contact_phone || undefined,
        company_name: deal.company_name || undefined,
        discount_percentage: quoteDiscount,
        tax_percentage: quoteTax,
        valid_until: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        notes: quoteNotes,
        items: quoteItems,
      });
      alert(`Penawaran resmi ${res.quote_number} berhasil dibuat!`);
      const updatedQuotes = await api.listQuotations(workspaceId, deal.id);
      setQuotations(updatedQuotes);
      setShowQuoteModal(false);
    } catch (e: any) {
      alert(e.message || 'Gagal membuat penawaran');
    } finally {
      setCreatingQuote(false);
    }
  };

  const handleSendQuoteWhatsApp = async (quoId: string) => {
    try {
      setSendingQuoteWA(quoId);
      const res = await api.sendQuotationWhatsApp(workspaceId, quoId);
      alert(res.message || 'Penawaran resmi berhasil dikirim ke WhatsApp klien!');
      const updatedQuotes = await api.listQuotations(workspaceId, deal?.id);
      setQuotations(updatedQuotes);
    } catch (e: any) {
      alert(e.message || 'Gagal mengirim penawaran via WhatsApp');
    } finally {
      setSendingQuoteWA(null);
    }
  };

  useEffect(() => {
    loadDealDetail();
  }, [dealId, workspaceId]);

  if (!deal && loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm font-semibold text-slate-700">Memuat detail peluang...</p>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  const currentStage = stages.find((s) => s.id === deal.stage_id);
  const proratedValue = Math.round(deal.value * ((deal.probability ?? deal.stage_probability ?? 0) / 100));

  // Change Stage
  const handleStageClick = async (targetStageId: string) => {
    if (targetStageId === deal.stage_id) return;
    const targetStage = stages.find((s) => s.id === targetStageId);
    if (!targetStage) return;

    if (targetStage.is_lost) {
      setShowLostDialog(true);
      return;
    }

    try {
      await api.updateDealStage(workspaceId, deal.id, targetStageId);
      await loadDealDetail();
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal memindahkan tahap');
    }
  };

  // Mark Won
  const handleMarkWon = async () => {
    const wonStage = stages.find((s) => s.is_won);
    const targetStageId = wonStage ? wonStage.id : deal.stage_id;
    try {
      await api.updateDealStage(workspaceId, deal.id, targetStageId, 'won');
      await loadDealDetail();
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal menandai Won');
    }
  };

  // Mark Lost
  const handleConfirmLost = async () => {
    const finalReason = lostReasonChoice === 'Lainnya' ? customLostReason : lostReasonChoice;
    const lostStage = stages.find((s) => s.is_lost);
    const targetStageId = lostStage ? lostStage.id : deal.stage_id;
    try {
      await api.updateDealStage(workspaceId, deal.id, targetStageId, 'lost', finalReason);
      setShowLostDialog(false);
      await loadDealDetail();
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal menandai Lost');
    }
  };

  // Update Priority
  const handleSetPriority = async (newPriority: number) => {
    try {
      await api.updateDealPriority(workspaceId, deal.id, newPriority);
      setDeal({ ...deal, priority: newPriority });
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui prioritas');
    }
  };

  // Save Title
  const handleSaveTitle = async () => {
    if (!titleInput.trim()) return;
    try {
      await api.updateDeal(workspaceId, deal.id, { title: titleInput });
      setDeal({ ...deal, title: titleInput });
      setEditingTitle(false);
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui judul');
    }
  };

  // Save Value & Probability
  const handleSaveValue = async () => {
    try {
      await api.updateDeal(workspaceId, deal.id, { value: valueInput, probability: probabilityInput });
      setDeal({ ...deal, value: valueInput, probability: probabilityInput });
      setEditingValue(false);
      setEditingProbability(false);
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui nilai');
    }
  };

  // Reassign Sales Representative (PIC)
  const handleAssignOwner = async (newOwnerId: string) => {
    if (!deal) return;
    try {
      setUpdatingOwner(true);
      await api.updateDeal(workspaceId, deal.id, {
        owner_id: newOwnerId === '' ? '' : newOwnerId,
      });
      const selectedMember = members.find((m) => m.user_id === newOwnerId);
      setDeal({
        ...deal,
        owner_id: newOwnerId === '' ? undefined : newOwnerId,
        owner_name: selectedMember ? selectedMember.full_name : undefined,
      });
      onDealUpdated();
    } catch (e: any) {
      alert(e.message || 'Gagal memperbarui sales penanggung jawab');
    } finally {
      setUpdatingOwner(false);
    }
  };

  // Submit Note (Log Note)
  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    try {
      setSubmittingNote(true);
      await api.createActivity(workspaceId, {
        contact_id: deal.contact_id || '',
        deal_id: deal.id,
        type: 'note',
        subject: 'Catatan Internal',
        description: noteText.trim(),
      });
      setNoteText('');
      const updatedActivities = await api.listDealActivities(workspaceId, deal.id);
      setActivities(updatedActivities);
    } catch (err: any) {
      alert(err.message || 'Gagal menambahkan catatan');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Schedule Activity (Odoo Activity Engine)
  const handleScheduleActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityTitle.trim()) return;
    try {
      setSubmittingActivity(true);
      // Create task attached to deal
      await api.createTask(workspaceId, {
        deal_id: deal.id,
        contact_id: deal.contact_id || undefined,
        title: `[${activityType.toUpperCase()}] ${activityTitle.trim()}`,
        due_date: new Date(activityDueDate).toISOString(),
        priority: activityPriority,
        status: 'open',
      });
      // Also log activity plan
      await api.createActivity(workspaceId, {
        contact_id: deal.contact_id || '',
        deal_id: deal.id,
        type: activityType,
        subject: `Menjadwalkan Aktivitas: ${activityTitle.trim()}`,
        description: `Jatuh tempo: ${activityDueDate} (Prioritas: ${activityPriority})`,
      });

      setActivityTitle('');
      setChatterTab('note');
      const [updatedTasks, updatedActivities] = await Promise.all([
        api.listTasks(workspaceId, { deal_id: deal.id }),
        api.listDealActivities(workspaceId, deal.id),
      ]);
      setDealTasks(updatedTasks);
      setActivities(updatedActivities);
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal menjadwalkan aktivitas');
    } finally {
      setSubmittingActivity(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (taskId: string) => {
    try {
      await api.toggleCompleteTask(workspaceId, taskId);
      const [updatedTasks, updatedActivities] = await Promise.all([
        api.listTasks(workspaceId, { deal_id: deal.id }),
        api.listDealActivities(workspaceId, deal.id),
      ]);
      setDealTasks(updatedTasks);
      setActivities(updatedActivities);
      onDealUpdated();
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui status tugas');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* ================= HEADER: ODOO ACTION BAR & CHEVRON STAGE PROGRESS ================= */}
        <div className="border-b border-slate-200 bg-slate-50/90 px-6 py-4 flex flex-col gap-3">
          {/* Top Bar: Action Buttons & Window Controls */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {deal.status !== 'won' && (
                <button
                  onClick={handleMarkWon}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  Menangkan (Won)
                </button>
              )}
              {deal.status !== 'lost' && (
                <button
                  onClick={() => setShowLostDialog(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
                >
                  <XCircle className="w-4 h-4" />
                  Gagal (Lost)
                </button>
              )}
              <button
                onClick={() => setChatterTab('activity')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition"
              >
                <Clock className="w-4 h-4 text-indigo-600" />
                Jadwalkan Aktivitas
              </button>

              <button
                type="button"
                onClick={() => setShowQuoteModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-xs transition"
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                Penawaran Resmi (CPQ)
                {quotations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    {quotations.length}
                  </span>
                )}
              </button>

              {/* Priority Stars (Odoo 3-Star Rating) */}
              <div className="flex items-center gap-0.5 ml-3 pl-3 border-l border-slate-200">
                <span className="text-xs text-slate-500 mr-1.5 font-medium">Prioritas:</span>
                {[1, 2, 3].map((starVal) => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => handleSetPriority(deal.priority === starVal ? starVal - 1 : starVal)}
                    className="p-1 hover:scale-115 transition"
                    title={`Prioritas ${starVal} Bintang`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (deal.priority || 0) >= starVal
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 hover:text-amber-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {deal.status === 'won' && (
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 shadow-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> WON (MENANG)
                </span>
              )}
              {deal.status === 'lost' && (
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-300 shadow-xs flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> LOST ({deal.lost_reason || 'GAGAL'})
                </span>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/80 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Odoo Chevron Stage Progress Bar */}
          <div className="flex items-center overflow-x-auto no-scrollbar py-1 gap-1">
            {stages.map((stg, idx) => {
              const isCurrent = stg.id === deal.stage_id;
              const isWon = stg.is_won;
              const isLost = stg.is_lost;
              return (
                <button
                  key={stg.id}
                  onClick={() => handleStageClick(stg.id)}
                  className={`group relative flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap cursor-pointer ${
                    isCurrent
                      ? isWon
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isLost
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span>{stg.name}</span>
                  {stg.probability > 0 && (
                    <span
                      className={`ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        isCurrent ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {stg.probability}%
                    </span>
                  )}
                  {idx < stages.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover:text-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= BODY: 2-COLUMN VIEW (FORM KIRI, CHATTER KANAN) ================= */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          
          {/* KOLOM KIRI (7/12): DETAIL INFORMASI PELUANG & PROSPEK */}
          <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto">
            {/* Title & Value Summary */}
            <div className="space-y-3">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="flex-1 text-xl font-bold text-slate-900 border-b-2 border-indigo-600 focus:outline-hidden px-1"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-md"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      setTitleInput(deal.title);
                      setEditingTitle(false);
                    }}
                    className="px-2 py-1 text-xs text-slate-500"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  className="text-2xl font-bold text-slate-900 hover:text-indigo-600 cursor-pointer transition flex items-center gap-2 group"
                  title="Klik untuk mengubah judul"
                >
                  {deal.title}
                  <span className="opacity-0 group-hover:opacity-100 text-xs font-normal text-indigo-500">
                    (klik untuk edit)
                  </span>
                </h1>
              )}

              {/* Value & Prorated Calculation (Odoo Prorated Revenue) */}
              <div className="flex items-center flex-wrap gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-medium text-slate-500 block">Nilai Kesepakatan (Expected Revenue)</span>
                  {editingValue ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={valueInput}
                        onChange={(e) => setValueInput(Number(e.target.value))}
                        className="w-36 text-sm font-semibold border rounded px-2 py-1"
                      />
                      <button
                        onClick={handleSaveValue}
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => setEditingValue(true)}
                      className="text-xl font-bold text-slate-900 cursor-pointer hover:text-indigo-600 transition"
                      title="Klik untuk edit nominal"
                    >
                      {formatCurrencyIDR(deal.value)}
                    </span>
                  )}
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                <div>
                  <span className="text-xs font-medium text-slate-500 block">Probabilitas (%)</span>
                  {editingProbability ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={probabilityInput}
                        onChange={(e) => setProbabilityInput(Number(e.target.value))}
                        className="w-20 text-sm font-semibold border rounded px-2 py-1"
                      />
                      <button
                        onClick={handleSaveValue}
                        className="px-2 py-1 bg-indigo-600 text-white text-xs rounded"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <span
                      onClick={() => setEditingProbability(true)}
                      className="text-lg font-bold text-indigo-600 cursor-pointer hover:underline"
                    >
                      {deal.probability ?? deal.stage_probability ?? 0}%
                    </span>
                  )}
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                <div>
                  <span className="text-xs font-medium text-slate-500 block">Pendapatan Prorata (Prorated)</span>
                  <span className="text-base font-semibold text-emerald-700 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    {formatCurrencyIDR(proratedValue)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tags Badges */}
            {deal.tags && deal.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {deal.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Field Grid (Contact, Company, Close Date, Owner) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Kontak / Pelanggan</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {deal.contact_name || 'Belum dihubungkan'}
                  </span>
                  {deal.contact_email && (
                    <span className="text-xs text-slate-500 block">{deal.contact_email}</span>
                  )}
                  {deal.contact_phone && (
                    <span className="text-xs text-slate-500 block">{deal.contact_phone}</span>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Perusahaan / Organisasi</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {deal.company_name || 'Tidak terafiliasi perusahaan'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-slate-400 block mb-1">Sales Penanggung Jawab (Pre-Sales)</span>
                  <select
                    value={deal.owner_id || ''}
                    disabled={updatingOwner}
                    onChange={(e) => handleAssignOwner(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#00AFC4] focus:border-[#00AFC4] outline-hidden cursor-pointer w-full max-w-[240px]"
                    title="Tugaskan atau ubah penanggung jawab kesepakatan ini (Hanya staf Pre-Sales)"
                  >
                    <option value="">Belum Ditugaskan (Unassigned)</option>
                    {members
                      .filter((m) => {
                        // Keep currently assigned owner visible in case already assigned
                        if (deal.owner_id === m.user_id) return true;
                        // Exclude After-Sales (CS / support) members
                        if (m.department === 'support' && m.role !== 'owner' && m.role !== 'admin') {
                          return false;
                        }
                        return true;
                      })
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.full_name || m.email} (Pre-Sales • {m.role})
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-slate-400 block mt-1">Khusus staf departemen Pre-Sales / Sales</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-400 block">Estimasi Tutup (Close Date)</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {deal.expected_close_date ? formatDateIndo(deal.expected_close_date) : 'Belum ditentukan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="border-t border-slate-200 pt-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Catatan Kebutuhan Pelanggan
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[70px]">
                {deal.notes ? deal.notes : <span className="text-slate-400 italic">Belum ada catatan khusus.</span>}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN (5/12): THE CHATTER (ODOO SIGNATURE ENGINE) */}
          <div className="lg:col-span-5 bg-slate-50/50 flex flex-col h-full border-l border-slate-200">
            {/* Chatter Header Tabs */}
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChatterTab('note')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    chatterTab === 'note'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Catatan Internal
                </button>
                <button
                  type="button"
                  onClick={() => setChatterTab('activity')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                    chatterTab === 'activity'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Jadwalkan Aktivitas
                </button>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Chatter
              </span>
            </div>

            {/* Chatter Interactive Input Form */}
            <div className="p-4 bg-white border-b border-slate-200">
              {chatterTab === 'note' ? (
                <form onSubmit={handleSubmitNote} className="space-y-2.5">
                  <textarea
                    rows={3}
                    placeholder="Tulis catatan internal untuk tim (misal: 'Klien minta diskon 10%...')"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingNote || !noteText.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingNote ? 'Menyimpan...' : 'Simpan Catatan'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleScheduleActivity} className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Tipe Aktivitas</label>
                      <select
                        value={activityType}
                        onChange={(e) => setActivityType(e.target.value as any)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white mt-0.5"
                      >
                        <option value="call">📞 Telepon (Call)</option>
                        <option value="meeting">👥 Rapat / Demo</option>
                        <option value="email">✉️ Kirim Email</option>
                        <option value="whatsapp">💬 WhatsApp Chat</option>
                        <option value="note">📋 Tindak Lanjut Lain</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 uppercase">Jatuh Tempo</label>
                      <input
                        type="date"
                        value={activityDueDate}
                        onChange={(e) => setActivityDueDate(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white mt-0.5"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Ringkasan Aktivitas</label>
                    <input
                      type="text"
                      placeholder="Contoh: Telepon follow-up proposal harga"
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 mt-0.5"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={activityPriority}
                      onChange={(e) => setActivityPriority(e.target.value as any)}
                      className="text-xs p-1.5 rounded border border-slate-200 text-slate-600"
                    >
                      <option value="low">Prioritas Rendah</option>
                      <option value="medium">Prioritas Normal</option>
                      <option value="high">Prioritas Tinggi</option>
                      <option value="urgent">Mendesak</option>
                    </select>

                    <button
                      type="submit"
                      disabled={submittingActivity || !activityTitle.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {submittingActivity ? 'Menjadwalkan...' : 'Jadwalkan'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Planned Activities Queue (Tugas Deal Yang Belum Selesai) */}
            {dealTasks.filter((t) => t.status !== 'completed').length > 0 && (
              <div className="p-4 bg-amber-50/60 border-b border-amber-200">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Aktivitas Menunggu Tindak Lanjut ({dealTasks.filter((t) => t.status !== 'completed').length})
                </span>
                <div className="space-y-2">
                  {dealTasks
                    .filter((t) => t.status !== 'completed')
                    .map((task) => (
                      <div
                        key={task.id}
                        className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-2xs flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-800 truncate">{task.title}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {task.due_date ? formatDateIndo(task.due_date) : 'Hari ini'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 text-[11px] font-semibold transition flex items-center gap-1 whitespace-nowrap"
                          title="Tandai Selesai"
                        >
                          <Check className="w-3 h-3" />
                          Selesai
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Activity Stream & History Timeline */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Riwayat Interaksi & Audit Trail
              </span>

              {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  Belum ada aktivitas tercatat untuk peluang ini.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      {act.user_name ? act.user_name.charAt(0) : 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-slate-900 truncate">{act.user_name || 'Pengguna'}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {formatDateIndo(act.created_at)}
                        </span>
                      </div>
                      <p className="font-medium text-slate-700 mt-0.5">{act.subject}</p>
                      {act.description && (
                        <p className="text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                          {act.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PILIHAN ALASAN LOST (ODOO LOST REASONS) */}
      {showLostDialog && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Tandai Kesepakatan Gagal (Lost)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Pilih alasan utama mengapa peluang bisnis ini tidak berhasil dimenangkan untuk keperluan analitik.
            </p>

            <div className="mt-4 space-y-2">
              {[
                'Harga melebihi anggaran klien (Too expensive)',
                'Klien memilih kompetitor lain (Competitor won)',
                'Fitur produk belum sesuai kebutuhan klien',
                'Klien tidak merespons follow-up (Unresponsive)',
                'Proyek klien ditunda / dibatalkan internal',
                'Lainnya',
              ].map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                >
                  <input
                    type="radio"
                    name="lost_reason"
                    checked={lostReasonChoice === reason}
                    onChange={() => setLostReasonChoice(reason)}
                    className="text-indigo-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {lostReasonChoice === 'Lainnya' && (
                <input
                  type="text"
                  placeholder="Ketik alasan spesifik..."
                  value={customLostReason}
                  onChange={(e) => setCustomLostReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 mt-2"
                  autoFocus
                />
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLostDialog(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLost}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Simpan Sebagai Lost
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: CPQ Quotation Generator (Pilar 3) */}
      {showQuoteModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#142740]">Generator Penawaran Resmi (CPQ Quotation)</h3>
                  <p className="text-xs text-slate-500">
                    Klien: <strong className="text-slate-700">{deal?.contact_name || 'Klien'}</strong> {deal?.company_name ? `(${deal.company_name})` : ''} • WA: {deal?.contact_phone || 'Belum ada'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Existing Quotations List */}
              {quotations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 flex items-center justify-between">
                    <span>Daftar Penawaran Deal Ini ({quotations.length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2">No. Penawaran</th>
                          <th className="px-3.5 py-2">Judul</th>
                          <th className="px-3.5 py-2">Total Akhir</th>
                          <th className="px-3.5 py-2">Status</th>
                          <th className="px-3.5 py-2 text-right">Aksi Cepat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {quotations.map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/50">
                            <td className="px-3.5 py-2 font-mono font-bold text-[#00AFC4]">{q.quote_number}</td>
                            <td className="px-3.5 py-2 text-slate-700 font-medium">{q.title}</td>
                            <td className="px-3.5 py-2 font-bold text-slate-900">{formatCurrencyIDR(q.grand_total)}</td>
                            <td className="px-3.5 py-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                q.status === 'sent'
                                  ? 'bg-blue-100 text-blue-700'
                                  : q.status === 'accepted'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {q.status}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-right">
                              <button
                                type="button"
                                disabled={sendingQuoteWA === q.id}
                                onClick={() => handleSendQuoteWhatsApp(q.id)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                {sendingQuoteWA === q.id ? (
                                  <>
                                    <RefreshCw className="w-3 h-3 animate-spin" /> Mengirim...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-3 h-3" /> Kirim ke WA
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Form Create New Quotation */}
              <form onSubmit={handleCreateQuotation} className="space-y-4 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-sm text-[#142740]">Buat Penawaran Resmi Baru</h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Penawaran Resmi</label>
                  <input
                    type="text"
                    required
                    value={quoteTitle}
                    onChange={(e) => setQuoteTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">Rincian Item Produk / Layanan</label>
                    <button
                      type="button"
                      onClick={handleAddQuoteItem}
                      className="text-xs text-[#00AFC4] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {quoteItems.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <input
                            type="text"
                            required
                            placeholder="Nama Item / Layanan"
                            value={item.item_name}
                            onChange={(e) => {
                              const next = [...quoteItems];
                              next[idx].item_name = e.target.value;
                              setQuoteItems(next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => {
                              const next = [...quoteItems];
                              next[idx].quantity = parseFloat(e.target.value) || 1;
                              setQuoteItems(next);
                            }}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div className="col-span-4">
                          <input
                            type="number"
                            min="0"
                            required
                            placeholder="Harga Satuan (Rp)"
                            value={item.unit_price}
                            onChange={(e) => {
                              const next = [...quoteItems];
                              next[idx].unit_price = parseFloat(e.target.value) || 0;
                              setQuoteItems(next);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div className="col-span-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveQuoteItem(idx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Calculation Summary */}
                {(() => {
                  const subtotal = quoteItems.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);
                  const discountAmount = subtotal * (quoteDiscount / 100);
                  const afterDiscount = subtotal - discountAmount;
                  const taxAmount = afterDiscount * (quoteTax / 100);
                  const grandTotal = afterDiscount + taxAmount;

                  return (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">Diskon (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={quoteDiscount}
                            onChange={(e) => setQuoteDiscount(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">PPN (%)</label>
                          <input
                            type="number"
                            min="0"
                            value={quoteTax}
                            onChange={(e) => setQuoteTax(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-200 text-xs space-y-1 text-slate-600">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-semibold">{formatCurrencyIDR(subtotal)}</span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Diskon ({quoteDiscount}%):</span>
                            <span>-{formatCurrencyIDR(discountAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>PPN ({quoteTax}%):</span>
                          <span>{formatCurrencyIDR(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-emerald-200">
                          <span>Total Akhir (Grand Total):</span>
                          <span className="text-emerald-700">{formatCurrencyIDR(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan & Syarat Penawaran</label>
                  <textarea
                    rows={2}
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={creatingQuote}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creatingQuote ? 'Menyimpan...' : 'Simpan & Siapkan Penawaran'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
