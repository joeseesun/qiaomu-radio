import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { RADIO_THEMES } from "./themes";
import type { ThemeId } from "./types";
import { useI18n, type MessageKey } from "./i18n";

export function ThemePicker({ value, onChange }: { value: ThemeId; onChange: (id: ThemeId) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [awake, setAwake] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setAwake(true);
      clearTimeout(timer);
      timer = setTimeout(() => setAwake(false), 4000);
    };
    document.addEventListener("pointerdown", wake);
    document.addEventListener("keydown", wake);
    return () => { clearTimeout(timer); document.removeEventListener("pointerdown", wake); document.removeEventListener("keydown", wake); };
  }, []);
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div className={`theme-picker ${awake || open ? "is-awake" : "is-asleep"}`} ref={root} onKeyDown={(event) => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (!open || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }}>
    <button className="theme-trigger" ref={trigger} aria-label={t("theme.switch")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Palette size={20} strokeWidth={1.5} /></button>
    {open && <div className="theme-popover" role="menu" aria-label={t("theme.menu")}>{RADIO_THEMES.map((theme) => <button key={theme.id} role="menuitemradio" aria-checked={value === theme.id} onClick={() => { onChange(theme.id); setOpen(false); trigger.current?.focus(); }}><span className={`theme-dot dot-${theme.id}`} /><span>{t(`theme.${theme.id}` as MessageKey)}</span>{value === theme.id && <Check size={15} />}</button>)}</div>}
  </div>;
}
