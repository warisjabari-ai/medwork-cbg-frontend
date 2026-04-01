import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ─── Constantes ───────────────────────────────────────────────────────────────
const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const DAYS_FR = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDMY(s: string): { d: number; m: number; y: number } | null {
  const p = s.split("/");
  if (p.length !== 3) return null;
  const [d, m, y] = p.map(Number);
  if (!d || !m || !y || y < 1900 || y > 2100) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { d, m, y };
}

function toDMY(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Composant principal ──────────────────────────────────────────────────────
interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
  minYear?: number;
  maxYear?: number;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "JJ/MM/AAAA",
  className = "",
  disabled = false,
  label,
  minYear = 1950,
  maxYear = new Date().getFullYear() + 10,
}: DatePickerProps) {
  const today = new Date();
  const parsed = parseDMY(value);

  const [open, setOpen] = useState(false);
  const [viewYear,  setViewYear]  = useState(parsed?.y  ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.m  ?? today.getMonth() + 1);
  const [inputVal,  setInputVal]  = useState(value);
  const [popupPos,  setPopupPos]  = useState({ top: 0, left: 0, width: 0 });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const popup  = document.getElementById("datepicker-portal");
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        popup && !popup.contains(target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  // Calculer la position du popup depuis le bounding rect de l'input
  const openPopup = () => {
    if (disabled || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const popupH = 380; // hauteur estimée du calendrier
    const top = spaceBelow > popupH
      ? rect.bottom + window.scrollY + 4
      : rect.top  + window.scrollY - popupH - 4;
    setPopupPos({ top, left: rect.left + window.scrollX, width: Math.max(rect.width, 288) });
    setOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputVal(v);
    const p = parseDMY(v);
    if (p) { onChange(v); setViewYear(p.y); setViewMonth(p.m); }
  };

  const handleInputBlur = () => {
    if (!parseDMY(inputVal)) setInputVal(value);
  };

  const selectDay = (d: number) => {
    const date = toDMY(new Date(viewYear, viewMonth - 1, d));
    onChange(date);
    setInputVal(date);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay  = firstDayOfMonth(viewYear, viewMonth);
  const selectedP = parseDMY(value);
  const isSelected = (d: number) =>
    selectedP?.d === d && selectedP?.m === viewMonth && selectedP?.y === viewYear;
  const isToday = (d: number) =>
    today.getDate() === d && today.getMonth() + 1 === viewMonth && today.getFullYear() === viewYear;

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  const baseInp = `w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition
    focus:border-medwork-cyan focus:bg-white focus:ring-2 focus:ring-medwork-cyan/20
    disabled:opacity-50 disabled:cursor-not-allowed ${className}`;

  const popup = open && (
    <div
      id="datepicker-portal"
      style={{ position: "absolute", top: popupPos.top, left: popupPos.left, width: 288, zIndex: 99999 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60"
    >
      {/* Navigation */}
      <div className="flex items-center justify-between bg-medwork-navy px-4 py-3">
        <button type="button" onClick={prevMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/20 transition">‹</button>
        <div className="flex items-center gap-2">
          <select value={viewMonth} onChange={(e) => setViewMonth(Number(e.target.value))}
            className="rounded-lg border-0 bg-white/20 px-2 py-1 text-xs font-bold text-white outline-none cursor-pointer">
            {MONTHS_FR.map((m, i) => <option key={i + 1} value={i + 1} className="text-slate-800">{m}</option>)}
          </select>
          <select value={viewYear} onChange={(e) => setViewYear(Number(e.target.value))}
            className="rounded-lg border-0 bg-white/20 px-2 py-1 text-xs font-bold text-white outline-none cursor-pointer">
            {years.map((y) => <option key={y} value={y} className="text-slate-800">{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={nextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/70 hover:bg-white/20 transition">›</button>
      </div>

      {/* Jours de semaine */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 px-3 py-2">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">{d}</div>
        ))}
      </div>

      {/* Grille jours */}
      <div className="grid grid-cols-7 gap-0.5 p-3">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => (
          <button
            key={d} type="button" onClick={() => selectDay(d)}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-medium transition mx-auto
              ${isSelected(d)
                ? "bg-medwork-cyan text-white font-bold shadow-sm"
                : isToday(d)
                ? "border border-medwork-cyan text-medwork-cyan font-bold"
                : "text-slate-700 hover:bg-slate-100"
              }`}
          >{d}</button>
        ))}
      </div>

      {/* Aujourd'hui */}
      <div className="border-t border-slate-100 px-3 py-2">
        <button type="button"
          onClick={() => { const t = toDMY(today); onChange(t); setInputVal(t); setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); setOpen(false); }}
          className="w-full rounded-lg py-1.5 text-xs font-semibold text-medwork-cyan hover:bg-cyan-50 transition">
          Aujourd'hui
        </button>
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</label>
      )}
      <div className="relative">
        <input
          type="text"
          value={inputVal}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={openPopup}
          placeholder={placeholder}
          disabled={disabled}
          className={baseInp + " pr-9"}
          autoComplete="off"
        />
        <button
          type="button" disabled={disabled}
          onClick={() => open ? setOpen(false) : openPopup()}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-medwork-cyan transition disabled:opacity-40"
          tabIndex={-1}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 8h12v8H4V8z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {/* Rendu dans le body via portal pour éviter overflow:hidden */}
      {typeof document !== "undefined" && createPortal(popup, document.body)}
    </div>
  );
}