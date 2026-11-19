# Product Requirements Document (PRD)

# Personal Finance Tracker

**Version:** 1.1\
**Status:** Refined Product Specification\
**Product Type:** Personal Finance Management Application\
**Target Platforms:** macOS Desktop (MacBook), Android Mobile, dan iPhone (iOS)\
**Primary Locale:** Indonesia\
**Currency:** Indonesian Rupiah (IDR) saja

Istilah domain di dokumen ini mengikuti [CONTEXT.md](CONTEXT.md). Keputusan
yang sulit dibalik dicatat di [docs/adr/](docs/adr/).

------------------------------------------------------------------------

## 1. Product Overview

### 1.1 Background

Mengelola keuangan pribadi sering dilakukan secara manual dan tidak
terstruktur. Pengguna mungkin mencatat pemasukan dan pengeluaran melalui
catatan pribadi atau spreadsheet, atau tidak mencatatnya sama sekali.

Akibatnya, pengguna kesulitan mengetahui total pengeluaran, memahami ke
mana uang digunakan, memantau arus kas, dan mengevaluasi kebiasaan
finansial.

Dibutuhkan aplikasi Personal Finance Tracker untuk mencatat, mengelola,
dan menganalisis keuangan pribadi dalam satu tempat.

### 1.2 Product Vision

Membangun aplikasi pengelolaan keuangan pribadi yang sederhana,
intuitif, responsif, dan dapat diakses dari berbagai perangkat.

Pengguna dapat mencatat pemasukan, pengeluaran, dan perpindahan uang
antar-dompet, memantau kondisi keuangan secara berkala, serta memahami
pola pengeluaran melalui visualisasi data.

### 1.3 Product Goals

1.  Mempermudah pencatatan Income, Expense, dan Transfer.
2.  Menunjukkan di mana uang pengguna berada dan berapa totalnya.
3.  Membantu pengguna memahami pola pengeluaran.
4.  Memungkinkan pengelolaan transaksi berdasarkan kategori, dompet, dan
    waktu.
5.  Menyediakan pengalaman konsisten di desktop dan mobile.
6.  Menjaga data keuangan tetap aman dan tersinkronisasi antarperangkat.
7.  Menjadi karya portfolio yang bisa dicoba reviewer lewat URL publik
    tanpa persiapan apa pun.

### 1.4 Target Users

**Primary users:**

-   Mahasiswa yang ingin mengelola uang bulanan.
-   Pekerja yang ingin memantau penghasilan dan pengeluaran.
-   Individu yang ingin membangun kebiasaan financial tracking.

**Karakteristik pengguna:**

-   Tidak harus memiliki pengetahuan akuntansi.
-   Membutuhkan pencatatan yang cepat.
-   Menginginkan tampilan keuangan yang mudah dipahami.
-   Menggunakan lebih dari satu perangkat.
-   Menyimpan uang di beberapa tempat sekaligus: tunai, bank, e-wallet.

**Secondary audience:** reviewer portfolio. Mereka membuka aplikasi
beberapa menit, tidak mau mendaftar, dan harus langsung melihat aplikasi
yang sudah terisi data (lihat Akun demo di 3.1).

------------------------------------------------------------------------

## 2. Platform Requirements

### 2.1 Desktop --- macOS (MacBook)

-   Dapat diakses melalui browser modern.
-   Mendukung instalasi sebagai PWA apabila browser mendukungnya.
-   Layout dioptimalkan untuk layar desktop.
-   Mendukung penggunaan keyboard dan mouse.
-   Menggunakan sidebar navigation untuk akses fitur utama.

### 2.2 Mobile --- Android dan iPhone

-   Dapat digunakan melalui browser Android (Chrome) dan iPhone (Safari).
-   Mendukung instalasi PWA ke home screen: lewat prompt install di
    Android, dan lewat menu Share → "Add to Home Screen" di iPhone.
-   Responsif untuk berbagai ukuran layar Android (termasuk Redmi) dan
    iPhone, termasuk safe area (notch / Dynamic Island dan home
    indicator) di iPhone.
-   Menggunakan touch-friendly interface.
-   Navigasi sederhana dan nyaman digunakan dengan satu tangan.
-   Form pencatatan transaksi harus nyaman digunakan di layar kecil.

### 2.3 Cross-device Synchronization

Data pengguna harus konsisten antara MacBook, Android, dan iPhone.

Contoh alur:

1.  Pengguna mencatat pengeluaran Rp25.000 melalui HP Android atau
    iPhone.
2.  Transaksi tersimpan di server.
3.  Pengguna membuka aplikasi di MacBook.
4.  Transaksi yang sama muncul tanpa perlu dicatat ulang.

Sistem mencegah duplikasi transaksi akibat tap ganda: tombol simpan
dikunci selama permintaan berjalan (lihat 5.3).

