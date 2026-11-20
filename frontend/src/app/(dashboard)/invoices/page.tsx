'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Invoice, Product, Contact, Deal, WorkspacePaymentSettings, InvoiceQRISTransaction } from '@/types';
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
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export default function InvoicesPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<WorkspacePaymentSettings | null>(null);
  const [payMethodTab, setPayMethodTab] = useState<'qris' | 'bank'>('qris');
  const [copiedBankInvoice, setCopiedBankInvoice] = useState(false);
  const [copiedPublicLink, setCopiedPublicLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const getPublicPayUrl = (invNumberOrId?: string) => {
    if (!invNumberOrId) return '';
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/pay/${invNumberOrId}`;
    }
    return `http://localhost:3000/pay/${invNumberOrId}`;
  };

  // AutoGoPay Dynamic QRIS State
  const [dynamicQrisTx, setDynamicQrisTx] = useState<InvoiceQRISTransaction | null>(null);
  const [loadingDynamicQris, setLoadingDynamicQris] = useState(false);
  const [dynamicQrisError, setDynamicQrisError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

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
      const [invData, prodData, contactData, dealData, payData] = await Promise.all([
        api.listInvoices(currentWorkspace.id, typeFilter, statusFilter),
        api.listProducts(currentWorkspace.id),
        api.listContacts(currentWorkspace.id),
        api.listDeals(currentWorkspace.id),
        api.getPaymentSettings(currentWorkspace.id).catch(() => null),
      ]);
      setInvoices(invData);
      setProducts(prodData);
      setContacts(contactData || []);
      setDeals(dealData || []);
      if (payData) {
        setPaymentSettings(payData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentWorkspace, typeFilter, statusFilter]);

  // AutoGoPay Dynamic QRIS Poller & Session Manager
  useEffect(() => {
    let intervalId: any = null;
    if (showPayModal && selectedInvoice && paymentSettings?.payment_gateway_provider === 'autogopay') {
      setLoadingDynamicQris(true);
      setDynamicQrisError(null);

      const fetchQRIS = async () => {
        try {
          const tx = await api.generateAutoGopayQRIS(currentWorkspace!.id, selectedInvoice.id);
          setDynamicQrisTx(tx);
          setLoadingDynamicQris(false);

          if (tx.status === 'settlement') {
            return;
          }

          intervalId = setInterval(async () => {
            try {
              const check = await api.checkAutoGopayQRISStatus(currentWorkspace!.id, selectedInvoice.id);
              if (check.status === 'settlement') {
                clearInterval(intervalId);
                setDynamicQrisTx(check);
              }
            } catch (err) {
              console.error('AutoGoPay status check error:', err);
            }
          }, 3000);
        } catch (err: any) {
          setDynamicQrisError(err.message || 'Gagal menghasilkan QRIS AutoGoPay');
          setLoadingDynamicQris(false);
        }
      };

      fetchQRIS();
    } else {
      setDynamicQrisTx(null);
      setDynamicQrisError(null);
      setTimeRemaining(0);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showPayModal, selectedInvoice?.id, paymentSettings?.payment_gateway_provider]);

  // Expiration countdown timer for AutoGoPay (15-min limit)
  useEffect(() => {
    if (!dynamicQrisTx || !dynamicQrisTx.expiry_time || dynamicQrisTx.status === 'settlement') {
      return;
    }

    const updateTimer = () => {
      const expiry = new Date(dynamicQrisTx.expiry_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [dynamicQrisTx]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle Item Row Changes
  const getFullQrisUrl = (url?: string, payload?: string) => {
    if (url) {
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      const backendOrigin =
        typeof window !== 'undefined'
          ? `${window.location.protocol}//${window.location.host.replace(':3000', ':8080')}`
          : 'http://localhost:8080';
      return `${backendOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    const defaultPayload =
      payload ||
      `00020101021126600016ID.CO.QRIS.WWW01189360052300000123455204599953033605802ID5924${(paymentSettings?.bank_account_holder || currentWorkspace?.name || 'PT MAJU BERSAMA').slice(0, 24).toUpperCase()}6007JAKARTA61051011062070703A0163045E1A`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(defaultPayload)}`;
  };

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

                          <button
                            type="button"
                            onClick={() => {
                              const payUrl = getPublicPayUrl(inv.invoice_number);
                              navigator.clipboard.writeText(payUrl);
                              alert(`🔗 Link Pembayaran Publik berhasil disalin!\n${payUrl}\n\nKlien dapat membuka link ini langsung di smartphone atau browser tanpa login.`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Salin Link Pembayaran Klien (Tanpa Login)"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
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

            {/* Payment Details / Official Company Bank & Scannable QRIS Box (Embedded for Print & PDF) */}
            <div className="p-4 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 rounded-2xl border border-emerald-200/90 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                  <strong className="text-emerald-950 font-bold text-xs">
                    Instruksi Pembayaran Resmi Perusahaan:
                  </strong>
                </div>

                <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 space-y-1">
                  <p className="text-[11px] text-slate-800">
                    Bank Tujuan: <strong className="text-slate-900 font-bold">{paymentSettings?.bank_name || 'BCA'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-800">
                    Nomor Rekening PT: <span className="font-mono font-black text-slate-950 text-xs tracking-wider">{paymentSettings?.bank_account_number || '880129994012'}</span>
                  </p>
                  <p className="text-[11px] text-slate-800">
                    Atas Nama Rekening: <strong className="text-slate-900 font-bold">{paymentSettings?.bank_account_holder || currentWorkspace?.name || 'PT Maju Bersama Solusindo'}</strong>
                  </p>
                </div>

                <div className="text-[10px] text-slate-500 pt-0.5 space-y-0.5">
                  <p>✓ Bebas biaya admin &amp; scannable via BCA Mobile, Livin&apos; Mandiri, BRImo, BNI, GoPay, OVO, ShopeePay.</p>
                  <p className="font-mono text-emerald-700 font-semibold truncate">
                    Tautan Publik Klien: {getPublicPayUrl(selectedInvoice.invoice_number)}
                  </p>
                </div>
              </div>

              {/* Scannable Physical QRIS Box for Print / Display */}
              <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-2xl border border-slate-300 shadow-xs shrink-0 text-center w-36">
                <div className="bg-[#ED1C24] text-white px-2 py-0.5 rounded-t-md w-full text-[8px] font-black tracking-wider uppercase mb-1">
                  QRIS Standar
                </div>
                <div className="w-24 h-24 p-1 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                  <img
                    src={getFullQrisUrl(paymentSettings?.qris_image_url, paymentSettings?.qris_payload)}
                    alt="QRIS Barcode Pembayaran"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[7.5px] font-bold text-slate-500 mt-1 uppercase">
                  Scan untuk Bayar
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-100 text-xs text-slate-400 gap-3">
              <span>{selectedInvoice.terms || 'Terima kasih atas kerja sama Anda.'}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const payUrl = getPublicPayUrl(selectedInvoice.invoice_number);
                    navigator.clipboard.writeText(payUrl);
                    setCopiedPublicLink(true);
                    setTimeout(() => setCopiedPublicLink(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-200 transition cursor-pointer flex items-center gap-1.5"
                  title="Salin tautan pembayaran publik untuk dikirim ke klien via WhatsApp atau Email"
                >
                  {copiedPublicLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Link Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Salin Link Bayar Klien</span>
                    </>
                  )}
                </button>

                {selectedInvoice.status !== 'paid' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowPayModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Bayar via QRIS</span>
                  </button>
                )}

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

      {/* ================= MODAL: PAYMENT GATEWAY & QRIS NASIONAL ================= */}
      {showPayModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-left">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <strong className="text-sm font-black text-[#142740]">Pembayaran Tagihan Resmi Perusahaan</strong>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                Total Tagihan Invoice
              </span>
              <h3 className="text-2xl font-black text-emerald-700">
                {formatCurrencyIDR(selectedInvoice.total_amount)}
              </h3>
              <p className="text-xs text-slate-600">
                Invoice <strong className="font-mono text-slate-800">{selectedInvoice.invoice_number}</strong> • {selectedInvoice.contact_name || 'Klien Pelanggan'}
              </p>
            </div>

            {/* Payment Method Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setPayMethodTab('qris')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  payMethodTab === 'qris'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Scan QRIS Nasional</span>
              </button>
              <button
                type="button"
                onClick={() => setPayMethodTab('bank')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  payMethodTab === 'bank'
                    ? 'bg-white text-[#142740] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-[#00AFC4]" />
                <span>Transfer Bank PT</span>
              </button>
            </div>

            {/* TAB 1: Scannable QRIS (AutoGoPay Dynamic or Standard Static) */}
            {payMethodTab === 'qris' && (
              <div className="space-y-3">
                {paymentSettings?.payment_gateway_provider === 'autogopay' ? (
                  /* AutoGoPay Dynamic QRIS Container */
                  <div className="space-y-3">
                    {loadingDynamicQris ? (
                      <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center justify-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-800">Menghubungkan ke AutoGoPay Gateway...</p>
                          <p className="text-[11px] text-slate-500">Menerbitkan QRIS dinamis resmi GoPay Merchant</p>
                        </div>
                      </div>
                    ) : dynamicQrisError ? (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-2 text-left">
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Gagal Membuat Sesi QRIS AutoGoPay</span>
                        </div>
                        <p className="text-[11px]">{dynamicQrisError}</p>
                        <p className="text-[10px] text-rose-600/80">
                          Pastikan API Key AutoGoPay sudah diatur di menu Pengaturan &gt; Rekening &amp; QRIS.
                        </p>
                      </div>
                    ) : dynamicQrisTx ? (
                      <div className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-sm inline-block w-full max-w-sm mx-auto text-left">
                        {/* AutoGoPay Official Red/Emerald Header */}
                        <div className="bg-gradient-to-r from-[#ED1C24] to-emerald-700 text-white px-3 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-black text-base tracking-wider leading-none">QRIS</span>
                            <span className="text-[9px] bg-white text-slate-900 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Dynamic GoPay
                            </span>
                          </div>
                          <div className="text-[7.5px] font-bold tracking-widest uppercase opacity-95 mt-0.5">
                            AutoGoPay Merchant • Nominal Presisi Otomatis
                          </div>
                        </div>

                        {/* Merchant & Order ID */}
                        <div className="px-3 py-2 text-center border-b border-slate-100 bg-slate-50/70">
                          <div className="font-black text-xs text-slate-900 uppercase truncate">
                            {paymentSettings?.autogopay_merchant_name || paymentSettings?.bank_account_holder || currentWorkspace?.name || 'GoPay Merchant'}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 text-[8.5px] font-mono text-slate-500 mt-0.5">
                            <span>Order: {dynamicQrisTx.order_id}</span>
                            <span>•</span>
                            <span>Sesi #{dynamicQrisTx.generate_count}/2</span>
                          </div>
                        </div>

                        {/* Status & Expiration Banner */}
                        <div className="px-3 py-1.5 text-center border-b border-slate-100">
                          {dynamicQrisTx.status === 'settlement' ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>PEMBAYARAN LUNAS / SETTLEMENT</span>
                            </div>
                          ) : timeRemaining <= 0 ? (
                            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>Sesi QRIS Kedaluwarsa (15 Menit)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 animate-spin text-amber-600" />
                              <span>Batas Waktu: <strong>{formatTimer(timeRemaining)}</strong></span>
                            </div>
                          )}
                        </div>

                        {/* Scannable Dynamic QR Code Image */}
                        <div className="p-3 bg-white flex flex-col items-center justify-center">
                          <div className="w-48 h-48 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                            <img
                              src={dynamicQrisTx.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(dynamicQrisTx.qr_string)}`}
                              alt="AutoGoPay Dynamic QRIS"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="mt-2 text-center">
                            <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                              {formatCurrencyIDR(dynamicQrisTx.amount)} (Tepat Presisi)
                            </span>
                            <p className="text-[8.5px] font-bold text-slate-500 mt-1.5 tracking-wide uppercase">
                              Scan via BCA Mobile • Mandiri • BRImo • GoPay • OVO • DANA • ShopeePay
                            </p>
                          </div>

                          {dynamicQrisTx.checkout_url && (
                            <a
                              href={dynamicQrisTx.checkout_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 bg-emerald-50/80 hover:bg-emerald-100 px-3 py-1 rounded-lg transition"
                            >
                              <span>Buka Halaman Checkout GoPay</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* ASPI Footer with auto-poller note */}
                        <div className="bg-slate-100 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[7.5px] font-bold text-slate-600">
                          <span>ASPI • GPN • GOPAY GATEWAY</span>
                          <span className="flex items-center gap-1 text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Auto-Poller Aktif</span>
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  /* Standard Static QRIS Standar Nasional */
                  <div className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-sm inline-block w-full max-w-sm mx-auto text-left">
                    {/* ASPI Official Red Header */}
                    <div className="bg-[#ED1C24] text-white px-3 py-2 text-center">
                      <div className="font-black text-base tracking-wider leading-none">QRIS</div>
                      <div className="text-[7.5px] font-bold tracking-widest uppercase opacity-95 mt-0.5">
                        Quick Response Code Indonesian Standard
                      </div>
                    </div>

                    {/* Merchant & NMID */}
                    <div className="px-3 py-2 text-center border-b border-slate-100 bg-slate-50/50">
                      <div className="font-black text-xs text-slate-900 uppercase truncate">
                        {paymentSettings?.bank_account_holder || currentWorkspace?.name || 'PT Maju Bersama Solusindo'}
                      </div>
                      <div className="text-[8.5px] font-mono font-semibold text-slate-400 mt-0.5">
                        NMID: ID1020039281921 • Standard BI
                      </div>
                    </div>

                    {/* Scannable Real QR Code Image */}
                    <div className="p-3 bg-white flex flex-col items-center justify-center">
                      <div className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center">
                        <img
                          src={getFullQrisUrl(paymentSettings?.qris_image_url, paymentSettings?.qris_payload)}
                          alt="QRIS Barcode Standar Nasional"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[8.5px] font-bold text-slate-500 mt-2 tracking-wide uppercase text-center">
                        Scan via Livin&apos; Mandiri • BCA Mobile • BRImo • GoPay • OVO • DANA • ShopeePay
                      </span>
                    </div>

                    {/* ASPI Footer */}
                    <div className="bg-slate-100 px-3 py-1.5 border-t border-slate-200 text-center">
                      <div className="text-[7.5px] font-extrabold text-slate-700">
                        ASPI • GPN • BANK INDONESIA
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Transfer Bank Langsung */}
            {payMethodTab === 'bank' && (
              <div className="space-y-3 text-left">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Bank Tujuan:</span>
                    <strong className="text-sm font-black text-[#142740]">
                      {paymentSettings?.bank_name || 'Bank Central Asia (BCA)'}
                    </strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Nomor Rekening PT:</span>
                      <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                        {paymentSettings?.bank_account_number || '880129994012'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentSettings?.bank_account_number || '880129994012');
                        setCopiedBankInvoice(true);
                        setTimeout(() => setCopiedBankInvoice(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedBankInvoice ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-semibold">Atas Nama (Penerima):</span>
                    <strong className="text-xs font-bold text-slate-800 text-right">
                      {paymentSettings?.bank_account_holder || currentWorkspace?.name || 'PT Maju Bersama Solusindo'}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-[11px] text-teal-800">
                  ⚡ Transfer langsung masuk ke rekening operasional resmi PT tanpa potongan biaya administrasi pihak ketiga.
                </div>
              </div>
            )}

            {/* Note & Confirmation */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left text-[11px] text-slate-500">
              Mengonfirmasi pembayaran lunas akan otomatis memperbarui status Invoice menjadi <strong>PAID</strong>, memotong stok gudang, dan memindahkan Deal terkait ke <strong>WON</strong>.
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
