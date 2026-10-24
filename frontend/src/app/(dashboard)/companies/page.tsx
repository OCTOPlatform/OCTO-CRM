'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Company } from '@/types';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export default function CompaniesPage() {
  const { currentWorkspace } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Company Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const loadCompanies = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = await api.listCompanies(currentWorkspace.id);
      setCompanies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, [currentWorkspace]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !name) return;

    try {
      await api.createCompany(currentWorkspace.id, {
        name,
        industry,
        website,
        phone,
        email,
        address,
      });

      setShowAddModal(false);
      setName('');
      setIndustry('');
      setWebsite('');
      setPhone('');
      setEmail('');
      setAddress('');
      loadCompanies();
    } catch (e: any) {
      alert(e.message || 'Gagal membuat perusahaan');
    }
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.industry && c.industry.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Perusahaan & Klien Bisnis"
        subtitle="Manajemen akun korporat dan organisasi pelanggan"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Header bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari perusahaan atau industri..."
              className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Perusahaan</span>
          </button>
        </div>

        {/* Company Cards Grid */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-[#00AFC4] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            Belum ada data perusahaan yang tersimpan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((co) => (
              <div
                key={co.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#00AFC4]/50 transition space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E8F8FA] text-[#00AFC4] flex items-center justify-center font-bold text-sm shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-[#142740] truncate">{co.name}</h3>
                    <p className="text-[11px] text-[#586779]">{co.industry || 'Umum / Retail'}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  {co.website && (
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={co.website.startsWith('http') ? co.website : `https://${co.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00AFC4] hover:underline truncate"
                      >
                        {co.website}
                      </a>
                    </div>
                  )}

                  {co.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{co.phone}</span>
                    </div>
                  )}

                  {co.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{co.email}</span>
                    </div>
                  )}

                  {co.address && (
                    <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{co.address}</span>
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
                  <span>ID: {co.id.slice(0, 8)}...</span>
                  <span>Ditambahkan: {formatDateIndo(co.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Add Company */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-[#142740] mb-4">Tambah Perusahaan Baru</h3>

            <form onSubmit={handleCreateCompany} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: PT Digital Nusantara Medika"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Industri / Sektor</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Contoh: Healthcare, Retail, F&B, Logistik"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://perusahaan.co.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telepon Kantor</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="021-5551234"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Perusahaan</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@perusahaan.co.id"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Kantor</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Jend. Sudirman Kav 50, Jakarta Selatan"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white transition shadow-xs"
                >
                  Simpan Perusahaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