Angka ringkasan (Today, This Month, dan seterusnya) dihitung server
dengan zona waktu di profil pengguna, sehingga dua perangkat di zona
waktu berbeda tetap menampilkan angka yang sama.

------------------------------------------------------------------------

## 3. Functional Requirements

### 3.1 Authentication & User Management

Pengguna harus memiliki Akun agar data keuangan dapat disimpan dan
diakses lintas perangkat. Kata "Akun" di dokumen ini selalu berarti
identitas login, tidak pernah tempat uang.

**Fitur:**

-   Register (terbuka untuk siapa pun).
-   Login.
-   Logout.
-   Forgot password: tautan reset dikirim lewat email.
-   Change password.
-   User profile.
-   Session management: sesi tersimpan di server dan dibawa browser
    sebagai httpOnly cookie.
-   Coba demo.

**Informasi pengguna:**

-   Full name.
-   Email.
-   Password (disimpan sebagai hash yang aman).
-   Zona waktu (default `Asia/Jakarta`, bisa diubah di profil).
-   Account creation date.

**Akun demo:**

Halaman login punya tombol "Coba demo". Setiap klik membuat satu Akun
demo baru khusus pengunjung itu, sudah berisi dompet, kategori, dan
transaksi contoh. Pengunjung bebas mengubah atau menghapus apa pun di
dalamnya. Akun demo kedaluwarsa 24 jam setelah dibuat: sesudah itu tidak
bisa dipakai lagi dan datanya dibersihkan oleh job terjadwal. Akun demo
tidak punya email asli dan tidak bisa reset password.

**Acceptance Criteria:**

-   Pengguna dapat membuat Akun menggunakan email dan password.
-   Email harus unik.
-   Akun langsung bisa dipakai setelah register, tanpa verifikasi email.
-   Password tidak boleh disimpan dalam bentuk plaintext.
-   Pengguna yang belum login tidak dapat mengakses data keuangan
    pribadi.
-   Setiap pengguna hanya dapat mengakses data miliknya sendiri.
-   Akun baru langsung memiliki kategori default (3.6) dan satu Dompet
    "Tunai" bersaldo awal Rp0 (3.3).
-   Pengunjung dapat masuk ke Akun demo dengan satu klik dan langsung
    melihat dashboard yang terisi.

### 3.2 Dashboard

Dashboard merupakan halaman utama yang memberikan ringkasan kondisi
keuangan pengguna.

**Informasi yang ditampilkan:**

1.  Total Balance.
2.  Saldo tiap Dompet aktif.
3.  Total Income.
4.  Total Expense.
5.  Net Cash Flow.
6.  Recent Transactions (lima terbaru).
7.  Expense Breakdown (mulai Phase 2).
8.  Income vs Expense Chart (mulai Phase 2).

**Filter periode:**

-   Today.
-   This Week (Senin sampai Minggu).
-   This Month.
-   This Year.
-   Custom Date Range.

Batas setiap periode dihitung server menurut zona waktu di profil
pengguna.

**Rumus perhitungan:**

-   **Saldo Dompet:** saldo awal + total Income ke dompet itu − total
    Expense dari dompet itu + total Transfer masuk − total Transfer
    keluar. Selalu posisi terkini.
-   **Total Balance:** jumlah Saldo semua Dompet aktif. Tidak
    dipengaruhi filter periode.
-   **Total Income / Total Expense:** jumlah transaksi bertipe Income /
    Expense yang Waktu transaksinya berada dalam periode terpilih.
-   **Net Cash Flow:** Total Income dikurangi Total Expense pada periode
    yang sama.

Transfer tidak pernah masuk Total Income, Total Expense, maupun Net Cash
Flow. Dashboard selalu menampilkan gabungan semua dompet; tidak ada
filter per dompet di sini.

**Acceptance Criteria:**

-   Angka diperbarui setelah transaksi berhasil disimpan, diubah, atau
    dihapus.
-   Pengguna dapat mengganti periode laporan.
-   Mengganti periode tidak mengubah Total Balance maupun Saldo Dompet.
-   Saldo negatif ditampilkan dengan warna merah.
-   Jika belum ada transaksi, tampilkan empty state yang informatif.

### 3.3 Wallet Management

Dompet (Wallet) adalah tempat uang pengguna berada: tunai, rekening
bank, atau e-wallet. Setiap transaksi terjadi pada satu Dompet.

**Fitur:**

-   Create Dompet dengan nama, saldo awal, warna, dan ikon.
-   Edit Dompet, termasuk saldo awalnya.
-   Arsipkan Dompet dan batalkan arsip.
-   Hapus permanen Dompet yang belum pernah dipakai.
-   Lihat Saldo tiap Dompet.

**Business Rules:**

1.  Akun baru otomatis memiliki satu Dompet "Tunai" bersaldo awal Rp0.
2.  Saldo awal adalah bilangan bulat rupiah dan bisa diubah kapan saja;
    Saldo ikut berubah.
