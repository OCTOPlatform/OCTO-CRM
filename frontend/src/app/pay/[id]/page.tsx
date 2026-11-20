'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PublicInvoicePayInfo } from '@/types';
import {
  CreditCard,
  QrCode,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Download,
  ShieldCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';

function formatCurrencyIDR(val: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTimeIndo(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PublicInvoicePayPage() {
  const params = useParams();
  const invoiceIdentifier = (params?.id as string) || '';

  const [payInfo, setPayInfo] = useState<PublicInvoicePayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [payTab, setPayTab] = useState<'qris' | 'bank'>('qris');
  const [copiedBank, setCopiedBank] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isSettled, setIsSettled] = useState(false);

  // 1. Fetch Invoice Pay Info
  useEffect(() => {
    if (!invoiceIdentifier) return;

    let pollerId: any = null;

    const loadPayInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublicInvoicePayInfo(invoiceIdentifier);
        setPayInfo(data);
        setLoading(false);

        if (data.invoice.status === 'paid' || data.qris_transaction?.status === 'settlement') {
          setIsSettled(true);
          return;
        }

        // Start background polling every 3.5 seconds
        pollerId = setInterval(async () => {
          try {
            const statusCheck = await api.getPublicInvoiceStatus(invoiceIdentifier);
            if (statusCheck.status === 'paid') {
              setIsSettled(true);
              clearInterval(pollerId);
            }
          } catch (e) {
            console.error('Error polling status:', e);
          }
        }, 3500);
      } catch (err: any) {
        setError(err.message || 'Faktur tagihan tidak ditemukan atau tautan telah kedaluwarsa.');
        setLoading(false);
      }
    };

    loadPayInfo();

    return () => {
      if (pollerId) clearInterval(pollerId);
    };
  }, [invoiceIdentifier]);

  // 2. Countdown Timer for QRIS Expiration
  useEffect(() => {
    if (!payInfo?.qris_transaction?.expiry_time || isSettled) {
      return;
    }

    const updateTimer = () => {
      const expiry = new Date(payInfo.qris_transaction!.expiry_time).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(diff);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [payInfo, isSettled]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getQRImageUrl = () => {
    if (payInfo?.qris_transaction?.qr_url) {
      return payInfo.qris_transaction.qr_url;
    }
    if (payInfo?.qris_transaction?.qr_string) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(payInfo.qris_transaction.qr_string)}`;
    }
    if (payInfo?.payment_settings?.qris_image_url) {
      return payInfo.payment_settings.qris_image_url;
    }
    const defaultPayload =
      payInfo?.payment_settings?.qris_payload ||
      `00020101021126600016ID.CO.QRIS.WWW01189360052300000123455204599953033605802ID5924${(payInfo?.payment_settings?.bank_account_holder || payInfo?.workspace_name || 'PT MAJU BERSAMA').slice(0, 24).toUpperCase()}6007JAKARTA61051011062070703A0163045E1A`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(defaultPayload)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <h2 className="text-sm font-bold text-slate-800">Memuat Faktur Tagihan Resmi...</h2>
        <p className="text-xs text-slate-400 mt-1">Menghubungkan ke gerbang pembayaran aman OCTO Platform</p>
      </div>
    );
  }

  if (error || !payInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center border border-slate-200 shadow-xl space-y-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Faktur Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 mt-1">{error || 'Tautan tagihan ini tidak valid.'}</p>
          </div>
          <p className="text-[11px] text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200">
            Silakan hubungi staf penagihan atau sales representative perusahaan terkait untuk mendapatkan tautan faktur yang valid.
          </p>
        </div>
      </div>
    );
  }

  const { invoice, workspace_name, payment_settings, qris_transaction } = payInfo;
  const qrImage = getQRImageUrl();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-slate-100 py-6 px-4 md:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header & Verified Merchant Banner */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#142740] to-emerald-700 text-white flex items-center justify-center font-black text-sm shadow-sm">
              {(workspace_name || 'PT').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-extrabold text-sm text-[#142740]">
                  {payment_settings.bank_account_holder || workspace_name}
                </h1>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Merchant Resmi Terverifikasi</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Portal Pembayaran Tagihan Resmi Klien • Bank Indonesia &amp; ASPI Standard
              </p>
            </div>
          </div>

          <div className="self-start sm:self-center">
            {isSettled ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 text-white text-xs font-black rounded-xl shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>LUNAS / PAID</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>MENUNGGU PEMBAYARAN</span>
              </span>
            )}
          </div>
        </header>

        {/* Invoice Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden">
          {/* Card Top: Amount & Invoice Info */}
          <div className="p-6 md:p-8 bg-gradient-to-r from-[#142740] via-teal-900 to-emerald-950 text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300 block">
                  Total Tagihan Invoice
                </span>
                <div className="text-3xl md:text-4xl font-black text-white mt-1 tracking-tight">
                  {formatCurrencyIDR(invoice.total_amount)}
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1">
                <div className="inline-block bg-white/10 backdrop-blur-xs px-3 py-1 rounded-xl text-xs font-mono font-bold text-white border border-white/20">
                  {invoice.invoice_number}
                </div>
                <div className="text-[11px] text-slate-300">
                  Jatuh Tempo: <strong className="text-white">{formatDateIndo(invoice.due_date)}</strong>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ditagihkan Kepada:</span>
                <strong className="text-white text-sm">{invoice.contact_name || 'Klien Pelanggan'}</strong>
                {invoice.company_name && (
                  <span className="block text-[11px] text-emerald-200">{invoice.company_name}</span>
                )}
              </div>
              <div className="sm:text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tanggal Terbit:</span>
                <span>{formatDateIndo(invoice.issue_date)}</span>
              </div>
            </div>
          </div>

          {/* CELEBRATION BANNER IF ALREADY PAID */}
          {isSettled ? (
            <div className="p-8 text-center bg-emerald-50/50 space-y-4 border-b border-emerald-100">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-emerald-950">
                  PEMBAYARAN TELAH BERHASIL DITERIMA!
                </h3>
                <p className="text-xs text-emerald-800">
                  Tagihan faktur <strong className="font-mono">{invoice.invoice_number}</strong> telah berstatus lunas. Sistem otomatis telah mencatat dan memperbarui status pesanan Anda.
                </p>
                {invoice.paid_at && (
                  <p className="text-[11px] text-emerald-600 font-mono">
                    Waktu Pelunasan: {formatDateTimeIndo(invoice.paid_at)}
                  </p>
                )}
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Unduh Bukti Faktur Lunas (PDF)</span>
                </button>
              </div>
            </div>
          ) : (
            /* PAYMENT OPTIONS CONTAINER */
            <div className="p-6 md:p-8 space-y-6">
              {/* Payment Method Switcher Tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setPayTab('qris')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    payTab === 'qris'
                      ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Scan QRIS Instan (GoPay &amp; Seluruh Bank)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayTab('bank')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    payTab === 'bank'
                      ? 'bg-white text-[#142740] shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-4 h-4 text-[#00AFC4]" />
                  <span>Transfer Rekening Bank PT</span>
                </button>
              </div>

              {/* TAB 1: QRIS INSTANT */}
              {payTab === 'qris' && (
                <div className="space-y-4 text-center">
                  <div className="bg-white rounded-3xl border-2 border-slate-300 overflow-hidden shadow-md max-w-sm mx-auto text-left">
                    {/* Official Red ASPI Header */}
                    <div className="bg-[#ED1C24] text-white px-4 py-2.5 text-center flex flex-col items-center justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-lg tracking-wider leading-none">QRIS</span>
                        {qris_transaction?.provider === 'autogopay' && (
                          <span className="text-[9px] bg-white text-slate-900 px-1.5 py-0.2 rounded font-black uppercase">
                            GoPay Dynamic
                          </span>
                        )}
                      </div>
                      <div className="text-[7.5px] font-bold tracking-widest uppercase opacity-95 mt-0.5">
                        Quick Response Code Indonesian Standard
                      </div>
                    </div>

                    {/* Merchant & NMID */}
                    <div className="p-3 text-center border-b border-slate-100 bg-slate-50/70">
                      <div className="font-black text-xs text-slate-900 uppercase truncate">
                        {payment_settings.autogopay_merchant_name || payment_settings.bank_account_holder || workspace_name}
                      </div>
                      <div className="text-[8.5px] font-mono font-semibold text-slate-400 mt-0.5">
                        {qris_transaction?.order_id ? `Order: ${qris_transaction.order_id}` : 'NMID: ID1020039281921 • ASPI Switch'}
                      </div>
                    </div>

                    {/* Expiration Timer Banner if AutoGoPay Dynamic */}
                    {timeRemaining > 0 && (
                      <div className="bg-amber-50 px-3 py-1.5 text-center border-b border-amber-100 flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                        <span>Sisa Waktu Pembayaran: <strong className="font-mono text-amber-950">{formatTimer(timeRemaining)}</strong></span>
                      </div>
                    )}

                    {/* Scannable Barcode Image */}
                    <div className="p-4 bg-white flex flex-col items-center justify-center">
                      <div className="w-52 h-52 bg-white p-2 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center">
                        <img
                          src={qrImage}
                          alt="QRIS Barcode Pembayaran"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="mt-3 text-center">
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 inline-block">
                          {formatCurrencyIDR(invoice.total_amount)} (Tepat Presisi)
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 mt-2 tracking-wide uppercase">
                          Scan via BCA Mobile • Mandiri • BRImo • GoPay • OVO • DANA • ShopeePay
                        </p>
                      </div>

                      {/* Smartphone Convenience Actions */}
                      <div className="mt-3.5 w-full space-y-2 pt-3 border-t border-slate-100">
                        {qris_transaction?.checkout_url && (
                          <a
                            href={qris_transaction.checkout_url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                          >
                            <span>📱 Bayar Cepat via Aplikasi GoPay</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        <a
                          href={qrImage}
                          download={`QRIS-${invoice.invoice_number}.png`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>📥 Simpan Gambar Barcode ke Galeri HP</span>
                        </a>
                      </div>
                    </div>

                    {/* ASPI Footer */}
                    <div className="bg-slate-100 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[7.5px] font-bold text-slate-600">
                      <span>ASPI • GPN • BANK INDONESIA</span>
                      <span className="flex items-center gap-1 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Verifikasi Otomatis Aktif</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    💡 <strong>Tips Pembayaran:</strong> Cukup buka aplikasi perbankan atau e-wallet pilihan Anda, pilih menu <strong>Scan / Bayar</strong>, lalu arahkan ke barcode di atas. Status pembayaran akan terverifikasi lunas seketika.
                  </p>
                </div>
              )}

              {/* TAB 2: TRANSFER BANK MANUAL */}
              {payTab === 'bank' && (
                <div className="space-y-4 max-w-lg mx-auto">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-semibold">Bank Tujuan Resmi:</span>
                      <strong className="text-sm font-black text-[#142740]">
                        {payment_settings.bank_name || 'Bank Central Asia (BCA)'}
                      </strong>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-semibold">Nomor Rekening PT:</span>
                        <span className="font-mono text-lg md:text-xl font-black text-slate-900 tracking-wider">
                          {payment_settings.bank_account_number || '880129994012'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(payment_settings.bank_account_number || '880129994012');
                          setCopiedBank(true);
                          setTimeout(() => setCopiedBank(false), 2000);
                        }}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                      >
                        {copiedBank ? (
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
                      <span className="text-slate-500 font-semibold">Atas Nama Penerima:</span>
                      <strong className="text-xs font-bold text-slate-800 text-right">
                        {payment_settings.bank_account_holder || workspace_name}
                      </strong>
                    </div>
                  </div>

                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-100 text-[11px] text-teal-800 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>
                      Dana transfer langsung masuk ke rekening giro/operasional resmi perusahaan tanpa potongan biaya pihak ketiga.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Items Breakdown Table */}
          <div className="p-6 md:p-8 border-t border-slate-100 space-y-4">
            <h4 className="text-xs font-extrabold text-[#142740] uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Rincian Barang &amp; Jasa</span>
            </h4>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                    <th className="py-2.5 px-4">Item &amp; Layanan</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-4 text-right">Harga</th>
                    <th className="py-2.5 px-4 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((it, idx) => (
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
                        {invoice.notes || 'Pengadaan Paket Solusi CRM Enterprise'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="flex justify-end text-xs">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrencyIDR(invoice.subtotal)}</span>
                </div>
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN (11%):</span>
                    <span>{formatCurrencyIDR(invoice.tax_amount)}</span>
                  </div>
                )}
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Diskon:</span>
                    <span>-{formatCurrencyIDR(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-[#142740]">
                  <span>Total Tagihan:</span>
                  <span className="text-emerald-700">{formatCurrencyIDR(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions & Terms */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>{invoice.terms || 'Terima kasih atas kerja sama dan kepercayaan Anda.'}</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Unduh PDF</span>
            </button>
          </div>
        </div>

        {/* Brand Watermark */}
        <div className="text-center text-[11px] text-slate-400">
          Powered by <strong>OCTO CRM</strong> • Gerbang Pembayaran Aman &amp; Terverifikasi
        </div>
      </div>
    </div>
  );
}
