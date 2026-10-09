'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Trophy,
  Plus,
  Play,
  Shuffle,
  Users,
  LogOut,
  Calendar,
  MapPin,
  Trash2,
  Sparkles,
  Tv,
  Coffee,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { clientDb, Tournament } from '@/lib/client-db';
import { createCoffee28Bracket, createStandardKnockoutBracket } from '@/lib/bracket-generator';
import { Download, Upload } from 'lucide-react';
import { showAlert } from '@/lib/sweetalert';
import { useSessionGuard } from '@/hooks/useSessionGuard';

export default function DashboardPage() {
  const router = useRouter();
  const { handleLogout } = useSessionGuard();
  const [user, setUser] = useState<{ id: string; username: string; name: string } | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // New Tournament Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('Championship Knockdown Competition');
  const [newLocation, setNewLocation] = useState('Main Stage');
  const [newDate, setNewDate] = useState('10 - 11 Oktober 2026');
  const [newFormat, setNewFormat] = useState<'coffee-28' | 'knockout-standard'>('coffee-28');
  const [creating, setCreating] = useState(false);

  const fetchData = () => {
    try {
      const currentUser = clientDb.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      const list = clientDb.getTournaments();
      setTournaments(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedSample = () => {
    setSeeding(true);
    try {
      clientDb.seedSampleTournament();
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setCreating(true);

    try {
      const tournamentId = `trn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const generated =
        newFormat === 'coffee-28'
          ? createCoffee28Bracket([])
          : createStandardKnockoutBracket([]);

      const newTournament: Tournament = {
        id: tournamentId,
        userId: user?.id || 'user_admin',
        title: newTitle,
        subtitle: newSubtitle,
        location: newLocation,
        date: newDate,
        format: newFormat,
        status: 'draft',
        participants: [],
        unassignedParticipantIds: [],
        rounds: generated.rounds,
        matches: generated.matches,
        grandFinalists: generated.grandFinalists,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      clientDb.saveTournament(newTournament);
      setShowCreateModal(false);
      router.push(`/tournament/${newTournament.id}/setup`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showAlert.confirm({
      title: 'Hapus Turnamen?',
      text: `Turnamen "${title}" beserta seluruh peserta dan bagan pertandingannya akan dihapus permanen.`,
      confirmText: 'Ya, Hapus Turnamen',
      cancelText: 'Batal',
      isDanger: true,
    });
    if (!confirmed) return;
    clientDb.deleteTournament(id);
    showAlert.success('Terhapus!', 'Turnamen berhasil dihapus.');
    fetchData();
  };

  const handleExportData = () => {
    const dataStr = clientDb.exportData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spinbracket_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert.success('Backup Siap!', 'File data backup JSON berhasil diunduh.', 2000);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = clientDb.importData(content);
        if (ok) {
          await showAlert.success('Data Berhasil Di-import!', 'Seluruh turnamen dan data peserta berhasil dipulihkan.');
          fetchData();
        } else {
          showAlert.error('Format Tidak Valid', 'File JSON yang diunggah tidak memiliki struktur data turnamen yang sesuai.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center text-gold-400 font-bold">
        Memuat Dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-coffee-950 via-coffee-900 to-black text-white">
      {/* Navbar */}
      <header className="border-b border-coffee-800 bg-coffee-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gold-500/20 border border-gold-500/50">
              <Coffee className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-gold-400">
                SPINBRACKET ARENA
              </div>
              <div className="text-xs text-coffee-300">Sistem Bagan TV & Undian Spinwheel Interaktif</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-white">{user?.name}</div>
              <div className="text-xs text-coffee-400 font-mono">@{user?.username}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-coffee-800/80 hover:bg-red-900/50 text-coffee-300 hover:text-red-300 border border-coffee-700 transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Banner Section */}
        <div className="relative rounded-3xl bg-gradient-to-r from-coffee-900 via-coffee-850 to-coffee-900 border border-gold-500/30 p-8 mb-10 overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Stage Ready Tournament Engine
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
              Kelola & Tampilkan Turnamen di Layar Panggung TV
            </h1>
            <p className="text-coffee-300 text-sm md:text-base leading-relaxed mb-6">
              Sistem knockout throwdown dengan undian live spinwheel, tampilan bagan otomatis yang pas 1 layar TV tanpa scroll, gimmick perayaan pemenang, dan penyimpanan database aman.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-sm shadow-[0_0_20px_rgba(234,179,8,0.4)] active:scale-95 transition"
              >
                <Plus className="w-5 h-5" />
                Buat Turnamen Baru
              </button>

              <button
                onClick={handleSeedSample}
                disabled={seeding}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-coffee-800/90 hover:bg-coffee-700/90 text-gold-300 border border-gold-500/40 font-bold text-sm shadow transition"
              >
                <Coffee className="w-5 h-5 text-gold-400" />
                {seeding ? 'Memuat Contoh...' : 'Muat Contoh KKB 2026 (28 Peserta)'}
              </button>
            </div>
          </div>

          <div className="absolute -right-10 -bottom-10 opacity-20 pointer-events-none">
            <Trophy className="w-80 h-80 text-gold-400" />
          </div>
        </div>

        {/* Tournaments List Section */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Daftar Turnamen Tersimpan</h2>
            <p className="text-sm text-coffee-400">Pilih turnamen untuk membuka layar TV atau mengundi peserta</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportData}
              title="Download backup file JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coffee-850 hover:bg-coffee-800 text-coffee-200 border border-coffee-700 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5 text-gold-400" />
              Backup JSON
            </button>
            <label
              title="Restore data dari file JSON"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-coffee-850 hover:bg-coffee-800 text-coffee-200 border border-coffee-700 text-xs font-semibold cursor-pointer transition"
            >
              <Upload className="w-3.5 h-3.5 text-gold-400" />
              Restore JSON
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>
            <div className="text-sm font-semibold text-gold-400 bg-gold-500/10 px-3 py-1.5 rounded-lg border border-gold-500/30">
              Total: {tournaments.length} Turnamen
            </div>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-coffee-950/60 border border-coffee-800 p-8">
            <div className="w-16 h-16 rounded-full bg-coffee-800/60 mx-auto flex items-center justify-center text-coffee-400 mb-4">
              <Trophy className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Belum ada turnamen</h3>
            <p className="text-sm text-coffee-400 max-w-md mx-auto mb-6">
              Mulai dengan membuat turnamen baru atau klik tombol &quot;Muat Contoh KKB 2026 (28 Peserta)&quot; untuk langsung mencoba bagan panggung.
            </p>
            <button
              onClick={handleSeedSample}
              disabled={seeding}
              className="px-6 py-3 rounded-xl bg-gold-500 text-coffee-950 font-bold hover:bg-gold-400 transition"
            >
              {seeding ? 'Memuat...' : 'Muat Contoh KKB 2026'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((t) => {
              const totalParticipants = t.participants?.length || 0;
              const hasWinners = !!t.winners?.first;

              return (
                <div
                  key={t.id}
                  className="group rounded-3xl bg-gradient-to-b from-coffee-850 to-coffee-900 border border-coffee-700/80 hover:border-gold-500/60 p-6 flex flex-col justify-between transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(234,179,8,0.2)]"
                >
                  <div>
                    {/* Top status */}
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          hasWinners
                            ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                            : t.status === 'in_progress'
                            ? 'bg-amber-950 border border-amber-500/60 text-amber-300'
                            : 'bg-coffee-800 border border-coffee-600 text-coffee-300'
                        }`}
                      >
                        {hasWinners ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selesai (Ada Juara)
                          </>
                        ) : t.status === 'in_progress' ? (
                          <>
                            <Clock className="w-3.5 h-3.5" /> Sedang Berlangsung
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5" /> Persiapan / Draft
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => handleDelete(t.id, t.title)}
                        className="text-coffee-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 transition"
                        title="Hapus Turnamen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-xl font-black text-white group-hover:text-gold-300 transition line-clamp-2 mb-2">
                      {t.title}
                    </h3>
                    <p className="text-xs text-coffee-300 line-clamp-1 mb-4 font-medium">
                      {t.subtitle}
                    </p>

                    <div className="space-y-2 text-xs text-coffee-400 mb-6 bg-coffee-950/60 p-3 rounded-xl border border-coffee-800">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gold-400" />
                        <span>Peserta: <b className="text-white">{totalParticipants} Orang</b></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gold-400" />
                        <span className="truncate">Lokasi: {t.location || 'Stage'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gold-400" />
                        <span>Tanggal: {t.date || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5 pt-2 border-t border-coffee-800">
                    <Link
                      href={`/tournament/${t.id}/tv`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 font-black text-sm shadow transition active:scale-95"
                    >
                      <Tv className="w-4 h-4" />
                      Buka Layar TV (Bagan)
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/tournament/${t.id}/wheel`}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-gold-300 border border-coffee-700 text-xs font-bold transition"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        Undi Spinwheel
                      </Link>

                      <Link
                        href={`/tournament/${t.id}/setup`}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-coffee-200 border border-coffee-700 text-xs font-bold transition"
                      >
                        <Users className="w-3.5 h-3.5" />
                        Atur Peserta
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Buat Turnamen */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-coffee-900 border border-gold-500/60 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-2xl font-black text-gold-300 mb-2">Buat Turnamen Baru</h3>
            <p className="text-xs text-coffee-300 mb-6">
              Masukkan detail acara. Peserta dan foto dapat ditambahkan setelahnya.
            </p>

            <form onSubmit={handleCreateTournament} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
                  Nama Turnamen *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: KKB 2026 MANUAL BREWING THROWDOWN"
                  className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-3 text-white placeholder-coffee-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
                  Subtitle / Kategori
                </label>
                <input
                  type="text"
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Contoh: TOURNAMENT BRACKET 28 PESERTA → 3 JUARA"
                  className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-3 text-white placeholder-coffee-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
                    Lokasi / Venue
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Bank Indonesia Banten"
                    className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-3 text-white placeholder-coffee-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
                    Tanggal
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    placeholder="10 - 11 Oktober 2026"
                    className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-3 text-white placeholder-coffee-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-coffee-200 uppercase tracking-wider mb-2">
                  Format Bagan Kompetisi
                </label>
                <select
                  value={newFormat}
                  onChange={(e) => setNewFormat(e.target.value as any)}
                  className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-3 text-white focus:outline-none"
                >
                  <option value="coffee-28">
                    🏆 Bagan Dinamis Knockdown Throwdown (Fleksibel Berapapun Peserta: 16, 24, 28, 36, 48+ dll)
                  </option>
                  <option value="knockout-standard">
                    ⚔️ Single Elimination Standar Bracket (Dinamis dengan Automatic BYE)
                  </option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-coffee-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-coffee-300 text-sm font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 text-sm font-black transition"
                >
                  {creating ? 'Membuat...' : 'Lanjut ke Pengisian Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
