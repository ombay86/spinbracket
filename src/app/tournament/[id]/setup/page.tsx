'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Plus,
  Trash2,
  ArrowRight,
  Upload,
  Coffee,
  Check,
  Tv,
  Shuffle,
  ArrowLeft,
  Camera,
  Sparkles,
} from 'lucide-react';
import { clientDb, Tournament, Participant } from '@/lib/client-db';
import { createDynamicBracket } from '@/lib/bracket-generator';
import { showAlert } from '@/lib/sweetalert';
import { useSessionGuard } from '@/hooks/useSessionGuard';

const sampleNames = [
  'Dimas Aditya', 'Siti Rahma', 'Budi Santoso', 'Rian Pratama',
  'Ahmad Fauzi', 'Nadia Putri', 'Eko Prasetyo', 'Fajar Nugraha',
  'Kevin Sanjaya', 'Maya Anggraini', 'Reza Firmansyah', 'Dewi Lestari',
  'Hendra Gunawan', 'Rizky Ramadhan', 'Andi Wijaya', 'Lia Kartika',
  'Farhan Maulana', 'Bayu Saputra', 'Indah Permata', 'Tommy Kurniawan',
  'Riko Pratama', 'Gita Savitri', 'Arif Hidayat', 'Vina Panduwinata',
  'Yoga Pratama', 'Dini Fitria', 'Iqbal Ramli', 'Zahra Amalia',
];

const sampleShops = [
  'Anomali Coffee', 'Smoking Barrels', 'Giyanti Coffee', 'Ombay Roastery',
  'Space Roastery', 'Klinik Kopi', 'Tanamera Coffee', 'Common Grounds',
  'Morph Coffee Serang', 'Two Hands Full', 'Satu Kata Kopi Cilegon', 'Titik Temu',
  'Seniman Coffee Ubud', 'Hungry Bird Canggu', 'Toko Kopi Djawa', 'Kopi Manyar',
  'Kopikalyan BSD', 'Wheelhouse Surabaya', 'Korte Chocolate & Coffee', 'Kyo Coffee',
  'Djournal Tangerang', 'Kopi Praja Bintaro', 'First Crack Coffee', 'Monolog Quality',
  'Koffie Fabriek Banten', 'Simetri Coffee', 'Crematology Coffee', 'Work Coffee',
];

