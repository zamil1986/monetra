# Personal Finance Tracker

Pencatatan keuangan pribadi satu orang: di mana uangnya berada, dari mana datangnya, ke mana perginya, dan batas belanja yang ia tetapkan sendiri.

## Language

### Orang dan akses

**Pengguna**:
Satu orang yang mencatat keuangannya sendiri. Semua data lain dimiliki tepat satu Pengguna.
_Avoid_: member, customer

**Akun**:
Identitas login milik satu Pengguna.
_Avoid_: memakai "akun" atau "account" untuk tempat uang (itu Dompet)

**Perangkat**:
Tempat Pengguna membuka Monetra: app Android di HP atau browser di komputer. Satu Pengguna bisa memakai beberapa Perangkat.
_Avoid_: device, klien, client

**Sinkronisasi**:
Penyamaan catatan antara semua Perangkat milik satu Pengguna, sehingga Saldo dan ringkasan yang tampil sama di mana pun. Catatan yang dibuat tanpa koneksi ikut disamakan begitu Perangkat kembali online.
_Avoid_: sync sebagai istilah domain, backup, upload

**Bahasa**:
Bahasa antarmuka yang dipilih Pengguna: Indonesia atau English. Milik Akun, jadi sama di semua Perangkat; sebelum masuk mengikuti bahasa browser atau HP. Bahasa hanya mengubah teks antarmuka dan nama hari serta bulan; nama Dompet dan Kategori tidak pernah ikut berubah, dan format Rupiah tetap sama.
_Avoid_: locale, language setting, terjemahan (untuk pilihannya)

**Tema**:
Tampilan terang atau gelap: Sistem (mengikuti setelan Perangkat), Terang, atau Gelap. Milik Perangkat, bukan Akun, jadi tidak ikut Sinkronisasi; Mac boleh terang sementara HP gelap. Tema hanya mengubah warna, tidak pernah angka, urutan, atau kata.
_Avoid_: mode, skin, dark mode (untuk pilihannya)

**Akun demo**:
Akun sementara berisi data contoh yang dibuat untuk satu pengunjung dan kedaluwarsa setelah 24 jam.
_Avoid_: guest, akun tamu

### Uang

**Dompet** (Wallet):
Tempat uang Pengguna berada: tunai, rekening bank, atau e-wallet.
_Avoid_: account, akun, rekening sebagai istilah umum

**Saldo awal**:
Jumlah uang di sebuah Dompet sebelum Transaksi pertamanya dicatat.
_Avoid_: modal, initial deposit

**Saldo**:
Posisi uang terkini di satu Dompet: Saldo awal ditambah semua yang masuk, dikurangi semua yang keluar.
_Avoid_: saldo per periode, saldo akhir bulan

**Total Balance** (UI Indonesia: Total Saldo):
Jumlah Saldo semua Dompet aktif. Selalu posisi terkini, tidak bergantung pada Periode.
_Avoid_: net total, kekayaan bersih

### Pergerakan uang

**Transaksi**:
Satu catatan pergerakan uang. Selalu salah satu dari tiga tipe: Income, Expense, atau Transfer.
_Avoid_: entry, mutasi

**Income** (UI Indonesia: Pemasukan):
Uang yang masuk ke satu Dompet dari luar milik Pengguna.
_Avoid_: menyebut uang masuk dari Transfer sebagai income

**Expense** (UI Indonesia: Pengeluaran):
Uang yang keluar dari satu Dompet ke luar milik Pengguna.
_Avoid_: menyebut top-up atau tarik tunai sebagai expense

**Transfer**:
Perpindahan uang antara dua Dompet milik Pengguna yang sama. Bukan Income dan bukan Expense.
_Avoid_: mutasi, top-up, pemindahan

**Waktu transaksi**:
Momen sebuah Transaksi terjadi (tanggal dan jam), bukan momen ia dicatat.
_Avoid_: transaction date, tanggal input

**Kategori**:
Label jenis sebuah Income atau Expense. Setiap Kategori hanya berlaku untuk salah satu dari keduanya; Transfer tidak punya Kategori.
_Avoid_: tag, label

**Kategori default**:
Kategori yang disalin ke setiap Akun baru. Sesudah disalin, ia milik Pengguna dan sama persis dengan Kategori buatan Pengguna sendiri. Namanya sengaja berbahasa Indonesia (Makanan, Gaji), begitu juga Dompet pertama (Tunai): nama adalah data milik Pengguna, sedangkan teks antarmuka mengikuti Bahasa Pengguna. Mengganti Bahasa tidak mengganti nama Kategori atau Dompet.
_Avoid_: kategori sistem, kategori bawaan yang terkunci

### Ringkasan dan batas

**Periode**:
Rentang waktu yang dipakai untuk meringkas Transaksi, dengan batas hari menurut zona waktu di profil Pengguna.
_Avoid_: range, filter tanggal

**Net Cash Flow** (UI Indonesia: Arus Kas Bersih):
Total Income dikurangi total Expense dalam satu Periode. Transfer tidak ikut dihitung.
_Avoid_: profit, selisih saldo

**Budget** (UI Indonesia: Anggaran):
Batas Expense untuk satu bulan kalender, bagi satu Kategori atau bagi seluruh Expense, yang berulang tiap bulan sampai diubah.
_Avoid_: anggaran sekali pakai, target

**Arsip**:
Keadaan Dompet atau Kategori yang tidak lagi bisa dipilih untuk Transaksi baru tetapi tetap tampil di riwayat dan laporan. Dompet atau Kategori yang dipakai Transaksi hanya bisa diarsip, tidak bisa dihapus. Dompet atau Kategori yang dihapus di satu Perangkat tetapi ternyata dipakai Transaksi dari Perangkat lain kembali sebagai Arsip.
_Avoid_: hapus (untuk yang sudah pernah dipakai), nonaktif
