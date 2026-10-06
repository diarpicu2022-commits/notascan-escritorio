// Paso 6a · verificación medida del backend sin tocar el proyecto real.
// PGlite (PostgreSQL 17 en Node) + lo mínimo de Supabase simulado (auth.users, auth.uid(), storage y los roles
// anon/authenticated). Aplica las migraciones y la semilla tal cual, y prueba los permisos de cada rol
// con consultas reales, como lo haría la app a través de la API.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text not null, invited_at timestamptz, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, public boolean not null default false);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text not null);
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert on storage.objects to authenticated;
`;

const db = new PGlite();
// Ejecuta varias sentencias SQL en la base en memoria (método de PGlite, no un proceso del sistema).
const runSql = (sql) => db["exec"](sql);
const errorOf = async (sql, params) => { try { await db.query(sql, params); return null; } catch (e) { return e.message; } };

// Ejecuta como un usuario de la app (rol authenticated + su uid) o como anónimo.
async function as(uid, fn) {
  await runSql(uid ? `select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;` : `select set_config('request.jwt.claim.sub', '', false); set role anon;`);
  try { return await fn(); } finally { await runSql("reset role;"); }
}
const one = async (sql, params) => (await db.query(sql, params)).rows[0];

try {
  // ---------- 1. Migraciones y semilla ----------
  await runSql(SUPABASE_STUBS);
  // Mismo orden que en el proyecto real: la semilla se cargó en el paso 6a, antes de multicolegio (7a), que la
  // asigna al primer colegio. Así se prueba también ese relleno de datos existentes.
  const migrations = readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  const SEED_BEFORE = "20261004";
  let seeded = false;
  const loadSeed = async () => {
    const seedErr = await runSql(readFileSync(join(ROOT, "supabase/seed.sql"), "utf8")).then(() => null, (e) => e.message);
    check("La semilla se carga sin errores", !seedErr, seedErr || "");
    seeded = true;
  };
  for (const f of migrations) {
    if (!seeded && f >= SEED_BEFORE) await loadSeed();
    const err = await runSql(readFileSync(join(ROOT, "supabase/migrations", f), "utf8")).then(() => null, (e) => e.message);
    check(`Migración ${f} se aplica sin errores`, !err, err || "");
  }
  if (!seeded) await loadSeed();
  const counts = await one(`select (select count(*) from public.students)::int s, (select count(*) from public.teaching_assignments)::int a,
    (select count(*) from public.grades)::int g, (select count(*) from public.grade_change_requests)::int r, (select count(*) from public.staff_directory)::int p`);
  check("Semilla: 72 estudiantes, 35 asignaciones, 9 notas, 5 solicitudes, 11 personas", counts.s === 72 && counts.a === 35 && counts.g === 9 && counts.r === 5 && counts.p === 11, JSON.stringify(counts));
  const rlsOff = (await db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows.map((r) => r.relname);
  check("Todas las tablas públicas tienen RLS activo", rlsOff.length === 0, rlsOff.join(", "));

  // ---------- 2. Cuentas: solo personal registrado ----------
  // Cuentas ya confirmadas (Add user con confirmación automática). Las invitadas se prueban aparte (12b).
  const mk = async (email) => (await db.query("insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id", [email])).rows[0].id;
  const ana = await mk("ana.lucia@losandes.edu.co");          // docente de Matemáticas en los 6 cursos
  const carlos = await mk("carlos.perez@losandes.edu.co");    // docente de Física
  const patricia = await mk("patricia@losandes.edu.co");      // Secretaría
  const hernando = await mk("hernando@losandes.edu.co");      // Rectoría
  const roles = (await db.query("select email, role from public.profiles order by email")).rows.map((r) => r.email.split("@")[0] + ":" + r.role).join(", ");
  check("Al crear la cuenta, el perfil toma el rol del directorio", roles === "ana.lucia:teacher, carlos.perez:teacher, hernando:principal, patricia:admin", roles);
  const intruder = await errorOf("insert into auth.users (email) values ('intruso@gmail.com')");
  check("Un correo que no está en el directorio no puede crear cuenta", intruder?.includes("no está registrada por la institución"), intruder || "se creó");

  // ---------- 3. Lectura según rol ----------
  // Jorge Insuasty dicta Inglés en todos los cursos menos 8B (el hueco de la malla del sistema).
  const jorge = await mk("jorge.insuasty@losandes.edu.co");
  const jorgeSees = await as(jorge, () => one("select count(*)::int n, count(*) filter (where course_id = '8B')::int en8b from public.students"));
  const expected = await one("select count(*)::int n from public.students where course_id <> '8B'");
  check("El docente solo ve estudiantes de los cursos que dicta (Jorge: sin 8B)", jorgeSees.n === expected.n && jorgeSees.en8b === 0, `${jorgeSees.n} de ${expected.n} esperados, ${jorgeSees.en8b} de 8B`);
  const adminSees = await as(patricia, () => one("select count(*)::int n from public.students"));
  check("Secretaría ve los 72 estudiantes", adminSees.n === 72, String(adminSees.n));
  const anaMedical = await as(ana, () => one("select count(*)::int n from public.student_medical"));
  const rectorMedical = await as(hernando, () => one("select count(*)::int n from public.student_medical"));
  check("Datos de salud: el docente no ve ninguno; Rectoría sí", anaMedical.n === 0 && rectorMedical.n === 72, `docente ${anaMedical.n}, Rectoría ${rectorMedical.n}`);
  const anaGuardians = await as(ana, () => one("select count(*)::int n from public.guardians"));
  check("El docente no ve los datos de los acudientes", anaGuardians.n === 0, String(anaGuardians.n));
  const anonErr = await as(null, () => errorOf("select * from public.students"));
  check("Sin sesión no se lee nada (permiso denegado)", anonErr?.includes("permission denied"), anonErr || "leyó datos");
  const carlosGrades = await as(carlos, () => one("select count(*)::int n from public.grades"));
  check("Un docente no ve las notas de las evaluaciones de otro", carlosGrades.n === 0, String(carlosGrades.n));

  // ---------- 4. Escritura de notas: la IA detecta, el docente verifica ----------
  const g = await one("select g.id, g.student_id, g.value from public.grades g where g.value is not null order by g.id limit 1");
  // Sin sesión (semilla, mantenimiento) nadie firma por la base: «verificada» sin firma se rechaza.
  await runSql("select set_config('request.jwt.claim.sub', '', false);");
  const badVerify = await errorOf("update public.grades set status = 'verified' where id = $1", [g.id]);
  check("No se puede marcar «verificada» sin quién verificó", badVerify?.includes("verified_needs_teacher"), badVerify || "se marcó");
  const okVerify = await as(ana, () => errorOf("update public.grades set value = 4.3, status = 'verified', verified_by = auth.uid(), verified_at = now() where id = $1", [g.id]));
  check("El docente verifica su nota corrigiéndola a 4.3", !okVerify, okVerify || "");
  const audit = await one("select old_value::text o, new_value::text n from public.grade_audit where grade_id = $1", [g.id]);
  check("La nota original queda en el historial (grade_audit)", audit && audit.o === String(Number(g.value).toFixed(1)) && audit.n === "4.3", JSON.stringify(audit));
  const outOfRange = await as(ana, () => errorOf("update public.grades set value = 7 where id = $1", [g.id]));
  check("Una nota fuera de 1.0–5.0 se rechaza en la base", outOfRange?.includes("check") || outOfRange?.includes("overflow"), outOfRange || "se guardó");
  const carlosEdit = await as(carlos, () => db.query("update public.grades set value = 1.0 where id = $1", [g.id]).then((r) => r.affectedRows));
  check("Otro docente no puede cambiar esa nota (0 filas afectadas)", carlosEdit === 0, String(carlosEdit));
  await db.query("update public.evaluations set status = 'cerrada' where id = (select evaluation_id from public.grades where id = $1)", [g.id]);
  const closed = await as(ana, () => errorOf("update public.grades set value = 3.0 where id = $1", [g.id]));
  check("Con la evaluación cerrada, el docente no cambia la nota (va por solicitud)", closed?.includes("Solicita el cambio de nota a Rectoría"), closed || "se cambió");
  const anaStudent = (await one("select s.id from public.students s where s.course_id = '7A' limit 1")).id;
  const teacherAddStudent = await as(ana, () => errorOf("insert into public.students (id, first_names, last_names, doc_type, document) values ('9999', 'Prueba', 'Docente', 'TI', 'TI 1')"));
  check("El docente no puede matricular estudiantes", teacherAddStudent?.includes("row-level security"), teacherAddStudent || "matriculó");
  const adminAddStudent = await as(patricia, () => errorOf("insert into public.students (id, first_names, last_names, doc_type, document, course_id) values ('9999', 'Prueba', 'Secretaría', 'TI', 'TI 9999', '7A')"));
  check("Secretaría no matricula por fuera del registro con autorización del acudiente (6g)", adminAddStudent?.includes("Falta la autorización del acudiente"), adminAddStudent || "matriculó");

  // ---------- 5. Solicitudes: el docente pide, Rectoría decide ----------
  // La solicitud apunta a la nota (grade_id) de la evaluación cerrada de la sección 4 (vale 4.3).
  const ins = (email, grade, from, to) => errorOf("insert into public.grade_change_requests (teacher_email, student_id, subject_id, course_id, from_value, to_value, reason, grade_id) values ($1, $2, 'mat', '7A', $3, $4, 'Corrección de evaluación', $5)", [email, g.student_id, from, to, grade]);
  const reqErr = await as(ana, () => ins("ana.lucia@losandes.edu.co", g.id, 4.3, 4.6));
  check("El docente crea una solicitud de cambio de nota sobre su nota", !reqErr, reqErr || "");
  const fake = await as(ana, () => ins("carlos.perez@losandes.edu.co", g.id, 4.3, 4.6));
  check("No puede crearla a nombre de otro docente", fake?.includes("row-level security"), fake || "se creó");
  const wrongFrom = await as(ana, () => ins("ana.lucia@losandes.edu.co", g.id, 3.1, 4.6));
  check("La nota «desde» tiene que ser la nota actual", wrongFrom?.includes("row-level security"), wrongFrom || "se creó");
  const noGrade = await as(ana, () => ins("ana.lucia@losandes.edu.co", null, 4.3, 4.6));
  check("Una solicitud nueva sin nota no se crea", noGrade?.includes("row-level security"), noGrade || "se creó");
  const otherGrade = await as(carlos, () => ins("carlos.perez@losandes.edu.co", g.id, 4.3, 4.6));
  check("Un docente no pide cambios sobre notas de otro", otherGrade?.includes("row-level security"), otherGrade || "se creó");
  const anaReq = (await one("select id from public.grade_change_requests where grade_id = $1", [g.id])).id;
  const pendingId = (await one("select id from public.grade_change_requests where status = 'pending' order by id limit 1")).id;
  // Hallazgo del Security Advisor: sin sesión el rol es NULL y no debe poder decidir ni llamar funciones.
  const anonDecides = await as(null, () => errorOf("select public.decide_grade_request($1, 'approved')", [pendingId]));
  check("Sin sesión no se puede llamar a decide_grade_request", anonDecides?.includes("permission denied"), anonDecides || "decidió");
  const anonHelper = await as(null, () => errorOf("select public.current_app_role()"));
  check("Sin sesión no se pueden llamar las funciones auxiliares", anonHelper?.includes("permission denied"), anonHelper || "se llamó");
  const ghost = "00000000-0000-0000-0000-000000000001"; // con sesión pero sin perfil (rol NULL)
  const ghostDecides = await as(ghost, () => errorOf("select public.decide_grade_request($1, 'approved')", [pendingId]));
  check("Un usuario sin perfil (rol NULL) no puede decidir", ghostDecides?.includes("Solo Rectoría"), ghostDecides || "decidió");
  const triggerFn = await as(ana, () => errorOf("select public.audit_grade_change()"));
  check("Nadie llama directamente a las funciones de disparador", triggerFn?.includes("permission denied") || triggerFn?.includes("trigger"), triggerFn || "se llamó");
  const teacherDecides = await as(ana, () => errorOf("select public.decide_grade_request($1, 'approved')", [pendingId]));
  check("Un docente no puede decidir solicitudes", teacherDecides?.includes("Solo Rectoría"), teacherDecides || "decidió");
  const rejectNoReason = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'rejected', '')", [pendingId]));
  check("Rechazar sin motivo no se permite", rejectNoReason?.includes("rejection_needs_reason"), rejectNoReason || "se rechazó");
  const legacy = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'approved', 'Procede')", [pendingId]));
  check("Una solicitud anterior sin nota no se aprueba a ciegas", legacy?.includes("no indica qué nota"), legacy || "se aprobó");
  const approve = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'approved', 'Procede')", [anaReq]));
  const after = await one("select status, decided_by is not null d, (select description from public.request_events where request_id = $1) e from public.grade_change_requests where id = $1", [anaReq]);
  check("Rectoría aprueba y la decisión queda en el historial", !approve && after.status === "approved" && after.d && after.e === "Aprobada por Hernando Villota: Procede", approve || JSON.stringify(after));
  const applied = await one("select value::text v, (select old_value::text || '>' || new_value::text from public.grade_audit where grade_id = $1 order by id desc limit 1) a from public.grades where id = $1", [g.id]);
  check("Aprobar cambia la nota (4.3 → 4.6) y la original queda en grade_audit", applied.v === "4.6" && applied.a === "4.3>4.6", JSON.stringify(applied));
  await as(ana, () => ins("ana.lucia@losandes.edu.co", g.id, 4.6, 4.9));
  const staleReq = (await one("select id from public.grade_change_requests where grade_id = $1 and status = 'pending'", [g.id])).id;
  // La nota cambia por otro camino (se reabre la evaluación, el docente corrige y se vuelve a cerrar).
  await db.query("update public.evaluations set status = 'en-revision' where id = (select evaluation_id from public.grades where id = $1)", [g.id]);
  await as(ana, () => db.query("update public.grades set value = 4.0 where id = $1", [g.id]));
  await db.query("update public.evaluations set status = 'cerrada' where id = (select evaluation_id from public.grades where id = $1)", [g.id]);
  const stale = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'approved')", [staleReq]));
  const keep = await one("select value::text v, (select status::text from public.grade_change_requests where id = $2) s from public.grades where id = $1", [g.id, staleReq]);
  check("Si la nota cambió desde la solicitud, no se aplica y la solicitud sigue pendiente", stale?.includes("La nota cambió desde la solicitud (ahora es 4.0)") && keep.v === "4.0" && keep.s === "pending", stale || JSON.stringify(keep));
  const reject = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'rejected', 'Falta el soporte')", [staleReq]));
  const rej = await one("select status::text s, decision_note n, (select value::text from public.grades where id = $2) v from public.grade_change_requests where id = $1", [staleReq, g.id]);
  check("Rechazar no toca la nota y guarda el motivo", !reject && rej.s === "rejected" && rej.n === "Falta el soporte" && rej.v === "4.0", reject || JSON.stringify(rej));
  // Deja la nota como la espera el resto del script (4.3 verificada).
  await db.query("update public.evaluations set status = 'en-revision' where id = (select evaluation_id from public.grades where id = $1)", [g.id]);
  await as(ana, () => db.query("update public.grades set value = 4.3 where id = $1", [g.id]));
  await db.query("update public.evaluations set status = 'cerrada' where id = (select evaluation_id from public.grades where id = $1)", [g.id]);
  const fitsAnon = await as(null, () => errorOf("select public.request_fits_grade(1, 'x', 'x', 'x', 1)"));
  check("Sin sesión no se llama a request_fits_grade", fitsAnon?.includes("permission denied"), fitsAnon || "se llamó");
  const directUpdate = await as(hernando, () => db.query("update public.grade_change_requests set status = 'approved' where status = 'pending'").then((r) => r.affectedRows));
  check("Ni Rectoría cambia el estado por fuera de la función (sin política de update)", directUpdate === 0, String(directUpdate));

  // ---------- 6. Vista de estudiantes (respeta el RLS de quien consulta) ----------
  const ovAdmin = await as(patricia, () => one("select count(*)::int n, count(guardian_name)::int con_acudiente from public.student_overview"));
  check("Vista student_overview: Secretaría ve los estudiantes con su acudiente", ovAdmin.n >= 72 && ovAdmin.con_acudiente === 72, JSON.stringify(ovAdmin));
  const ovTeacher = await as(jorge, () => one("select count(*)::int n, count(guardian_name)::int con_acudiente, count(*) filter (where course_id = '8B')::int en8b from public.student_overview"));
  check("Vista student_overview: el docente ve solo sus cursos y sin datos del acudiente", ovTeacher.en8b === 0 && ovTeacher.con_acudiente === 0 && ovTeacher.n > 0, JSON.stringify(ovTeacher));
  const ovAvg = await as(patricia, () => one("select avg_grade::text a from public.student_overview where id = $1", [g.student_id]));
  check("El promedio de la vista usa solo notas verificadas (4.3 recién verificada)", ovAvg.a === "4.3", JSON.stringify(ovAvg));
  const ovAnon = await as(null, () => errorOf("select * from public.student_overview"));
  check("Sin sesión la vista no se lee", ovAnon?.includes("permission denied"), ovAnon || "leyó");

  // ---------- 7. Registro del docente (6b.2): la base firma con la sesión, nunca el cliente ----------
  const quiz = (await one(`select e.id from public.evaluations e join public.teaching_assignments a on a.id = e.assignment_id
    where a.teacher_email = 'ana.lucia@losandes.edu.co' and a.course_id = '7A' and e.name = 'Quiz 4'`)).id;
  const upsertGrade = (v, by) => `insert into public.grades (evaluation_id, student_id, value, status, verified_by, verified_at)
    values (${quiz}, '${anaStudent}', ${v}, 'verified', ${by ? `'${by}'` : "null"}, now())
    on conflict (evaluation_id, student_id) do update set value = excluded.value, status = excluded.status, verified_by = excluded.verified_by`;
  const forged = await as(ana, () => errorOf(upsertGrade("4.0", carlos)));
  const signed = await one("select verified_by, value::text v from public.grades where evaluation_id = $1 and student_id = $2", [quiz, anaStudent]);
  check("Planilla: la nota escrita queda verificada con la firma de quien la escribe (aunque mande otra)", !forged && signed.verified_by === ana && signed.v === "4.0", forged || JSON.stringify(signed));
  const resend = await as(ana, () => errorOf(upsertGrade("4.5", null)));
  const resent = await one("select verified_by, value::text v, (select count(*)::int from public.grade_audit a where a.grade_id = g.id) n from public.grades g where evaluation_id = $1 and student_id = $2", [quiz, anaStudent]);
  check("Planilla: corregir la nota la vuelve a firmar y deja el cambio en el historial", !resend && resent.verified_by === ana && resent.v === "4.5" && resent.n === 1, resend || JSON.stringify(resent));
  const quizGrade = (await one("select id from public.grades where evaluation_id = $1 and student_id = $2", [quiz, anaStudent])).id;
  await as(ana, () => db.query("update public.grades set verified_by = $1 where id = $2", [carlos, quizGrade]));
  check("Sin cambio de nota, la firma anterior no se puede reemplazar", (await one("select verified_by from public.grades where id = $1", [quizGrade])).verified_by === ana);
  const carlosQuiz = await as(carlos, () => errorOf(upsertGrade("1.0", null)));
  check("Otro docente no puede escribir en la planilla de Ana", carlosQuiz?.includes("row-level security"), carlosQuiz || "escribió");

  const att = (course, student, state, by) => `insert into public.attendance (course_id, student_id, class_date, slot, state, recorded_by)
    values ('${course}', '${student}', '2026-10-01', 1, '${state}', ${by ? `'${by}'` : "null"})
    on conflict (student_id, course_id, class_date, slot) do update set state = excluded.state, recorded_by = excluded.recorded_by`;
  const att1 = await as(ana, () => errorOf(att("7A", anaStudent, "absent", carlos)));
  const att2 = await as(ana, () => errorOf(att("7A", anaStudent, "late", null)));
  const attRow = await one("select state::text s, recorded_by, (select count(*)::int from public.attendance where student_id = $1) n from public.attendance where student_id = $1", [anaStudent]);
  check("Asistencia: guardar dos veces actualiza la misma clase y la firma quien la toma", !att1 && !att2 && attRow.s === "late" && attRow.recorded_by === ana && attRow.n === 1, att1 || att2 || JSON.stringify(attRow));
  const st8B = (await one("select id from public.students where course_id = '8B' limit 1")).id;
  const att8B = await as(jorge, () => errorOf(att("8B", st8B, "present", null)));
  check("Asistencia: el docente no la toma en un curso que no dicta (Jorge en 8B)", att8B?.includes("row-level security"), att8B || "la tomó");

  const anaMat7A = (await one("select id from public.teaching_assignments where teacher_email = 'ana.lucia@losandes.edu.co' and course_id = '7A' and subject_id = 'mat'")).id;
  const concept = (state) => `insert into public.period_concepts (student_id, assignment_id, text, state, reviewed_by) values ('${anaStudent}', ${anaMat7A}, 'Alcanza el logro.', '${state}', '${carlos}')
    on conflict (student_id, assignment_id) do update set text = excluded.text, state = excluded.state, reviewed_by = excluded.reviewed_by`;
  const c1 = await as(ana, () => errorOf(concept("teacher")));
  const c1r = await one("select reviewed_by from public.period_concepts where student_id = $1 and assignment_id = $2", [anaStudent, anaMat7A]);
  const c2 = await as(ana, () => errorOf(concept("ai")));
  const c2r = await one("select reviewed_by, state::text s from public.period_concepts where student_id = $1 and assignment_id = $2", [anaStudent, anaMat7A]);
  check("Conceptos: escrito por el docente lleva su firma; un borrador de IA no lleva ninguna", !c1 && !c2 && c1r.reviewed_by === ana && c2r.reviewed_by === null && c2r.s === "ai", c1 || c2 || JSON.stringify([c1r, c2r]));
  const carlosConcept = await as(carlos, () => errorOf(concept("teacher")));
  check("Conceptos: otro docente no escribe en la asignación de Ana", carlosConcept?.includes("row-level security"), carlosConcept || "escribió");

  const obsOwn = await as(ana, () => errorOf("insert into public.observations (student_id, type, title) values ($1, 'positive', 'Participación destacada')", [anaStudent]));
  const obsAuthor = await one("select author_id from public.observations where title = 'Participación destacada' and student_id = $1 order by id desc limit 1", [anaStudent]);
  const obsForged = await as(ana, () => errorOf("insert into public.observations (student_id, type, title, author_id) values ($1, 'attention', 'Suplantación', $2)", [anaStudent, carlos]));
  check("Observador: el autor lo pone la base y no se puede escribir a nombre de otro", !obsOwn && obsAuthor?.author_id === ana && obsForged?.includes("row-level security"), obsOwn || obsForged || JSON.stringify(obsAuthor));
  const stampFn = await as(ana, () => errorOf("select public.stamp_attendance()"));
  check("Las funciones de firma no se pueden llamar directamente", stampFn?.includes("permission denied") || stampFn?.includes("trigger"), stampFn || "se llamó");
  const myAssign = await as(ana, () => one(`select count(*)::int n from public.teaching_assignments a join public.academic_periods p on p.id = a.period_id
    where a.teacher_email = 'ana.lucia@losandes.edu.co' and p.status = 'open'`));
  check("Ana ve sus asignaciones del periodo abierto (Matemáticas en los 6 cursos)", myAssign.n === 6, String(myAssign.n));

  // ---------- 8. Recuperaciones y evaluaciones (6b.2b) ----------
  const rec = (value, by) => `insert into public.recoveries (student_id, assignment_id, original, recovery, result, recorded_by) values ('${anaStudent}', ${anaMat7A}, 2.4, ${value}, 'passed', ${by ? `'${by}'` : "null"})
    on conflict (student_id, assignment_id) do update set recovery = excluded.recovery, result = excluded.result, recorded_by = excluded.recorded_by`;
  const r1 = await as(ana, () => errorOf(rec("2.6", carlos)));
  const r1r = await one("select result, recorded_by, original::text o from public.recoveries where student_id = $1 and assignment_id = $2", [anaStudent, anaMat7A]);
  check("Recuperación: el resultado lo deriva la base (2.6 no aprueba aunque el cliente diga «passed») y firma quien registra",
    !r1 && r1r.result === "failed" && r1r.recorded_by === ana && r1r.o === "2.4", r1 || JSON.stringify(r1r));
  const r2 = await as(ana, () => errorOf(rec("3.5", null)));
  const r2r = await one("select result from public.recoveries where student_id = $1 and assignment_id = $2", [anaStudent, anaMat7A]);
  check("Recuperación: 3.5 aprueba y la nota original (2.4) se conserva", !r2 && r2r.result === "passed", r2 || JSON.stringify(r2r));
  const r3 = await as(carlos, () => errorOf(rec("5.0", null)));
  check("Recuperación: otro docente no la registra en la asignación de Ana", r3?.includes("row-level security"), r3 || "la registró");
  const newEval = await as(ana, () => errorOf("insert into public.evaluations (assignment_id, name, kind, weight, status) values ($1, 'Parcial 3', 'examen', 20, 'borrador')", [anaMat7A]));
  const carlosEval = await as(carlos, () => errorOf("insert into public.evaluations (assignment_id, name, kind, weight, status) values ($1, 'Intruso', 'examen', 20, 'borrador')", [anaMat7A]));
  check("Evaluaciones: el docente crea las de su asignación y no las de otro", !newEval && carlosEval?.includes("row-level security"), newEval || carlosEval || "");
  const recFn = await as(ana, () => errorOf("select public.stamp_recovery()"));
  check("La función de recuperaciones no se puede llamar directamente", recFn?.includes("permission denied") || recFn?.includes("trigger"), recFn || "se llamó");

  // ---------- 9. Configuración de Secretaría (6b.3a) ----------
  const delWithEvals = await as(patricia, () => errorOf("delete from public.teaching_assignments where id = $1", [anaMat7A]));
  check("Malla: una asignación con evaluaciones no se elimina (se cambia el docente)", delWithEvals?.includes("Cambia el docente en lugar de eliminarla"), delWithEvals || "se eliminó");
  const tmp = await as(patricia, () => one("insert into public.teaching_assignments (teacher_email, subject_id, course_id, period_id) values ('ana.lucia@losandes.edu.co', 'mat', '7A', '2026-p4') returning id"));
  const delEmpty = await as(patricia, () => errorOf("delete from public.teaching_assignments where id = $1", [tmp.id]));
  check("Malla: una asignación sin evaluaciones sí se elimina", !delEmpty, delEmpty || "");
  const clashAssign = await as(patricia, () => errorOf("insert into public.teaching_assignments (teacher_email, subject_id, course_id, period_id) values ('carlos.perez@losandes.edu.co', 'mat', '7A', '2026-p3')"));
  check("Malla: no hay dos docentes para la misma materia, curso y periodo", clashAssign?.includes("duplicate") || clashAssign?.includes("unique"), clashAssign || "se duplicó");
  const twoOpen = await as(patricia, () => errorOf("update public.academic_periods set status = 'open' where id = '2026-p4'"));
  check("Periodos: no puede haber dos abiertos a la vez", twoOpen?.includes("academic_periods_one_open"), twoOpen || "se abrió");
  const bad95 = await as(patricia, () => errorOf(`select public.save_period('2026-p4', '2026-10-19', '2026-11-27', 'draft', '[{"name":"Actividades","weight":35},{"name":"Exámenes","weight":60}]'::jsonb)`));
  check("Periodos: guardar con componentes que no suman 100 % se rechaza", bad95?.includes("debe sumar 100%"), bad95 || "se guardó");
  const ok100 = await as(patricia, () => errorOf(`select public.save_period('2026-p4', '2026-10-20', '2026-11-28', 'draft', '[{"name":"Actividades","weight":50},{"name":"Exámenes","weight":50}]'::jsonb)`));
  const p4 = await one("select open_date::text o, (select string_agg(name || ' ' || weight::int, ', ' order by position) from public.period_components where period_id = '2026-p4') c from public.academic_periods where id = '2026-p4'");
  check("Periodos: guardar reemplaza fechas y componentes en una sola operación", !ok100 && p4.o === "2026-10-20" && p4.c === "Actividades 50, Exámenes 50", ok100 || JSON.stringify(p4));
  const teacherPeriod = await as(ana, () => errorOf(`select public.save_period('2026-p4', '2026-10-20', '2026-11-28', 'draft', '[{"name":"Todo","weight":100}]'::jsonb)`));
  check("Periodos: un docente no configura periodos", teacherPeriod?.includes("Solo Secretaría"), teacherPeriod || "configuró");
  const touch = await as(ana, () => errorOf("select public.touch_last_seen()"));
  const seen = await one("select last_seen_at is not null s from public.profiles where id = $1", [ana]);
  const selfRole = await as(ana, () => db.query("update public.profiles set role = 'admin' where id = $1", [ana]).then((r) => r.affectedRows));
  check("Usuarios: cada quien marca su último acceso, pero no puede cambiarse el rol", !touch && seen.s && selfRole === 0, touch || `visto=${seen.s}, filas=${selfRole}`);
  const teacherDir = await as(ana, () => one("select count(*)::int n from public.staff_directory"));
  const adminInvite = await as(patricia, () => errorOf("insert into public.staff_directory (email, full_name, role, area) values ('nueva.docente@losandes.edu.co', 'Nueva Docente', 'teacher', 'Docencia')"));
  check("Usuarios: solo Secretaría ve y registra el directorio de personal", teacherDir.n === 0 && !adminInvite, adminInvite || `docente ve ${teacherDir.n}`);
  const deact = await as(patricia, () => errorOf("update public.profiles set status = 'inactive' where id = $1", [carlos]));
  const carlosRole = await as(carlos, () => one("select public.current_app_role()::text r"));
  check("Usuarios: desactivar quita el rol (la cuenta no ve nada)", !deact && carlosRole.r === null, deact || JSON.stringify(carlosRole));
  const fnExec = await as(null, () => errorOf("select public.save_period('2026-p4', '2026-10-20', '2026-11-28', 'draft', '[]'::jsonb)"));
  check("Sin sesión no se llama save_period", fnExec?.includes("permission denied"), fnExec || "se llamó");

  // ---------- 10. Matrícula (6b.3b) ----------
  const student = (doc, course = "7A", extra = {}) => JSON.stringify({ year: "2026", first_names: "Emilia", last_names: "Narváez Paz", doc_type: "Tarjeta de identidad", document: doc,
    birth_date: "2014-03-12", course_id: course, status: "active", guardian_name: "Rosa Paz", guardian_rel: "Madre", guardian_phone: "3120000000", allergies: "Penicilina", ...extra });
  const maxBefore = (await one("select max(id::bigint)::text m from public.students where id ~ '^2026[0-9]{4}$'")).m;
  const AUTH = JSON.stringify({ received: true, health: true });
  const noAuth = await as(patricia, () => errorOf("select public.register_enrollment($1::jsonb, '{}'::jsonb)", [student("TI 1099000001")]));
  check("Autorización (6g): sin la autorización firmada del acudiente no se matricula", noAuth?.includes("Falta la autorización firmada"), noAuth || "matriculó");
  const legacyEnroll = await as(patricia, () => errorOf("select public.enroll_student($1::jsonb)", [student("TI 1099000001")]));
  check("Autorización (6g): la función vieja sin autorización ya no deja matricular", legacyEnroll?.includes("Falta la autorización del acudiente"), legacyEnroll || "matriculó");
  const noHealth = await as(patricia, () => errorOf("select public.register_enrollment($1::jsonb, $2::jsonb)", [student("TI 1099000001"), JSON.stringify({ received: true, health: false })]));
  check("Autorización (6g): datos de salud sin autorización expresa para ellos no se guardan (ni la matrícula)", noHealth?.includes("datos de salud"), noHealth || "se guardó");
  const enrolled = await as(patricia, () => one("select public.register_enrollment($1::jsonb, $2::jsonb) id", [student("TI 1099000001"), AUTH]));
  const authRow = await one("select policy_version, guardian_name, relationship, health_data, method, recorded_by = $2 by_patricia from public.guardian_authorizations where student_id = $1", [enrolled.id, patricia]);
  check("Autorización (6g): queda registrada con la versión vigente, quien firma, salud sí y quién la registró",
    authRow && authRow.policy_version === "2026.1" && authRow.guardian_name === "Rosa Paz" && authRow.relationship === "Madre" && authRow.health_data === true && authRow.method === "firma-fisica" && authRow.by_patricia, JSON.stringify(authRow));
  const parts = await one(`select (select count(*)::int from public.guardians where student_id = $1) g, (select allergies from public.student_medical where student_id = $1) a,
    (select status::text from public.students where id = $1) s`, [enrolled.id]);
  check("Matrícula: registra estudiante, acudiente y datos médicos con el código siguiente del año",
    enrolled.id === String(BigInt(maxBefore) + 1n) && parts.g === 1 && parts.a === "Penicilina" && parts.s === "active", JSON.stringify({ id: enrolled.id, maxBefore, ...parts }));
  const dupDoc = await as(patricia, () => errorOf("select public.register_enrollment($1::jsonb, $2::jsonb)", [student("TI 1099000001"), AUTH]));
  check("Matrícula: un documento repetido se rechaza con un mensaje claro", dupDoc?.includes("Ya existe un estudiante con el documento TI 1099000001"), dupDoc || "se registró");
  const noCourse = await as(patricia, () => errorOf("select public.register_enrollment($1::jsonb, $2::jsonb)", [student("TI 1099000002", "6C"), AUTH]));
  check("Matrícula: un curso que no existe se rechaza", noCourse?.includes("El curso 6C no existe"), noCourse || "se registró");
  const teacherEnroll = await as(ana, () => errorOf("select public.register_enrollment($1::jsonb, $2::jsonb)", [student("TI 1099000003"), AUTH]));
  check("Matrícula: un docente no matricula", teacherEnroll?.includes("Solo Secretaría"), teacherEnroll || "matriculó");
  const countBefore = (await one("select count(*)::int n from public.students")).n;
  const BATCH = JSON.stringify({ received: true });
  const batchBad = await as(patricia, () => errorOf("select public.register_enrollments($1::jsonb, $2::jsonb)", ["[" + student("TI 1099000010", "7A", { allergies: "" }) + "," + student("TI 1099000001", "7A", { allergies: "" }) + "]", BATCH]));
  const countAfterBad = (await one("select count(*)::int n from public.students")).n;
  check("Importación: si una fila falla no entra ninguna (todo o nada)", batchBad?.includes("Ya existe") && countAfterBad === countBefore, `${batchBad} · ${countBefore} → ${countAfterBad}`);
  const batchHealth = await as(patricia, () => errorOf("select public.register_enrollments($1::jsonb, $2::jsonb)", ["[" + student("TI 1099000013") + "]", JSON.stringify({ received: true, health: true })]));
  check("Importación (6g): los datos de salud nunca entran en lote, aunque se pida", batchHealth?.includes("datos de salud"), batchHealth || "entraron");
  const batchOk = await as(patricia, () => one("select public.register_enrollments($1::jsonb, $2::jsonb) n", ["[" + student("TI 1099000011", "7A", { allergies: "" }) + "," + student("TI 1099000012", "7B", { allergies: "" }) + "]", BATCH]));
  const batchAuth = await one("select count(*)::int n, bool_or(health_data) h from public.guardian_authorizations a join public.students s on s.id = a.student_id where s.document in ('TI 1099000011', 'TI 1099000012')");
  check("Importación (6g): una autorización por estudiante, sin datos de salud", batchAuth.n === 2 && batchAuth.h === false, JSON.stringify(batchAuth));
  const noMed = await one("select count(*)::int n from public.student_medical m join public.students s on s.id = m.student_id where s.document = 'TI 1099000012'");
  check("Importación: entran todas las filas válidas y sin datos médicos no se crea ficha médica", batchOk.n === 2 && noMed.n === 0, JSON.stringify({ ...batchOk, med: noMed.n }));
  const anonEnroll = await as(null, () => errorOf("select public.register_enrollment('{}'::jsonb, '{}'::jsonb)"));
  check("Sin sesión no se llama register_enrollment", anonEnroll?.includes("permission denied"), anonEnroll || "se llamó");
  // Quién ve y quién revoca; revocar la autorización de salud borra esos datos.
  const authTeacher = await as(ana, () => one("select count(*)::int n from public.guardian_authorizations"));
  const authRector = await as(hernando, () => one("select count(*)::int n from public.guardian_authorizations"));
  check("Autorizaciones (6g): Rectoría las consulta; el docente no", authRector.n >= 3 && authTeacher.n === 0, JSON.stringify({ authRector, authTeacher }));
  const authId = (await one("select id from public.guardian_authorizations where student_id = $1", [enrolled.id])).id;
  const revokeTeacher = await as(ana, () => errorOf("select public.revoke_guardian_authorization($1, 'x')", [authId]));
  const revokeNoReason = await as(patricia, () => errorOf("select public.revoke_guardian_authorization($1, '')", [authId]));
  const revokeOk = await as(patricia, () => errorOf("select public.revoke_guardian_authorization($1, 'El acudiente retiró la autorización de salud')", [authId]));
  const afterRevoke = await one("select (select count(*)::int from public.student_medical where student_id = $1) med, (select revoked_reason from public.guardian_authorizations where id = $2) r", [enrolled.id, authId]);
  check("Revocar (6g): solo Secretaría y con motivo; queda en el historial y se borran los datos de salud",
    revokeTeacher?.includes("Solo Secretaría") && revokeNoReason?.includes("motivo") && !revokeOk && afterRevoke.med === 0 && afterRevoke.r === "El acudiente retiró la autorización de salud", JSON.stringify({ revokeTeacher, revokeNoReason, revokeOk, afterRevoke }));

  // ---------- 11. Boletines y mensaje del director (6b.3c) ----------
  // Directores de la semilla: Ana Lucía dirige 6A; Jorge Insuasty, 7B.
  const st6A = (await one("select id from public.students where course_id = '6A' and status = 'active' order by id limit 1")).id;
  const st7A = (await one("select id from public.students where course_id = '7A' and status = 'active' order by id limit 1")).id;
  const expected6A = (await one("select count(*)::int n from public.students where course_id = '6A' and status in ('active', 'pending')")).n;
  const anaGroup = await as(ana, () => db.query("select course_id, subjects from public.director_overview('2026-p3')").then((r) => r.rows));
  check("Director: el resumen trae solo los estudiantes de su grupo (Ana: 6A)", anaGroup.length === expected6A && anaGroup.every((r) => r.course_id === "6A"), `${anaGroup.length} de ${expected6A}`);
  const jorgeGroup = await as(jorge, () => db.query("select course_id from public.director_overview('2026-p3')").then((r) => r.rows));
  check("Director: otro director ve solo el suyo (Jorge: 7B)", jorgeGroup.length > 0 && jorgeGroup.every((r) => r.course_id === "7B"), String(jorgeGroup.length));
  const patriciaGroup = await as(patricia, () => db.query("select 1 from public.director_overview('2026-p3')").then((r) => r.rows.length));
  check("Director: quien no dirige ningún curso no recibe filas", patriciaGroup === 0, String(patriciaGroup));
  const msg = (student, state) => `insert into public.director_messages (student_id, period_id, text, state, author_id) values ('${student}', '2026-p3', 'Un periodo muy positivo.', '${state}', '${carlos}')
    on conflict (student_id, period_id) do update set text = excluded.text, state = excluded.state, author_id = excluded.author_id`;
  const m1 = await as(ana, () => errorOf(msg(st6A, "teacher")));
  const m1r = await one("select author_id from public.director_messages where student_id = $1", [st6A]);
  const m2 = await as(ana, () => errorOf(msg(st6A, "ai")));
  const m2r = await one("select author_id from public.director_messages where student_id = $1", [st6A]);
  check("Mensaje: escrito por el director lleva su firma (aunque mande otra); un borrador de IA no lleva ninguna", !m1 && !m2 && m1r.author_id === ana && m2r.author_id === null, m1 || m2 || JSON.stringify([m1r, m2r]));
  const m3 = await as(ana, () => errorOf(msg(st7A, "teacher")));
  check("Mensaje: no se escribe para un estudiante de otro grupo", m3?.includes("row-level security"), m3 || "lo escribió");
  const jorgeReads = await as(jorge, () => one("select count(*)::int n from public.director_messages where student_id = $1", [st6A]));
  const adminReads = await as(patricia, () => one("select count(*)::int n from public.director_messages where student_id = $1", [st6A]));
  check("Mensaje: lo leen Secretaría y Rectoría, no otros directores", jorgeReads.n === 0 && adminReads.n === 1, `Jorge ${jorgeReads.n}, Secretaría ${adminReads.n}`);
  const rc = await as(patricia, () => errorOf(`insert into public.report_cards (student_id, period_id, status) values ('${st6A}', '2026-p3', 'generated')
    on conflict (student_id, period_id) do update set status = excluded.status`));
  const rcr = await one("select generated_by, generated_at is not null at from public.report_cards where student_id = $1 and period_id = '2026-p3'", [st6A]);
  check("Boletín generado: la base pone quién y cuándo", !rc && rcr.generated_by === patricia && rcr.at, rc || JSON.stringify(rcr));
  const anonOverview = await as(null, () => errorOf("select * from public.director_overview('2026-p3')"));
  check("Sin sesión no se llama director_overview", anonOverview?.includes("permission denied"), anonOverview || "se llamó");

  // ---------- 12. Multicolegio y plataforma (7a) ----------
  const A = "00000000-0000-4000-8000-000000000001";
  const studentsA = (await one("select count(*)::int n from public.students")).n;
  const backfilled = await one(`select (select count(*)::int from public.students where institution_id <> $1) s, (select count(*)::int from public.profiles where institution_id is distinct from $1) p,
    (select count(*)::int from public.courses where institution_id <> $1) c`, [A]);
  check("Multicolegio: los datos que ya existían quedan en el primer colegio", backfilled.s === 0 && backfilled.p === 0 && backfilled.c === 0, JSON.stringify(backfilled));
  const B = (await one("insert into public.institutions (name, short_name, city, status) values ('Colegio San Felipe', 'SF', 'Ipiales', 'active') returning id")).id;
  await db.query("insert into public.staff_directory (email, full_name, role, area, institution_id) values ('secre@sanfelipe.edu.co', 'Marta Ruano', 'admin', 'Secretaría académica', $1), ('profe@sanfelipe.edu.co', 'Iván Ruano', 'teacher', 'Docencia', $1)", [B]);
  const adminB = await mk("secre@sanfelipe.edu.co");
  const teacherB = await mk("profe@sanfelipe.edu.co");
  const profB = await one("select institution_id from public.profiles where id = $1", [adminB]);
  check("Multicolegio: la cuenta toma el colegio de su registro en el directorio", profB.institution_id === B, JSON.stringify(profB));
  const sameIds = await as(adminB, () => runSql(`insert into public.grade_levels (id, name, level, status) values ('7', 'Séptimo', 'Básica secundaria', 'active');
    insert into public.courses (id, grade_level_id, name, director_email) values ('7A', '7', '7A', 'profe@sanfelipe.edu.co');
    insert into public.subjects (id, name, code, category) values ('mat', 'Matemáticas', 'MAT-01', 'Ciencias exactas');
    insert into public.academic_periods (id, year, position, name, open_date, close_date, status) values ('2026-p3', 2026, 3, 'Periodo 3', '2026-07-13', '2026-10-15', 'open');
    insert into public.teaching_assignments (teacher_email, subject_id, course_id, period_id) values ('profe@sanfelipe.edu.co', 'mat', '7A', '2026-p3')`).then(() => null, (e) => e.message));
  check("Multicolegio: otro colegio crea su propio grado 7, curso 7A, materia «mat» y periodo abierto (sin chocar con el primero)", !sameIds, sameIds || "");
  const enrolledB = await as(adminB, () => one("select public.register_enrollment($1::jsonb, '{\"received\": true}'::jsonb) id", [JSON.stringify({ year: "2026", first_names: "Sara", last_names: "Ruano Paz", doc_type: "Tarjeta de identidad", document: "TI 1084655210", course_id: "7A", guardian_name: "Luz Paz", guardian_phone: "3120000000" })]));
  const codeMax = (await one("select max(id::bigint)::text m from public.students where id ~ '^2026[0-9]{4}$'")).m;
  check("Multicolegio: el mismo documento puede estar en dos colegios y el código estudiantil sigue siendo único en la plataforma", enrolledB.id === codeMax, JSON.stringify({ enrolledB, codeMax }));
  const seenByB = await as(adminB, () => one("select count(*)::int n from public.students"));
  const seenByA = await as(patricia, () => one("select count(*)::int n, count(*) filter (where id = $1)::int b from public.students", [enrolledB.id]));
  check("Multicolegio: cada Secretaría ve solo los estudiantes de su colegio", seenByB.n === 1 && seenByA.n === studentsA && seenByA.b === 0, `B ve ${seenByB.n}, A ve ${seenByA.n} (con el de B: ${seenByA.b})`);
  const ovB = await as(adminB, () => one("select count(*)::int n, max(grade_level_id) g from public.student_overview"));
  check("Multicolegio: la vista de estudiantes une el curso dentro del mismo colegio", ovB.n === 1 && ovB.g === "7", JSON.stringify(ovB));
  const crossWrite = await as(patricia, () => errorOf("insert into public.courses (id, grade_level_id, name, institution_id) values ('9Z', '7', '9Z', $1)", [B]));
  check("Multicolegio: nadie escribe en otro colegio aunque mande su id", crossWrite?.includes("row-level security"), crossWrite || "escribió");
  const teacherBSees = await as(teacherB, () => one("select count(*)::int n from public.students"));
  const anaSees = await as(ana, () => one("select count(*)::int n from public.students where id = $1", [enrolledB.id]));
  check("Multicolegio: el docente de un 7A no ve al estudiante del 7A del otro colegio", teacherBSees.n === 1 && anaSees.n === 0, `docente B ${teacherBSees.n}, Ana ve al de B: ${anaSees.n}`);

  await db.query("insert into public.platform_admins (email, full_name) values ('diego@notascan.co', 'Diego Pinta')");
  const diego = await mk("diego@notascan.co");
  const diegoProfile = await one("select role::text r, institution_id from public.profiles where id = $1", [diego]);
  check("Plataforma: la cuenta registrada como administradora de la plataforma no pertenece a ningún colegio", diegoProfile.r === "platform" && diegoProfile.institution_id === null, JSON.stringify(diegoProfile));
  const diegoData = await as(diego, () => one(`select (select count(*)::int from public.students) s, (select count(*)::int from public.grades) g, (select count(*)::int from public.student_medical) m,
    (select count(*)::int from public.guardians) gd, (select count(*)::int from public.observations) o, (select count(*)::int from public.institutions) i`));
  check("Plataforma: ve los colegios pero ningún estudiante, nota, acudiente, dato médico ni observación", diegoData.s === 0 && diegoData.g === 0 && diegoData.m === 0 && diegoData.gd === 0 && diegoData.o === 0 && diegoData.i === 2, JSON.stringify(diegoData));
  const stats = await as(diego, () => db.query("select institution_id, students, teachers, jsonb_array_length(weekly) w from public.platform_stats()").then((r) => r.rows));
  const sa = stats.find((r) => r.institution_id === A), sb = stats.find((r) => r.institution_id === B);
  const activeA = (await one("select count(*)::int n from public.students where institution_id = $1 and status = 'active'", [A])).n;
  check("Plataforma: cifras por colegio (estudiantes activos, docentes, 8 semanas de actividad)", stats.length === 2 && sa.students === activeA && sb.students === 1 && sb.teachers === 1 && sa.w === 8, JSON.stringify(stats));
  const statsLeak = Object.keys((await as(diego, () => db.query("select * from public.platform_stats() limit 1"))).rows[0]).join(",");
  check("Plataforma: las cifras no traen nombres ni documentos", !/name|document|email/.test(statsLeak), statsLeak);
  const notPlatform = await as(patricia, () => errorOf("select * from public.platform_stats()"));
  check("Plataforma: un colegio no consulta las cifras de la plataforma", notPlatform?.includes("Solo la plataforma"), notPlatform || "consultó");
  const identity = await as(diego, () => errorOf("update public.institutions set resolution = 'Resolución 0456 de 2019', dane = '152356000123', logo_path = 'sanfelipe/logo.png' where id = $1", [B]));
  check("Plataforma: carga la identidad de un colegio", !identity, identity || "");
  const badDane = await as(diego, () => errorOf("update public.institutions set dane = '123' where id = $1", [B]));
  check("Plataforma: un DANE que no tiene 12 dígitos se rechaza", badDane?.includes("check"), badDane || "se guardó");
  const ownRow = await as(adminB, () => db.query("select name, resolution from public.institutions").then((r) => r.rows));
  const schoolEdits = await as(adminB, () => db.query("update public.institutions set name = 'Otro nombre'").then((r) => r.affectedRows));
  check("Colegio: lee solo su propia identidad y no puede cambiarla", ownRow.length === 1 && ownRow[0].resolution === "Resolución 0456 de 2019" && schoolEdits === 0, JSON.stringify({ ownRow, schoolEdits }));
  const logoUp = await as(diego, () => errorOf("insert into storage.objects (bucket_id, name) values ('institution-logos', 'sanfelipe/logo.png')"));
  const logoUpSchool = await as(adminB, () => errorOf("insert into storage.objects (bucket_id, name) values ('institution-logos', 'sanfelipe/otro.png')"));
  check("Plataforma: solo la plataforma sube logos", !logoUp && logoUpSchool?.includes("row-level security"), `plataforma: ${logoUp || "ok"} · colegio: ${logoUpSchool || "subió"}`);
  // Alta de un colegio (7d): colegio en implementación y su primera cuenta de Secretaría, solo desde la plataforma.
  const newSchool = await as(diego, () => one("select public.create_institution($1::jsonb) id", [JSON.stringify({ name: "Institución Educativa La Merced", short_name: "iem", city: "Túquerres", department: "Nariño", plan: "Anual", contract_until: "2027-06-30", admin_name: "Rosa Erazo", admin_email: "Secretaria@LaMerced.edu.co" })]));
  const created = await one(`select i.status, i.short_name, (select role::text || ':' || email from public.staff_directory d where d.institution_id = i.id) d from public.institutions i where i.id = $1`, [newSchool.id]);
  check("Alta: crea el colegio en implementación con su primera cuenta de Secretaría (correo en minúsculas)", created.status === "implementation" && created.short_name === "IEM" && created.d === "admin:secretaria@lamerced.edu.co", JSON.stringify(created));
  const dupMail = await as(diego, () => errorOf("select public.create_institution($1::jsonb)", [JSON.stringify({ name: "Otro", admin_name: "X", admin_email: "patricia@losandes.edu.co" })]));
  check("Alta: un correo que ya está en NotaScan se rechaza", dupMail?.includes("ya está registrado"), dupMail || "se creó");
  const schoolCreates = await as(patricia, () => errorOf("select public.create_institution($1::jsonb)", [JSON.stringify({ name: "Pirata", admin_name: "X", admin_email: "x@pirata.co" })]));
  check("Alta: un colegio no da de alta colegios", schoolCreates?.includes("Solo la plataforma"), schoolCreates || "creó");
  const secStats = await as(diego, () => one("select secretaries from public.platform_stats() where institution_id = $1", [newSchool.id]));
  check("Cifras: cuentan las cuentas de Secretaría registradas", secStats.secretaries === 1, JSON.stringify(secStats));

  // ---------- Secretaría de cada colegio desde la consola (2026-10-06) ----------
  const secA = await as(diego, () => db.query("select email, account from public.platform_secretaries($1)", [A]).then((r) => r.rows));
  const accA = Object.fromEntries(secA.map((r) => [r.email, r.account]));
  check("Secretaría: la plataforma ve solo las cuentas de Secretaría del colegio y su estado (activa / sin invitar)",
    secA.length > 0 && accA["patricia@losandes.edu.co"] === "active" && !secA.some((r) => r.email === "ana.lucia@losandes.edu.co"), JSON.stringify(secA));
  const secLeak = await as(patricia, () => errorOf("select * from public.platform_secretaries($1)", [A]));
  check("Secretaría: un colegio no consulta la lista de la plataforma", secLeak?.includes("Solo la plataforma"), secLeak || "consultó");
  const addSec = await as(diego, () => errorOf("select public.platform_add_secretary($1, ' Firux386@Gmail.com ', 'Secretaría de prueba')", [newSchool.id]));
  const added = await one("select role::text r, area from public.staff_directory where email = 'firux386@gmail.com' and institution_id = $1", [newSchool.id]);
  check("Secretaría: la plataforma agrega una cuenta de Secretaría a un colegio que ya existe (correo en minúsculas)", !addSec && added?.r === "admin", addSec || JSON.stringify(added));
  const addDup = await as(diego, () => errorOf("select public.platform_add_secretary($1, 'ana.lucia@losandes.edu.co', 'X')", [newSchool.id]));
  const addBad = await as(diego, () => errorOf("select public.platform_add_secretary($1, 'sin-arroba', 'X')", [newSchool.id]));
  const addSchool = await as(patricia, () => errorOf("select public.platform_add_secretary($1, 'pirata@x.co', 'X')", [A]));
  check("Secretaría: no se agrega un correo ya registrado, uno inválido, ni lo hace un colegio",
    addDup?.includes("ya está registrado") && addBad?.includes("correo válido") && addSchool?.includes("Solo la plataforma"), JSON.stringify({ addDup, addBad, addSchool }));
  await as(diego, () => db.query("select public.platform_add_secretary($1, 'mal.escrito@lamerced.edu.co', 'Correo mal escrito')", [newSchool.id]));
  const rmNone = await as(diego, () => errorOf("select public.platform_remove_secretary($1, 'mal.escrito@lamerced.edu.co')", [newSchool.id]));
  const rmActive = await as(diego, () => errorOf("select public.platform_remove_secretary($1, 'patricia@losandes.edu.co')", [A]));
  const rmOther = await as(diego, () => errorOf("select public.platform_remove_secretary($1, 'patricia@losandes.edu.co')", [newSchool.id]));
  const stillPatricia = await one("select count(*)::int n from public.staff_directory where email = 'patricia@losandes.edu.co'");
  check("Secretaría: se quita a quien nunca recibió invitación; a quien ya tiene cuenta, o es de otro colegio, no",
    !rmNone && rmActive?.includes("no se quita desde aquí") && rmOther?.includes("no es de la Secretaría de este colegio") && stillPatricia.n === 1, JSON.stringify({ rmNone, rmActive, rmOther }));
  const firstLogin = await mk("secretaria@lamerced.edu.co");
  const firstProfile = await one("select role::text r, institution_id from public.profiles where id = $1", [firstLogin]);
  check("Alta: cuando la Secretaría crea su acceso, entra a su colegio", firstProfile.r === "admin" && firstProfile.institution_id === newSchool.id, JSON.stringify(firstProfile));
  await as(diego, () => db.query("update public.institutions set status = 'suspended' where id = $1", [B]));
  const suspended = await as(adminB, () => one("select public.current_app_role()::text r, (select count(*)::int from public.students) n"));
  check("Plataforma: un colegio suspendido no entra (sin rol ni datos)", suspended.r === null && suspended.n === 0, JSON.stringify(suspended));
  const otherStillIn = await as(patricia, () => one("select public.current_app_role()::text r"));
  check("Plataforma: suspender un colegio no afecta a los demás", otherStillIn.r === "admin", JSON.stringify(otherStillIn));

  // ---------- 12b. Invitaciones (7e) ----------
  await db.query("insert into public.staff_directory (email, full_name, role, area, institution_id) values ('invitada@losandes.edu.co', 'Clara Invitada', 'teacher', 'Docencia', $1)", [A]);
  const invited = (await db.query("insert into auth.users (email, invited_at) values ('invitada@losandes.edu.co', now()) returning id")).rows[0].id;
  const inv1 = await one("select status from public.profiles where id = $1", [invited]);
  const invRole = await as(invited, () => one("select public.current_app_role()::text r, (select count(*)::int from public.students) n"));
  check("Invitación: el perfil queda «invitado», sin rol ni datos, hasta aceptar", inv1.status === "invited" && invRole.r === null && invRole.n === 0, JSON.stringify({ inv1, invRole }));
  // Orden real de Supabase al invitar: crea el usuario sin invited_at y lo marca después (2026-10-06).
  await db.query("insert into public.staff_directory (email, full_name, role, area, institution_id) values ('real@losandes.edu.co', 'Orden Real', 'admin', 'Secretaría académica', $1)", [A]);
  const realInv = (await db.query("insert into auth.users (email) values ('real@losandes.edu.co') returning id")).rows[0].id;
  await db.query("update auth.users set invited_at = now() where id = $1", [realInv]);
  const realSt = await one("select status from public.profiles where id = $1", [realInv]);
  const realRole = await as(realInv, () => one("select public.current_app_role()::text r"));
  check("Invitación con el orden real de Supabase (invited_at después): queda invitada y sin rol hasta confirmar", realSt.status === "invited" && realRole.r === null, JSON.stringify({ realSt, realRole }));
  await db.query("update auth.users set email_confirmed_at = now() where id = $1", [invited]);
  const inv2 = await one("select status from public.profiles where id = $1", [invited]);
  const invRole2 = await as(invited, () => one("select public.current_app_role()::text r"));
  check("Invitación: al confirmar con el código queda activa con su rol", inv2.status === "active" && invRole2.r === "teacher", JSON.stringify({ inv2, invRole2 }));
  const confirmedFn = await as(ana, () => errorOf("select public.activate_invited_profile()"));
  check("La función de activación no se puede llamar directamente", confirmedFn?.includes("permission denied") || confirmedFn?.includes("trigger"), confirmedFn || "se llamó");

  // ---------- 12b. Rectoría: directorio de personal y asistencia agregada (6b.4b) ----------
  const staffRector = await as(hernando, () => one("select count(*)::int n from public.staff_directory"));
  const staffTeacher = await as(ana, () => one("select count(*)::int n from public.staff_directory"));
  const staffAdmin = await as(patricia, () => one("select count(*)::int n from public.staff_directory"));
  check("Rectoría lee el directorio de personal (lo mismo que Secretaría); el docente no", staffRector.n === staffAdmin.n && staffRector.n >= 11 && staffTeacher.n === 0, `Rectoría ${staffRector.n}, Secretaría ${staffAdmin.n}, docente ${staffTeacher.n}`);
  const staffWrite = await as(hernando, () => db.query("update public.staff_directory set full_name = 'X' where email = 'ana.lucia@losandes.edu.co'").then((r) => r.affectedRows));
  check("Rectoría no edita el directorio (0 filas)", staffWrite === 0, String(staffWrite));
  await db.query("insert into public.attendance (course_id, student_id, class_date, state) select s.course_id, s.id, date '2026-09-15', case when row_number() over (order by s.id) <= 2 then 'absent'::public.attendance_state else 'present' end from public.students s where s.course_id = '6A' and s.status = 'active' on conflict do nothing");
  const abs6 = await as(hernando, () => one("select records, absences from public.attendance_by_grade('2026-09-15', '2026-09-15') where grade_level_id = '6'"));
  const abs6Teacher = await as(carlos, () => one("select coalesce(sum(records), 0)::int n from public.attendance_by_grade('2026-09-15', '2026-09-15')"));
  check("attendance_by_grade: Rectoría ve el agregado por grado; respeta el RLS del docente", abs6 && abs6.absences === 2 && abs6.records > 2 && abs6Teacher.n >= 0, JSON.stringify(abs6));
  const absAnon = await as(null, () => errorOf("select * from public.attendance_by_grade('2026-01-01', '2026-12-31')"));
  check("Sin sesión no se llama a attendance_by_grade", absAnon?.includes("permission denied"), absAnon || "se llamó");

  // ---------- 12c. Meta institucional: la configura Secretaría ----------
  const goalDefault = await as(hernando, () => one("select performance_goal::text g from public.institutions"));
  const goalTeacher = await as(ana, () => errorOf("select public.set_performance_goal(4.0)"));
  const goalRector = await as(hernando, () => errorOf("select public.set_performance_goal(4.0)"));
  const goalOut = await as(patricia, () => errorOf("select public.set_performance_goal(5.5)"));
  const goalOk = await as(patricia, () => errorOf("select public.set_performance_goal(3.84)"));
  const goalNow = await as(hernando, () => one("select performance_goal::text g from public.institutions"));
  check("Meta institucional: 3.5 por defecto; solo Secretaría la cambia, entre 1.0 y 5.0, con un decimal",
    goalDefault.g === "3.5" && goalTeacher?.includes("Solo Secretaría") && goalRector?.includes("Solo Secretaría") && goalOut?.includes("entre 1.0 y 5.0") && !goalOk && goalNow.g === "3.8",
    JSON.stringify({ goalDefault, goalTeacher, goalRector, goalOut, goalOk, goalNow }));
  const goalDirect = await as(patricia, () => db.query("update public.institutions set performance_goal = 2.0").then((r) => r.affectedRows));
  check("Secretaría no escribe la tabla de colegios directamente (0 filas)", goalDirect === 0, String(goalDirect));
  const goalAnon = await as(null, () => errorOf("select public.set_performance_goal(4.0)"));
  check("Sin sesión no se llama a set_performance_goal", goalAnon?.includes("permission denied"), goalAnon || "se llamó");

  // ---------- 12d. Recordatorios de Rectoría al docente ----------
  const send = (who, email, extra = "") => as(who, () => errorOf(`insert into public.teacher_reminders (teacher_email, message${extra ? ", sent_by" : ""}) values ($1, 'Ponte al día con las notas del periodo.'${extra ? ", '" + extra + "'" : ""})`, [email]));
  const remOk = await send(hernando, "ana.lucia@losandes.edu.co");
  const remTeacher = await send(carlos, "ana.lucia@losandes.edu.co");
  const remToAdmin = await send(hernando, "patricia@losandes.edu.co");
  const remForged = await send(hernando, "ana.lucia@losandes.edu.co", patricia);
  check("Recordatorio: Rectoría lo envía a un docente; un docente no envía; no a quien no es docente; no a nombre de otro",
    !remOk && remTeacher?.includes("row-level security") && remToAdmin?.includes("row-level security") && remForged?.includes("row-level security"),
    JSON.stringify({ remOk, remTeacher, remToAdmin, remForged }));
  const remSender = await one("select sent_by = $1 ok from public.teacher_reminders order by id desc limit 1", [hernando]);
  const remAna = await as(ana, () => one("select count(*)::int n, min(id) id from public.teacher_reminders where seen_at is null"));
  const remCarlos = await as(carlos, () => one("select count(*)::int n from public.teacher_reminders"));
  check("Recordatorio: la base firma quién lo envió; Ana ve el suyo, Carlos no ve el de Ana", remSender.ok && remAna.n === 1 && remCarlos.n === 0, JSON.stringify({ remSender, remAna, remCarlos }));
  const seenOther = await as(carlos, () => errorOf("select public.mark_reminder_seen($1)", [remAna.id]));
  const seenOwn = await as(ana, () => errorOf("select public.mark_reminder_seen($1)", [remAna.id]));
  const seenTwice = await as(ana, () => errorOf("select public.mark_reminder_seen($1)", [remAna.id]));
  const seenDirect = await as(ana, () => db.query("update public.teacher_reminders set seen_at = null").then((r) => r.affectedRows, (e) => e.message));
  check("Recordatorio: solo su docente lo marca como visto, una vez, y nadie edita la tabla directamente",
    seenOther?.includes("no existe") && !seenOwn && seenTwice?.includes("ya se marcó") && (seenDirect === 0 || String(seenDirect).includes("permission denied")),
    JSON.stringify({ seenOther, seenOwn, seenTwice, seenDirect }));
  const remAnon = await as(null, () => errorOf("select * from public.teacher_reminders"));
  check("Sin sesión no se leen recordatorios", remAnon?.includes("permission denied"), remAnon || "leyó");

  // ---------- 12e. Historial de reportes: cada quien guarda y ve los suyos ----------
  const rep = (who, extra = "") => as(who, () => errorOf(`insert into public.generated_reports (kind, format, title, params${extra ? ", author_id" : ""}) values ('course', 'pdf', 'Consolidado 7A · Periodo 3', '{"course":"7A"}'${extra ? ", '" + extra + "'" : ""})`));
  const repAna = await rep(ana), repHernando = await rep(hernando), repForged = await rep(carlos, ana);
  const repBadKind = await as(ana, () => errorOf("insert into public.generated_reports (kind, format, title) values ('otro', 'pdf', 'X')"));
  const seesAna = await as(ana, () => one("select count(*)::int n from public.generated_reports"));
  const seesCarlos = await as(carlos, () => one("select count(*)::int n from public.generated_reports"));
  check("Reportes: docente y Rectoría guardan el suyo; nadie a nombre de otro; tipo válido; cada quien ve solo los suyos",
    !repAna && !repHernando && repForged?.includes("row-level security") && repBadKind?.includes("check") && seesAna.n === 1 && seesCarlos.n === 0,
    JSON.stringify({ repAna, repHernando, repForged, repBadKind, seesAna, seesCarlos }));
  const repAnon = await as(null, () => errorOf("select * from public.generated_reports"));
  check("Sin sesión no se lee el historial de reportes", repAnon?.includes("permission denied"), repAnon || "leyó");

  // ---------- 12f. Evaluación cerrada: protege la nota, no la referencia a la foto (borrado de fotos, 6e) ----------
  const cg = await one("select g.id, g.evaluation_id from public.grades g join public.evaluations e on e.id = g.evaluation_id where e.status = 'cerrada' limit 1");
  await db.query("update public.grades set photo_path = 'x/1/foto.jpg' where id = $1", [cg.id]).catch(() => null);
  await db.query("update public.evaluations set status = 'en-revision' where id = $1", [cg.evaluation_id]);
  await db.query("update public.grades set photo_path = 'x/1/foto.jpg' where id = $1", [cg.id]);
  await db.query("update public.evaluations set status = 'cerrada' where id = $1", [cg.evaluation_id]);
  const clearPhoto = await errorOf("update public.grades set photo_path = null where id = $1", [cg.id]);
  const changeValue = await errorOf("update public.grades set value = 1.0 where id = $1", [cg.id]);
  const setPhoto = await errorOf("update public.grades set photo_path = 'x/1/otra.jpg' where id = $1", [cg.id]);
  const after6e = await one("select photo_path from public.grades where id = $1", [cg.id]);
  check("Evaluación cerrada: se puede quitar la referencia a la foto, pero no cambiar la nota ni poner otra foto",
    !clearPhoto && after6e.photo_path === null && changeValue?.includes("está cerrada") && setPhoto?.includes("está cerrada"),
    JSON.stringify({ clearPhoto, changeValue, setPhoto, after6e }));

  // ---------- Subir desde el celular (2026-10-06) ----------
  {
    const evAna = await one("select e.id from public.evaluations e join public.teaching_assignments a on a.id = e.assignment_id where a.teacher_email = 'ana.lucia@losandes.edu.co' and e.status <> 'cerrada' limit 1");
    const evCarlos = await one("select e.id from public.evaluations e join public.teaching_assignments a on a.id = e.assignment_id where a.teacher_email <> 'ana.lucia@losandes.edu.co' limit 1") ?? (await db.query("insert into public.evaluations (assignment_id, name, kind, weight, status, institution_id) select a.id, 'Ajena', 'examen', 10, 'borrador', a.institution_id from public.teaching_assignments a where a.teacher_email <> 'ana.lucia@losandes.edu.co' limit 1 returning id")).rows[0];
    const s1 = await as(ana, () => one("select * from public.start_phone_upload($1)", [evAna.id]));
    check("Celular: el docente abre un permiso de 20 minutos con un código largo para su evaluación",
      s1.token.length === 64 && /^[0-9a-f]+$/.test(s1.token) && Math.abs(new Date(s1.expires_at) - Date.now() - 20 * 60000) < 120000, JSON.stringify(s1));
    const notMine = await as(ana, () => errorOf("select * from public.start_phone_upload($1)", [evCarlos.id]));
    const notTeacher = await as(patricia, () => errorOf("select * from public.start_phone_upload($1)", [evAna.id]));
    const anonStart = await as(null, () => errorOf("select * from public.start_phone_upload($1)", [evAna.id]));
    check("Celular: no abre permiso para una evaluación ajena, ni lo pide Secretaría, ni alguien sin sesión",
      notMine?.includes("no es tuya") && notTeacher?.includes("Solo un docente") && !!anonStart, JSON.stringify({ notMine, notTeacher, anonStart }));
    const s2 = await as(ana, () => one("select * from public.start_phone_upload($1)", [evAna.id]));
    const closedFirst = await one("select closed_at is not null c from public.phone_upload_sessions where id = $1", [s1.session_id]);
    check("Celular: abrir un permiso nuevo cierra el anterior", closedFirst.c && s2.token !== s1.token);
    await db.query("insert into public.phone_uploads (session_id, photo_path) values ($1, 'x/1/movil-1.jpg')", [s2.session_id]);
    const anaSees = await as(ana, () => one("select count(*)::int n from public.phone_uploads"));
    const carlosSees = await as(carlos, () => one("select (select count(*)::int from public.phone_uploads) u, (select count(*)::int from public.phone_upload_sessions) s"));
    check("Celular: cada docente ve solo sus fotos y permisos", anaSees.n === 1 && carlosSees.u === 0 && carlosSees.s === 0, JSON.stringify({ anaSees, carlosSees }));
    const pick = await as(ana, () => errorOf("update public.phone_uploads set picked_at = now()"));
    const rewrite = await as(ana, () => errorOf("update public.phone_uploads set photo_path = 'otra.jpg'"));
    check("Celular: el docente solo marca la foto como recogida (no cambia su ruta)", !pick && !!rewrite, JSON.stringify({ pick, rewrite }));
    await as(ana, () => db.query("select public.close_phone_upload($1)", [s2.session_id]));
    const closed2 = await one("select closed_at is not null c from public.phone_upload_sessions where id = $1", [s2.session_id]);
    const tokenHidden = await as(carlos, () => one("select count(*)::int n from public.phone_upload_sessions where token = $1", [s2.token]));
    check("Celular: cerrar el permiso lo cierra; otro docente no puede ver el código", closed2.c && tokenHidden.n === 0);
  }

  // ---------- Rol de servicio: lo justo para invite-staff y purge-exam-photos (2026-10-06) ----------
  const svc = await one(`select
    has_table_privilege('service_role', 'public.staff_directory', 'select') sd, has_table_privilege('service_role', 'public.profiles', 'select') pr,
    has_table_privilege('service_role', 'public.teaching_assignments', 'select') ta, has_table_privilege('service_role', 'public.evaluations', 'select') ev,
    has_table_privilege('service_role', 'public.grades', 'select') gs, has_column_privilege('service_role', 'public.grades', 'photo_path', 'update') gp,
    has_column_privilege('service_role', 'public.grades', 'value', 'update') gv, has_table_privilege('service_role', 'public.staff_directory', 'insert') sdi,
    has_table_privilege('service_role', 'public.students', 'select') st`);
  check("Rol de servicio: lee directorio, perfiles, asignaciones, evaluaciones y notas, y solo cambia la ruta de la foto",
    svc.sd && svc.pr && svc.ta && svc.ev && svc.gs && svc.gp && !svc.gv && !svc.sdi && !svc.st, JSON.stringify(svc));

  // ---------- 13. «supabase db reset»: todas las migraciones y después la semilla ----------
  {
    const fresh = new PGlite();
    await fresh.exec(SUPABASE_STUBS);
    for (const f of migrations) await fresh.exec(readFileSync(join(ROOT, "supabase/migrations", f), "utf8"));
    const resetErr = await fresh.exec(readFileSync(join(ROOT, "supabase/seed.sql"), "utf8")).then(() => null, (e) => e.message);
    const freshCount = resetErr ? null : (await fresh.query("select count(*)::int n, count(distinct institution_id)::int i from public.students")).rows[0];
    check("Instalación desde cero: la semilla carga después de todas las migraciones y queda en el único colegio", !resetErr && freshCount.n === 72 && freshCount.i === 1, resetErr || JSON.stringify(freshCount));
    await fresh.close();
  }

  // ---------- 14. Fotos de exámenes ----------
  const ownPhoto = await as(ana, () => errorOf(`insert into storage.objects (bucket_id, name) values ('exam-photos', '${ana}/parcial2/foto1.jpg')`));
  const otherPhoto = await as(ana, () => errorOf(`insert into storage.objects (bucket_id, name) values ('exam-photos', '${carlos}/parcial2/foto1.jpg')`));
  check("El docente sube fotos solo a su carpeta del bucket privado", !ownPhoto && otherPhoto?.includes("row-level security"), `propia: ${ownPhoto || "ok"} · ajena: ${otherPhoto || "se subió"}`);
  const bucket = await one("select public from storage.buckets where id = 'exam-photos'");
  check("El bucket de fotos es privado", bucket && bucket.public === false);
} catch (e) {
  check("El script terminó sin excepciones", false, String(e.message || e));
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "OK   " : "FALLA"} ${r.name}${r.detail ? "  — " + r.detail : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} comprobaciones superadas`);
process.exit(failed ? 1 : 0);
