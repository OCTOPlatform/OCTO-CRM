'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import { Attendance, AttendanceSummary } from '@/types';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Send,
  Sparkles,
} from 'lucide-react';

export default function AttendancePage() {
  const { currentWorkspace, user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter month
  const [month, setMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Check-In Form
  const [notes, setNotes] = useState('');
  const [locName, setLocName] = useState('Kantor Pusat / Kunjungan Klien');
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number }>({
    lat: -6.2088,
    lng: 106.8456,
  });

  const loadData = async () => {
    if (!currentWorkspace) return;
    try {
      setLoading(true);
      const [today, list, sum] = await Promise.all([
        api.getTodayAttendance(currentWorkspace.id),
        api.listAttendances(currentWorkspace.id, month),
        api.getAttendanceSummary(currentWorkspace.id, month),
      ]);
      setTodayAttendance(today);
      setAttendances(list);
      setSummary(sum);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Fetch browser geolocation if available
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.log('GPS default used:', err.message);
        }
      );
    }
  }, [currentWorkspace, month]);

  const handleCheckIn = async () => {
    if (!currentWorkspace) return;
    try {
      setSubmitting(true);
      await api.checkIn(currentWorkspace.id, {
        gps_lat: liveCoords.lat,
        gps_lng: liveCoords.lng,
        location_name: locName,
        notes: notes || 'Presensi hadir via Web Portal',
      });
      setNotes('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal melakukan check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentWorkspace) return;
    try {
      setSubmitting(true);
      await api.checkOut(currentWorkspace.id, notes || 'Check-out selesai jam kerja');
      setNotes('');
      loadData();
    } catch (e: any) {
      alert(e.message || 'Gagal melakukan check-out');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Navbar
        title="Presensi & Absensi Tim (GPS & Selfie)"
        subtitle="Pencatatan kehadiran staf, check-in kunjungan lapangan, dan rekapitulasi jam kerja"
      />

      <div className="p-6 md:p-8 space-y-6 max-w-7xl">
        {/* Quick Check-In / Check-Out Hero Card */}
        <div className="bg-gradient-to-r from-[#142740] via-slate-900 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Left: Clock & Status */}
            <div className="md:col-span-2 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-bold backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <h2 className="text-2xl md:text-3xl font-black">
                {todayAttendance?.check_out
                  ? 'Presensi Hari Ini Selesai ✨'
                  : todayAttendance?.check_in
                  ? 'Sedang Aktif Bekerja (Checked-In) 🟢'
                  : 'Belum Presensi Masuk Hari Ini ⏱️'}
              </h2>

              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {todayAttendance?.check_in ? (
                  <span>
                    Masuk pada pukul{' '}
                    <strong className="text-white">
                      {new Date(todayAttendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </strong>{' '}
                    di lokasi <strong>{todayAttendance.location_name || 'Kantor'}</strong>.
                  </span>
                ) : (
                  'Pastikan Anda berada di area kerja atau lokasi kunjungan klien saat menekan tombol check-in presensi.'
                )}
              </p>

              {/* Geolocation Tag */}
              <div className="flex items-center gap-2 text-[11px] text-cyan-200">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  Koordinat GPS: {liveCoords.lat.toFixed(4)}, {liveCoords.lng.toFixed(4)} ({locName})
                </span>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-md space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-200 mb-1">
                  Catatan Aktivitas / Kunjungan:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Meeting klien PT Maju / Standby toko"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white/20 border border-white/20 rounded-xl text-white placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-300"
                />
              </div>

              {!todayAttendance?.check_in ? (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={submitting}
                  className="w-full py-3 bg-[#00AFC4] hover:bg-[#009bb0] text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{submitting ? 'Mencatat...' : 'Check-In Presensi (GPS)'}</span>
                </button>
              ) : !todayAttendance?.check_out ? (
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={submitting}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Memproses...' : 'Check-Out Selesai Kerja'}</span>
                </button>
              ) : (
                <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-center text-xs font-bold text-emerald-200">
                  Presensi lengkap hari ini telah tersimpan!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Summary KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hari Hadir</span>
              <div className="text-2xl font-black text-emerald-600">{summary?.total_days_present || 0} Hari</div>
              <p className="text-[11px] text-slate-400">Periode bulan {month}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frekuensi Keterlambatan</span>
              <div className="text-2xl font-black text-amber-600">{summary?.total_late_count || 0} Kali</div>
              <p className="text-[11px] text-slate-400">Check-in setelah pukul 09:15</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Akumulasi Lembur</span>
              <div className="text-2xl font-black text-purple-600">{(summary?.total_overtime || 0).toFixed(1)} Jam</div>
              <p className="text-[11px] text-slate-400">Waktu kerja di atas jam 18:00</p>
            </div>
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-base text-[#142740] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#00AFC4]" />
                <span>Riwayat Presensi Staf</span>
              </h3>
              <p className="text-xs text-[#586779]">
                Catatan jam masuk, pulang, stempel lokasi GPS, dan komputasi lembur tim
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Pilih Bulan:</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="py-3 px-5">Nama Karyawan</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Jam Masuk</th>
                  <th className="py-3 px-4">Jam Pulang</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Lembur</th>
                  <th className="py-3 px-5 text-right">Lokasi GPS & Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-[#00AFC4] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      Memuat data presensi...
                    </td>
                  </tr>
                ) : attendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada data presensi pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-5">
                        <strong className="text-slate-800">{att.user_name || 'Staff Member'}</strong>
                        <div className="text-[10px] text-slate-400">{att.user_email}</div>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {new Date(att.date).toLocaleDateString('id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                        {att.check_in
                          ? new Date(att.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {att.check_out
                          ? new Date(att.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : att.status === 'late'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {att.status === 'present' ? 'Hadir Tepat Waktu' : att.status === 'late' ? 'Terlambat' : att.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-purple-700">
                        {att.overtime_hours > 0 ? `${att.overtime_hours.toFixed(1)} Jam` : '-'}
                      </td>

                      <td className="py-3 px-5 text-right">
                        <div className="text-slate-700 font-semibold truncate max-w-xs ml-auto">
                          {att.location_name || 'Area Kantor'}
                        </div>
                        {att.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs ml-auto">{att.notes}</div>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
