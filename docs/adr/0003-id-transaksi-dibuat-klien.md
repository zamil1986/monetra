# ID Transaksi dibuat di perangkat, dan penghapusan hanya ditandai

PRD mewajibkan tidak ada Transaksi ganda akibat request yang terkirim ulang, dan menempatkan pencatatan offline di Phase 4. Kami memutuskan ID Transaksi berupa UUID yang dibuat di perangkat sebelum request dikirim: server memperlakukan permintaan simpan dengan ID yang sudah ada sebagai pengulangan dan mengembalikan Transaksi yang sudah tersimpan, bukan membuat yang baru. Transaksi yang dihapus tidak dibuang dari database melainkan ditandai terhapus, lalu dikecualikan dari semua tampilan dan perhitungan.

## Considered Options

- **ID dari server ditambah idempotency key terpisah**: ditolak karena menambah satu konsep dan satu tempat penyimpanan hanya untuk anti-duplikasi, dan tetap tidak memberi perangkat sebuah ID sebelum server menjawab, yang nanti dibutuhkan antrean offline.

## Consequences

- MVP tetap online-only. Keputusan ini hanya memastikan antrean offline di Phase 4 bisa ditambahkan tanpa mengubah bentuk ID atau memigrasi data.
- Tanda terhapus adalah cara perangkat lain mengetahui sebuah Transaksi sudah dihapus saat sinkronisasi; hapus fisik akan membuat Transaksi itu "hidup lagi" dari perangkat yang tertinggal.
- Setiap query yang membaca Transaksi wajib mengecualikan yang bertanda terhapus.
