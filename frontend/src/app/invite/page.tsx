'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';
import { WorkspaceInvitation } from '@/types';
import {
  ShieldCheck,
  Building,
  User,
  Lock,
  Mail,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
} from 'lucide-react';

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<WorkspaceInvitation | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('');

  // Form states
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Tautan undangan tidak memiliki token verifikasi.');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        setLoading(true);
        const res = await api.getInvitationByToken(token);
        setInvitation(res.invitation);
        setWorkspaceName(res.workspace.name);
        if (res.invitation.full_name) {
          setFullName(res.invitation.full_name);
        } else {
          setFullName(res.invitation.email.split('@')[0]);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Tautan undangan tidak valid atau telah kedaluwarsa.');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!fullName.trim()) {
      alert('Nama lengkap tidak boleh kosong');
      return;
    }

    if (password.length < 6) {
      alert('Kata sandi minimal 6 karakter');
      return;
    }

    if (password !== confirmPassword) {
      alert('Konfirmasi kata sandi tidak cocok');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.acceptInvitation(token, {
        full_name: fullName.trim(),
        password,
      });

      // Save credentials for immediate seamless login
      localStorage.setItem('octo_token', res.token);
      localStorage.setItem('octo_user', JSON.stringify(res.user));

      // Set active role profile
      const isSupport = invitation?.department === 'support' || (invitation?.role as string) === 'support';
      const isOwnerOrAdmin = invitation?.role === 'admin' || invitation?.role === 'owner';
      const userRole = isSupport ? 'support' : isOwnerOrAdmin ? 'owner' : 'sales';
      localStorage.setItem('octo_active_role', userRole);

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Gagal mengaktifkan akun');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    if (role === 'sales') {
      return {
        label: '💼 Tim Sales (Pre-Sales)',
        desc: 'Akses ke Deals Pipeline, Manajemen Prospek Leads, & WhatsApp Sales',
        color: 'bg-cyan-50 text-[#008A9B] border-cyan-200',
      };
    }
    if (role === 'support') {
      return {
        label: '🎧 Tim CS (After-Sales Helpdesk)',
        desc: 'Akses ke Tiket Keluhan, Chat Support, & Handover Klien Won',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    }
    return {
      label: '👑 Admin / Manajer',
      desc: 'Akses Pengelolaan Tim & Laporan Workspace',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-[#00AFC4] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold text-slate-300">Memverifikasi tautan undangan...</p>
      </div>
    );
  }

  if (errorMsg || !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 text-center space-y-5">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-100">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Tautan Tidak Berlaku</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {errorMsg || 'Tautan ini mungkin sudah kedaluwarsa (masa aktif 7 hari) atau telah digunakan sebelumnya.'}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 block">Langkah Solusi:</span>
            <p>Silakan hubungi Administrator atau Owner perusahaan Anda untuk mengirimkan ulang tautan undangan baru.</p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  const roleInfo = getRoleBadge(invitation.role);

  return (
    <div className="min-h-screen bg-[#070D18] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00AFC4]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#091E42] via-[#0D2A5E] to-[#00AFC4] p-6 text-white text-center relative">
          <div className="flex justify-center mb-3">
            <Image
              src="/logo.png"
              alt="OCTO CRM Logo"
              width={80}
              height={80}
              className="w-20 h-20 object-contain drop-shadow-md"
              priority
            />
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-[11px] font-bold text-white mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>Undangan Resmi Anggota Tim</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Selamat Datang di OCTO CRM</h1>
          <p className="text-xs text-slate-200 mt-1">
            Anda diundang oleh <strong>{invitation.invited_by_name || 'Admin'}</strong>
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Workspace & Role Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600">Perusahaan / Workspace:</span>
              </div>
              <span className="text-xs font-extrabold text-slate-900">{workspaceName}</span>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-600">Peran Anda:</span>
                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{roleInfo.desc}</p>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200/70">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Tautan aktif selama 7 hari (Kedaluwarsa otomatis demi keamanan data perusahaan).</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            {/* Email (Readonly) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Terdaftar</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  value={invitation.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
                <CheckCircle className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
              </div>
            </div>

            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Anda</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Contoh: Doni Hermawan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Buat Kata Sandi Baru</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || success}
              className="w-full py-3.5 bg-[#00AFC4] hover:bg-[#009bb0] text-white font-extrabold rounded-xl text-xs transition cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Mengaktifkan Akun...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Berhasil! Mengalihkan ke Dashboard...</span>
                </>
              ) : (
                <>
                  <span>Aktivasi Akun & Masuk ke Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#00AFC4] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