3.  Saldo boleh negatif. Transaksi yang membuat Saldo minus tetap
    disimpan, karena pencatatan sering tidak lengkap.
4.  Dompet hanya bisa diarsipkan saat Saldonya tepat Rp0. Sisa uang
    dipindahkan dulu lewat Transfer atau dicatat sebagai Expense.
5.  Dompet yang diarsipkan tidak bisa dipilih untuk transaksi baru,
    tetapi tetap tampil di riwayat.
6.  Dompet yang dipakai dalam transaksi tidak bisa dihapus permanen,
    hanya diarsipkan.
7.  Pengguna tidak boleh mengakses Dompet milik pengguna lain.

**Acceptance Criteria:**

-   Pengguna dapat membuat Dompet "BCA" bersaldo awal Rp2.000.000 dan
    Total Balance langsung bertambah Rp2.000.000.
-   Mengarsipkan Dompet bersaldo Rp50.000 ditolak dengan pesan yang
    menjelaskan bahwa saldo harus Rp0.

### 3.4 Transaction Management

Fitur utama aplikasi adalah pencatatan transaksi keuangan. Transaksi
selalu salah satu dari tiga tipe.

#### A. Income

Uang yang masuk ke satu Dompet dari luar. Wajib memiliki kategori
bertipe income.

#### B. Expense

Uang yang keluar dari satu Dompet ke luar. Wajib memiliki kategori
bertipe expense.

#### C. Transfer

Perpindahan uang antara dua Dompet milik pengguna yang sama, misalnya
top-up GoPay dari BCA atau tarik tunai. Transfer tidak punya kategori
dan tidak dihitung sebagai Income maupun Expense.

Biaya admin sebuah Transfer dicatat sebagai transaksi Expense terpisah
berkategori "Biaya Admin". Contoh: top-up GoPay Rp100.000 dari BCA
dengan biaya Rp1.000 dicatat sebagai satu Transfer Rp100.000 (BCA →
GoPay) dan satu Expense Rp1.000 dari BCA.

#### Transaction Data

  Field              Description
  ------------------ ----------------------------------------------------
  ID                 UUID yang dibuat server
  User ID            Pemilik transaksi
  Type               Income / Expense / Transfer
  Amount             Nominal, bilangan bulat rupiah, lebih besar dari nol
  Wallet ID          Dompet tempat transaksi terjadi (asal, untuk Transfer)
  To Wallet ID       Dompet tujuan; hanya untuk Transfer
  Category ID        Kategori; wajib untuk Income/Expense, kosong untuk Transfer
  Description        Catatan opsional
  Occurred At        Waktu transaksi: tanggal dan jam kejadian
  Created At         Waktu dicatat
  Updated At         Waktu terakhir diubah

#### Transaction Operations

-   Create transaction.
-   View transaction details.
-   Edit transaction.
-   Delete transaction.
-   Search transactions.
-   Filter transactions.
-   Sort transactions.

#### Business Rules

1.  Amount harus bilangan bulat rupiah yang lebih besar dari nol.
2.  Setiap transaksi wajib memiliki tipe dan Dompet.
3.  Income dan Expense wajib memiliki kategori yang tipenya sama dengan
    tipe transaksi. Transfer tidak boleh memiliki kategori.
4.  Transfer wajib memiliki Dompet tujuan yang berbeda dari Dompet asal.
5.  Waktu transaksi wajib diisi (default: saat ini) dan tidak boleh
    melewati saat ini.
6.  Dompet dan kategori yang diarsipkan tidak bisa dipilih untuk
    transaksi baru.
7.  Pengguna hanya dapat mengubah atau menghapus transaksinya sendiri.
8.  Saat edit: nominal, Dompet, waktu, deskripsi, dan kategori bebas
    diubah. Income boleh diubah menjadi Expense dan sebaliknya, dengan
    kategori wajib dipilih ulang. Transfer tidak bisa diubah menjadi
    tipe lain dan sebaliknya; yang salah tipe dihapus lalu dibuat ulang.
9.  Perubahan transaksi harus memengaruhi Saldo dan perhitungan
    dashboard.
10. Penghapusan transaksi harus menggunakan confirmation dialog. Setelah
    dikonfirmasi, transaksi hilang dari semua tampilan dan perhitungan.
    Tidak ada halaman sampah atau pemulihan.
11. Mengirim ulang permintaan simpan dengan ID yang sama tidak membuat
    transaksi kedua.

**Acceptance Criteria:**

Pengguna dapat menambahkan transaksi dengan mengisi nominal, tipe,
Dompet, kategori (atau Dompet tujuan untuk Transfer), waktu, dan
deskripsi opsional. Setelah berhasil disimpan, transaksi muncul di
transaction history, Saldo Dompet terkait berubah, dan ringkasan
keuangan diperbarui.

