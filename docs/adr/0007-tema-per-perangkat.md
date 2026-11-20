# Tema disimpan di Perangkat, bukan di Akun

Monetra kini punya Tema Terang dan Gelap, dengan Sistem sebagai bawaan. Berbeda dari Bahasa ([ADR 0006](0006-bahasa-di-akun-katalog-bersama.md)), Tema adalah milik Perangkat: di web disimpan di cookie `theme`, di HP di tabel setelan lokal dengan kunci `device.theme`. Tema tidak dikirim ke server dan tidak ikut Sinkronisasi.

Aturannya:

- **Pilihan cocok dengan tempatnya.** Terang atau gelap ditentukan oleh cahaya di sekitar layar: Mac di meja siang hari, HP di jalan malam hari. Satu pilihan untuk semua Perangkat justru salah di salah satunya.
- **Sistem adalah bawaan.** Selama Pengguna belum memilih, Tema mengikuti setelan terang/gelap Perangkat.
- **Tanpa kedip di web.** Server membaca cookie dan menulis `<html data-theme>`, jadi halaman pertama sudah benar tanpa skrip sebelum render.
- **Tetap setelah keluar.** `wipe()` di HP menyimpan `device.theme` seperti `profile.language`; cookie web tidak dihapus saat keluar.
- **Satu palet untuk dua platform.** Token di `src/app/globals.css` (`light-dark(<terang>, <gelap>)`) dan `mobile/lib/ui/theme.dart` (`MonetraColors.light` / `.dark`) harus sama. Pita cobalt, kuning, dan putih tidak berbalik; kertas, tinta, dan warna makna berbalik.

## Considered Options

- **Tema di Akun, seperti Bahasa**: ditolak; Pengguna yang ingin HP gelap dan Mac terang harus memilih ulang setiap kali, dan butuh kolom serta aturan "pilihan terakhir menang" yang tidak memberi manfaat.
- **Hanya mengikuti sistem, tanpa pilihan**: ditolak; sebagian Pengguna ingin Monetra gelap walau HP-nya terang, atau sebaliknya.
- **`localStorage` di web**: ditolak; server tidak bisa membacanya, jadi halaman pertama akan berkedip dari terang ke gelap.

## Consequences

- Setiap warna baru di web ditulis sebagai token di `globals.css` dengan nilai terang dan gelap, lalu disalin ke `MonetraColors`. Hex lepas di komponen tidak lagi dipakai.
- Isian `bg-ink`, `bg-red`, dan `bg-green` memakai teks `paper` agar ikut berbalik; apa pun di atas kuning memakai `on-yellow`; yang di dalam pita cobalt tetap putih.
- Token ditulis dengan CSS `light-dark()`; build (lightningcss lewat Tailwind) menurunkannya ke variabel cadangan yang mengikuti `color-scheme`, jadi browser dalam batas dukungan Tailwind 4 tetap mendapat Tema yang benar.
