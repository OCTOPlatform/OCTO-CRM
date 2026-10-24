'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, formatDateIndo } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Contact, Company, DuplicateCandidate } from '@/types';
import {
  Users,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Copy,
  GitMerge,
  AlertTriangle,
  Building2,
  Phone,
  Mail,
  Tag,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Edit,
} from 'lucide-react';

export default function ContactsPage() {
  const { currentWorkspace } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateCandidate | null>(null);

  // Form states for new contact
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formSource, setFormSource] = useState('Website');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // CSV Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [importing, setImporting] = useState(false);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [contactList, companyList, dupList] = await Promise.all([
        api.listContacts(currentWorkspace.id, {
          query: searchQuery,
          lead_source: sourceFilter,
          tag: tagFilter,
        }),
        api.listCompanies(currentWorkspace.id),
        api.findDuplicates(currentWorkspace.id),
      ]);
      setContacts(contactList || []);
      setCompanies(companyList || []);
      setDuplicates(dupList || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace, searchQuery, sourceFilter, tagFilter]);

  // Create contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !formFirstName) return;

    try {
      const tagsArray = formTags
        ? formTags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      await api.createContact(currentWorkspace.id, {
        first_name: formFirstName,
        last_name: formLastName,
        email: formEmail,
        phone: formPhone,
        company_id: formCompanyId || undefined,
        job_title: formJobTitle,
        lead_source: formSource,
        tags: tagsArray,
        notes: formNotes,
        consent_status: 'granted',
      });

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal membuat kontak');
    }
  };

  const resetForm = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormEmail('');
    setFormPhone('');
    setFormCompanyId('');
    setFormJobTitle('');
    setFormSource('Website');
    setFormTags('');
    setFormNotes('');
  };

  // Merge Contacts
  const handleMerge = async () => {
    if (!currentWorkspace || !selectedDuplicate) return;
    try {
      await api.mergeContacts(
        currentWorkspace.id,
        selectedDuplicate.primary_contact.id,
        selectedDuplicate.secondary_contact.id,
        true,
        true
      );
      setShowMergeModal(false);
      setSelectedDuplicate(null);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menggabungkan kontak');
    }
  };

  // CSV Import flow
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWorkspace || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setImportFile(file);

    try {
      const preview = await api.previewCSV(currentWorkspace.id, file);
      setImportPreview(preview);

      // Auto-detect mappings
      const initialMap: Record<string, string> = {};
      preview.detected_headers.forEach((h: string) => {
        const lh = h.toLowerCase();
        if (lh.includes('nama') || lh.includes('name')) initialMap[h] = 'name';
        else if (lh.includes('email')) initialMap[h] = 'email';
        else if (lh.includes('phone') || lh.includes('telepon') || lh.includes('hp')) initialMap[h] = 'phone';
        else if (lh.includes('jabatan') || lh.includes('title')) initialMap[h] = 'job_title';
        else if (lh.includes('source') || lh.includes('sumber')) initialMap[h] = 'lead_source';
      });
      setImportMapping(initialMap);
      setImportStep(2);
    } catch (e: any) {
      alert(e.message || 'Gagal membaca CSV');
    }
  };

  const handleCommitImport = async () => {
    if (!currentWorkspace || !importPreview) return;
    try {
      setImporting(true);
      const rows = importPreview.preview_rows.map((r: any) => r.data);
      const res = await api.commitCSV(currentWorkspace.id, importMapping, rows);
      alert(`Sukses mengimpor ${res.success_count} kontak!`);
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
      setImportStep(1);
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal menyimpan impor');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Database Kontak"
        subtitle="Kelola kontak, prospek, dan identifikasi kandidat duplikat"
        onQuickAddContact={() => setShowAddModal(true)}
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* 1. Duplicate candidates banner if detected */}
        {(duplicates?.length ?? 0) > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <GitMerge className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <span className="font-bold text-sm text-amber-900">
                  {duplicates.length} Pasangan Kandidat Duplikat Terdeteksi
                </span>
                <p className="text-xs text-amber-700">
                  Ditemukan kontak dengan email atau nomor telepon yang identik. Gabungkan data untuk mencegah rekam ganda.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (duplicates && duplicates.length > 0) {
                  setSelectedDuplicate(duplicates[0]);
                  setShowMergeModal(true);
                }
              }}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs"
            >
              <GitMerge className="w-3.5 h-3.5" />
              <span>Periksa & Gabungkan</span>
            </button>
          </div>
        )}

        {/* 2. Search & Filter Bar & Action buttons */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, email, telepon, perusahaan..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
              />
            </div>

            {/* Lead Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
            >
              <option value="">Semua Sumber (Source)</option>
              <option value="Website">Website</option>
              <option value="OCTO Tap">OCTO Tap</option>
              <option value="Referral">Referral</option>
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Organic">Organic</option>
            </select>

            {/* Tag Filter */}
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#00AFC4]"
            >
              <option value="">Semua Tag</option>
              <option value="VIP">VIP</option>
              <option value="B2B">B2B</option>
              <option value="Retail">Retail</option>
              <option value="Prospect">Prospect</option>
              <option value="Healthcare">Healthcare</option>
            </select>
          </div>

          {/* Action buttons: Export CSV, Import CSV, New Contact */}
          <div className="flex items-center gap-2">
            <a
              href={currentWorkspace ? api.getExportContactsCSVUrl(currentWorkspace.id) : '#'}
              download
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </a>

            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Impor CSV</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 text-xs font-semibold bg-[#00AFC4] hover:bg-[#0096a8] text-white rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kontak</span>
            </button>
          </div>
        </div>

        {/* 3. Contacts Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Nama Kontak</th>
                  <th className="px-4 py-3.5">Perusahaan & Jabatan</th>
                  <th className="px-4 py-3.5">Kontak</th>
                  <th className="px-4 py-3.5">Sumber Lead</th>
                  <th className="px-4 py-3.5">Tags</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      Tidak ada kontak yang cocok dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-bold text-[#142740] hover:text-[#00AFC4] transition"
                        >
                          {contact.full_name}
                        </Link>
                        <div className="text-[11px] text-[#586779]">
                          ID: {contact.id.slice(0, 8)}...
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">
                          {contact.company_name || '-'}
                        </div>
                        <div className="text-[11px] text-[#586779]">
                          {contact.job_title || '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8F8FA] text-[#00AFC4] font-semibold text-[11px]">
                          {contact.lead_source}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {contact.tags && contact.tags.length > 0 ? (
                            contact.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-slate-700 font-medium">
                          {contact.owner_name || 'Unassigned'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00AFC4] hover:bg-[#E8F8FA] transition"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add Contact */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-[#142740] mb-4">Tambah Kontak Baru</h3>

            <form onSubmit={handleCreateContact} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Depan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="Contoh: Andi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Belakang</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="Contoh: Wijaya"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="andi@digitalniaga.co.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Perusahaan</label>
                  <select
                    value={formCompanyId}
                    onChange={(e) => setFormCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="">Pilih Perusahaan (Opsional)</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Role</label>
                  <input
                    type="text"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    placeholder="Contoh: Direktur Operasional"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sumber Prospek (Lead Source)</label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  >
                    <option value="Website">Website</option>
                    <option value="OCTO Tap">OCTO Tap</option>
                    <option value="Referral">Referral</option>
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Organic">Organic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (pisahkan koma)</label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="VIP, B2B, Retail"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#00AFC4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan diskusi pertama atau kebutuhan bisnis..."
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
                  Simpan Kontak
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Merge Duplicates */}
      {showMergeModal && selectedDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#142740]">
                  Gabungkan Kontak (Merge Duplicates)
                </h3>
                <p className="text-xs text-[#586779]">
                  Alasan match: {selectedDuplicate.match_reason === 'same_phone' ? 'Nomor Telepon Sama' : 'Email Sama'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 my-6">
              {/* Primary Contact */}
              <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/30">
                <div className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider mb-2">
                  ✓ Kontak Utama (Dipertahankan)
                </div>
                <div className="font-bold text-sm text-[#142740]">
                  {selectedDuplicate.primary_contact.full_name}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  📞 {selectedDuplicate.primary_contact.phone || '-'}
                </div>
                <div className="text-xs text-slate-600">
                  ✉️ {selectedDuplicate.primary_contact.email || '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Dibuat: {formatDateIndo(selectedDuplicate.primary_contact.created_at)}
                </div>
              </div>

              {/* Secondary Contact */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                  Kontak Sekunder (Akan Digabung)
                </div>
                <div className="font-bold text-sm text-[#142740]">
                  {selectedDuplicate.secondary_contact.full_name}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  📞 {selectedDuplicate.secondary_contact.phone || '-'}
                </div>
                <div className="text-xs text-slate-600">
                  ✉️ {selectedDuplicate.secondary_contact.email || '-'}
                </div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Dibuat: {formatDateIndo(selectedDuplicate.secondary_contact.created_at)}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-600 space-y-1 mb-6">
              <div className="font-semibold text-slate-800">Efek Penggabungan:</div>
              <div>• Seluruh deals, tugas, dan histori aktivitas kontak sekunder otomatis dipindahkan ke kontak utama.</div>
              <div>• Catatan dan label (tags) kedua kontak akan digabungkan.</div>
              <div>• Kontak sekunder akan diarsipkan dan dicatat dalam audit log.</div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleMerge}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white transition shadow-sm"
              >
                Konfirmasi Gabungkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-base text-[#142740] mb-2">Impor Data Kontak dari CSV</h3>
            <p className="text-xs text-[#586779] mb-4">
              Unggah file CSV dengan preview dan pemetaan kolom sebelum menyimpan.
            </p>

            {importStep === 1 ? (
              <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">Pilih file CSV dari komputer Anda</div>
                <div className="text-[11px] text-slate-400 mt-1">Mendukung header: Nama, Email, Telepon, dsb.</div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="mt-4 text-xs mx-auto block cursor-pointer"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-800">
                  Pemetaan Kolom ({importPreview?.total_rows} baris terdeteksi):
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {importPreview?.detected_headers.map((hdr: string) => (
                    <div key={hdr} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded-xl">
                      <span className="font-semibold text-slate-700">{hdr}</span>
                      <select
                        value={importMapping[hdr] || ''}
                        onChange={(e) =>
                          setImportMapping({ ...importMapping, [hdr]: e.target.value })
                        }
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="">Lewati Kolom</option>
                        <option value="name">Nama Lengkap</option>
                        <option value="email">Email</option>
                        <option value="phone">Nomor Telepon</option>
                        <option value="job_title">Jabatan</option>
                        <option value="lead_source">Sumber Prospek</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Kembali
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleCommitImport}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#00AFC4] hover:bg-[#0096a8] text-white shadow-xs disabled:opacity-50"
                  >
                    {importing ? 'Menyimpan...' : 'Impor Sekarang'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