Setelah top-up GoPay Rp100.000 dari BCA dengan biaya admin Rp1.000:
Total Balance turun Rp1.000, Total Expense periode naik Rp1.000, dan
Total Income tidak berubah.

### 3.5 Transaction History

Halaman untuk menampilkan seluruh riwayat transaksi pengguna.

**Fitur:**

-   List all transactions.
-   Search by description.
-   Filter by transaction type (Income, Expense, Transfer).
-   Filter by category.
-   Filter by Dompet (untuk Transfer: cocok bila dompet itu asal atau
    tujuan).
-   Filter by date range.
-   Sort by newest or oldest.
-   Sort by highest or lowest amount.
-   Pagination atau infinite scrolling.

**Informasi yang ditampilkan per baris:**

-   Judul: deskripsi bila diisi; bila kosong, nama kategori; untuk
    Transfer tanpa deskripsi, "Transfer ke \<nama dompet tujuan\>".
-   Category (kosong untuk Transfer).
-   Dompet.
-   Waktu transaksi.
-   Transaction type.
-   Amount.

**Acceptance Criteria:**

-   Pengguna dapat menemukan transaksi tertentu melalui pencarian.
-   Filter dapat dikombinasikan.
-   Data ditampilkan berdasarkan Waktu transaksi terbaru secara default.
-   Transaksi dengan Dompet atau kategori yang sudah diarsipkan tetap
    tampil lengkap.
-   Tampilan tetap nyaman digunakan di mobile.

### 3.6 Category Management

Kategori melabeli jenis sebuah Income atau Expense.

**Default Income Categories:**

-   Gaji.
-   Uang Saku.
-   Freelance.
-   Bisnis.
-   Investasi.
-   Hadiah.
-   Pemasukan Lain.

**Default Expense Categories:**

-   Makanan.
-   Transportasi.
-   Pendidikan.
-   Belanja.
-   Hiburan.
-   Kesehatan.
-   Tagihan.
-   Perawatan Diri.
-   Biaya Admin.
-   Pengeluaran Lain.

**Fitur (mulai Phase 2; Phase 1 hanya memakai kategori default):**

-   Create custom category.
-   Edit category.
-   Arsipkan category dan batalkan arsip.
-   Hapus permanen category yang belum pernah dipakai.
-   Assign category color.
-   Assign category icon.

**Business Rules:**

-   Setiap kategori bertipe income atau expense, dan tipenya tidak bisa
    diubah setelah dibuat.
-   Kategori default disalin ke setiap Akun baru saat register. Sesudah
    itu kategori tersebut milik pengguna dan berperilaku sama seperti
    kategori buatannya sendiri.
-   Kategori yang sudah dipakai dalam transaksi tidak bisa dihapus
    permanen, hanya diarsipkan: hilang dari pilihan saat input, tetap
    tampil di riwayat dan laporan.
-   Pengguna tidak boleh mengakses kategori milik pengguna lain.
-   Kategori dianggap dipakai bila direferensikan Transaksi apa pun.
    Transaksi yang dihapus dibuang permanen, jadi tidak lagi dihitung.
    Hanya kategori yang tidak dipakai yang bisa dihapus permanen.
-   Nama kategori 1--30 karakter dan unik per tipe tanpa membedakan
    huruf besar/kecil, termasuk terhadap kategori yang diarsipkan.
    Nama yang sudah dipakai kategori arsip ditolak dengan arahan untuk
    membatalkan arsipnya. Karena itu batalkan arsip tidak pernah
    bentrok nama.
-   Kategori aktif terakhir dari satu tipe tidak bisa diarsipkan atau
    dihapus, agar Income dan Expense selalu bisa dicatat.
-   Kategori yang diarsipkan tetap boleh diedit (nama, ikon, warna).
    Mengganti nama berlaku untuk seluruh riwayat.
-   Ikon dan warna dipilih dari daftar tetap. Palet warna sama dengan
    Dompet.
-   Kategori default tidak istimewa, termasuk "Biaya Admin": boleh
    diganti nama dan diarsipkan, dan aplikasi tidak bergantung pada
    namanya.
-   Urutan: kategori default sesuai daftar di atas, lalu kategori
    buatan pengguna menurut waktu dibuat. Tidak ada pengurutan manual.
-   Filter kategori di Transaction History tetap menampilkan kategori
    yang diarsipkan, dalam grup "Diarsip".

### 3.7 Financial Analytics & Reports

Fitur untuk membantu pengguna memahami kebiasaan keuangannya. Seluruh
angka di bagian ini mengecualikan Transfer dan selalu merupakan gabungan
semua dompet.

#### A. Expense Breakdown

Visualisasi pengeluaran berdasarkan kategori.

Contoh:

-   Food: Rp500.000.
-   Transportation: Rp200.000.
-   Education: Rp300.000.
-   Shopping: Rp150.000.

#### B. Income vs Expense

