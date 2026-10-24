'use client';

import React from 'react';
import { WorkspaceMember, Conversation } from '@/types';
import {
  ShieldCheck,
  UserCheck,
  Zap,
  AlertTriangle,
  Clock,
  X,
  Lock,
  Unlock,
  CheckCircle,
  Sparkles,
  Info,
} from 'lucide-react';

// ================= MODAL 1: TAKEOVER CHAT (AMBIL ALIH) =================
interface TakeoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  reason: string;
  setReason: (val: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function TakeoverModal({
  isOpen,
  onClose,
  conversation,
  reason,
  setReason,
  onConfirm,
  loading,
}: TakeoverModalProps) {
  if (!isOpen || !conversation) return null;

  const quickReasons = [
    'Supervisi penanganan komplain klien',
    'Agen bertugas berhalangan / SLA terlewati',
    'Pendelegasian penutupan deal bernilai tinggi',
    'Bantuan teknis kasus After-Sales kritis',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Ambil Alih Percakapan (Take Over)
              </h3>
              <p className="text-xs text-slate-500">
                Alihkan penugasan percakapan langsung ke akun Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-950">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Kepatuhan Tata Kelola & Audit Trail</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Pengambilalihan dari agen <strong>{conversation.assigned_to_name || 'Belum Ditugaskan'}</strong> akan dicatat dalam Audit Trail untuk akuntabilitas operasional.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block">
            Alasan Pengambilalihan:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickReasons.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setReason(r)}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                  reason === r
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Tuliskan alasan pengambilalihan percakapan..."
            className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{loading ? 'Memproses...' : 'Konfirmasi Ambil Alih'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= MODAL 2: ESKALASI KASUS =================
interface EscalateModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  members: WorkspaceMember[];
  escalateToId: string;
  setEscalateToId: (id: string) => void;
  reason: string;
  setReason: (val: string) => void;
  priority: 'high' | 'urgent';
  setPriority: (val: 'high' | 'urgent') => void;
  onConfirm: () => void;
  loading: boolean;
}

export function EscalateModal({
  isOpen,
  onClose,
  conversation,
  members,
  escalateToId,
  setEscalateToId,
  reason,
  setReason,
  priority,
  setPriority,
  onConfirm,
  loading,
}: EscalateModalProps) {
  if (!isOpen || !conversation) return null;

  const supervisors = members.filter(
    (m) => m.role === 'owner' || m.role === 'supervisor' || m.role === 'admin'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <Zap className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Eskalasi Kasus ke Supervisor
              </h3>
              <p className="text-xs text-slate-500">
                Minta bantuan manajerial untuk kasus pelanggan mendesak
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Eskalasikan Kepada:
            </label>
            <select
              value={escalateToId}
              onChange={(e) => setEscalateToId(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-semibold"
            >
              {supervisors.length === 0 ? (
                <option value="">Tidak ada supervisor ditemukan</option>
              ) : (
                supervisors.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} ({s.role.toUpperCase()}) • {s.department}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tingkat Prioritas Kasus:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  priority === 'high'
                    ? 'bg-amber-50 text-amber-800 border-amber-400 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                🟡 Prioritas Tinggi
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgent')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  priority === 'urgent'
                    ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-2xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                🔴 Urgent / Kritis
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Alasan Eskalasi & Catatan Bantuan:
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Klien komplain penundaan instalasi cabang ke-3, membutuhkan persetujuan kompensasi diskon dari supervisor..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !escalateToId || !reason.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{loading ? 'Mengirimkan...' : 'Kirimkan Eskalasi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= MODAL 3: ACCESS ON DEMAND LOG MODAL =================
interface AccessLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  reason: string;
  setReason: (val: string) => void;
  onConfirm: () => void;
  loading: boolean;
}

export function AccessLogModal({
  isOpen,
  onClose,
  conversation,
  reason,
  setReason,
  onConfirm,
  loading,
}: AccessLogModalProps) {
  if (!isOpen || !conversation) return null;

  const quickPurposes = [
    'Penyelidikan keluhan & komplain klien',
    'Supervisi kualitas layanan (Quality Assurance)',
    'Pendampingan negosiasi deal strategis',
    'Evaluasi kepatuhan SLA & onboarding anggota baru',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <Unlock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Akses Percakapan On-Demand
              </h3>
              <p className="text-xs text-slate-500">
                Konfirmasi alasan bisnis untuk membuka isi percakapan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
          <span className="font-bold block text-indigo-950">Prinsip Tata Kelola (Access on Demand):</span>
          <p className="text-[11px] text-indigo-800 leading-relaxed">
            Percakapan ini ditugaskan kepada <strong>{conversation.assigned_to_name}</strong>. Demi menjaga privasi kerja dan transparansi tim, alasan akses akan dicatat dalam Audit Trail.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 block">
            Tujuan / Alasan Akses:
          </label>
          <div className="space-y-1.5">
            {quickPurposes.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setReason(p)}
                className={`w-full text-left text-[11px] font-semibold p-2.5 rounded-xl border transition ${
                  reason === p
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Catatan tambahan..."
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || !reason.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{loading ? 'Mencatat...' : 'Konfirmasi Akses'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= MODAL 4: GOVERNANCE POLICY TRANSPARENCY MODAL =================
interface GovernancePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GovernancePolicyModal({
  isOpen,
  onClose,
}: GovernancePolicyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F8FA] text-[#00AFC4] flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">
                Kebijakan Tata Kelola & Monitoring OCTO CRM
              </h3>
              <p className="text-xs text-slate-500">
                Versi 0.1 • Standar Etika & Kepatuhan Monitoring Tim
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-700 max-h-[60vh] overflow-y-auto pr-2">
          <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 text-[#0E1E38] leading-relaxed">
            <strong className="block text-sm mb-1 text-[#00AFC4]">Prinsip Utama:</strong>
            Monitoring bertujuan memberikan owner dan supervisor visibilitas operasional yang cukup untuk menjaga kualitas layanan pelanggan dan pencapaian bisnis, <strong>tanpa menjadikan produk sebagai alat surveillance atau pengawasan karyawan yang berlebihan</strong>.
          </div>

          <div className="space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm">Prinsip Desain & Tata Kelola:</h4>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>1. Visibility by Default:</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Owner melihat ringkasan kinerja, status, dan tren kinerja tim secara agregat, bukan otomatis membaca seluruh isi percakapan secara bebas.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>2. Access on Demand:</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Isi percakapan di luar penugasan dibuka ketika ada alasan bisnis yang sah (eskalasi komplain, supervisi penutupan deal penting).
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>3. Exception-Based Monitoring:</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Sistem menyoroti kondisi yang membutuhkan perhatian: chat melewati SLA (&gt;15 menit), sentimen komplain negatif, atau antrean belum tertugaskan.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>4. Role-Based Access Control (RBAC):</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Hak akses dibedakan berjenjang: Owner (Executive Overview & Governance), Supervisor (Supervisi Tim & Reassign/Takeover), Sales/CS Agent (Chat yang Ditugaskan & Eskalasi).
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>5. Transparency & Auditability:</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Seluruh tindakan administratif (takeover chat, perubahan penugasan, eskalasi, akses on-demand) dicatat dalam Audit Trail yang transparan.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>6. Data Minimization:</span>
              </span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Sistem hanya menampilkan data yang diperlukan untuk tugas pengguna dan tujuan bisnis resmi perusahaan.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            Saya Memahami Kebijakan Ini
          </button>
        </div>
      </div>
    </div>
  );
}
