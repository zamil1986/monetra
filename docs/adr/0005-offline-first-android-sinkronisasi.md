# Offline-first di Android dengan Sinkronisasi ke server

Menggantikan [ADR 0004](0004-online-penuh-id-server-hapus-fisik.md) untuk cara data disimpan. Monetra kini punya app Android (Flutter) yang harus bisa mencatat tanpa koneksi, dan datanya harus sama dengan web di Mac. Web Next.js tetap online-only dan sekaligus menjadi server Sinkronisasi. Perangkat menyimpan salinan lokal, mengantrekan perubahan, lalu mengirim dan menarik perubahan lewat API Next.js.

Aturannya:

- **ID dibuat Perangkat.** Dompet, Kategori, dan Transaksi diberi UUID oleh Perangkat yang membuatnya. Mengirim ulang record dengan ID yang sama tidak membuat record baru.
- **Penghapusan berupa tanda.** Record yang dihapus disimpan dengan tanda terhapus supaya Perangkat lain tahu, dan dikecualikan dari semua tampilan dan perhitungan.
- **Edit terakhir menang per record**, diukur dengan jam Perangkat saat edit dibuat, bukan saat diterima server.
- **Hapus selalu menang.** Edit yang tiba untuk Transaksi bertanda terhapus dibuang.
- **Dompet atau Kategori terhapus yang ternyata dipakai** Transaksi dari Perangkat lain tidak dibiarkan terhapus: tandanya dibatalkan dan ia menjadi Arsip.
- **Transaksi ke Dompet atau Kategori yang sudah diarsip diterima.** Arsip hanya mencegah pilihan di layar, bukan kejadian yang sudah terjadi.
- **Kategori kembar digabung.** Bila Kategori baru bernama sama (tanpa membedakan huruf besar-kecil) dengan Kategori bertipe sama yang sudah ada, server memakai yang sudah ada dan memindahkan Transaksinya.
- **Saldo dan Periode dihitung di kedua sisi** (TypeScript di server, Dart di Perangkat) dan diuji dengan satu set fixture bersama.

## Considered Options

- **Tetap online penuh (ADR 0004)**: ditolak; pencatatan terjadi di HP saat bepergian, sering tanpa sinyal.
- **Lokal penuh tanpa server**: ditolak; data harus sama di Mac dan HP.
- **Layanan sync siap pakai (PowerSync)**: ditolak; aturan domain tetap harus ditulis di server, dan menambah satu vendor untuk satu Pengguna.
- **Jam server untuk konflik**: ditolak; edit lama dari HP yang baru online akan menimpa edit yang lebih baru di Mac.
- **Menanyakan konflik ke Pengguna**: ditolak; terlalu banyak UI untuk satu orang yang jarang mengedit record yang sama di dua tempat.

## Consequences

- Jam Perangkat yang salah bisa membuat edit lama menang. Diterima untuk satu Pengguna.
- Setiap query yang membaca Dompet, Kategori, atau Transaksi wajib mengecualikan yang bertanda terhapus.
- Aturan "Dompet atau Kategori yang dipakai hanya bisa diarsip" tetap mengabaikan Transaksi bertanda terhapus.
- Aturan Saldo dan Periode ada di dua bahasa; fixture bersama adalah satu-satunya penjaga agar keduanya tetap sama.
- iPhone belum didukung; distribusi native di iOS butuh Apple Developer Program.
