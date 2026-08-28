# 🎨 Graphic Standard Manual (GSM) & Design System
**Rapot Rawat Maba 2026 — Platform Evaluasi Karakter Mahasiswa Baru**

---

## 📌 1. Pengenalan & Brand Identity

**Rapot Rawat Maba 2026** mengusung identitas visual modern, energik, edukatif, dan humanis. Desain sistem menggabungkan nuansa *electric blue-cyan* yang futuristik dengan sentuhan palet hangat (*peach*, *lavender*, *cream*) untuk merepresentasikan semangat pembinaan, ketertiban, dan kebersamaan.

| Elemen | Deskripsi |
| :--- | :--- |
| **Produk** | Rapot Digital Rawat Maba |
| **Organisasi / Divisi** | Human Resources Development (HRD) / Divisi Pembinaan Mahasiswa Baru |
| **Karakter Visual** | Vibrant, Terstruktur, Kontemporer, Humanis, Berstandar Tinggi |
| **Aset Utama** | Logo HRD, Judul 3D/Stroke Style, Bintang Ornament, Dot Pattern Grid |

---

## 🎨 2. Palet Warna (Color Palette)

Semua token warna telah distandarisasi di dalam `tailwind.config.js` dan CSS tema aplikasi.

### 🔷 Primary & Accent Colors

```
+-----------------------------------------------------------------------------------+
|  gsm-blue-main  |   gsm-cyan    | gsm-lavender  |   gsm-peach   |    gsm-cream    |
|     #003CEC     |    #00B0D8    |    #C896E0    |    #E59B86    |     #F4F6C0     |
+-----------------------------------------------------------------------------------+
|   gsm-lilac     | gsm-dark-blue |  text-primary |   bg-surface  |   border-soft   |
|     #DCD6F7     |    #0A1128    |    #0F172A    |    #FFFFFF    |     #E2E8F0     |
+-----------------------------------------------------------------------------------+
```

| Nama Token | HEX | RGB | Peran & Penggunaan |
| :--- | :--- | :--- | :--- |
| `gsm-blue-main` | `#003CEC` | `rgb(0, 60, 236)` | **Warna Utama (Primary Brand)**: Tombol utama, active state nav, highlight, gradient start. |
| `gsm-cyan` | `#00B0D8` | `rgb(0, 176, 216)` | **Aksen Elektrik (Cyan)**: Gradient finish, hover borders, status aktif cerah, icon accents. |
| `gsm-lavender` | `#C896E0` | `rgb(200, 150, 224)` | **Aksen Sekunder (Lavender)**: Gradient judul, badge nilai soft, dekorasi visual. |
| `gsm-peach` | `#E59B86` | `rgb(229, 155, 134)` | **Aksen Hangat (Peach)**: Badge perhatian, title header gradient, aksen pilar aksi. |
| `gsm-cream` | `#F4F6C0` | `rgb(244, 246, 192)` | **Highlight Lembut (Cream)**: Badge istimewa, kartu nilai tinggi, glow overlay. |
| `gsm-lilac` | `#DCD6F7` | `rgb(220, 214, 247)` | **Neutral Tint (Lilac)**: Background tag ringan, border halus kartu aksen. |
| `gsm-dark-blue` | `#0A1128` | `rgb(10, 17, 40)` | **Neutral Dark**: Teks judul tebal, header tabel kontras tinggi, background malam. |
| `text-dark` | `#0F172A` | `rgb(15, 23, 42)` | **Body Text**: Teks konten reguler di atas background terang. |

---

### 🌈 Gradients Resmi

1. **GSM Primary Blue Gradient** (`bg-gsm-blue-gradient` / `.bg-gsm-linear-exact`)
   ```css
   background: linear-gradient(135deg, #003CEC 0%, #00B0D8 62%);
   ```
   *Penggunaan*: Header bar, kartu highlight utama, hero banner, button primary premium.

2. **GSM Peach-to-Lavender Gradient** (`bg-gsm-peach-gradient`)
   ```css
   background: linear-gradient(180deg, #E59B86 0%, #C896E0 50%, #F4F6C0 100%);
   ```
   *Penggunaan*: Badge skor khusus, card preview artistik, decorative pillars.

