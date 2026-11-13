'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { AutomationWorkflow, AutomationLog } from '@/types';
import {
  Zap,
  MessageSquare,
  Clock,
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
  Kanban,
  Receipt,
  Activity,
  Send,
  Power,
  RotateCcw,
} from 'lucide-react';

export default function AutomationsPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflows' | 'logs'>('workflows');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [selectedWf, setSelectedWf] = useState<AutomationWorkflow | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerType, setFormTriggerType] = useState('lead_inactive_24h');
  const [formActionType, setFormActionType] = useState('send_whatsapp');
  const [formMessageTemplate, setFormMessageTemplate] = useState(
    'Halo {{name}}, apakah ada informasi paket produk yang bisa kami bantu jelaskan lebih lanjut?'
  );
  const [formTargetStage, setFormTargetStage] = useState('won');
  const [submitting, setSubmitting] = useState(false);

  // Test Runner State
  const [testTargetName, setTestTargetName] = useState('Pak Surya (PT Mega Solusindo)');
  const [testTargetType, setTestTargetType] = useState('lead');
  const [testing, setTesting] = useState(false);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [wfData, logData] = await Promise.all([
        api.listDripWorkflows(currentWorkspace.id),
        api.listDripLogs(currentWorkspace.id, 50),
      ]);
      setWorkflows(wfData);
      setLogs(logData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace]);

  const handleToggleActive = async (wf: AutomationWorkflow) => {
    if (!currentWorkspace) return;
    try {
      await api.updateDripWorkflow(currentWorkspace.id, wf.id, {
        name: wf.name,
        description: wf.description,
        trigger_type: wf.trigger_type,
        trigger_config: wf.trigger_config,
        action_type: wf.action_type,
        action_config: wf.action_config,
        is_active: !wf.is_active,
      });
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal mengubah status workflow');
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentWorkspace || !confirm('Yakin ingin menghapus workflow otomasi ini?')) return;
    try {
      await api.deleteDripWorkflow(currentWorkspace.id, id);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus workflow');
    }
  };

  const handleInsertVariable = (v: string) => {
    setFormMessageTemplate((prev) => `${prev} ${v}`);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      setSubmitting(true);
      const actionConfig: Record<string, any> = {};
      if (formActionType === 'send_whatsapp') {
        actionConfig.template = formMessageTemplate;
      } else if (formActionType === 'change_deal_stage') {
        actionConfig.target_stage = formTargetStage;
      }

      await api.createDripWorkflow(currentWorkspace.id, {
        name: formName,
        description: formDescription,
        trigger_type: formTriggerType,
        trigger_config: { hours: 24 },
        action_type: formActionType,
        action_config: actionConfig,
        is_active: true,
      });

      setShowCreateModal(false);
      setFormName('');
      setFormDescription('');
      loadData();
      alert('✅ Workflow follow-up otomatis berhasil dibuat!');
    } catch (e: any) {
      alert(e.message || 'Gagal membuat workflow');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunTest = async () => {
    if (!currentWorkspace || !selectedWf) return;
    try {
      setTesting(true);
      await api.triggerDripWorkflow(currentWorkspace.id, selectedWf.id, {
        target_type: testTargetType,
        target_name: testTargetName,
        target_id: 'test-lead-99',
      });
      setShowTestModal(false);
      await loadData();
      setActiveTab('logs');
      alert(`🚀 Uji coba otomasi untuk ${testTargetName} berhasil dieksekusi!`);
    } catch (e: any) {
      alert(e.message || 'Gagal mengeksekusi uji coba');
    } finally {
      setTesting(false);
    }
  };

  // KPI Calculations
  const activeCount = workflows.filter((w) => w.is_active).length;
  const totalExecutions = workflows.reduce((acc, w) => acc + w.execution_count, 0);

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Otomasi Follow-Up & Drip WhatsApp"
        subtitle="Penjadwalan pesan sapaan otomatis, nurturing prospek dingin, dan trigger perubahan status pipeline"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-[#00AFC4] flex items-center justify-center font-bold">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Alur Kerja Aktif (Running)
              </span>
              <div className="text-xl font-black text-[#142740]">{activeCount} Workflow</div>
              <p className="text-[10px] text-slate-400">Siap mengeksekusi trigger</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Aksi Dijalankan
              </span>
              <div className="text-xl font-black text-emerald-600">{totalExecutions} Eksekusi</div>
              <p className="text-[10px] text-emerald-600 font-semibold">Terkirim via WhatsApp Gateway</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Tingkat Respon Prospek
              </span>
              <div className="text-xl font-black text-purple-700">68.4%</div>
              <p className="text-[10px] text-slate-400">Prospek membalas pesan sapaan</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Closing dari Follow-up
              </span>
              <div className="text-xl font-black text-amber-600">12 Deals Won</div>
              <p className="text-[10px] text-slate-400">Terselamatkan otomatis</p>
            </div>
          </div>
        </div>

        {/* Tab Selector & Add Button */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('workflows')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'workflows'
                  ? 'bg-[#00AFC4] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Katalog Alur Kerja ({workflows.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-[#00AFC4] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Riwayat Eksekusi (Audit Logs)</span>
            </button>
          </div>

          {activeTab === 'workflows' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#142740] hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Workflow Baru</span>
            </button>
          )}
        </div>

        {/* ================= TAB 1: WORKFLOW CARDS ================= */}
        {activeTab === 'workflows' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        wf.trigger_type === 'lead_inactive_24h'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : wf.trigger_type === 'deal_stage_changed'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {wf.trigger_type === 'lead_inactive_24h'
                        ? '⏱️ Prospek Dingin 24 Jam'
                        : wf.trigger_type === 'deal_stage_changed'
                        ? '🎯 Deal Masuk Won'
                        : '🧾 Invoice Lunas (QRIS)'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(wf)}
                      className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                        wf.is_active
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                      title={wf.is_active ? 'Klik untuk non-aktifkan' : 'Klik untuk aktifkan'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{wf.is_active ? 'Aktif' : 'Mati'}</span>
                    </button>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-[#142740]">{wf.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{wf.description}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aksi Otomasi:</div>
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      {wf.action_type === 'send_whatsapp' ? (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kirim WhatsApp Otomatis</span>
                        </>
                      ) : (
                        <>
                          <Kanban className="w-3.5 h-3.5 text-purple-600" />
                          <span>Ubah Tahap Deal ke WON</span>
                        </>
                      )}
                    </div>
                    {wf.action_config?.template && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
                        &quot;{wf.action_config.template}&quot;
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-400">
                    Eksekusi: <strong className="text-slate-700">{wf.execution_count}x</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWf(wf);
                        setShowTestModal(true);
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-[#00AFC4] bg-cyan-50 hover:bg-cyan-100 rounded-lg transition cursor-pointer flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-[#00AFC4]" />
                      <span>Uji Coba</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(wf.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Hapus Workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================= TAB 2: AUDIT LOGS TABLE ================= */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Audit Trail Riwayat Eksekusi Otomasi Real-Time</span>
              <button
                type="button"
                onClick={loadData}
                className="text-xs font-bold text-[#00AFC4] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Segarkan Data</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-5">Nama Alur Kerja</th>
                    <th className="py-3 px-4">Target Prospek / Invoice</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Rincian Tindakan</th>
                    <th className="py-3 px-5 text-right">Waktu Eksekusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Belum ada riwayat eksekusi otomasi. Klik tombol <strong>Uji Coba</strong> pada salah satu alur kerja di tab Katalog.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-5 font-bold text-slate-800">{log.workflow_name}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{log.target_name || log.target_id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sukses
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-md truncate">{log.action_details}</td>
                        <td className="py-3 px-5 text-right font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: CREATE WORKFLOW ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00AFC4]" />
                  <span>Buat Alur Kerja Otomasi WhatsApp Baru</span>
                </h3>
                <p className="text-xs text-slate-400">Tentukan pemicu (trigger) dan aksi tindak lanjut otomatis</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Alur Kerja</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sapaan Ulang Lead Belum Beli 48 Jam"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Singkat</label>
                <input
                  type="text"
                  placeholder="Keterangan alur kerja follow-up..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pemicu (Trigger)</label>
                  <select
                    value={formTriggerType}
                    onChange={(e) => setFormTriggerType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="lead_inactive_24h">Prospek Tidak Membalas (24 Jam)</option>
                    <option value="deal_stage_changed">Tahap Deal Pindah ke Won</option>
                    <option value="invoice_paid">Invoice Terkonfirmasi Lunas</option>
                    <option value="scheduled_timer">Penjadwalan Berkala (Repeat Order)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aksi Eksekusi</label>
                  <select
                    value={formActionType}
                    onChange={(e) => setFormActionType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="send_whatsapp">Kirim Pesan WhatsApp Otomatis</option>
                    <option value="change_deal_stage">Ubah Status Deal ke Won</option>
                    <option value="create_task">Buat Tugas Follow-Up Sales</option>
                  </select>
                </div>
              </div>

              {formActionType === 'send_whatsapp' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700">Template Pesan WhatsApp</label>
                    <span className="text-[10px] text-slate-400">Variabel Dinamis:</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {['{{name}}', '{{phone}}', '{{company}}', '{{invoice_url}}'].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleInsertVariable(v)}
                        className="px-2 py-0.5 rounded bg-cyan-50 text-[#00AFC4] font-mono font-bold text-[10px] hover:bg-cyan-100 cursor-pointer"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    required
                    value={formMessageTemplate}
                    onChange={(e) => setFormMessageTemplate(e.target.value)}
                    placeholder="Tuliskan kalimat follow-up di sini..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-extrabold text-white bg-[#00AFC4] rounded-xl hover:bg-[#009bb0] cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Alur Kerja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TEST RUN WORKFLOW ================= */}
      {showTestModal && selectedWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#142740]">Uji Coba Eksekusi Otomasi</h3>
                <p className="text-xs text-slate-400">{selectedWf.name}</p>
              </div>
              <button onClick={() => setShowTestModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Target Uji Coba</label>
                <input
                  type="text"
                  value={testTargetName}
                  onChange={(e) => setTestTargetName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <strong>Aksi yang akan disimulasikan:</strong>
                <p className="text-[11px] text-emerald-800">
                  Sistem akan memanggil gateway WhatsApp (WAHA) dan mencatatkan log audit pengiriman pesan.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRunTest}
                disabled={testing}
                className="px-4 py-2 font-extrabold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 cursor-pointer shadow-xs disabled:opacity-50 text-xs flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{testing ? 'Mengeksekusi...' : 'Jalankan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