Grafik perbandingan pemasukan dan pengeluaran berdasarkan:

-   Daily.
-   Weekly.
-   Monthly.
-   Yearly.

#### C. Financial Summary

Menampilkan:

-   Total income.
-   Total expense.
-   Net cash flow.
-   Highest expense category.
-   Largest transaction.
-   Average daily expense.

#### D. Transaction Trends

Membantu pengguna melihat perubahan pengeluaran dari waktu ke waktu.

**Acceptance Criteria:**

-   Seluruh analisis berdasarkan transaksi aktual.
-   Pengguna dapat mengganti periode laporan.
-   Grafik tidak menghitung transaksi di luar periode terpilih.
-   Batas hari, minggu, dan bulan mengikuti zona waktu di profil.
-   Nilai pada grafik konsisten dengan data transaksi.

### 3.8 Budget Management

Fitur untuk membantu pengguna mengontrol pengeluaran. Budget adalah
batas Expense untuk satu bulan kalender yang berulang otomatis setiap
bulan sampai diubah atau dihapus.

**Fitur:**

-   Set budget keseluruhan (semua Expense).
-   Set budget per category.
-   View budget utilization.
-   Monitor remaining budget.
-   Budget warning.

**Contoh:**

Pengguna menetapkan budget Food sebesar Rp1.000.000. Batas itu berlaku
untuk bulan ini dan setiap bulan berikutnya. Ketika pengeluaran Food
bulan ini mencapai Rp750.000:

-   Budget utilization: 75%.
-   Remaining budget: Rp250.000.

Aplikasi menampilkan peringatan saat utilization mencapai 80%, dan
peringatan yang lebih tegas saat mencapai atau melebihi 100%, lengkap
dengan jumlah pengeluaran aktual dibandingkan budget.

**Business Rules:**

-   Periode budget selalu satu bulan kalender (tanggal 1 sampai akhir
    bulan) menurut zona waktu di profil.
-   Budget kategori hanya menghitung Expense dari kategori terkait.
    Budget keseluruhan menghitung semua Expense.
-   Budget keseluruhan dan budget kategori berdiri sendiri; jumlah
    budget kategori tidak harus sama dengan budget keseluruhan.
-   Income dan Transfer tidak memengaruhi budget.
-   Mengubah nominal budget berlaku mulai bulan berjalan. Bulan yang
    sudah lewat tetap memakai nominal lamanya.
-   Menghapus budget menghentikannya mulai bulan berjalan; bulan yang
    sudah lewat tidak berubah.
-   Edit atau delete transaksi harus memperbarui budget utilization.

**Acceptance Criteria:**

-   Budget Food Rp1.000.000 yang dibuat Oktober masih berlaku di
    November tanpa dibuat ulang.
-   Menaikkan budget Food menjadi Rp1.500.000 pada pertengahan November
    mengubah angka November; laporan Oktober tetap menampilkan
    Rp1.000.000.

------------------------------------------------------------------------

## 4. User Interface & User Experience

### 4.1 Design Principles

Aplikasi harus mengikuti prinsip:

-   Minimalist.
-   Clean and modern.
-   Easy to navigate.
-   Consistent design system.
-   Responsive.
-   Readable financial information.

Fokus utama adalah mempermudah pengguna mencatat transaksi tanpa melalui
terlalu banyak langkah. Form tambah transaksi terisi default: tipe
Expense, waktu saat ini, dan Dompet yang terakhir dipakai.

### 4.2 Main Navigation

**Desktop Sidebar:**

1.  Dashboard.
2.  Transactions.
3.  Wallets.
4.  Categories.
5.  Budgets.
6.  Reports.
7.  Settings.

**Mobile Bottom Navigation:**

1.  Home.
2.  Transactions.
3.  Add Transaction.
4.  Reports.
5.  Settings.

Di mobile, Wallets dibuka dari kartu saldo di Home dan dari Settings;
Categories dan Budgets dibuka dari Settings.

Tombol Add Transaction harus mudah ditemukan.

### 4.3 Required Pages

  Page               Purpose
  ------------------ ------------------------------------------
  Login              User authentication dan tombol "Coba demo"
  Register           Create Akun
  Forgot Password    Meminta tautan reset
  Reset Password     Menetapkan password baru dari tautan
  Dashboard          Financial overview
  Transactions       Transaction history
  Add Transaction    Record new transaction
  Edit Transaction   Modify transaction
  Wallets            Manage Dompet dan saldo awal
  Categories         Manage categories
  Budgets            Manage spending budgets
  Reports            Financial analytics
  Settings           Profil, zona waktu, password

### 4.4 UI States

Setiap halaman harus menangani:

-   Loading state.
-   Empty state.
-   Success state.
-   Error state.
-   Validation state.
-   Offline state: di web, banner bahwa aplikasi butuh koneksi dan aksi
    tulis nonaktif; di Android, penanda perubahan belum tersinkron.

