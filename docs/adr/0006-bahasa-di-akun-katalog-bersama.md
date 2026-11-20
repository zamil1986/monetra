# Bahasa disimpan di Akun, satu katalog teks untuk web dan Android

Monetra kini bisa dipakai dalam bahasa Indonesia atau English. Bahasa adalah milik Akun, bukan Perangkat: dipilih sekali, lalu web dan HP ikut. Semua teks antarmuka ada di satu katalog per bahasa, `shared/i18n/en.json` dan `shared/i18n/id.json`, yang dibaca web (TypeScript, diimpor langsung) dan Android (disalin ke `mobile/lib/i18n/catalog.g.dart` oleh `dart run tool/gen_i18n.dart`).

Aturannya:

- **Bahasa ikut Sinkronisasi.** Kolom `language` di Pengguna, dikirim di setiap pull. HP boleh mengganti Bahasa saat offline: langsung berlaku di HP, lalu dikirim ke `/api/profile/language` saat online lagi.
- **Pilihan terakhir menang**, diukur dengan jam Perangkat saat dipilih (`languageChangedAt`), sama seperti edit record di [ADR 0005](0005-offline-first-android-sinkronisasi.md). Pilihan lama dari HP yang baru online tidak menimpa pilihan yang lebih baru di web.
- **Sebelum masuk** Bahasa mengikuti browser (`Accept-Language`) atau HP; pilihan ID | EN di halaman masuk disimpan di cookie atau di HP, lalu dipakai saat daftar. Setelah keluar, bahasa terakhir tetap dipakai.
- **Penolakan diterjemahkan di tepi.** Aturan domain mengembalikan kunci katalog dan parameternya, bukan kalimat. Server menerjemahkan dengan Bahasa Pengguna sebelum mengirim respons atau hasil push; email reset kata sandi juga.
- **Nama tetap data.** Nama bawaan (Tunai, Makanan, Gaji) tetap Indonesia dan tidak pernah diterjemahkan, sama seperti nama buatan Pengguna.
- **Tanggal dari katalog**, bukan dari data locale platform, supaya web dan HP menulis "Kam 19 Nov" persis sama. Rupiah tetap `Rp 6.240.000` di kedua bahasa.

## Considered Options

- **Bahasa per Perangkat** (cookie di web, setelan di HP): ditolak; satu Pengguna harus mengganti dua kali, dan email tidak tahu bahasa mana yang dipakai.
- **next-intl di web dan ARB/gen-l10n di Flutter**: ditolak; setiap teks diterjemahkan dua kali dan mudah berbeda. next-intl juga membawa routing per locale yang tidak dibutuhkan satu Pengguna.
- **Bahasa di URL (`/id/...`)**: ditolak; Bahasa adalah setelan Akun, bukan alamat halaman.
- **Menerjemahkan nama bawaan sesuai bahasa saat daftar**: ditolak; nama adalah data milik Pengguna dan harus stabil saat Bahasa diganti.

## Consequences

- Setiap teks baru ditambahkan ke kedua file katalog. Test di web (`src/domain/i18n.test.ts`) dan HP (`mobile/test/i18n_test.dart`) gagal bila kunci atau placeholder berbeda, atau bila `catalog.g.dart` belum dibuat ulang.
- Pesan zod di skema ditulis sebagai kunci katalog; pesan zod lain tampil sebagai "Permintaan tidak valid".
- Web merender per permintaan dengan Bahasa dari sesi, cookie, atau `Accept-Language`; halaman Unduh tidak lagi statis.
