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
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text not null);
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
  const migrations = readdirSync(join(ROOT, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const f of migrations) {
    const err = await runSql(readFileSync(join(ROOT, "supabase/migrations", f), "utf8")).then(() => null, (e) => e.message);
    check(`Migración ${f} se aplica sin errores`, !err, err || "");
  }
  const seedErr = await runSql(readFileSync(join(ROOT, "supabase/seed.sql"), "utf8")).then(() => null, (e) => e.message);
  check("La semilla se carga sin errores", !seedErr, seedErr || "");
  const counts = await one(`select (select count(*) from public.students)::int s, (select count(*) from public.teaching_assignments)::int a,
    (select count(*) from public.grades)::int g, (select count(*) from public.grade_change_requests)::int r, (select count(*) from public.staff_directory)::int p`);
  check("Semilla: 72 estudiantes, 35 asignaciones, 9 notas, 5 solicitudes, 11 personas", counts.s === 72 && counts.a === 35 && counts.g === 9 && counts.r === 5 && counts.p === 11, JSON.stringify(counts));
  const rlsOff = (await db.query(`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`)).rows.map((r) => r.relname);
  check("Todas las tablas públicas tienen RLS activo", rlsOff.length === 0, rlsOff.join(", "));

  // ---------- 2. Cuentas: solo personal registrado ----------
  const mk = async (email) => (await db.query("insert into auth.users (email) values ($1) returning id", [email])).rows[0].id;
  const ana = await mk("ana.lucia@losandes.edu.co");          // docente de Matemáticas en 6A, 7A, 7B
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
  const badVerify = await as(ana, () => errorOf("update public.grades set status = 'verified' where id = $1", [g.id]));
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
  check("Secretaría sí puede matricular", !adminAddStudent, adminAddStudent || "");

  // ---------- 5. Solicitudes: el docente pide, Rectoría decide ----------
  const reqErr = await as(ana, () => errorOf("insert into public.grade_change_requests (teacher_email, student_id, subject_id, course_id, from_value, to_value, reason) values ('ana.lucia@losandes.edu.co', $1, 'mat', '7A', 3.0, 3.5, 'Corrección de evaluación')", [anaStudent]));
  check("El docente crea una solicitud de cambio de nota", !reqErr, reqErr || "");
  const fake = await as(ana, () => errorOf("insert into public.grade_change_requests (teacher_email, student_id, subject_id, course_id, from_value, to_value, reason) values ('carlos.perez@losandes.edu.co', $1, 'mat', '7A', 3.0, 3.5, 'Suplantación')", [anaStudent]));
  check("No puede crearla a nombre de otro docente", fake?.includes("row-level security"), fake || "se creó");
  const pendingId = (await one("select id from public.grade_change_requests where status = 'pending' order by id limit 1")).id;
  const teacherDecides = await as(ana, () => errorOf("select public.decide_grade_request($1, 'approved')", [pendingId]));
  check("Un docente no puede decidir solicitudes", teacherDecides?.includes("Solo Rectoría"), teacherDecides || "decidió");
  const rejectNoReason = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'rejected', '')", [pendingId]));
  check("Rechazar sin motivo no se permite", rejectNoReason?.includes("rejection_needs_reason"), rejectNoReason || "se rechazó");
  const approve = await as(hernando, () => errorOf("select public.decide_grade_request($1, 'approved', 'Procede')", [pendingId]));
  const after = await one("select status, decided_by is not null d, (select description from public.request_events where request_id = $1) e from public.grade_change_requests where id = $1", [pendingId]);
  check("Rectoría aprueba y la decisión queda en el historial", !approve && after.status === "approved" && after.d && after.e === "Aprobada por Hernando Villota: Procede", approve || JSON.stringify(after));
  const directUpdate = await as(hernando, () => db.query("update public.grade_change_requests set status = 'approved' where status = 'pending'").then((r) => r.affectedRows));
  check("Ni Rectoría cambia el estado por fuera de la función (sin política de update)", directUpdate === 0, String(directUpdate));

  // ---------- 6. Fotos de exámenes ----------
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
