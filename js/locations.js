/**
 * LOCATIONS.JS — Satu-satunya sumber data lokasi untuk Mode Bumi
 * Ubah koordinat / label DI SINI SAJA.
 * Data ini dibaca oleh js/space/director.js, map-layer.js, dan earth.js.
 */

// TODO: Ubah ke 'exact' hanya jika kamu siap menampilkan titik tepat ke publik
const BIRTH_PRECISION = 'city'; // 'city' | 'exact'

const LOCATIONS = [
  {
    id: 'kelahiran',
    stage: 'Tahap 01',
    title: 'Kelahiran',
    place: 'Mataram, Nusa Tenggara Barat',
    // Sengaja dibulatkan 2 desimal (±1 km). Titik tepat TIDAK disimpan di repo publik.
    lat: -8.58, lng: 116.11,
    precision: BIRTH_PRECISION,
    mapZoom: 12,
    maxZoom: 13,
    circleMeters: 1500
    // TODO: Untuk titik tepat, isi koordinat lengkap dan set BIRTH_PRECISION = 'exact'
    //       (zoom 17, pakai pin, label nama tempat)
  },

  {
    id: 'sd',
    stage: 'Tahap 02',
    title: 'TK / SD',
    place: 'SDIT Abu Hurairah, Mataram',
    lat: -8.60, lng: 116.09,
    precision: 'city',
    mapZoom: 15,
    maxZoom: 17,
    circleMeters: 500
  },

  {
    id: 'smp',
    stage: 'Tahap 03',
    title: 'SMP',
    place: 'Mataram, Nusa Tenggara Barat',
    lat: -8.59, lng: 116.10,
    precision: 'city',
    mapZoom: 14,
    maxZoom: 16,
    circleMeters: 800
    // TODO: isi nama sekolah dan koordinat tepat kalau sudah siap
  },

  {
    id: 'sma',
    stage: 'Tahap 04',
    title: 'SMA / MA',
    place: 'Mataram, Nusa Tenggara Barat',
    lat: -8.58, lng: 116.12,
    precision: 'city',
    mapZoom: 14,
    maxZoom: 16,
    circleMeters: 800
    // TODO: isi nama sekolah dan koordinat tepat kalau sudah siap
  },

  {
    id: 'kuliah',
    stage: 'Mahasiswa',
    title: 'Universitas Bumigora',
    place: 'Universitas Bumigora, Mataram',
    lat: -8.6197, lng: 116.1286,
    precision: 'city',
    mapZoom: 16,
    maxZoom: 18,
    circleMeters: 300
  }
];

// Bounding box Mataram untuk validasi kelahiran (precision: 'city')
const MATARAM_BBOX = { latMin: -8.65, latMax: -8.52, lngMin: 116.04, lngMax: 116.17 };