export default function ParticipantSetupPage() {
  const router = useRouter();
  useSessionGuard();
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form input for new participant
  const [newName, setNewName] = useState('');
  const [newAffiliation, setNewAffiliation] = useState('');
  const [newPhoto, setNewPhoto] = useState('');

  const fetchTournament = () => {
    try {
      const t = clientDb.getTournamentById(tournamentId);
      if (!t) {
        router.push('/dashboard');
        return;
      }
      setTournament(t);
      setParticipants(t.participants || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  // Handle Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (typeof index === 'number') {
        // Edit existing participant photo
        setParticipants((prev) =>
          prev.map((p, idx) => (idx === index ? { ...p, photo: base64 } : p))
        );
      } else {
        // Add new participant photo
        setNewPhoto(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add single participant
  const handleAddParticipant = () => {
    if (!newName.trim()) return;

    const newParticipant: Participant = {
      id: `p_${Date.now()}_${participants.length + 1}`,
      name: newName.trim(),
      affiliation: newAffiliation.trim(),
      photo: newPhoto,
      seed: participants.length + 1,
    };

    setParticipants([...participants, newParticipant]);
    setNewName('');
    setNewAffiliation('');
    setNewPhoto('');
  };

  // Delete participant
  const handleDeleteParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  // Clear all participants
  const handleClearAll = async () => {
    if (participants.length === 0) return;
    const confirmed = await showAlert.confirm({
      title: 'Hapus Semua Peserta?',
      text: `Seluruh ${participants.length} peserta dalam daftar turnamen ini akan dihapus.`,
      confirmText: 'Ya, Kosongkan',
      cancelText: 'Batal',
      isDanger: true,
    });
    if (!confirmed) return;
    setParticipants([]);
    showAlert.success('Daftar Dikosongkan', 'Semua peserta telah dihapus dari daftar.', 1800);
  };

  // Preset generator (e.g. 28 participants like reference)
  const handleLoad28Preset = async () => {
    if (participants.length > 0) {
      const confirmed = await showAlert.confirm({
        title: 'Muat Preset 28 Peserta?',
        text: 'Daftar peserta yang ada saat ini akan digantikan dengan 28 peserta preset.',
        confirmText: 'Ya, Gantikan',
        cancelText: 'Batal',
      });
      if (!confirmed) return;
    }
    const list: Participant[] = [];
    for (let i = 0; i < 28; i++) {
      list.push({
        id: `p_preset_${i + 1}`,
        name: sampleNames[i],
        affiliation: sampleShops[i],
        photo: '',
        seed: i + 1,
      });
    }
    setParticipants(list);
    showAlert.success('Preset Berhasil Dimuat!', '28 peserta telah dimasukkan ke dalam daftar.', 1800);
  };

  // Preset 16 participants
  const handleLoad16Preset = async () => {
    if (participants.length > 0) {
      const confirmed = await showAlert.confirm({
        title: 'Muat Preset 16 Peserta?',
        text: 'Daftar peserta yang ada saat ini akan digantikan dengan 16 peserta preset.',
        confirmText: 'Ya, Gantikan',
        cancelText: 'Batal',
      });
      if (!confirmed) return;
    }
    const list: Participant[] = [];
    for (let i = 0; i < 16; i++) {
      list.push({
        id: `p_preset_${i + 1}`,
        name: sampleNames[i],
        affiliation: sampleShops[i],
        photo: '',
        seed: i + 1,
      });
    }
    setParticipants(list);
    showAlert.success('Preset Berhasil Dimuat!', '16 peserta telah dimasukkan ke dalam daftar.', 1800);
  };

  // Save changes to DB
  const handleSave = async (redirectTarget?: string) => {
    if (!tournament) return;
    setSaving(true);
    setSavedSuccess(false);

    try {
      // Always regenerate bracket structure dynamically matching exact participant count
      const generated = createDynamicBracket(
        participants,
        tournament.format === 'coffee-28' ? 'throwdown' : 'knockout'
      );
      const rounds = generated.rounds;
      const matches = generated.matches;
      const grandFinalists = generated.grandFinalists;

      const updatedTournament: Tournament = {
        ...tournament,
        participants,
        unassignedParticipantIds: participants.map((p) => p.id),
        rounds,
        matches,
        grandFinalists,
        updatedAt: new Date().toISOString(),
      };

      clientDb.saveTournament(updatedTournament);
      setTournament(updatedTournament);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (redirectTarget) {
        router.push(redirectTarget);
      } else {
        showAlert.success('Tersimpan!', 'Perubahan peserta dan bagan pertandingan berhasil disimpan.', 2000);
      }
    } catch (e) {
      console.error(e);
      showAlert.error('Gagal Menyimpan', 'Terjadi kesalahan saat menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center text-gold-400 font-bold">
        Memuat Data Peserta...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-coffee-950 via-coffee-900 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-6 border-b border-coffee-800">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-coffee-300 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{tournament?.title}</h1>
                <span className="text-xs bg-gold-500/20 text-gold-300 border border-gold-500/40 px-3 py-0.5 rounded-full font-bold">
                  {participants.length} Peserta Terdaftar
                </span>
              </div>
              <p className="text-xs text-coffee-300">{tournament?.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-gold-300 border border-gold-500/40 text-sm font-bold transition"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : null}
              {saving ? 'Menyimpan...' : savedSuccess ? 'Tersimpan!' : 'Simpan Perubahan'}
            </button>

            <button
              onClick={() => handleSave(`/tournament/${tournamentId}/wheel`)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-coffee-950 text-sm font-black shadow transition active:scale-95"
            >
              <Shuffle className="w-4 h-4" />
              Lanjut ke Undian Spinwheel
            </button>

            <Link
              href={`/tournament/${tournamentId}/tv`}
              className="p-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-700 text-coffee-300 transition"
              title="Buka Layar TV"
            >
              <Tv className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Quick Presets Bar */}
        <div className="mb-8 p-4 rounded-2xl bg-coffee-900/80 border border-coffee-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-coffee-300">
            <Sparkles className="w-4 h-4 text-gold-400" />
            <span>Shortcut Cepat:</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoad28Preset}
              className="text-xs bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 px-4 py-2 rounded-xl font-bold transition"
            >
              + Isi Otomatis 28 Peserta (Preset KKB)
            </button>
            <button
              onClick={handleLoad16Preset}
              className="text-xs bg-coffee-800 hover:bg-coffee-700 text-coffee-200 border border-coffee-700 px-4 py-2 rounded-xl font-bold transition"
            >
              + Isi Otomatis 16 Peserta
            </button>
            {participants.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 px-3 py-2 rounded-xl transition"
              >
                Hapus Semua
              </button>
            )}
          </div>
        </div>

        {/* Add Participant Input Section */}
        <div className="mb-10 p-6 rounded-3xl bg-coffee-900 border border-gold-500/40 shadow-xl">
          <h2 className="text-lg font-black text-gold-300 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" /> Tambah Peserta Baru
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Foto Upload */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-coffee-300 uppercase tracking-wider mb-2">
                Foto Peserta
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-coffee-950 border border-coffee-700 overflow-hidden flex items-center justify-center shrink-0">
                  {newPhoto ? (
                    <img src={newPhoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Coffee className="w-6 h-6 text-coffee-500" />
                  )}
                </div>
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-coffee-800 hover:bg-coffee-700 border border-coffee-700 text-xs text-coffee-200 font-semibold transition">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e)}
                  />
                </label>
              </div>
            </div>

            {/* Nama Peserta */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold text-coffee-300 uppercase tracking-wider mb-2">
                Nama Peserta / Brewer *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                placeholder="Contoh: Dimas Aditya"
                className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-2.5 text-white placeholder-coffee-600 focus:outline-none"
              />
            </div>

            {/* Asal Kedai / Kota */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-coffee-300 uppercase tracking-wider mb-2">
                Asal Coffeeshop / Kota
              </label>
              <input
                type="text"
                value={newAffiliation}
                onChange={(e) => setNewAffiliation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddParticipant()}
                placeholder="Contoh: Anomali Coffee - Jakarta"
                className="w-full bg-coffee-950 border border-coffee-700 focus:border-gold-400 rounded-xl px-4 py-2.5 text-white placeholder-coffee-600 focus:outline-none"
              />
            </div>

            {/* Add Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddParticipant}
                className="w-full py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 font-black text-sm shadow transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Tambah
              </button>
            </div>
          </div>
        </div>

        {/* Participant List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-white">Daftar Semua Peserta ({participants.length})</h2>
            <p className="text-xs text-coffee-400">
              Setiap peserta akan diundi posisinya melalui Spinwheel
            </p>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-16 bg-coffee-950/60 rounded-3xl border border-coffee-800">
              <Users className="w-12 h-12 text-coffee-600 mx-auto mb-3" />
              <p className="text-coffee-300 text-sm font-semibold">Belum ada peserta yang ditambahkan.</p>
              <p className="text-xs text-coffee-500 mt-1">
                Gunakan form di atas atau klik tombol shortcut &quot;Isi Otomatis 28 Peserta&quot;
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {participants.map((p, idx) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-coffee-900 border border-coffee-800 p-4 flex items-center justify-between gap-3 group hover:border-gold-500/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono font-bold text-coffee-400 w-5">
                      #{idx + 1}
                    </span>

                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-xl bg-coffee-950 border border-coffee-700 overflow-hidden flex items-center justify-center shrink-0">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">☕</span>
                      )}
                      {/* Photo change hover */}
                      <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition">
                        <Camera className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, idx)}
                        />
                      </label>
                    </div>

                    <div className="min-w-0">
                      <div className="font-bold text-sm text-white truncate">{p.name}</div>
                      <div className="text-xs text-coffee-400 truncate">{p.affiliation || '-'}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteParticipant(p.id)}
                    className="p-1.5 text-coffee-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition"
                    title="Hapus Peserta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