3. **GSM Title Gradient with White Stroke** (`.title-pilaraksi-gsm`)
   ```css
   font-family: 'Space Grotesk', 'Coolvetica', sans-serif;
   background: linear-gradient(180deg, #F09789 0%, #D696E0 100%);
   -webkit-background-clip: text;
   -webkit-text-fill-color: transparent;
   -webkit-text-stroke: 1.5px #ffffff;
   paint-order: stroke fill;
   filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.3));
   ```
   *Penggunaan*: Headline tipografi di atas banner biru atau background gelap.

---

## 🔤 3. Tipografi (Typography System)

Sistem tipografi memadukan 4 jenis huruf fungsional untuk menciptakan hierarki yang terstruktur:

| Kategori | Font Family | Tailwind Class | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Display / Hero** | `Space Grotesk`, `Coolvetica`, sans-serif | `font-coolvetica` / `font-judul` | Judul utama halaman, angka besar KPI, headline hero banner. |
| **Serif Headings** | `Merriweather`, serif | `font-serif-judul` | Subjudul formal, kutipan evaluasi, judul sertifikat rapot. |
| **Body & UI** | `Reddit Sans`, sans-serif | `font-sans` / `font-isi` | Body copy, label input, teks navigasi, deskripsi tabel, modal. |
| **Monospace / Code** | `Google Sans Code`, `Fira Code`, monospace | `font-sans-code` / `font-code` | NIM mahasiswa, kode kelas, nilai numerik presisi, ID transaksi. |
| **Iconography** | `Material Symbols Outlined` | `material-symbols-outlined` | Semua icon UI interaktif & navigasi. |

### Hierarki Skala Ukuran Font

- **Display 1 (Hero Banner)**: `text-4xl` s.d. `text-5xl` (`36px` – `48px`), `font-bold` / `font-extrabold`, tracking `0.015em`
- **Heading 1 (Page Title)**: `text-2xl` s.d. `text-3xl` (`24px` – `30px`), `font-bold`, leading `1.2`
- **Heading 2 (Card Title / Section)**: `text-xl` (`20px`), `font-semibold`
- **Heading 3 (Subsection / Modal Title)**: `text-lg` (`18px`), `font-semibold`
- **Body Regular**: `text-sm` s.d. `text-base` (`14px` – `16px`), `font-normal`, leading `1.5`
- **Caption / Meta Text**: `text-xs` (`12px`), `font-medium`, text muted (`#64748B`)
- **Badge / Pill**: `text-xs` (`11px` – `12px`), `font-semibold`, tracking `0.05em`, uppercase / normal

---

## 📦 4. Komponen UI & Design Specs

### 🔘 4.1 Buttons

- **Primary Gradient Button**:
  ```html
  <button class="bg-gsm-linear-exact text-white font-medium px-5 py-2.5 rounded-xl shadow-md hover:shadow-gsm-hover hover:scale-[1.02] transition-all duration-200">
    Simpan Rapot
  </button>
  ```
- **Secondary / Soft Button**:
  ```html
  <button class="bg-blue-50 text-gsm-blue-main font-medium px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
    Batal
  </button>
  ```
- **Outline Button**:
  ```html
  <button class="border border-slate-200 text-slate-700 font-medium px-4 py-2 rounded-xl hover:border-gsm-cyan hover:text-gsm-blue-main transition-colors">
    Ekspor Excel
  </button>
  ```

---

### 🃏 4.2 Cards & Surfaces

- **Standard Data Card**:
  - Background: `#FFFFFF`
  - Border: `1px solid #F1F5F9` atau `#E2E8F0`
  - Radius: `rounded-2xl` (`16px`) s.d. `rounded-3xl` (`24px`)
  - Shadow: `shadow-gsm-card` (`0 10px 30px -5px rgba(0, 60, 236, 0.08)`)
  - Hover Effect: `hover:shadow-gsm-hover hover:-translate-y-0.5 transition-all duration-200`

- **Glassmorphic Floating Bar**:
  - Background: `rgba(255, 255, 255, 0.85)`
  - Backdrop Blur: `backdrop-blur-md`
  - Border: `1px solid rgba(255, 255, 255, 0.6)`
  - Shadow: `0 8px 32px 0 rgba(0, 60, 236, 0.1)`

