"use client";

import { useLang } from "@/lib/i18n";

type Member = {
  /** Path foto di /public. Kosong = tampil inisial. Ganti file dengan foto asli beresolusi tinggi bila tersedia. */
  photo?: string;
  name: string;
  /** Teks Bahasa Indonesia; terjemahan EN di lib/dictionary.ts. */
  role: string;
  /** Teks Bahasa Indonesia; terjemahan EN di lib/dictionary.ts. */
  experience: string[];
};

export type TeamKey = "manajemen" | "healthcare";

/** Halaman tim di menu Profil (dipakai juga oleh Navbar & Footer). Label = judul halaman. */
export const TEAM_PAGES = [
  { key: "manajemen", href: "/jajaran-manajemen/", label: "Jajaran Manajemen" },
  { key: "healthcare", href: "/healthcare-specialists/", label: "Jajaran Healthcare Specialists" },
] as const;

const TEAMS: Record<TeamKey, { intro: string; members: Member[] }> = {
  manajemen: {
    intro: "Pemimpin berpengalaman yang mendorong transformasi digital kesehatan Indonesia.",
    members: [
      {
        photo: "/assets/tim/rivelino-hasugian.webp",
        name: "Rivelino Hasugian",
        role: "Direktur Utama",
        experience: ["Eks-Direktur Oracle – Teknologi"],
      },
      {
        photo: "/assets/tim/bambang-h-purnomo.webp",
        name: "Bambang H. Purnomo",
        role: "Kepala Pengembangan Bisnis Strategis",
        experience: [
          "Eks-Direktur Konsultasi Deloitte",
          "Eks-Direktur Layanan Advisory KPMG Indonesia",
          "Eks-Presiden Direktur Sigma Solusi Integrasi (Telkom Group)",
        ],
      },
      {
        photo: "/assets/tim/tavri-deviyan.webp",
        name: "Tavri Deviyan",
        role: "Kepala Informatika Kesehatan",
        experience: ["Eks-CIO Rumah Sakit Pondok Indah", "Konsultan Berbagai Proyek Implementasi HIS"],
      },
      {
        photo: "/assets/tim/abiathar.webp",
        name: "dr. Abiathar, M.Sc",
        role: "VP Strategi & Kemitraan Ekosistem Layanan Kesehatan",
        experience: ["Eks-Product Manager di Peralatan Kesehatan"],
      },
    ],
  },
  healthcare: {
    intro: "Para spesialis kesehatan kami yang mendukung transformasi layanan kesehatan digital Indonesia.",
    members: [
      {
        photo: "/assets/tim/lucy-widasari.webp",
        name: "Dr. dr. Lucy Widasari, M.Si",
        role: "Penasihat Inovasi Strategis Layanan Kesehatan – Dewan Keunggulan Kesehatan Intramedika",
        experience: ["Peneliti, Dosen, Penulis, Dokter Medis"],
      },
      {
        photo: "/assets/tim/tommy-p-sibuea.webp",
        name: "dr. Tommy P Sibuea, Sp. PD, FINASIM",
        role: "Penasihat Inovasi Strategis Layanan Kesehatan – Dewan Keunggulan Kesehatan Intramedika",
        experience: ["Dokter Medis"],
      },
      {
        photo: "/assets/tim/golda-naomi.webp",
        name: "dr. Golda Naomi, Sp. KP",
        role: "Dewan Keunggulan Kesehatan Intramedika",
        experience: ["Spesialis Kedokteran Penerbangan", "Koordinator MCU", "Dokter Medis"],
      },
    ],
  },
};

/** Inisial dari nama, tanpa gelar "Dr." / "dr." di depan. */
const initials = (name: string) =>
  name
    .replace(/^(Dr\.\s*)?(dr\.\s*)?/i, "")
    .split(/[\s,]+/)
    .filter((w) => /^[A-Z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export default function Team({ team }: { team: TeamKey }) {
  const { t } = useLang();
  const { intro, members } = TEAMS[team];
  const title = TEAM_PAGES.find((p) => p.key === team)!.label;
  return (
    <div className="pt-28 lg:pt-[8.5vw] pb-20 bg-gradient-to-b from-white via-white to-mint/40 min-h-screen">
      <section className="max-w-6xl mx-auto px-5">
        <div className="text-center max-w-3xl mx-auto">
          <span className="inline-block text-xs md:text-sm font-extrabold tracking-[.18em] px-5 py-1.5 rounded-full bg-green-100 text-g9 border border-g6/30">
            {t("PROFIL PERUSAHAAN")}
          </span>{" "}
          <h1 className="mt-5 text-4xl md:text-5xl font-extrabold text-[#1d2b6b] tracking-tight leading-tight">{t(title)}</h1>
          <p className="mt-5 text-base md:text-lg text-slate-600">{t(intro)}</p>
        </div>
        <div className="mt-14 grid md:grid-cols-2 gap-6 lg:gap-7">
          {members.map((m, i) => {
            const lastOdd = i === members.length - 1 && members.length % 2 === 1;
            return (
              <article
                key={m.name}
                className={`card p-6 lg:p-7 flex gap-5 lg:gap-6 items-start${lastOdd ? " md:col-span-2 md:w-[calc(50%-.85rem)] md:mx-auto" : ""}`}
              >
                <div className="relative w-24 lg:w-28 aspect-[5/6] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0B5D2E] grid place-items-center text-white text-2xl font-extrabold">
                  <span aria-hidden="true">{initials(m.name)}</span>
                  {m.photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- foto kecil statis, static export tanpa optimasi gambar
                    <img src={m.photo} alt={`${t("Foto")} ${m.name}`} className="absolute inset-0 w-full h-full object-cover object-top" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold text-[#1d2b6b] leading-snug">{m.name}</h2>
                  <p className="mt-1 text-[15px] font-medium text-[#1f5fd0] leading-snug">{t(m.role)}</p>
                  <ul className="mt-3 space-y-1 text-[15px] text-slate-500 leading-relaxed">
                    {m.experience.map((x) => (
                      <li key={x}>{t(x)}</li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
