'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load saved email if remember me was active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('octo_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('octo_remembered_email', email);
      } else {
        localStorage.removeItem('octo_remembered_email');
      }

      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Email atau kata sandi tidak sesuai. Silakan periksa kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-[#EDF2F7] flex flex-col justify-between p-4 sm:p-6">
      <div className="flex-1 flex items-center justify-center py-8">
        <div className="max-w-md w-full">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-3">
              <Image
                src="/logo.png"
                alt="OCTO CRM Logo"
                width={88}
                height={88}
                className="w-20 h-20 sm:w-22 sm:h-22 object-contain drop-shadow-sm"
                priority
              />
            </div>
            <h1 className="text-2xl font-black text-[#142740] tracking-tight">
              OCTO <span className="text-[#00AFC4]">CRM</span>
            </h1>
            <p className="text-[11px] uppercase tracking-widest text-[#586779] font-semibold mt-1">
              One Platform. Many Possibilities.
            </p>
          </div>

          {/* SaaS Login Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-6 sm:p-8 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-[#142740]">Masuk ke Workspace</h2>
              <p className="text-xs text-[#586779] mt-1">
                Akses prospek, pipeline penjualan, dan pesan pelanggan perusahaan Anda.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Business Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Bisnis
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:border-transparent transition bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Kata Sandi
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Untuk bantuan reset kata sandi, hubungi Administrator workspace Anda.');
                    }}
                    className="text-[11px] font-medium text-[#00AFC4] hover:underline"
                  >
                    Lupa sandi?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#00AFC4] focus:border-transparent transition bg-slate-50/50 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00AFC4] focus:ring-[#00AFC4] border-slate-300 cursor-pointer"
                  />
                  <span className="text-xs text-slate-600">Ingat email di perangkat ini</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#00AFC4] hover:bg-[#0096a8] active:scale-[0.99] text-white font-bold text-sm transition shadow-md shadow-[#00AFC4]/20 flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Masuk ke Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Register Link */}
          <p className="text-center text-xs text-[#586779] mt-6">
            Belum memiliki workspace perusahaan?{' '}
            <Link href="/register" className="font-bold text-[#00AFC4] hover:underline">
              Daftar Workspace Baru
            </Link>
          </p>
        </div>
      </div>

      {/* Enterprise Multi-Tenant Security Footer */}
      <footer className="py-4 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium border border-slate-200/60">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Keamanan Enterprise • Enkripsi TLS 256-bit • Isolasi Tenant Aman</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          &copy; 2026 OCTO CRM Platform. Hak cipta dilindungi undang-undang.
        </p>
      </footer>
    </div>
  );
}
