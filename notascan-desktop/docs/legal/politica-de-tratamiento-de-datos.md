# Política de tratamiento de datos personales — NotaScan

**Versión 2026.1 · vigente desde el 6 de octubre de 2026**

> **Borrador técnico.** Lo redactó el equipo de desarrollo a partir de la Ley 1581 de 2012, el Decreto 1377 de 2013
> (compilado en el Decreto 1074 de 2015) y del funcionamiento real de la aplicación. **Debe revisarlo un abogado antes
> de usarse con datos reales.** Los campos entre corchetes los completa cada colegio.

## 1. Quién trata los datos

- **Responsable del tratamiento:** cada colegio que usa NotaScan — **[nombre del colegio]**, [NIT], [dirección],
  [ciudad], correo de atención de datos personales **[correo]**, teléfono [teléfono]. El colegio decide para qué se
  usan los datos de su comunidad.
- **Encargado del tratamiento:** NotaScan (Diego Armando Pinta Cuasquen, [documento], [correo de contacto]), que presta
  la plataforma y trata los datos solo por cuenta del colegio y según sus instrucciones.
- **Subencargados** que usa NotaScan para prestar el servicio (ver sección 6).

## 2. Qué datos se tratan

| Titular | Datos | Para qué |
|---|---|---|
| Estudiantes (en su mayoría **menores de edad**) | Nombres, apellidos, tipo y número de documento, código estudiantil, curso, estado de matrícula, fecha de matrícula, paz y salvo (biblioteca, pensiones, documentos) | Matrícula y gestión académica |
| | Notas, asistencia, observaciones de convivencia, conceptos de los docentes, boletines | Registro y seguimiento académico |
| | **Fotografías de exámenes** (hoja con nombre, código y nota escrita a mano) | Leer la nota para que el docente la verifique |
| | **Datos de salud** (alergias, condiciones, notas médicas, contacto de emergencia) — **dato sensible** | Atención de emergencias en el colegio |
| Acudientes | Nombre, parentesco, teléfono | Contacto sobre el estudiante |
| Personal del colegio (docentes, Secretaría, Rectoría) | Nombre, correo institucional, rol, área, último acceso, registro de las acciones que firman (quién verificó una nota, quién decidió una solicitud) | Acceso a la aplicación, trazabilidad del registro académico |

NotaScan **no** usa estos datos para publicidad, no los vende y no hace perfiles comerciales.

## 3. Finalidades

1. Matricular y gestionar la vida académica del estudiante (notas, asistencia, observador, boletines, reportes).
2. Leer automáticamente la nota de las fotografías de exámenes **para que el docente la verifique**: la nota que cuenta
   es siempre la que confirma el docente.
3. Permitir a Rectoría y Secretaría la supervisión académica y la estadística institucional.
4. Contactar al acudiente sobre asuntos del estudiante.
5. Atender emergencias de salud del estudiante (solo con autorización expresa para datos sensibles).
6. Garantizar la seguridad y la trazabilidad de la plataforma (quién hizo cada cambio).

## 4. Autorización

- Los datos de estudiantes **menores de edad** se tratan con la **autorización previa, expresa e informada de su
  representante legal (acudiente)**, respetando el interés superior del menor y sus derechos fundamentales (Ley 1581,
  art. 7; Decreto 1377, art. 12). Cuando su madurez lo permita, se escucha la opinión del estudiante.
- Los **datos de salud son sensibles**: su entrega es **facultativa** (nadie está obligado a darlos) y requiere
  autorización explícita y separada (Ley 1581, arts. 5 y 6).
- El colegio conserva la prueba de cada autorización: en NotaScan, Secretaría registra la autorización firmada con su
  versión, fecha y forma de entrega.
- El personal acepta esta política al entrar por primera vez a la aplicación; la aceptación queda registrada con su
  versión y fecha.

## 5. Dónde y cuánto tiempo se guardan

