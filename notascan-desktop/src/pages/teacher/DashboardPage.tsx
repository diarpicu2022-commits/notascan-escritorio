import { useShell } from "../../app/ShellContext";
import { Avatar } from "../../components/atoms/Avatar";
import { Badge } from "../../components/atoms/Badge";
import { Button } from "../../components/atoms/Button";
import { Progress } from "../../components/atoms/Controls";
import { CountUp } from "../../components/atoms/CountUp";
import { Icon } from "../../components/atoms/Icon";
import { Sticker } from "../../components/atoms/Sticker";
import { Header } from "../../components/organisms/Header";
import { Block, BlockTitle } from "../../components/organisms/Layout";
import { PageShell } from "../../components/templates/PageShell";
import { EVALUATIONS, EVAL_STATUS, KIND, STUDENTS } from "../../data/academic";

/** 01 · ¿Qué tengo pendiente hoy? Continuar la revisión es el punto de entrada. */
export function DashboardPage() {
  const { navigate: go } = useShell();
  const active = EVALUATIONS.filter((e) => e.status === "en-revision");
  return (
    <PageShell active="dashboard">
      <Header
        eyebrow="Martes 30 de septiembre · Periodo 3 · 2026" title="Buenos días, Ana Lucía" highlight="Ana Lucía"
        description="Tienes 2 evaluaciones en revisión y 8 notas esperando tu verificación."
        actions={<>
          <Button variant="secondary" icon="plus" onClick={() => go("evaluations")}>Nueva evaluación</Button>
          <Button size="lg" icon="grade" onClick={() => go("grade")}>Calificar</Button>
        </>}
      />
      <div className="ns-home-bento">
        <Block tone="navy" className="ns-home-hero" label="Continuar revisión">
          <div className="ns-row" style={{ justifyContent: "space-between" }}>
            <span className="ns-overline" style={{ color: "var(--gold)" }}>Continúa donde quedaste</span>
            <Sticker tone="gold" rotate={4}>8 pendientes</Sticker>
          </div>
          <div>
            <h2 className="ns-home-hero-title">Parcial 2 · Matemáticas</h2>
            <p className="ns-home-hero-meta">7A · 24 estudiantes · subido hace 2 horas</p>
          </div>
          <div className="ns-home-hero-progress">
            <div className="ns-row" style={{ justifyContent: "space-between" }}><span>18 de 24 verificadas</span><strong>75%</strong></div>
            <Progress value={18} total={24} tone="inverse" label="Avance de revisión" />
          </div>
          <div><Button iconRight="arrow" onClick={() => go("review")}>Continuar revisión</Button></div>
        </Block>
        <Block tone="gold" className="ns-home-stat">
          <span className="ns-bento-icon" aria-hidden><Icon name="clock" size={18} strokeWidth={2.5} /></span>
          <span className="ns-bento-value"><CountUp value="8" /></span><span className="ns-bento-label">notas por verificar</span>
        </Block>
        <Block tone="sage" className="ns-home-stat">
          <span className="ns-bento-icon" aria-hidden><Icon name="check" size={18} strokeWidth={2.5} /></span>
          <span className="ns-bento-value"><CountUp value="112" /></span><span className="ns-bento-label">verificadas este mes</span>
        </Block>
        <Block className="ns-home-stat">
          <span className="ns-bento-icon" aria-hidden><Icon name="reports" size={18} strokeWidth={2.5} /></span>
          <span className="ns-bento-value"><CountUp value="3.9" /></span><span className="ns-bento-label">promedio de Matemáticas 7A</span>
        </Block>
      </div>
      <div className="ns-home-cols">
        <Block label="Evaluaciones en curso">
          <BlockTitle action={<Button variant="ghost" size="sm" iconRight="arrow" onClick={() => go("evaluations")}>Ver todas</Button>}>Evaluaciones en curso</BlockTitle>
          <ul className="ns-list">
            {active.concat(EVALUATIONS.filter((e) => e.status === "borrador").slice(0, 1)).map((e) => {
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
        </Block>
        <Block tone="paper" label="Requieren tu atención">
          <BlockTitle>Requieren tu atención</BlockTitle>
          <ul className="ns-list">
            {STUDENTS.filter((s) => s.status === "needs-review").map((s) => (
              <li key={s.id} className="ns-list-item">
                <Avatar name={s.name} size="sm" />
                <div className="ns-list-main"><strong>{s.name}</strong><span className="ns-caption">{isNaN(s.avg) ? "Sin detección · " + s.last : "Baja confianza · " + s.last}</span></div>
                <Button variant="secondary" size="sm" icon="edit" onClick={() => go("review")} aria-label={"Revisar nota de " + s.name}>Revisar</Button>
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </PageShell>
  );
}
