'use client';

import React, { useEffect, useState } from 'react';
import { useAuth, formatCurrencyIDR } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Product, ProductStockMovement } from '@/types';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  CheckCircle2,
  SlidersHorizontal,
  X,
  TrendingUp,
  Tag,
} from 'lucide-react';

export default function InventoryPage() {
  const { currentWorkspace, activeRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<ProductStockMovement[]>([]);

  // Add Product Form
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Hardware & Gadgets');
  const [formDescription, setFormDescription] = useState('');
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formSalePrice, setFormSalePrice] = useState<number>(0);
  const [formStockQty, setFormStockQty] = useState<number>(10);
  const [formMinAlert, setFormMinAlert] = useState<number>(5);
  const [formUnit, setFormUnit] = useState('Pcs');
  const [submitting, setSubmitting] = useState(false);

  // Adjust Stock Form
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustNotes, setAdjustNotes] = useState('');

  const isOwnerOrAdmin =
    activeRole === 'owner' ||
    activeRole === 'admin' ||
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.role === 'admin';

  const loadProducts = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const data = await api.listProducts(currentWorkspace.id, search, categoryFilter);
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [currentWorkspace, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      setSubmitting(true);
      await api.createProduct(currentWorkspace.id, {
        sku: formSku,
        name: formName,
        category: formCategory,
        description: formDescription,
        cost_price: Number(formCostPrice),
        sale_price: Number(formSalePrice),
        stock_quantity: Number(formStockQty),
        min_stock_alert: Number(formMinAlert),
        unit: formUnit,
      });
      setShowAddModal(false);
      resetAddForm();
      loadProducts();
    } catch (e: any) {
      alert(e.message || 'Gagal menambahkan produk');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAddForm = () => {
    setFormSku('');
    setFormName('');
    setFormCategory('Hardware & Gadgets');
    setFormDescription('');
    setFormCostPrice(0);
    setFormSalePrice(0);
    setFormStockQty(10);
    setFormMinAlert(5);
    setFormUnit('Pcs');
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !selectedProduct) return;
    try {
      setSubmitting(true);
      await api.adjustStock(currentWorkspace.id, selectedProduct.id, adjustQty, adjustType, adjustNotes);
      setShowAdjustModal(false);
      setAdjustNotes('');
      setAdjustQty(1);
      loadProducts();
    } catch (e: any) {
      alert(e.message || 'Gagal menyesuaikan stok');
    } finally {
      setSubmitting(false);
    }
  };

  const openMovements = async (p: Product) => {
    if (!currentWorkspace) return;
    setSelectedProduct(p);
    setShowMovementsModal(true);
    try {
      const data = await api.listStockMovements(currentWorkspace.id, p.id);
      setMovements(data);
    } catch (e) {
      console.error(e);
    }
  };

  // KPI Calculations
  const totalItems = products.length;
  const totalAssetValue = products.reduce((acc, p) => acc + p.stock_quantity * p.cost_price, 0);
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.min_stock_alert).length;

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Inventori & Manajemen Produk"
        subtitle="Katalog barang, alokasi stok penjualan, dan histori pergerakan barang gudang"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-[#00AFC4] flex items-center justify-center font-bold">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Produk Terdaftar</span>
              <div className="text-2xl font-black text-[#142740]">{totalItems} SKU</div>
              <p className="text-[11px] text-slate-400">Aktif di katalog penjualan</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Nilai Aset Stok</span>
              <div className="text-2xl font-black text-emerald-600">{formatCurrencyIDR(totalAssetValue)}</div>
              <p className="text-[11px] text-slate-400">Berdasarkan Harga Pokok Penjualan (HPP)</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peringatan Stok Menipis</span>
              <div className={`text-2xl font-black ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {lowStockCount} Produk
              </div>
              <p className="text-[11px] text-slate-400">Perlu restock dari pemasok</p>
            </div>
          </div>
        </div>

        {/* Toolbar: Search, Filter & Add Button */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama produk atau kode SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00AFC4] text-slate-800"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold text-white bg-[#00AFC4] hover:bg-[#009bb0] rounded-xl transition cursor-pointer"
            >
              Cari
            </button>
          </form>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Kategori</option>
              <option value="Hardware & Gadgets">Hardware & Gadgets</option>
              <option value="Software Subscription">Software Subscription</option>
              <option value="Jasa Layanan">Jasa Layanan</option>
              <option value="Umum">Umum</option>
            </select>

            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#142740] hover:bg-slate-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Produk</span>
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-5">Kode SKU & Produk</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Harga Pokok (HPP)</th>
                  <th className="py-3 px-4">Harga Jual</th>
                  <th className="py-3 px-4">Est. Margin</th>
                  <th className="py-3 px-4">Persediaan (Stok)</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-[#00AFC4] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Memuat daftar inventori...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada data produk di inventori.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const margin = p.sale_price > 0 ? Math.round(((p.sale_price - p.cost_price) / p.sale_price) * 100) : 0;
                    const isLow = p.stock_quantity <= p.min_stock_alert;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                        <td className="py-3.5 px-5">
                          <div className="font-extrabold text-sm text-[#142740]">{p.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                              {p.sku}
                            </span>
                            {p.description && (
                              <span className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-600">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
                            {p.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">{formatCurrencyIDR(p.cost_price)}</td>
                        <td className="py-3.5 px-4 font-extrabold text-[#142740]">{formatCurrencyIDR(p.sale_price)}</td>

                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${margin >= 40 ? 'bg-emerald-50 text-emerald-700' : margin > 0 ? 'bg-cyan-50 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}>
                            {margin}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-extrabold ${isLow ? 'text-amber-600' : 'text-[#142740]'}`}>
                              {p.stock_quantity} {p.unit}
                            </span>
                            {isLow && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Menipis
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProduct(p);
                                setShowAdjustModal(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                            >
                              Sesuaikan Stok
                            </button>
                            <button
                              type="button"
                              onClick={() => openMovements(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition cursor-pointer"
                              title="Riwayat Pergerakan Stok"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= MODAL: ADD PRODUCT ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#00AFC4]" />
                <span>Tambah Produk Baru ke Inventori</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: OCTO-PRO-01"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="Hardware & Gadgets">Hardware & Gadgets</option>
                    <option value="Software Subscription">Software Subscription</option>
                    <option value="Jasa Layanan">Jasa Layanan</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mesin POS Android Dual Screen"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keterangan Singkat</label>
                <input
                  type="text"
                  placeholder="Spesifikasi atau informasi garansi..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Pokok (HPP / Beli)</label>
                  <input
                    type="number"
                    required
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual Dasar</label>
                  <input
                    type="number"
                    required
                    value={formSalePrice}
                    onChange={(e) => setFormSalePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    required
                    value={formStockQty}
                    onChange={(e) => setFormStockQty(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Minimum</label>
                  <input
                    type="number"
                    required
                    value={formMinAlert}
                    onChange={(e) => setFormMinAlert(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-bold text-white bg-[#00AFC4] rounded-xl hover:bg-[#009bb0] cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADJUST STOCK ================= */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#142740]">Penyesuaian Stok Barang</h3>
                <p className="text-xs text-slate-400">{selectedProduct.name} ({selectedProduct.sku})</p>
              </div>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600">Stok Saat Ini:</span>
                <strong className="text-sm text-[#142740]">{selectedProduct.stock_quantity} {selectedProduct.unit}</strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Penyesuaian</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('in')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${adjustType === 'in' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    + Barang Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('out')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${adjustType === 'out' ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    - Barang Keluar
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('adjustment')}
                    className={`py-2 text-xs font-bold rounded-xl border cursor-pointer ${adjustType === 'adjustment' ? 'bg-cyan-50 border-cyan-300 text-cyan-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    Set Stok Fisik
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {adjustType === 'adjustment' ? 'Jumlah Total Stok Sebenarnya:' : 'Jumlah Perubahan:'}
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan / Alasan Penyesuaian</label>
                <input
                  type="text"
                  placeholder="Contoh: Penerimaan PO Pemasok #1029 / Rusak / Stok Opname"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-bold text-white bg-[#00AFC4] rounded-xl hover:bg-[#009bb0] cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : 'Terapkan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: STOCK MOVEMENTS AUDIT ================= */}
      {showMovementsModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-[#142740]">Riwayat Pergerakan Stok</h3>
                <p className="text-xs text-slate-400">{selectedProduct.name} ({selectedProduct.sku})</p>
              </div>
              <button onClick={() => setShowMovementsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
              {movements.length === 0 ? (
                <div className="py-8 text-center text-slate-400">Belum ada riwayat mutasi stok untuk produk ini.</div>
              ) : (
                movements.map((m) => (
                  <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.type === 'in' ? 'bg-emerald-100 text-emerald-800' : m.type === 'out' || m.type === 'deal_won' ? 'bg-rose-100 text-rose-800' : 'bg-cyan-100 text-cyan-800'}`}>
                          {m.type.toUpperCase()}
                        </span>
                        <strong className="text-slate-800">{m.quantity} {selectedProduct.unit}</strong>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{m.notes || 'Perubahan stok terverifikasi'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