------------------------------------------------------------------------

## 5. Non-Functional Requirements

### 5.1 Performance

-   Halaman utama harus terasa responsif.
-   Operasi CRUD transaksi harus memberikan feedback yang jelas.
-   Grafik harus dapat menangani riwayat transaksi yang terus bertambah.
-   Hindari pengambilan seluruh data transaksi tanpa pagination atau
    batasan periode.

### 5.2 Security

-   Password wajib di-hash menggunakan algoritma yang sesuai.
-   Gunakan HTTPS.
-   Terapkan authentication dan authorization.
-   Sesi dibawa sebagai httpOnly cookie; tidak ada token yang disimpan
    di JavaScript.
-   Validasi input pada frontend dan backend.
-   Terapkan ownership checks pada seluruh operasi transaksi, Dompet,
    kategori, dan budget.
-   Lindungi API dari akses lintas pengguna.
-   Jangan menyimpan credential atau secret di frontend.
-   Batasi laju register, login, forgot password, dan pembuatan Akun
    demo, karena semuanya terbuka untuk publik.

### 5.3 Data Integrity

-   Semua nominal (transaksi, saldo awal, budget) disimpan sebagai
    bilangan bulat rupiah. Tidak ada tipe floating-point dan tidak ada
    pecahan.
-   Waktu transaksi disimpan sebagai satu momen yang tidak ambigu;
    pengelompokan per hari, minggu, dan bulan dilakukan server dengan
    zona waktu di profil.
-   Gunakan database transaction untuk operasi yang membutuhkan
    konsistensi.
-   Duplicate submission akibat tap ganda dicegah dengan mengunci tombol
    simpan selama permintaan berjalan. ID transaksi dibuat server
    ([ADR 0004](docs/adr/0004-online-penuh-id-server-hapus-fisik.md)).
-   Transaksi yang dihapus dibuang permanen dari database.
-   Gunakan server sebagai sumber data utama.
-   Perhitungan keuangan harus konsisten di seluruh perangkat.

### 5.4 Compatibility

Target browser:

-   macOS (MacBook): Chrome, Safari, dan browser modern.
-   Android: Chrome dan browser berbasis Chromium, di berbagai ukuran
    layar (termasuk Redmi) dan versi Android yang didukung browser.
-   iPhone (iOS): Safari, termasuk mode PWA standalone dari home screen,
    di berbagai ukuran layar iPhone dan versi iOS yang didukung.

### 5.5 Offline Support

Web online-only, Android offline-first
([ADR 0005](docs/adr/0005-offline-first-android-sinkronisasi.md)):

-   **Web**: tidak ada service worker dan tidak ada cache halaman. Bila
    koneksi putus saat aplikasi terbuka, tampil banner offline dan semua
    aksi tulis dinonaktifkan. Isi form tetap di layar agar bisa dicoba
    ulang.
-   **Android**: semua pencatatan, pengeditan, penghapusan, Saldo, dan
    Dashboard tetap berfungsi tanpa koneksi. Perubahan disimpan di
    Perangkat dan disinkronkan saat online. Login pertama wajib online.
-   Perangkat menampilkan penanda bila ada perubahan yang belum
    tersinkron.
-   Konflik diselesaikan menurut ADR 0005: edit terakhir menang per
    record, hapus selalu menang, Kategori kembar digabung.
-   iPhone belum didukung.

------------------------------------------------------------------------

## 6. Technical Architecture

Satu aplikasi Next.js fullstack: antarmuka PWA dan REST API berada di
satu repo dan satu deploy.

### 6.1 Application

-   Next.js dengan TypeScript.
-   Tailwind CSS dan responsive component system.
-   Web app manifest (installable), tanpa service worker.
-   Chart library.
-   REST API melalui route handlers Next.js.
-   Prisma ORM.
-   Library auth untuk email + password, sesi berbasis cookie, dan reset
    password.

Logika domain (Saldo, ringkasan periode, aturan transaksi, budget)
berada di modul tersendiri yang tidak bergantung pada komponen UI maupun
route handler, sehingga bisa diuji tanpa browser dan tanpa HTTP.

Tanggung jawab sisi antarmuka: user interface, form validation, state
management, API integration, responsive rendering, offline status
handling.

Tanggung jawab sisi server: authentication, authorization, pengelolaan
Dompet, transaksi, kategori, dan budget, financial calculations, data
validation.

### 6.2 Database

PostgreSQL.

Entitas:

1.  users
2.  wallets
3.  categories
4.  transactions
5.  budgets

Relasi:

-   One user has many wallets, categories, transactions, dan budgets.
-   One wallet has many transactions.
-   Satu Transfer merujuk dua wallet: asal dan tujuan.
-   One category has many transactions.
-   One category belongs to one user.

Database harus mendukung kepemilikan data dan mencegah akses lintas
pengguna.

### 6.3 Hosting

