'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, formatDateIndo, formatDateTimeIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Task, Contact, Deal } from '@/types';
import {
  ListTodo,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Calendar,
  User,
} from 'lucide-react';

export default function TasksPage() {
  const { currentWorkspace } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [search, setSearch] = useState('');

  // Add Task Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [contactId, setContactId] = useState('');
  const [dealId, setDealId] = useState('');

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [taskList, contactList, dealList] = await Promise.all([
        api.listTasks(currentWorkspace.id, {
          status: statusFilter,
          priority: priorityFilter,
          due_filter: dueFilter,
        }),
        api.listContacts(currentWorkspace.id),
        api.listDeals(currentWorkspace.id),
      ]);
      setTasks(taskList);
      setContacts(contactList);
      setDeals(dealList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace, statusFilter, priorityFilter, dueFilter]);

  const handleToggle = async (taskId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.toggleCompleteTask(currentWorkspace.id, taskId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!currentWorkspace) return;
    if (!confirm('Hapus tugas ini?')) return;
    try {
      await api.deleteTask(currentWorkspace.id, taskId);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !title) return;

    try {
      await api.createTask(currentWorkspace.id, {
        title,
        description,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        contact_id: contactId || undefined,
        deal_id: dealId || undefined,
      });

      setShowAddModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setContactId('');
      setDealId('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan tugas');
    }
  };

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Daftar Semua Tugas"
        subtitle="Manajemen aktivitas harian, pengingat prospek, dan follow-up tim"
        onQuickAddTask={() => setShowAddModal(true)}
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari tugas atau catatan..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="">Semua Status</option>
              <option value="open">Terbuka (Open)</option>
              <option value="in_progress">Berjalan (In Progress)</option>
              <option value="completed">Selesai (Completed)</option>
            </select>

            {/* Due Filter */}
            <select
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="">Semua Tenggat</option>
              <option value="overdue">Terlambat (Overdue)</option>
              <option value="today">Jatuh Tempo Hari Ini</option>
              <option value="upcoming">Mendatang</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700"
            >
              <option value="">Semua Prioritas</option>
              <option value="urgent">Mendesak (Urgent)</option>
              <option value="high">Tinggi (High)</option>
              <option value="medium">Menengah (Medium)</option>
              <option value="low">Rendah (Low)</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tugas</span>
          </button>
        </div>

        {/* Task Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">Status</th>
                  <th className="px-4 py-3.5">Judul Tugas</th>
                  <th className="px-4 py-3.5">Terkait</th>
                  <th className="px-4 py-3.5">PIC</th>
                  <th className="px-4 py-3.5">Jatuh Tempo</th>
                  <th className="px-4 py-3.5">Prioritas</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <ListTodo className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Tidak ada tugas yang sesuai.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={t.status === 'completed'}
                          onChange={() => handleToggle(t.id)}
                          className="w-4 h-4 rounded text-[#00AFC4] focus:ring-[#00AFC4] cursor-pointer"
                        />
                      </td>

                      <td className="px-4 py-3.5">
                        <div
                          className={`font-semibold ${
                            t.status === 'completed'
                              ? 'line-through text-slate-400'
                              : 'text-[#142740]'
                          }`}
                        >
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-[#586779] line-clamp-1 mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {t.contact_name && (
                          <Link
                            href={`/contacts/${t.contact_id}`}
                            className="font-medium text-[#00AFC4] hover:underline block"
                          >
                            👤 {t.contact_name}
                          </Link>
                        )}
                        {t.deal_title && (
                          <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                            💼 {t.deal_title}
                          </span>
                        )}
                        {!t.contact_name && !t.deal_title && <span className="text-slate-400">-</span>}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-slate-700 font-medium">
                          {t.assigned_to_name || 'Unassigned'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              t.is_overdue && t.status !== 'completed'
                                ? 'text-red-600 font-bold'
                                : 'text-slate-600'
                            }
                          >
                            {formatDateIndo(t.due_date)}
                          </span>
                          {t.is_overdue && t.status !== 'completed' && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-red-100 text-red-700">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            t.priority === 'urgent'
                              ? 'bg-red-100 text-red-700'
                              : t.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 transition"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Add Task */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-[#142740] mb-4">Buat Tugas Baru</h3>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Kirim revisi invoice"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail instruksi..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prioritas</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="low">Rendah</option>
                    <option value="medium">Menengah</option>
                    <option value="high">Tinggi</option>
                    <option value="urgent">Mendesak</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tenggat Waktu</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Terkait Kontak</label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="">Pilih Kontak (Opsional)</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Terkait Deal</label>
                  <select
                    value={dealId}
                    onChange={(e) => setDealId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="">Pilih Deal (Opsional)</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white shadow-xs"
                >
                  Simpan Tugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