---

### 🏷️ 4.3 Badges & Status Indicators

| Kategori | Styling Classes | Indikasi / Makna |
| :--- | :--- | :--- |
| **Sangat Baik (A / 85-100)** | `bg-emerald-50 text-emerald-600 border border-emerald-200` | Karakter teladan, tuntas |
| **Baik (B / 70-84)** | `bg-blue-50 text-gsm-blue-main border border-blue-200` | Standar kompetensi tercapai |
| **Cukup (C / 55-69)** | `bg-amber-50 text-amber-600 border border-amber-200` | Memerlukan pendampingan |
| **Kurang (D/E / <55)** | `bg-rose-50 text-rose-600 border border-rose-200` | Evaluasi khusus & follow-up |
| **Pilar / Tag Khusus** | `bg-gsm-lilac/30 text-gsm-blue-main border border-gsm-lilac` | Kategori pilar Rawat Maba |

---

## 🎬 5. Motion & Animation Standards

Animasi dirancang halus (*subtle*) dan responsif agar tidak mengganggu operasional penilaian:

1. **Page & Modal Transition (`animate-view-transition`)**:
   ```css
   @keyframes viewFadeSlide {
     0% { opacity: 0; transform: translateY(14px) scale(0.996); }
     100% { opacity: 1; transform: translateY(0) scale(1); }
   }
   /* Durasi: 0.35s | Easing: cubic-bezier(0.16, 1, 0.3, 1) */
   ```

2. **Hero Title Breath Glow (`animate-title-breath`)**:
   - Siklus 4 detik berulang lembut untuk banner login / halaman pembuka.
   - Glow putih halus: `drop-shadow(0 0 30px rgba(255, 255, 255, 0.5))`.

3. **Micro-Interactions**:
   - Hover Card Scale: `scale-[1.01]` s.d. `scale-[1.02]`
   - Button Press: `active:scale-[0.98]`
   - Transition Curve: `ease-out` atau `cubic-bezier(0.16, 1, 0.3, 1)` (150ms – 250ms).

---

## 🖼️ 6. Brand Assets Catalog

Semua aset resmi diletakkan pada folder `/public/assets/`:

- `Logo HRD.png` — Logo resmi divisi pengampu.
- `JUDUL.png` & `JUDUL2.svg` — Tipografi 3D resmi "RAWAT MABA 2026".
- `subjudul.png` & `sub judul2.png` — Subtitle pelengkap "Evaluasi & Karakter".
- `BG1.png`, `BG2.svg`, `Bg3.png`, `BG4.svg` — Ilustrasi & layer latar belakang geometris.
- `Pattern Dot.png` — Grid dot aksen pelengkap latar.
- `Bintang.png` — Ornamen bintang aksen visual cerah.

---

## ✅ 7. Rules: Do's and Don'ts

### ✅ DO
- Gunakan gradien `gsm-blue-gradient` untuk visual sentral / hero area.
- Tampilkan NIM dan kode angka penting menggunakan font monospace (`Fira Code` / `font-code`).
- Jaga kontras teks dengan background putih (`#0F172A` atau `#1E293B`).
- Gunakan sudut melengkung konsisten (`rounded-xl` s.d. `rounded-3xl`).
- Pastikan setiap modal memiliki animasi entrance `animate-view-transition`.

### ❌ DON'T
- Jangan gunakan warna solid acak (seperti warna merah murni `#FF0000` atau hijau murni `#00FF00`) tanpa token.
- Jangan menghilangkan outline putih (`-webkit-text-stroke`) pada judul gradient di atas background gelap.
- Jangan mencampur font non-standar di luar `Reddit Sans`, `Space Grotesk`, `Merriweather`, dan `Fira Code`.
- Jangan membuat bayangan (*drop-shadow*) terlalu pekat/hitam pekat; gunakan alpha rendah dengan tint biru (`rgba(0, 60, 236, 0.08)`).

---
*Dikeluarkan oleh Tim Kreatif & Teknologi — Rapot Rawat Maba 2026*
