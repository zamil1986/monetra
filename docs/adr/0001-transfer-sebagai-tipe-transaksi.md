# Transfer adalah tipe ketiga Transaksi, biaya admin dicatat terpisah

Top-up e-wallet dan tarik tunai terjadi hampir tiap hari bagi pengguna di Indonesia. Kalau hanya ada Income dan Expense, perpindahan itu harus dicatat sebagai keduanya dan menggelembungkan total. Kami memutuskan Transaksi punya tiga tipe (Income, Expense, Transfer). Transfer tidak punya Kategori, punya Dompet asal dan Dompet tujuan, dan dikecualikan dari Income, Expense, Net Cash Flow, laporan, dan Budget. Biaya admin sebuah Transfer dicatat pengguna sebagai Expense biasa berkategori "Biaya Admin".

## Considered Options

- **Dua Transaksi berpasangan** (Expense di asal + Income di tujuan, ditandai "transfer"): ditolak karena setiap perhitungan harus ingat mengecualikan pasangan itu, dan edit atau hapus salah satu sisi bisa meninggalkan pasangan yatim.
- **Kolom biaya di dalam Transfer**: ditolak karena total Expense jadi berasal dari dua sumber (Transaksi Expense dan kolom biaya Transfer), sehingga laporan dan Budget harus menggabungkan keduanya.

## Consequences

- Kategori bersifat opsional pada Transaksi di tingkat data, tetapi wajib untuk Income dan Expense dan terlarang untuk Transfer.
- Tipe Transfer tidak bisa diubah menjadi Income atau Expense dan sebaliknya; yang salah tipe dihapus lalu dibuat ulang.
- Transfer berbiaya butuh dua kali input. Ini diterima demi satu sumber kebenaran untuk Expense.
