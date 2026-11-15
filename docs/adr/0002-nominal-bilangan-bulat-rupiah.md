# Hanya IDR, nominal disimpan sebagai bilangan bulat rupiah

PRD awal menyimpan mata uang pilihan per pengguna, tetapi tidak punya aturan untuk kurs maupun untuk apa yang terjadi kalau mata uang diganti setelah ada Transaksi. Kami memutuskan aplikasi hanya mengenal rupiah: tidak ada kolom mata uang di mana pun, dan setiap nominal (Transaksi, Saldo awal, Budget) disimpan sebagai bilangan bulat rupiah tanpa pecahan. Rupiah tidak dipakai dengan sen dalam keseharian, jadi bilangan bulat menghilangkan seluruh persoalan pembulatan.

## Considered Options

- **Satu mata uang per pengguna, dipilih saat daftar**: ditolak karena memaksa tipe desimal dan format per mata uang untuk kebutuhan yang tidak dimiliki pengguna sasaran.
- **Multi-mata uang per Dompet**: ditolak karena Total Balance dan laporan butuh kurs dan aturan konversi; itu produk yang berbeda.

## Consequences

Menambah mata uang lain kelak berarti migrasi skema dan peninjauan ulang setiap penjumlahan lintas Dompet. Multi-mata uang dicatat sebagai Out of Scope di PRD.
