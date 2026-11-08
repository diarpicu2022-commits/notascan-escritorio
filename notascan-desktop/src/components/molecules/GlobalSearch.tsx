import { useEffect, useRef, useState } from "react";
import { cx } from "../../lib/cx";
import { ALL_STUDENTS, COURSES, type StudentRecord } from "../../data/students";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { Avatar } from "../atoms/Avatar";
import { Icon, type IconName } from "../atoms/Icon";
import { EnrollBadge } from "./EnrollBadge";
import { useI18n } from "../../i18n/I18nProvider";


const SEARCH_LINKS: Array<[id: "profile" | "grades" | "history" | "attendance" | "observer" | "reportcards", IconName]> = [
  ["profile", "user"], ["grades", "grade"], ["history", "book"],
  ["attendance", "calendar"], ["observer", "eye"], ["reportcards", "file"],
];

interface GlobalSearchProps {
  onOpenStudent?: (s: StudentRecord, tab: string) => void;
}

/** Búsqueda global de estudiantes (Ctrl + K): nombre, ID, documento o curso, con vista previa y accesos. */
export function GlobalSearch({ onOpenStudent }: GlobalSearchProps) {
  const { t: tr } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [recent, setRecent] = useState(["María Fernanda López", "7A"]);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen(true); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useDialogFocus(open, boxRef, () => setOpen(false));

  const t = q.trim().toLowerCase();
  const results = t
    ? ALL_STUDENTS.filter((s) => s.name.toLowerCase().indexOf(t) >= 0 || s.id.indexOf(t) >= 0 || s.document.toLowerCase().indexOf(t) >= 0 || s.course.toLowerCase() === t).slice(0, 7)
    : [];
  const cur = results[Math.min(idx, results.length - 1)];

  function go(s: StudentRecord, tab?: string) {
    setRecent([s.name, ...recent.filter((r) => r !== s.name)].slice(0, 4));
    setOpen(false);
    setQ("");
    onOpenStudent?.(s, tab || "profile");
  }

  return (
    <>
      <button type="button" className="ns-gsearch-trigger" onClick={() => setOpen(true)} aria-label={tr.search.trigger}>
        <Icon name="search" size={18} /><span>{tr.search.triggerText}</span><kbd>Ctrl K</kbd>
      </button>
      {open ? (
        <div className="ns-scrim ns-scrim--top" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div ref={boxRef} className="ns-gsearch" role="dialog" aria-modal aria-label={tr.search.dialog}>
            <div className="ns-gsearch-input">
              <Icon name="search" size={20} />
              <input
                data-autofocus value={q} placeholder={tr.search.placeholder} aria-label={tr.search.input}
                role="combobox" aria-expanded={results.length > 0} aria-controls="ns-gs-list" aria-activedescendant={cur ? "gs-" + cur.id : undefined}
                onChange={(e) => { setQ(e.target.value); setIdx(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(idx + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx(Math.max(idx - 1, 0)); }
                  if (e.key === "Enter" && cur) go(cur);
                }}
              />
              <kbd>Esc</kbd>
            </div>
            <div className="ns-gsearch-body">
              <div className="ns-gsearch-list">
                {!t ? (
                  <>
                    <span className="ns-overline">{tr.search.recent}</span>
                    <ul className="ns-gs-recent">
                      {recent.map((r) => <li key={r}><button type="button" onClick={() => setQ(r)}><Icon name="clock" size={14} />{r}</button></li>)}
                    </ul>
                    <span className="ns-overline">{tr.search.byCourse}</span>
                    <div className="ns-row" style={{ gap: 6 }}>
                      {COURSES.map((c) => <button key={c} type="button" className="ns-chip" onClick={() => setQ(c)}>{c}</button>)}
                    </div>
                  </>
                ) : results.length ? (
                  <>
                    <span className="ns-overline">{tr.search.results(results.length)}</span>
                    <ul id="ns-gs-list" role="listbox" className="ns-gs-results">
                      {results.map((s, i) => (
                        <li key={s.id} id={"gs-" + s.id} role="option" aria-selected={i === idx} className={cx(i === idx && "is-on")} onMouseEnter={() => setIdx(i)} onClick={() => go(s)}>
                          <Avatar name={s.name} size="sm" />
                          <div><strong>{s.name}</strong><span className="ns-caption">{s.course + " · " + s.id}</span></div>
                          <Icon name="arrow" size={16} />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : <p className="ns-gs-empty">{tr.search.empty}</p>}
              </div>
              {cur ? (
                <div className="ns-gsearch-preview">
                  <Avatar name={cur.name} size="lg" />
                  <strong className="ns-gs-name">{cur.name}</strong>
                  <span className="ns-caption">{tr.search.course(cur.course, cur.id)}</span>
                  <span className="ns-caption">{cur.document}</span>
                  <EnrollBadge status={cur.status} />
                  <div className="ns-gs-links">
                    {SEARCH_LINKS.map(([id, icon]) => <button key={id} type="button" onClick={() => go(cur, id)}><Icon name={icon} size={16} />{tr.search.links[id]}</button>)}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="ns-gsearch-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd>{" " + tr.search.keyNavigate}</span>
              <span><kbd>Enter</kbd>{" " + tr.search.keyOpen}</span>
              <span><kbd>Esc</kbd>{" " + tr.search.keyClose}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