| Datos | Dónde | Cuánto tiempo |
|---|---|---|
| Datos académicos y de matrícula | Base de datos de Supabase (región de São Paulo, Brasil) | El tiempo que exija la normativa educativa para el registro académico [**a confirmar por el abogado**]; después se suprimen o se anonimizan |
| Fotografías de exámenes | Almacenamiento privado de Supabase (carpeta de cada docente) | **Hasta que el colegio cierra el periodo académico**: al cerrarlo se borran automáticamente; la nota se conserva |
| Datos de salud | Base de datos, con acceso solo de Secretaría y Rectoría | Mientras el estudiante esté matriculado o hasta que se revoque la autorización |
| Registro de autorizaciones y aceptaciones | Base de datos | Mientras dure la relación con el colegio y el término legal para demostrar la autorización |
| Cola sin conexión de la planilla | En el equipo del docente (almacenamiento local de la aplicación) | Hasta que la nota se envía a la base |

## 6. Con quién se comparten

Los datos **no se venden ni se ceden** a terceros. Para prestar el servicio, NotaScan usa estos subencargados, con los
que debe existir un contrato que les impida usar los datos para fines propios:

| Subencargado | Para qué | País |
|---|---|---|
| Supabase Inc. | Base de datos, almacenamiento de fotos, cuentas de acceso | Servidores en Brasil (São Paulo); empresa en EE. UU. |
| Anthropic PBC | Leer la nota, el código y el nombre en la fotografía del examen (modelo Claude Haiku 4.5) | EE. UU. |
| [Proveedor de correo, p. ej. Brevo] | Enviar invitaciones y códigos de acceso al personal | [País] |

Estas entregas son **transmisiones internacionales a encargados** (Decreto 1377, arts. 24 y 25). La fotografía se envía a
Anthropic **solo para esa lectura**; [**verificar con el abogado y el contrato vigente de Anthropic** si conserva las
imágenes y por cuánto tiempo, y que no las use para entrenar modelos].

## 7. Seguridad

- Acceso con cuenta personal y contraseña; cada rol ve solo lo que necesita (docente: sus cursos; datos de salud y de
  acudientes: solo Secretaría y Rectoría), aplicado en la base de datos y no solo en la pantalla.
- Cada colegio ve únicamente sus datos.
- Las fotografías están en un almacenamiento privado; cada docente sube y ve solo las suyas.
- Las acciones importantes quedan firmadas por la base con quien las hizo (verificar notas, decidir solicitudes,
  registrar autorizaciones).
- Las claves de los servicios externos están solo en el servidor, nunca en la aplicación.

## 8. Derechos del titular

El titular (o el acudiente, en el caso de un menor) puede:

1. **Conocer, actualizar y rectificar** sus datos.
2. **Solicitar prueba de la autorización** que dio.
3. **Ser informado** del uso que se ha dado a sus datos.
4. **Presentar quejas** ante la Superintendencia de Industria y Comercio (SIC), después de agotar el trámite ante el
   colegio.
5. **Revocar la autorización y pedir la supresión** de sus datos, salvo cuando exista un deber legal o contractual de
   conservarlos (por ejemplo, el registro académico).
6. **Acceder gratis** a sus datos.

## 9. Cómo ejercer los derechos

- Escribir a **[correo de atención del colegio]** o presentarse en Secretaría con el documento del titular (y el del
  acudiente, si es menor).
- **Consultas:** se responden en máximo **10 días hábiles**, prorrogables 5 días más avisando el motivo (Ley 1581,
  art. 14).
- **Reclamos** (corrección, actualización, supresión, revocatoria): se responden en máximo **15 días hábiles**,
  prorrogables 8 días más avisando el motivo (Ley 1581, art. 15).
- Desde NotaScan, Secretaría puede **exportar todos los datos de un estudiante** y **corregirlos**.

## 10. Cambios a esta política

Cada cambio importante tiene una versión y una fecha nuevas. El personal debe aceptar la nueva versión al entrar a la
aplicación, y el colegio informa a los acudientes; si cambian las finalidades, se pide de nuevo la autorización.

| Versión | Fecha | Cambio |
|---|---|---|
| 2026.1 | 2026-10-06 | Primera versión |
