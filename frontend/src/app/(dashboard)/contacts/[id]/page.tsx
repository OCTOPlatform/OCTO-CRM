'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth, formatDateIndo, formatDateTimeIndo, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Contact, Activity, Deal, Task } from '@/types';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  Tag,
  Calendar,
  MessageSquare,
  FileText,
  PhoneCall,
  Award,
  Plus,
  Clock,
  CheckCircle2,
  Send,
  Trash2,
} from 'lucide-react';

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;
  const { currentWorkspace, user } = useAuth();

  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'timeline' | 'deals' | 'tasks'>('timeline');
  const [loading, setLoading] = useState(true);

  // New activity form state
  const [activityType, setActivityType] = useState<'call' | 'meeting' | 'whatsapp' | 'note'>('call');
  const [activitySubject, setActivitySubject] = useState('');
  const [activityDesc, setActivityDesc] = useState('');
  const [submittingAct, setSubmittingAct] = useState(false);

  const loadContactDetails = async () => {
    if (!currentWorkspace || !contactId) return;
    try {
      setLoading(true);
      const [cData, aData, dData, tData] = await Promise.all([
        api.getContact(currentWorkspace.id, contactId),
        api.listContactActivities(currentWorkspace.id, contactId),
        api.listDeals(currentWorkspace.id, { contact_id: contactId }),
        api.listTasks(currentWorkspace.id, { contact_id: contactId }),
      ]);
      setContact(cData);
      setActivities(aData);
      setDeals(dData);
      setTasks(tData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactDetails();
  }, [currentWorkspace, contactId]);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !activitySubject) return;

    try {
      setSubmittingAct(true);
      await api.createActivity(currentWorkspace.id, {
        contact_id: contactId,
        type: activityType,
        subject: activitySubject,
        description: activityDesc,
      });

      setActivitySubject('');
      setActivityDesc('');
      loadContactDetails();
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan aktivitas');
    } finally {
      setSubmittingAct(false);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.toggleCompleteTask(currentWorkspace.id, taskId);
      loadContactDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteContact = async () => {
    if (!currentWorkspace || !contact) return;
    if (!confirm(`Hapus kontak ${contact.full_name}?`)) return;
    try {
      await api.deleteContact(currentWorkspace.id, contact.id);
      router.push('/contacts');
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus kontak');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <Navbar title="Detail Kontak" />
        <div className="p-8 flex items-center justify-center flex-1">
          <div className="w-8 h-8 border-3 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center text-slate-500">
        Kontak tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Navbar title={contact.full_name} subtitle={`Profil Kontak & Histori Hubungan`} />

      <div className="p-6 md:p-8 space-y-6 max-w-6xl">
        {/* Back Link */}
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#586779] hover:text-[#00AFC4] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Semua Kontak</span>
        </Link>

        {/* Header Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#142740] text-[#00AFC4] font-black text-xl flex items-center justify-center shrink-0 shadow-md">
              {contact.first_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-[#142740]">{contact.full_name}</h2>
                <span className="px-2 py-0.5 rounded-full bg-[#E8F8FA] text-[#00AFC4] font-semibold text-[10px]">
                  {contact.lead_source}
                </span>
              </div>
              <div className="text-xs text-[#586779] mt-0.5 flex flex-wrap items-center gap-2">
                <span>{contact.job_title || 'No Job Title'}</span>
                {contact.company_name && (
                  <>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{contact.company_name}</span>
                  </>
                )}
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {contact.tags && contact.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Details & Delete */}
          <div className="flex flex-col sm:items-end gap-2 text-xs">
            {contact.phone && (
              <a
                href={`https://wa.me/${contact.normalized_phone || contact.phone}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold flex items-center gap-1.5 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{contact.phone} (WhatsApp)</span>
              </a>
            )}
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold flex items-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{contact.email}</span>
              </a>
            )}
            <button
              onClick={handleDeleteContact}
              className="mt-1 text-slate-400 hover:text-red-500 text-[11px] font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Hapus Kontak</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="border-b border-slate-200 flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-[#00AFC4] text-[#00AFC4]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline Aktivitas ({activities.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('deals')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'deals'
                ? 'border-[#00AFC4] text-[#00AFC4]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Peluang Penjualan / Deals ({deals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'tasks'
                ? 'border-[#00AFC4] text-[#00AFC4]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Tugas & Reminder ({tasks.length})</span>
          </button>
        </div>

        {/* Tab 1: Timeline & Log Activity Form */}
        {activeTab === 'timeline' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Log Form */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs h-fit space-y-4">
              <h3 className="font-bold text-sm text-[#142740] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#00AFC4]" />
                <span>Catat Interaksi Baru</span>
              </h3>

              <form onSubmit={handleCreateActivity} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Jenis Interaksi
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { type: 'call', label: 'Telepon', icon: PhoneCall },
                      { type: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                      { type: 'meeting', label: 'Meeting', icon: Calendar },
                      { type: 'note', label: 'Catatan', icon: FileText },
                    ].map((btn) => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.type}
                          type="button"
                          onClick={() => setActivityType(btn.type as any)}
                          className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                            activityType === btn.type
                              ? 'bg-[#142740] text-white border-[#142740]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Subjek / Judul Ringkas
                  </label>
                  <input
                    type="text"
                    required
                    value={activitySubject}
                    onChange={(e) => setActivitySubject(e.target.value)}
                    placeholder="Contoh: Telepon penawaran diskon kuantiti"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rincian Hasil Interaksi
                  </label>
                  <textarea
                    rows={3}
                    value={activityDesc}
                    onChange={(e) => setActivityDesc(e.target.value)}
                    placeholder="Apa hasil pembicaraan dan langkah berikutnya..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingAct}
                  className="w-full py-2.5 rounded-xl bg-[#00AFC4] hover:bg-[#0096a8] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Simpan ke Timeline</span>
                </button>
              </form>
            </div>

            {/* Timeline Stream */}
            <div className="lg:col-span-2 space-y-4">
              {activities.length === 0 ? (
                <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
                  Belum ada interaksi yang dicatat untuk kontak ini.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      {/* Node point */}
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white border-2 border-[#00AFC4] flex items-center justify-center text-[#00AFC4]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00AFC4]"></span>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-[#142740]">{act.subject}</span>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTimeIndo(act.created_at)}
                          </span>
                        </div>
                        {act.description && (
                          <p className="text-xs text-[#586779] whitespace-pre-wrap mt-1">
                            {act.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                          <span className="uppercase font-bold text-[#00AFC4]">{act.type}</span>
                          {act.user_name && <span>• Dicatat oleh {act.user_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Deals */}
        {activeTab === 'deals' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-[#142740]">Daftar Peluang Penjualan Terkait</h3>
              <Link
                href="/pipeline"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#00AFC4] text-white hover:bg-[#0096a8] shadow-xs"
              >
                + Buka Pipeline Kanban
              </Link>
            </div>

            {deals.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
                Belum ada deals untuk kontak ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-sm text-[#142740]">{deal.title}</span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          deal.status === 'won'
                            ? 'bg-emerald-100 text-emerald-700'
                            : deal.status === 'lost'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-[#E8F8FA] text-[#00AFC4]'
                        }`}
                      >
                        {deal.status}
                      </span>
                    </div>

                    <div className="text-base font-extrabold text-[#142740]">
                      {formatCurrencyIDR(deal.value)}
                    </div>

                    <div className="text-xs text-slate-500 flex justify-between pt-2 border-t border-slate-100">
                      <span>Tahap: {deal.stage_name}</span>
                      <span>Target: {formatDateIndo(deal.expected_close_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200/80 text-center text-xs text-slate-400">
                Tidak ada tugas untuk kontak ini.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={() => handleToggleTask(task.id)}
                        className="w-4 h-4 rounded text-[#00AFC4] cursor-pointer"
                      />
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            task.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-800'
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Jatuh tempo: {formatDateIndo(task.due_date)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                        task.priority === 'urgent'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
