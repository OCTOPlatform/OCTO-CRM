'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Invoice, Product, Contact, Deal } from '@/types';
import {
  Receipt,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  QrCode,
  CreditCard,
  Printer,
  X,
  Trash2,
  ArrowRight,
  TrendingUp,
  Send,
  Building,
  User as UserIcon,
} from 'lucide-react';

export default function InvoicesPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all' | 'invoice' | 'quotation'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'sent' | 'paid'>('all');
  const [search, setSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Create Form State
  const [formType, setFormType] = useState<'quotation' | 'invoice'>('invoice');
  const [formNumber, setFormNumber] = useState('');
  const [formContactId, setFormContactId] = useState('');
  const [formDealId, setFormDealId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('qris');
  const [formNotes, setFormNotes] = useState('');
  const [formTerms, setFormTerms] = useState('Pembayaran jatuh tempo dalam 14 hari kerja.');
  const [applyPpn, setApplyPpn] = useState(true);
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formItems, setFormItems] = useState<
    {
      product_id?: string;
      item_name: string;
      sku: string;
      quantity: number;
      unit_price: number;
      discount: number;
    }[]
  >([
    {
      item_name: '',
      sku: '',
      quantity: 1,
      unit_price: 0,
      discount: 0,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [invData, prodData, contactData, dealData] = await Promise.all([
        api.listInvoices(currentWorkspace.id, typeFilter, statusFilter),
        api.listProducts(currentWorkspace.id),
        api.listContacts(currentWorkspace.id),
        api.listDeals(currentWorkspace.id),
      ]);
      setInvoices(invData);
      setProducts(prodData);
      setContacts(contactData || []);
      setDeals(dealData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace, typeFilter, statusFilter]);

  // Handle Item Row Changes
  const handleItemProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...formItems];
    if (prod) {
      updated[index] = {
        product_id: prod.id,
        item_name: prod.name,
        sku: prod.sku,
        quantity: updated[index].quantity || 1,
        unit_price: prod.sale_price,
        discount: 0,
      };
    } else {
      updated[index].product_id = undefined;
    }
    setFormItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: value };
    setFormItems(updated);
  };

  const addItemRow = () => {
    setFormItems([
      ...formItems,
      {
        item_name: '',
        sku: '',
        quantity: 1,
        unit_price: 0,
        discount: 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  // Live Totals calculation for Form
  const formSubtotal = formItems.reduce(
    (acc, it) => acc + Math.max(0, it.quantity * it.unit_price - it.discount),
    0
  );
  const formTax = applyPpn ? formSubtotal * 0.11 : 0;
  const formTotal = Math.max(0, formSubtotal + formTax - formDiscount);

  const handleOpenCreateModal = (type: 'invoice' | 'quotation') => {
    setFormType(type);
    const prefix = type === 'quotation' ? 'QUO' : 'INV';
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 7).replace('-', '');
    const rand = Math.floor(Math.random() * 9000 + 1000);
    setFormNumber(`${prefix}-${dateStr}-${rand}`);
    setFormDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setFormItems([
      {
        item_name: products[0]?.name || 'Paket Layanan OCTO',
        sku: products[0]?.sku || 'OCTO-SVC',
        product_id: products[0]?.id,
        quantity: 1,
        unit_price: products[0]?.sale_price || 5000000,
        discount: 0,
      },
    ]);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      setSubmitting(true);
      const itemsPayload = formItems.map((it) => ({
        product_id: it.product_id,
        item_name: it.item_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount: Number(it.discount),
        total_price: Number(it.quantity) * Number(it.unit_price) - Number(it.discount),
      }));

      await api.createInvoice(currentWorkspace.id, {
        invoice_number: formNumber,
        type: formType,
        contact_id: formContactId || undefined,
        deal_id: formDealId || undefined,
        due_date: formDueDate,
        notes: formNotes,
        terms: formTerms,
        payment_method: formPaymentMethod,
        discount_amount: Number(formDiscount),
        tax_amount: formTax,
        items: itemsPayload,
      });

      setShowCreateModal(false);
      loadData();
      alert(`✅ Dokumen ${formType.toUpperCase()} berhasil diterbitkan!`);
    } catch (e: any) {
      alert(e.message || 'Gagal menerbitkan invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!currentWorkspace || !selectedInvoice) return;
    try {
      setPaying(true);
      const res = await api.payInvoice(currentWorkspace.id, selectedInvoice.id, {
        payment_method: selectedInvoice.payment_method || 'qris',
        payment_reference: `QRIS-${Date.now()}`,
        auto_deduct_stock: true,
        auto_close_deal: true,
      });
      setSelectedInvoice(res);
      setShowPayModal(false);
      loadData();
      alert(
        '🎉 Pembayaran Berhasil Dikonfirmasi Lunas!\n• Status invoice diperbarui ke PAID\n• Stok gudang otomatis terpotong (Stock Out)\n• Status Deal otomatis bergeser ke WON'
      );
    } catch (e: any) {
      alert(e.message || 'Gagal mengonfirmasi pembayaran');
    } finally {
      setPaying(false);
    }
  };

  // KPI Computations
  const totalInvoiced = invoices
    .filter((i) => i.type === 'invoice')
    .reduce((acc, i) => acc + i.total_amount, 0);

  const totalPaid = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + i.total_amount, 0);

  const totalQuotations = invoices.filter((i) => i.type === 'quotation').length;
  const pendingCount = invoices.filter((i) => i.status === 'draft' || i.status === 'sent').length;

  const filteredInvoices = invoices.filter((i) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      (i.contact_name && i.contact_name.toLowerCase().includes(q)) ||
      (i.notes && i.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Penawaran, Invoice & Payment Gateway"
        subtitle="Penerbitan surat penawaran harga (SPH), tagihan invoice, dan konfirmasi pembayaran QRIS/VA otomatis"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-[#00AFC4] flex items-center justify-center font-bold">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Tagihan Diterbitkan
              </span>
              <div className="text-xl font-black text-[#142740]">{formatCurrencyIDR(totalInvoiced)}</div>
              <p className="text-[10px] text-slate-400">Akumulasi seluruh invoice</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Pembayaran Lunas (Paid)
              </span>
              <div className="text-xl font-black text-emerald-600">{formatCurrencyIDR(totalPaid)}</div>
              <p className="text-[10px] text-emerald-600 font-semibold">Tercatat di kas masuk</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Surat Penawaran (SPH)
              </span>
              <div className="text-xl font-black text-purple-700">{totalQuotations} Dokumen</div>
              <p className="text-[10px] text-slate-400">Aktif dalam tahap negosiasi</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Menunggu Pembayaran
              </span>
              <div className="text-xl font-black text-amber-600">{pendingCount} Invoice</div>
              <p className="text-[10px] text-slate-400">Perlu pengingat tagihan</p>
            </div>
          </div>
        </div>

        {/* Toolbar: Filter & Actions */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari no invoice, kontak..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#00AFC4] text-slate-800 w-56"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  typeFilter === 'all' ? 'bg-white text-[#142740] shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('invoice')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  typeFilter === 'invoice' ? 'bg-white text-[#142740] shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Invoice Tagihan
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('quotation')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  typeFilter === 'quotation' ? 'bg-white text-[#142740] shadow-xs' : 'hover:text-slate-900'
                }`}
              >
                Penawaran (SPH)
              </button>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Terkirim</option>
              <option value="paid">Lunas (Paid)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenCreateModal('quotation')}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>+ Buat Penawaran</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateModal('invoice')}
              className="px-4 py-2 text-xs font-bold text-white bg-[#00AFC4] hover:bg-[#009bb0] rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Invoice Baru</span>
            </button>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3.5 px-5">No. Dokumen</th>
                  <th className="py-3.5 px-4">Tipe</th>
                  <th className="py-3.5 px-4">Pelanggan / Perusahaan</th>
                  <th className="py-3.5 px-4">Jatuh Tempo</th>
                  <th className="py-3.5 px-4 font-bold text-slate-700">Total Nilai</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-[#00AFC4] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Memuat data tagihan & penawaran...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada invoice atau penawaran yang tercatat. Klik tombol <strong>+ Buat Invoice Baru</strong>.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-3.5 px-5">
                        <div className="font-extrabold text-sm text-[#142740] font-mono">{inv.invoice_number}</div>
                        <div className="text-[10px] text-slate-400">Terbit: {inv.issue_date}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            inv.type === 'quotation'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-cyan-100 text-[#00AFC4] border border-cyan-200'
                          }`}
                        >
                          {inv.type === 'quotation' ? 'Penawaran' : 'Invoice'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {inv.contact_name || inv.company_name || 'Pelanggan Umum'}
                        </div>
                        {inv.deal_title && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">
                            Deal: {inv.deal_title}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600">{inv.due_date}</td>

                      <td className="py-3.5 px-4 font-black text-sm text-[#142740]">
                        {formatCurrencyIDR(inv.total_amount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 w-fit ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : inv.status === 'sent'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {inv.status === 'paid' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Lunas (Paid)
                            </>
                          ) : inv.status === 'sent' ? (
                            <>
                              <Send className="w-3 h-3 text-blue-600" />
                              Terkirim
                            </>
                          ) : (
                            'Draft'
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowDetailModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Lihat / Cetak</span>
                          </button>

                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setShowPayModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>⚡ Bayar QRIS</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= MODAL: CREATE INVOICE / QUOTATION ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#00AFC4]" />
                  <span>
                    {formType === 'quotation' ? 'Terbitkan Surat Penawaran (SPH)' : 'Terbitkan Invoice Tagihan Baru'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Pilih kontak klien dan produk dari katalog inventori</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Dokumen</label>
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full px-3 py-2 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pilih Kontak Pelanggan</label>
                  <select
                    value={formContactId}
                    onChange={(e) => setFormContactId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Pilih Kontak CRM --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.phone || c.email || 'Tanpa kontak'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tautkan ke Deal Penjualan</label>
                  <select
                    value={formDealId}
                    onChange={(e) => setFormDealId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="">-- Tanpa Tautan Deal --</option>
                    {deals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({formatCurrencyIDR(d.value)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo</label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran Rekomendasi</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="qris">QRIS (GoPay, OVO, ShopeePay, BCA)</option>
                    <option value="va_bca">Virtual Account BCA</option>
                    <option value="va_mandiri">Virtual Account Mandiri</option>
                    <option value="bank_transfer">Transfer Manual Bank</option>
                  </select>
                </div>
              </div>

              {/* Line Items Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Rincian Barang / Jasa (Line Items)
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-xs font-bold text-[#00AFC4] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
                    >
                      <div className="flex-1">
                        <select
                          value={item.product_id || ''}
                          onChange={(e) => handleItemProductSelect(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg mb-1"
                        >
                          <option value="">-- Pilih dari Inventori (Opsional) --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.name} ({formatCurrencyIDR(p.sale_price)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          required
                          placeholder="Deskripsi nama barang/jasa..."
                          value={item.item_name}
                          onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="w-20">
                        <label className="text-[10px] text-slate-400 block sm:hidden">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                        />
                      </div>

                      <div className="w-28">
                        <label className="text-[10px] text-slate-400 block sm:hidden">Harga Satuan</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(idx, 'unit_price', Number(e.target.value))}
                          placeholder="Harga Satuan"
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div className="w-28 text-right font-black text-slate-800 text-xs">
                        {formatCurrencyIDR(Math.max(0, item.quantity * item.unit_price - item.discount))}
                      </div>

                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Subtotal Item:</span>
                  <span className="font-semibold">{formatCurrencyIDR(formSubtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                    <input
                      type="checkbox"
                      checked={applyPpn}
                      onChange={(e) => setApplyPpn(e.target.checked)}
                      className="rounded text-[#00AFC4] focus:ring-0"
                    />
                    <span>Terapkan PPN 11%</span>
                  </label>
                  <span className="font-semibold text-slate-700">{formatCurrencyIDR(formTax)}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Diskon Potongan (IDR):</span>
                  <input
                    type="number"
                    min="0"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    className="w-32 px-2 py-1 text-right text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-[#142740]">
                  <span>Total Tagihan Akhir:</span>
                  <span className="text-emerald-700 text-base">{formatCurrencyIDR(formTotal)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan / Instruksi Bank</label>
                <textarea
                  rows={2}
                  placeholder="Instruksi transfer, rekening tujuan, atau rincian garansi..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

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
                  disabled={submitting || formItems.length === 0}
                  className="px-5 py-2 font-extrabold text-white bg-[#00AFC4] rounded-xl hover:bg-[#009bb0] cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menerbitkan...' : 'Terbitkan Dokumen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINT / PREVIEW INVOICE ================= */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            {/* Header: Company & Invoice Info */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#00AFC4] text-white flex items-center justify-center font-black">
                    8
                  </div>
                  <h2 className="text-lg font-black text-[#142740]">
                    {currentWorkspace?.name || 'PT OCTO CRM INDONESIA'}
                  </h2>
                </div>
                <p className="text-xs text-slate-400">Enterprise CRM & Unified Business Operating System</p>
                <p className="text-xs text-slate-400">Jakarta Pusat, Indonesia</p>
              </div>

              <div className="text-right">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    selectedInvoice.type === 'quotation'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-cyan-100 text-[#00AFC4]'
                  }`}
                >
                  {selectedInvoice.type === 'quotation' ? 'SURAT PENAWARAN' : 'INVOICE RESMI'}
                </span>
                <div className="font-mono text-base font-black text-[#142740] mt-1.5">
                  {selectedInvoice.invoice_number}
                </div>
                <div className="text-xs text-slate-400">Tanggal: {selectedInvoice.issue_date}</div>
                <div className="text-xs font-bold text-rose-600">Jatuh Tempo: {selectedInvoice.due_date}</div>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex justify-between text-xs">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Ditagihkan Kepada:</span>
                <div className="font-extrabold text-sm text-[#142740] mt-0.5">
                  {selectedInvoice.contact_name || selectedInvoice.company_name || 'Pelanggan Yth.'}
                </div>
                {selectedInvoice.contact_phone && (
                  <div className="text-slate-500 font-mono mt-0.5">{selectedInvoice.contact_phone}</div>
                )}
              </div>

              <div className="text-right">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Status Tagihan:</span>
                <div className="mt-0.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                      selectedInvoice.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedInvoice.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-4">Deskripsi</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Harga Satuan</th>
                    <th className="py-2.5 px-4 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {it.item_name}
                          {it.sku && <span className="ml-1 text-[10px] text-slate-400 font-mono">({it.sku})</span>}
                        </td>
                        <td className="py-3 px-3 text-center">{it.quantity}</td>
                        <td className="py-3 px-4 text-right">{formatCurrencyIDR(it.unit_price)}</td>
                        <td className="py-3 px-4 text-right font-bold">{formatCurrencyIDR(it.total_price)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 px-4 text-slate-500">
                        {selectedInvoice.notes || 'Pengadaan Paket Solusi CRM Enterprise'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Financial Totals */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyIDR(selectedInvoice.subtotal)}</span>
                </div>
                {selectedInvoice.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN (11%):</span>
                    <span>{formatCurrencyIDR(selectedInvoice.tax_amount)}</span>
                  </div>
                )}
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon:</span>
                    <span>-{formatCurrencyIDR(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-[#142740]">
                  <span>Total Tagihan:</span>
                  <span className="text-emerald-700">{formatCurrencyIDR(selectedInvoice.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Payment Details / QRIS Simulator Box */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <strong className="text-emerald-950 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <span>Kanal Pembayaran Otomatis</span>
                </strong>
                <p className="text-[11px] text-emerald-800">
                  Metode: <strong>{selectedInvoice.payment_method?.toUpperCase()}</strong> | Ref: {selectedInvoice.payment_reference || 'QRIS-OCTO-LIVE'}
                </p>
                <p className="text-[10px] text-emerald-700">Dukungan QRIS Nasional, BCA VA, Mandiri VA, dan e-Wallet</p>
              </div>

              {selectedInvoice.status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailModal(false);
                    setShowPayModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Bayar Sekarang
                </button>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-xs text-slate-400">
              <span>{selectedInvoice.terms || 'Terima kasih atas kerja sama Anda.'}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-[#142740] hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PAYMENT GATEWAY SIMULATION (QRIS / VA) ================= */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <strong className="text-sm font-black text-[#142740]">Payment Gateway Simulation</strong>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                QRIS & Virtual Account Live Gateway
              </span>
              <h3 className="text-xl font-black text-[#142740]">
                {formatCurrencyIDR(selectedInvoice.total_amount)}
              </h3>
              <p className="text-xs text-slate-500">
                Invoice <strong>{selectedInvoice.invoice_number}</strong> ({selectedInvoice.contact_name || 'Klien'})
              </p>
            </div>

            {/* Simulated QR Code Visual */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto relative group">
              <div className="w-44 h-44 bg-white p-3 rounded-xl border border-slate-300 shadow-inner flex flex-col items-center justify-center space-y-2">
                <QrCode className="w-28 h-28 text-slate-800" />
                <span className="text-[10px] font-mono font-bold text-slate-500">QRIS STANDAR NASIONAL</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-left text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Metode Pembayaran:</span>
                <strong className="text-slate-800">{selectedInvoice.payment_method?.toUpperCase()}</strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>No. Referensi / VA:</span>
                <strong className="font-mono text-emerald-700">
                  {selectedInvoice.payment_reference || '880129994012'}
                </strong>
              </div>
              <div className="text-[10px] text-slate-400 pt-1">
                ⚡ Mengonfirmasi lunas akan otomatis memotong stok produk di gudang & mengubah Deal ke status Won.
              </div>
            </div>

            <button
              type="button"
              onClick={handlePayInvoice}
              disabled={paying}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{paying ? 'Memverifikasi Pembayaran...' : '✅ Konfirmasi Pembayaran Lunas'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