-   Aplikasi: Vercel.
-   Database: Neon (PostgreSQL serverless).
-   Email reset password: Resend.
-   Job terjadwal harian untuk membersihkan Akun demo yang kedaluwarsa.

### 6.4 High-Level Architecture

``` text
User (MacBook / Android / iPhone)
        |
        v
   PWA Frontend  ----+
        |            |  satu aplikasi Next.js di Vercel
        v            |
     REST API    ----+
        |
        v
 PostgreSQL (Neon)
```

Server menjadi sumber kebenaran untuk seluruh data dan perhitungan
finansial.

------------------------------------------------------------------------

## 7. Data Model Requirements

Kredensial dan sesi disimpan di tabel milik library auth; tabel di bawah
adalah data domain.

### 7.1 Users

-   id
-   name
-   email
-   timezone
-   is_demo
-   demo_expires_at
-   created_at
-   updated_at

### 7.2 Wallets

-   id
-   user_id
-   name
-   opening_balance
-   icon
-   color
-   archived_at
-   created_at
-   updated_at

### 7.3 Categories

-   id
-   user_id
-   name
-   type
-   icon
-   color
-   archived_at
-   created_at
-   updated_at

### 7.4 Transactions

-   id (UUID dari server)
-   user_id
-   type
-   amount
-   wallet_id
-   to_wallet_id (hanya Transfer)
-   category_id (kosong untuk Transfer)
-   description
-   occurred_at
-   created_at
-   updated_at

### 7.5 Budgets

-   id
-   user_id
-   category_id (nullable untuk budget keseluruhan)
-   amount (kosong berarti budget dihentikan)
-   effective_month
-   created_at

Setiap perubahan nominal menambah satu baris. Nominal yang berlaku untuk
suatu bulan adalah baris dengan `effective_month` terbaru yang tidak
melewati bulan itu.

Semua data finansial harus memiliki relasi kepemilikan yang jelas.

------------------------------------------------------------------------

## 8. API Requirements

REST API endpoints. Path auth persisnya mengikuti library auth yang
dipakai.

### Authentication

-   `POST /api/auth/register`
-   `POST /api/auth/login`
-   `POST /api/auth/logout`
-   `POST /api/auth/forgot-password`
-   `POST /api/auth/reset-password`
-   `POST /api/auth/change-password`
-   `POST /api/auth/demo`
-   `GET /api/auth/me`
-   `PATCH /api/auth/me`

### Wallets

-   `GET /api/wallets` (menyertakan Saldo tiap Dompet)
-   `POST /api/wallets`
-   `PATCH /api/wallets/:id`
-   `POST /api/wallets/:id/archive`
-   `POST /api/wallets/:id/unarchive`
-   `DELETE /api/wallets/:id` (hanya bila belum pernah dipakai)

### Transactions

-   `GET /api/transactions`
-   `GET /api/transactions/:id`
-   `POST /api/transactions` (ID dikirim klien; idempoten)
-   `PATCH /api/transactions/:id`
-   `DELETE /api/transactions/:id`

### Categories

-   `GET /api/categories`
-   `POST /api/categories`
-   `PATCH /api/categories/:id`
-   `POST /api/categories/:id/archive`
-   `POST /api/categories/:id/unarchive`
-   `DELETE /api/categories/:id` (hanya bila belum pernah dipakai)

### Budgets

-   `GET /api/budgets`
-   `POST /api/budgets`
-   `PATCH /api/budgets/:id`
-   `DELETE /api/budgets/:id`

### Analytics

-   `GET /api/analytics/summary`
-   `GET /api/analytics/income-expense`
-   `GET /api/analytics/expense-breakdown`
-   `GET /api/analytics/trends`

API harus mendukung filtering berdasarkan rentang waktu, kategori,
Dompet, tipe transaksi, serta pagination.

------------------------------------------------------------------------

## 9. MVP Scope & Development Priorities

Pengembangan dilakukan secara bertahap agar fitur inti dapat digunakan
terlebih dahulu.

### Phase 1 --- Core MVP

Prioritas tertinggi:

-   Register, login, logout, forgot password, change password, profil
    dengan zona waktu.
-   Dompet: buat, ubah, arsip, saldo awal, Dompet "Tunai" otomatis.
-   Create Income, Expense, dan Transfer.
-   Edit transaction.
-   Delete transaction.
-   Transaction history.
-   Default categories.
-   Basic search and filtering.
-   Dashboard: Total Balance, Saldo tiap Dompet, Total Income, Total
    Expense, Net Cash Flow, Recent Transactions, filter periode.
-   Cross-device data synchronization.
-   Responsive PWA.
-   Akun demo dengan data contoh.

**Definition of Done:**

Pengguna dapat mencatat, melihat, mengubah, dan menghapus Income,
Expense, dan Transfer dari MacBook, Android, maupun iPhone. Saldo tiap
Dompet dan angka dashboard di semua perangkat harus sama. Reviewer dapat membuka URL
publik, menekan "Coba demo", dan melihat dashboard yang terisi.

