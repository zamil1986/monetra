# Online penuh: ID Transaksi dari server, penghapusan permanen

> **Digantikan oleh [ADR 0005](0005-offline-first-android-sinkronisasi.md)** untuk penyimpanan data. Web tetap online-only.

Menggantikan [ADR 0003](0003-id-transaksi-dibuat-klien.md). Supaya aplikasi mudah dirawat, Monetra hanya bisa dipakai saat online dan rencana pencatatan offline serta sinkronisasi dihapus dari roadmap. Tidak ada service worker dan tidak ada cache halaman. Bila koneksi putus saat aplikasi terbuka, tampil banner dan semua aksi tulis dinonaktifkan. Instalasi ke home screen tetap ada, cukup lewat web app manifest. Tanpa antrean offline, ID dari perangkat dan tanda terhapus tidak lagi dibutuhkan: ID Transaksi kini dibuat server, dan Transaksi yang dihapus dibuang permanen. Transaksi ganda akibat tap ganda dicegah dengan mengunci tombol simpan selama permintaan berjalan.

## Considered Options

- **Pertahankan ID dari perangkat hanya untuk anti-duplikat**: ditolak. Ia melindungi juga dari pengulangan setelah timeout, tetapi menambah jalur kode (pengulangan, ID bentrok, ID milik Transaksi terhapus) yang tidak sebanding untuk satu pengguna yang bisa menghapus duplikat sendiri.
- **Baca-saja saat offline dengan cache halaman**: ditolak. Butuh service worker dan invalidasi cache, dan Saldo lama bisa tampil seolah posisi terkini.

## Consequences

- Bila simpan tidak terjawab (timeout) lalu dicoba ulang, Transaksi bisa tercatat dua kali; pengguna menghapus salah satunya.
- Dompet atau Kategori yang hanya dipakai Transaksi yang sudah dihapus kembali bisa dihapus, karena jejak pemakaiannya ikut hilang.
- Tidak ada pemulihan Transaksi terhapus.
- Menambah mode offline kelak berarti memikirkan ulang ID dan penghapusan, termasuk migrasi data.
