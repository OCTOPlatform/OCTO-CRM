'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Task } from '@/types';
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  ArrowRight,
  Filter,
} from 'lucide-react';

export default function TodayTasksPage() {
  const { currentWorkspace } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'overdue' | 'today' | 'upcoming' | 'completed'>('today');
  const [loading, setLoading] = useState(true);

  // New task modal
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().slice(0, 16));

  const loadTasks = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = await api.listTasks(currentWorkspace.id);
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [currentWorkspace]);

  const handleToggle = async (taskId: string) => {
    if (!currentWorkspace) return;
    try {
      await api.toggleCompleteTask(currentWorkspace.id, taskId);
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newTitle) return;
    try {
      await api.createTask(currentWorkspace.id, {
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        due_date: new Date(newDueDate).toISOString(),
      });
      setShowModal(false);
      setNewTitle('');
      setNewDesc('');
      loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter tasks based on tabs
  const now = new Date();
  const isToday = (dStr?: string) => {
    if (!dStr) return false;
    const d = new Date(dStr);
    return d.toDateString() === now.toDateString();
  };

  const overdueTasks = tasks.filter((t) => t.is_overdue && t.status !== 'completed');
  const todayTasks = tasks.filter((t) => isToday(t.due_date) && !t.is_overdue && t.status !== 'completed');
  const upcomingTasks = tasks.filter((t) => t.status !== 'completed' && !t.is_overdue && !isToday(t.due_date));
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const displayedTasks =
    activeTab === 'overdue'
      ? overdueTasks
      : activeTab === 'today'
      ? todayTasks
      : activeTab === 'upcoming'
      ? upcomingTasks
      : completedTasks;

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Today / Tindak Lanjut Harian"
        subtitle="Fokus pada tindakan penjualan penting hari ini"
        onQuickAddTask={() => setShowModal(true)}
      />

      <div className="p-6 md:p-8 space-y-6 max-w-5xl">
        {/* Overdue alert banner if overdue tasks exist */}
        {overdueTasks.length > 0 && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <span className="font-bold text-sm">
                  {overdueTasks.length} Tugas Menunggu Tindakan (Overdue)
                </span>
                <p className="text-xs text-red-700">
                  Segera hubungi prospek untuk menjaga konversi penjualan.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('overdue')}
              className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition shrink-0"
            >
              Tinjau Overdue
            </button>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'today'
                  ? 'bg-[#142740] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#00AFC4]" />
              <span>Hari Ini ({todayTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'overdue'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span>Terlambat / Overdue ({overdueTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'upcoming'
                  ? 'bg-[#142740] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Mendatang ({upcomingTasks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-[#142740] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Selesai ({completedTasks.length})</span>
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tugas</span>
          </button>
        </div>

        {/* Task Cards List */}
        {displayedTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-90" />
            <h3 className="font-bold text-sm text-[#142740]">Tidak Ada Tugas di Kategori Ini</h3>
            <p className="text-xs text-[#586779] mt-1 max-w-sm mx-auto">
              Semua agenda tindak lanjut telah diselesaikan dengan baik atau belum ada tugas baru.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-xs flex items-start justify-between gap-4 transition"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggle(task.id)}
                    className="mt-1 w-4 h-4 rounded text-[#00AFC4] focus:ring-[#00AFC4] cursor-pointer"
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-bold ${
                        task.status === 'completed'
                          ? 'line-through text-slate-400'
                          : 'text-[#142740]'
                      }`}
                    >
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-xs text-[#586779] mt-0.5 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#586779]">
                      {task.contact_name && (
                        <Link
                          href={`/contacts/${task.contact_id}`}
                          className="font-medium text-[#00AFC4] hover:underline"
                        >
                          👤 {task.contact_name}
                        </Link>
                      )}
                      {task.deal_title && (
                        <span className="font-medium text-slate-700">
                          💼 {task.deal_title}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span className="text-slate-500">
                          PIC: {task.assigned_to_name}
                        </span>
                      )}
                      <span className="text-slate-400">
                        Jatuh Tempo: {formatDateIndo(task.due_date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      task.priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-[#142740] mb-4">Buat Tugas / Pengingat Baru</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Tugas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Follow up proposal sistem POS"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan / Deskripsi
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Instruksi tindak lanjut atau catatan khusus..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e: any) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="low">Rendah (Low)</option>
                    <option value="medium">Menengah (Medium)</option>
                    <option value="high">Tinggi (High)</option>
                    <option value="urgent">Mendesak (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tenggat Waktu
                  </label>
                  <input
                    type="datetime-local"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white transition shadow-xs"
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
