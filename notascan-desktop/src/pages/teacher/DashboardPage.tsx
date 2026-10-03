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
import { useDashboard } from "../../services/teacherOverview";
import { assignmentsState, queryState } from "./states";

/** 01 · ¿Qué tengo pendiente hoy? Continuar la revisión es el punto de entrada. */
export function DashboardPage() {
  const { navigate: go } = useShell();
  const { aq, q, data: d } = useDashboard();
  const state = assignmentsState(aq, "Cargando tus cursos") ?? queryState(q, "Cargando tu resumen", "No pudimos cargar tu resumen.");
  const pct = d?.hero && d.hero.total ? Math.round((d.hero.verified / d.hero.total) * 100) : 0;
  const reviewOf = (id: string) => go("review", id ? { id } : undefined);
  return (
    <PageShell active="dashboard">
      <Header
        eyebrow={d?.dateLine ?? "Inicio"} title={d ? d.greeting + ", " + d.name : "Inicio"} highlight={d?.name}
        description={d ? "Tienes " + d.inReview + (d.inReview === 1 ? " evaluación" : " evaluaciones") + " en revisión y " + d.toVerify + (d.toVerify === 1 ? " nota esperando" : " notas esperando") + " tu verificación." : undefined}
        actions={<>
          <Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>Nueva evaluación</Button>
          <Button size="lg" icon="grade" onClick={() => go("grade")}>Calificar</Button>
        </>}
      />
      {state ?? (d ? (
        <>
          <div className="ns-home-bento">
            <Block tone="navy" className="ns-home-hero" label="Continuar revisión">
              <div className="ns-row" style={{ justifyContent: "space-between" }}>
                <span className="ns-overline" style={{ color: "var(--gold)" }}>Continúa donde quedaste</span>
                {d.hero ? <Sticker tone="gold" rotate={4}>{d.hero.pending + " pendientes"}</Sticker> : null}
              </div>
              {d.hero ? (
                <>
                  <div>
                    <h2 className="ns-home-hero-title">{d.hero.title}</h2>
                    <p className="ns-home-hero-meta">{d.hero.meta}</p>
                  </div>
                  <div className="ns-home-hero-progress">
                    <div className="ns-row" style={{ justifyContent: "space-between" }}><span>{d.hero.verified + " de " + d.hero.total + " verificadas"}</span><strong>{pct + "%"}</strong></div>
                    <Progress value={d.hero.verified} total={d.hero.total} tone="inverse" label="Avance de revisión" />
                  </div>
                  <div><Button iconRight="arrow" onClick={() => reviewOf(d.hero!.id)}>Continuar revisión</Button></div>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="ns-home-hero-title">No tienes revisiones pendientes</h2>
                    <p className="ns-home-hero-meta">Cuando subas las fotografías de una evaluación, aparecerá aquí.</p>
                  </div>
                  <div><Button iconRight="arrow" onClick={() => go("grade")}>Calificar una evaluación</Button></div>
                </>
              )}
            </Block>
            <Block tone="gold" className="ns-home-stat">
              <span className="ns-bento-icon" aria-hidden><Icon name="clock" size={18} strokeWidth={2.5} /></span>
              <span className="ns-bento-value"><CountUp value={String(d.toVerify)} /></span><span className="ns-bento-label">notas por verificar</span>
            </Block>
            <Block tone="sage" className="ns-home-stat">
              <span className="ns-bento-icon" aria-hidden><Icon name="check" size={18} strokeWidth={2.5} /></span>
              <span className="ns-bento-value"><CountUp value={d.verifiedMonth} /></span><span className="ns-bento-label">verificadas este mes</span>
            </Block>
            <Block className="ns-home-stat">
              <span className="ns-bento-icon" aria-hidden><Icon name="reports" size={18} strokeWidth={2.5} /></span>
              <span className="ns-bento-value"><CountUp value={d.avg} /></span><span className="ns-bento-label">{d.avgLabel}</span>
            </Block>
          </div>
          <div className="ns-home-cols">
            <Block label="Evaluaciones en curso">
              <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("evaluations")}>Ver todas</Button>}>Evaluaciones en curso</BlockTitle>
              {d.evaluations.length ? (
                <ul className="ns-list">
                  {d.evaluations.map((e) => {
                    const st = EVAL_STATUS[e.status];
                    return (
                      <li key={e.id} className="ns-list-item">
                        <Sticker tone={KIND[e.kind][1]} rotate={0}>{KIND[e.kind][0]}</Sticker>
                        <div className="ns-list-main"><strong>{e.name}</strong><span className="ns-caption">{e.subject + " · " + e.weight + "% · " + e.date}</span></div>
                        <div className="ns-list-progress"><Progress value={e.reviewed} total={e.total} label={"Avance de " + e.name} /><span className="ns-caption">{e.reviewed + "/" + e.total}</span></div>
                        <Badge tone={st[1]}>{st[0]}</Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : <EmptyState title="No hay evaluaciones en curso." message="Crea las evaluaciones del periodo para empezar a calificar." action={<Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>Ir a evaluaciones</Button>} />}
            </Block>
            <Block tone="paper" label="Requieren tu atención">
              <BlockTitle>Requieren tu atención</BlockTitle>
              {d.attention.length ? (
                <ul className="ns-list">
                  {d.attention.map((s) => (
                    <li key={s.id} className="ns-list-item">
                      <Avatar name={s.name} size="sm" />
                      <div className="ns-list-main"><strong>{s.name}</strong><span className="ns-caption">{s.detail}</span></div>
                      <Button variant="secondary" size="sm" icon="edit" onClick={() => reviewOf(s.evaluationId)} aria-label={"Revisar nota de " + s.name}>Revisar</Button>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon="check" title="Nada pendiente por revisar." message="Las notas con baja confianza o sin detección aparecerán aquí." />}
            </Block>
          </div>
        </>
      ) : null)}
    </PageShell>
  );
}
