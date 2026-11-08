import { useShell } from "../../app/ShellContext";
import { Avatar } from "../../components/atoms/Avatar";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Progress } from "../../components/atoms/Controls";
import { CountUp } from "../../components/atoms/CountUp";
import { Icon } from "../../components/atoms/Icon";
import { Sticker } from "../../components/atoms/Sticker";
import { EmptyState } from "../../components/organisms/EmptyState";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { PageShell } from "../../components/templates/PageShell";
import { EVAL_STATUS, KIND } from "../../data/academic";
import { useI18n } from "../../i18n/I18nProvider";
import { shortDay, weekdayDay } from "../../i18n/dates";
import { useDashboard } from "../../services/teacherOverview";
import { useMarkReminderSeen, useMyReminders } from "../../services/reminders";
import { useToast } from "../../components/organisms/Toast";
import { assignmentsState, queryState } from "./states";

/** 01 · ¿Qué tengo pendiente hoy? Continuar la revisión es el punto de entrada. */
export function DashboardPage() {
  const { navigate: go } = useShell();
  const { aq, q, data: d } = useDashboard();
  const { t, lang, shownGrade } = useI18n();
  const x = t.tch.dash;
  const state = assignmentsState(aq, t.tch.states.loadingCourses) ?? queryState(q, x.loading, x.error);
  // El servicio da datos; el texto se compone aquí, en el idioma de la app (idiomas, paso 3).
  const greeting = d ? x.greeting[d.slot] : "";
  const dateLine = d ? x.dateLine(weekdayDay(lang, d.date), t.tch.periodName(d.period), d.year) : undefined;
  const pct = d?.hero && d.hero.total ? Math.round((d.hero.verified / d.hero.total) * 100) : 0;
  const reviewOf = (id: string) => go("review", id ? { id } : undefined);
  // Recordatorios de Rectoría: van primero en «Requieren tu atención» hasta que el docente los marca como vistos.
  const reminders = useMyReminders().data ?? [];
  const seen = useMarkReminderSeen();
  const [showToast, toastNode] = useToast();
  return (
    <PageShell active="dashboard">
      <Header
        eyebrow={dateLine ?? x.home} title={d ? x.title(greeting, d.name) : x.home} highlight={d?.name}
        description={d ? x.summary(d.inReview, d.toVerify) : undefined}
        actions={<>
          <Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>{x.newEvaluation}</Button>
          <Button size="lg" icon="grade" onClick={() => go("grade")}>{x.grade}</Button>
        </>}
      />
      {state ?? (d ? (
        <>
          <div className="ns-home-bento">
            <Block tone="navy" className="ns-home-hero" label={x.continueLabel}>
              <div className="ns-row" style={{ justifyContent: "space-between" }}>
                <span className="ns-overline" style={{ color: "var(--gold)" }}>{x.continueWhere}</span>
                {d.hero ? <Sticker tone="gold" rotate={4}>{x.pending(d.hero.pending)}</Sticker> : null}
              </div>
              {d.hero ? (
                <>
                  <div>
                    <h2 className="ns-home-hero-title">{d.hero.title}</h2>
                    <p className="ns-home-hero-meta">{x.heroMeta(d.hero.course, d.hero.total, d.hero.hoursAgo)}</p>
                  </div>
                  <div className="ns-home-hero-progress">
                    <div className="ns-row" style={{ justifyContent: "space-between" }}><span>{t.tch.verifiedOf(d.hero.verified, d.hero.total)}</span><strong>{pct + "%"}</strong></div>
                    <Progress value={d.hero.verified} total={d.hero.total} tone="inverse" label={x.reviewProgress} />
                  </div>
                  <div><Button iconRight="arrow" onClick={() => reviewOf(d.hero!.id)}>{x.continueLabel}</Button></div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="ns-home-hero-title">{x.noReviewsTitle}</h2>
                    <p className="ns-home-hero-meta">{x.noReviewsText}</p>
                  </div>
                  <div><Button iconRight="arrow" onClick={() => go("grade")}>{x.gradeOne}</Button></div>
                </>
              )}
            </Block>
            <Block tone="gold" className="ns-home-stat">
              <span className="ns-bento-icon" aria-hidden><Icon name="clock" size={18} strokeWidth={2.5} /></span>
              <span className="ns-bento-value"><CountUp value={String(d.toVerify)} /></span><span className="ns-bento-label">{x.toVerify(d.toVerify)}</span>
            </Block>
            <Block tone="sage" className="ns-home-stat">
              <span className="ns-bento-icon" aria-hidden><Icon name="check" size={18} strokeWidth={2.5} /></span>
              <span className="ns-bento-value"><CountUp value={d.verifiedMonth} /></span><span className="ns-bento-label">{x.verifiedMonth}</span>
            </Block>
            <Block className="ns-home-stat">
              <span className="ns-bento-icon" aria-hidden><Icon name="reports" size={18} strokeWidth={2.5} /></span>
              <span className="ns-bento-value"><CountUp value={shownGrade(d.avg)} /></span><span className="ns-bento-label">{d.avgOf ? x.avgOf(d.avgOf.subject, d.avgOf.course) : x.avgCourse}</span>
            </Block>
          </div>
          <div className="ns-home-cols">
            <Block label={x.inProgress}>
              <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("evaluations")}>{t.tch.states.seeAll}</Button>}>{x.inProgress}</BlockTitle>
              {d.evaluations.length ? (
                <ul className="ns-list">
                  {d.evaluations.map((e) => {
                    const st = EVAL_STATUS[e.status];
                    return (
                      <li key={e.id} className="ns-list-item">
                        <Sticker tone={KIND[e.kind][1]} rotate={0}>{t.tch.kind[e.kind]}</Sticker>
                        <div className="ns-list-main"><strong>{e.name}</strong><span className="ns-caption">{x.evalCaption(e.subject, e.weight, e.due ? shortDay(lang, e.due) : t.tch.noDate)}</span></div>
                        <div className="ns-list-progress"><Progress value={e.reviewed} total={e.total} label={t.tch.progressOf(e.name)} /><span className="ns-caption">{e.reviewed + "/" + e.total}</span></div>
                        <Badge tone={st[1]}>{t.tch.evalStatus[e.status]}</Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : <EmptyState title={x.noEvalsTitle} message={x.noEvalsText} action={<Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>{t.tch.states.goEvaluations}</Button>} />}
            </Block>
            <Block tone="paper" label={x.attention}>
              <BlockTitle>{x.attention}</BlockTitle>
              {d.attention.length || reminders.length ? (
                <ul className="ns-list">
                  {reminders.map((r) => (
                    <li key={"r" + r.id} className="ns-list-item">
                      <Avatar name={r.sender} size="sm" />
                      <div className="ns-list-main"><strong>{x.reminderOf(r.sender)}</strong><span className="ns-caption">{r.message}</span></div>
                      <Button variant="secondary" size="sm" icon="check" loading={seen.isPending && seen.variables === r.id} loadingText={t.common.saving}
                        onClick={() => seen.mutateAsync(r.id).catch(() => showToast({ tone: "error", title: x.seenError, message: t.common.retryHint }))}
                        aria-label={x.seenAria(r.sender)}>{x.seen}</Button>
                    </li>
                  ))}
                  {d.attention.map((s) => (
                    <li key={s.id} className="ns-list-item">
                      <Avatar name={s.name} size="sm" />
                      <div className="ns-list-main"><strong>{s.name}</strong><span className="ns-caption">{x.detail(s.noDetection, s.evaluation)}</span></div>
                      <Button variant="secondary" size="sm" icon="edit" onClick={() => reviewOf(s.evaluationId)} aria-label={x.reviewAria(s.name)}>{x.review}</Button>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="check" title={x.nothingTitle} message={x.nothingText} />}
            </Block>
          </div>
        </>
      ) : null)}
      {toastNode}
    </PageShell>
  );
}