### Phase 2 --- Financial Insights

-   Custom categories (buat, ubah, arsip).
-   Expense breakdown.
-   Income vs expense chart.
-   Financial summary.
-   Date range reports.
-   Transaction trends.

### Phase 3 --- Financial Planning

-   Budget keseluruhan.
-   Category budget.
-   Budget utilization.
-   Budget warnings.

### Phase 4 --- Advanced Features

-   CSV export.
-   PDF financial reports.
-   Recurring transactions.
-   Custom dashboard.
-   Data backup and restore.

------------------------------------------------------------------------

## 10. Out of Scope

Fitur berikut tidak termasuk dalam roadmap saat ini:

-   Direct bank integration.
-   Automatic bank transaction detection.
-   Credit card integration.
-   Investment portfolio tracking.
-   Cryptocurrency tracking.
-   Multi-user household finance.
-   AI-powered financial advisor.
-   Automatic receipt OCR.
-   Mata uang selain IDR dan konversi kurs.
-   Transaksi dengan waktu di masa depan (menunggu Recurring
    transactions).
-   Dashboard dan laporan per Dompet.
-   Financial goals (belum punya definisi).
-   Verifikasi email saat register.
-   Halaman sampah atau pemulihan transaksi terhapus.
-   Menggabungkan (merge) kategori.

Fitur tersebut dapat dipertimbangkan setelah kebutuhan inti terpenuhi.

------------------------------------------------------------------------

## 11. Success Metrics

Keberhasilan produk dievaluasi melalui:

1.  Transaction creation success rate.
2.  Transaction data consistency across devices.
3.  Dashboard and wallet balance calculation accuracy.
4.  API reliability.
5.  Application responsiveness.
6.  User ability to complete transaction recording without confusion.

**Target kualitas MVP:**

-   Tidak ada kebocoran data antarpengguna.
-   Tidak ada kesalahan perhitungan pada Saldo dan ringkasan keuangan.
-   Tidak ada duplikasi transaksi akibat tap ganda pada tombol simpan.
-   Transfer tidak pernah mengubah Total Income, Total Expense, atau
    Total Balance.
-   Seluruh fitur CRUD utama berjalan di desktop dan mobile.
-   Seluruh halaman utama memiliki loading, empty, dan error states.

------------------------------------------------------------------------

## 12. Key Product Decisions

1.  Aplikasi berorientasi pada personal finance, bukan business
    accounting.
2.  Satu Akun mewakili satu pengguna.
3.  Hanya IDR; semua nominal bilangan bulat rupiah
    ([ADR 0002](docs/adr/0002-nominal-bilangan-bulat-rupiah.md)).
4.  Uang berada di Dompet; Total Balance adalah jumlah Saldo semua
    Dompet aktif.
5.  Transaksi punya tiga tipe: Income, Expense, Transfer. Transfer tidak
    berkategori dan biaya adminnya dicatat sebagai Expense terpisah
    ([ADR 0001](docs/adr/0001-transfer-sebagai-tipe-transaksi.md)).
6.  Aplikasi online-only; ID transaksi dibuat server dan penghapusan
    bersifat permanen
    ([ADR 0004](docs/adr/0004-online-penuh-id-server-hapus-fisik.md)).
7.  Waktu transaksi mencakup tanggal dan jam; batas periode mengikuti
    zona waktu di profil.
8.  Dompet dan kategori yang terpakai diarsipkan, tidak dihapus.
9.  Budget berulang per bulan kalender dan menyimpan riwayat nominalnya.
10. Data disimpan di server agar dapat diakses lintas perangkat; server
    menjadi sumber kebenaran untuk seluruh perhitungan finansial.
11. Satu aplikasi Next.js fullstack yang bisa di-install (manifest saja), di-deploy ke Vercel
    dengan PostgreSQL di Neon.
12. Registrasi terbuka tanpa verifikasi email, ditambah Akun demo
    sementara per pengunjung.
13. Fitur pencatatan transaksi menjadi prioritas sebelum fitur analitik
    lanjutan.

------------------------------------------------------------------------

## 13. Final Product Definition

Personal Finance Tracker adalah aplikasi pengelolaan keuangan pribadi
lintas perangkat yang memungkinkan pengguna mencatat pemasukan,
pengeluaran, dan perpindahan uang antar-dompet, mengelola kategori,
melihat riwayat transaksi, memahami kondisi keuangan melalui dashboard,
serta mengontrol pengeluaran melalui fitur budgeting.

Produk harus mengutamakan akurasi data, keamanan, kemudahan penggunaan,
dan konsistensi pengalaman pada macOS dan Android.

**Primary product objective:**

> Make personal finance tracking simple, accessible, and understandable
> for everyone.
