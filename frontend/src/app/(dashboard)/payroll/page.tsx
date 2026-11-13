'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { PayrollComponent, PayrollSlip } from '@/types';
import {
  DollarSign,
  Plus,
  Play,
  Calculator,
  Calendar,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Code,
  Zap,
} from 'lucide-react';

export default function PayrollPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'slips' | 'formulas'>('slips');
  const [periodMonth, setPeriodMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selected slip detail modal
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);

  // Formula Builder Modal
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [editingComp, setEditingComp] = useState<PayrollComponent | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'allowance' | 'deduction' | 'commission' | 'tax'>('commission');
  const [formExpression, setFormExpression] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [savingFormula, setSavingFormula] = useState(false);

  // Live Simulator states
  const [simOmset, setSimOmset] = useState(50000000);
  const [simHadir, setSimHadir] = useState(22);
  const [simGajiPokok, setSimGajiPokok] = useState(5000000);
  const [simResult, setSimResult] = useState<number | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const isOwnerOrAdmin =
    activeRole === 'owner' ||
    activeRole === 'admin' ||
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.role === 'admin';

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [slipList, compList] = await Promise.all([
        api.listPayrollSlips(currentWorkspace.id, periodMonth),
        api.listPayrollComponents(currentWorkspace.id),
      ]);
      setSlips(slipList);
      setComponents(compList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace, periodMonth]);

  const handleGeneratePayroll = async () => {
    if (!currentWorkspace) return;
    try {
      setGenerating(true);
      const res = await api.generateMonthlyPayrollRun(currentWorkspace.id, periodMonth);
      setSlips(res);
      alert('✅ Berhasil mengeksekusi perhitungan payroll bulanan!');
    } catch (e: any) {
      alert(e.message || 'Gagal mengeksekusi payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenAddFormula = () => {
    setEditingComp(null);
    setFormName('');
    setFormCode('BONUS_' + Math.floor(Math.random() * 9000 + 1000));
    setFormType('commission');
    setFormExpression('TOTAL_OMSET_WON * 0.02');
    setFormDescription('');
    setShowFormulaModal(true);
    runLiveSimulation('TOTAL_OMSET_WON * 0.02');
  };

  const handleEditFormula = (c: PayrollComponent) => {
    setEditingComp(c);
    setFormName(c.name);
    setFormCode(c.code);
    setFormType(c.type);
    setFormExpression(c.formula_expression);
    setFormDescription(c.description);
    setShowFormulaModal(true);
    runLiveSimulation(c.formula_expression);
  };

  const runLiveSimulation = async (expr: string) => {
    if (!currentWorkspace || !expr.trim()) return;
    try {
      setSimError(null);
      const res = await api.simulateFormula(currentWorkspace.id, expr, {
        GAJI_POKOK: Number(simGajiPokok),
        HARI_HADIR: Number(simHadir),
        TOTAL_OMSET_WON: Number(simOmset),
        TOTAL_JAM_LEMBUR: 2,
        JUMLAH_TERLAMBAT: 1,
        JUMLAH_DEAL_WON: 4,
        HARI_ALPA: 0,
        GAJI_BRUTO: Number(simGajiPokok) + 1500000,
      });
      if (res.error) {
        setSimError(res.error);
        setSimResult(null);
      } else {
        setSimResult(res.evaluated_result);
      }
    } catch (e: any) {
      setSimError(e.message || 'Ekspresi tidak valid');
      setSimResult(null);
    }
  };

  const handleInsertVariable = (varName: string) => {
    const updated = formExpression ? `${formExpression} + ${varName}` : varName;
    setFormExpression(updated);
    runLiveSimulation(updated);
  };

  const handleSaveFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      setSavingFormula(true);
      if (editingComp) {
        await api.updatePayrollComponent(currentWorkspace.id, editingComp.id, {
          name: formName,
          type: formType,
          formula_expression: formExpression,
          description: formDescription,
        });
      } else {
        const componentCode =
          formCode ||
          formName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_') + '_' + Math.floor(Math.random() * 900 + 100);
        await api.createPayrollComponent(currentWorkspace.id, {
          name: formName,
          code: componentCode,
          type: formType,
          formula_expression: formExpression,
          description: formDescription,
        });
      }
      setShowFormulaModal(false);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan formula');
    } finally {
      setSavingFormula(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Penggajian, Komisi & Formula Builder"
        subtitle="Otomatisasi kalkulasi slip gaji, insentif omset CRM, dan formula payroll dinamis"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('slips')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'slips'
                ? 'bg-[#142740] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Slip Gaji & Komisi Bulanan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'formulas'
                ? 'bg-[#00AFC4] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Formula Builder & Kamus Rumus</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-[10px] rounded-full">Dinamis</span>
          </button>
        </div>

        {/* TAB 1: PAYROLL SLIPS */}
        {activeTab === 'slips' && (
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00AFC4]" />
                <span className="text-xs font-bold text-slate-700">Periode Bulan:</span>
                <input
                  type="month"
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
                />
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={handleGeneratePayroll}
                  disabled={generating}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{generating ? 'Mengkalkulasi...' : '⚡ Eksekusi Hitung Gaji Bulan Ini'}</span>
                </button>
              )}
            </div>

            {/* Slips Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                      <th className="py-3 px-5">Nama Karyawan</th>
                      <th className="py-3 px-4">Gaji Pokok</th>
                      <th className="py-3 px-4">Total Tunjangan</th>
                      <th className="py-3 px-4">Komisi Sales (Won)</th>
                      <th className="py-3 px-4">Potongan & Pajak</th>
                      <th className="py-3 px-4 font-black text-emerald-800">Gaji Bersih (THP)</th>
                      <th className="py-3 px-5 text-right">Rincian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-[#00AFC4] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          Memuat data slip gaji...
                        </td>
                      </tr>
                    ) : slips.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Belum ada slip gaji terhitung untuk periode ini. Klik tombol <strong>Eksekusi Hitung Gaji</strong> di atas.
                        </td>
                      </tr>
                    ) : (
                      slips.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-5">
                            <strong className="text-slate-800">{s.user_name || 'Staff Member'}</strong>
                            <div className="text-[10px] text-slate-400">{s.user_email}</div>
                          </td>

                          <td className="py-3 px-4 text-slate-600">{formatCurrencyIDR(s.base_salary)}</td>
                          <td className="py-3 px-4 text-slate-600">{formatCurrencyIDR(s.total_allowances)}</td>

                          <td className="py-3 px-4">
                            <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              +{formatCurrencyIDR(s.total_commissions)}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-rose-700">-{formatCurrencyIDR(s.total_deductions)}</td>

                          <td className="py-3 px-4">
                            <span className="text-sm font-black text-[#142740] bg-slate-100 px-2.5 py-1 rounded-lg">
                              {formatCurrencyIDR(s.net_salary)}
                            </span>
                          </td>

                          <td className="py-3 px-5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedSlip(s)}
                              className="px-3 py-1 bg-[#142740] hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                            >
                              Lihat Slip
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
        )}

        {/* TAB 2: DYNAMIC FORMULA BUILDER */}
        {activeTab === 'formulas' && (
          <div className="space-y-6">
            {/* Header Description */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#00AFC4]" />
                  <span>Kamus Formula Gaji, Komisi & Pajak Dinamis</span>
                </h3>
                <p className="text-xs text-[#586779]">
                  Atur rumus komponen tanpa perlu coding. Data diambil otomatis dari deals pipeline penjualan dan presensi absensi.
                </p>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAddFormula}
                  className="px-4 py-2 bg-[#00AFC4] hover:bg-[#009bb0] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Komponen Rumus</span>
                </button>
              )}
            </div>

            {/* Components Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {components.map((c) => (
                <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          c.type === 'commission'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : c.type === 'allowance'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : c.type === 'deduction'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {c.type}
                      </span>
                      <h4 className="font-bold text-sm text-[#142740]">{c.name}</h4>
                    </div>

                    {isOwnerOrAdmin && (
                      <button
                        type="button"
                        onClick={() => handleEditFormula(c)}
                        className="text-xs font-bold text-[#00AFC4] hover:underline cursor-pointer"
                      >
                        Ubah Rumus
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rumus Ekspresi:</span>
                    <div className="font-mono text-xs font-bold text-[#142740] break-all">{c.formula_expression}</div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">{c.description || 'Komponen aktif di perhitungan payroll'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: SLIP DETAIL BREAKDOWN ================= */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#142740]">Slip Gaji Bulanan</h3>
                <p className="text-xs text-slate-400">
                  {selectedSlip.user_name} ({selectedSlip.period_month})
                </p>
              </div>
              <button onClick={() => setSelectedSlip(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Used */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500">Hari Presensi Hadir:</span>{' '}
                <strong>{selectedSlip.calculation_breakdown?.metrics?.hari_hadir || 0} Hari</strong>
              </div>
              <div>
                <span className="text-slate-500">Omset Deals CRM:</span>{' '}
                <strong className="text-emerald-700">
                  {formatCurrencyIDR(selectedSlip.calculation_breakdown?.metrics?.omset_sales_won || 0)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Jam Lembur:</span>{' '}
                <strong>{(selectedSlip.calculation_breakdown?.metrics?.jam_lembur || 0).toFixed(1)} Jam</strong>
              </div>
              <div>
                <span className="text-slate-500">Jumlah Deal Won:</span>{' '}
                <strong>{selectedSlip.calculation_breakdown?.metrics?.jumlah_deal_won || 0} Transaksi</strong>
              </div>
            </div>

            {/* Financial Details */}
            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex justify-between py-1.5 font-semibold">
                <span className="text-slate-700">Gaji Pokok:</span>
                <span>{formatCurrencyIDR(selectedSlip.base_salary)}</span>
              </div>

              {selectedSlip.calculation_breakdown?.items &&
                Object.entries(selectedSlip.calculation_breakdown.items).map(([code, item]: any) => (
                  <div key={code} className="flex justify-between py-1.5 text-slate-600">
                    <div>
                      <span>{item.name}</span>
                      <div className="text-[10px] text-slate-400 font-mono">{item.formula}</div>
                    </div>
                    <span
                      className={`font-bold ${
                        item.type === 'deduction' || item.type === 'tax' ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {item.type === 'deduction' || item.type === 'tax' ? '-' : '+'}
                      {formatCurrencyIDR(item.amount)}
                    </span>
                  </div>
                ))}

              <div className="flex justify-between py-2 text-sm font-black text-[#142740] pt-3">
                <span>Gaji Bersih Diterima (Take Home Pay):</span>
                <span className="text-emerald-700">{formatCurrencyIDR(selectedSlip.net_salary)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FORMULA BUILDER ================= */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#142740]">
                  {editingComp ? 'Ubah Formula Komponen' : 'Formula Builder Komponen Baru'}
                </h3>
                <p className="text-xs text-slate-400">Susun logika perhitungan dengan variabel siap klik</p>
              </div>
              <button onClick={() => setShowFormulaModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormula} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Komponen</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Insentif Closing Deal"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipe Komponen</label>
                  <select
                    value={formType}
                    onChange={(e: any) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="commission">Komisi / Bonus Penjualan</option>
                    <option value="allowance">Tunjangan Kehadiran</option>
                    <option value="deduction">Potongan Keterlambatan</option>
                    <option value="tax">Pajak PPh 21</option>
                  </select>
                </div>
              </div>

              {/* Clickable Variable Chips Palette */}
              <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#00AFC4]" />
                  <span>Klik Variabel untuk Menyisipkan ke Rumus:</span>
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    { label: '+ GAJI_POKOK', cls: 'bg-blue-100 text-blue-800' },
                    { label: '+ HARI_HADIR', cls: 'bg-emerald-100 text-emerald-800' },
                    { label: '+ TOTAL_OMSET_WON', cls: 'bg-purple-100 text-purple-800 font-extrabold' },
                    { label: '+ JUMLAH_DEAL_WON', cls: 'bg-pink-100 text-pink-800' },
                    { label: '+ TOTAL_JAM_LEMBUR', cls: 'bg-indigo-100 text-indigo-800' },
                    { label: '+ JUMLAH_TERLAMBAT', cls: 'bg-amber-100 text-amber-800' },
                    { label: '+ HARI_ALPA', cls: 'bg-rose-100 text-rose-800' },
                    { label: '+ GAJI_BRUTO', cls: 'bg-slate-200 text-slate-800' },
                  ].map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => handleInsertVariable(v.label.replace('+ ', ''))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border border-slate-200/80 hover:opacity-80 transition cursor-pointer ${v.cls}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Formula Expression Field */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rumus Perhitungan (Formula Expression):</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TOTAL_OMSET_WON * 0.03"
                  value={formExpression}
                  onChange={(e) => {
                    setFormExpression(e.target.value);
                    runLiveSimulation(e.target.value);
                  }}
                  className="w-full px-3 py-2 font-mono text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#00AFC4] text-slate-900"
                />
              </div>

              {/* Interactive Live Simulator */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <strong className="text-emerald-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Live Simulator Uji Coba Rumus:</span>
                  </strong>
                  <span className="text-[10px] text-emerald-700 font-medium">Kalkulasi Otomatis</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-500">Contoh Omset Won:</label>
                    <input
                      type="number"
                      value={simOmset}
                      onChange={(e) => {
                        setSimOmset(Number(e.target.value));
                        runLiveSimulation(formExpression);
                      }}
                      className="w-full px-2 py-1 bg-white border border-emerald-300 rounded text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500">Contoh Hadir (Hari):</label>
                    <input
                      type="number"
                      value={simHadir}
                      onChange={(e) => {
                        setSimHadir(Number(e.target.value));
                        runLiveSimulation(formExpression);
                      }}
                      className="w-full px-2 py-1 bg-white border border-emerald-300 rounded text-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-950">Hasil Simulasi:</span>
                  {simError ? (
                    <span className="text-xs font-bold text-rose-600">{simError}</span>
                  ) : (
                    <span className="text-sm font-black text-emerald-800">
                      {simResult !== null ? formatCurrencyIDR(simResult) : '-'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                <input
                  type="text"
                  placeholder="Keterangan untuk slip gaji karyawan..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormulaModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingFormula || Boolean(simError)}
                  className="px-4 py-2 font-bold text-white bg-[#00AFC4] rounded-xl hover:bg-[#009bb0] cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {savingFormula ? 'Menyimpan...' : 'Simpan Formula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
