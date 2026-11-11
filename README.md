# NotaScan · app de escritorio para colegios

NotaScan es un sistema académico de notas para colegios. El docente le toma foto a la planilla o al examen calificado a mano, la app lee la nota con IA y el docente la revisa antes de guardarla. Nada entra al registro sin que una persona lo confirme.

Lo hicimos como proyecto final de Diseño de Interfaces de Software (5.º semestre, Universidad Cooperativa de Colombia).

## Para qué sirve

En muchos colegios las notas se pasan dos veces, primero en papel y después al sistema, y en ese paso se cuelan errores. NotaScan quita la segunda digitación sin quitarle el control al docente. Cada rol ve solo lo suyo.

| Rol | Qué hace |
|---|---|
| Docente | Revisa las notas leídas por la IA, lleva la planilla, la asistencia, el observador, los conceptos y las recuperaciones |
| Secretaría | Matrícula (una por una o importando CSV o Excel), estructura del colegio, malla, periodos, usuarios y paz y salvo |
| Rectoría | Ve el rendimiento del colegio y de cada docente, atiende las solicitudes (como los cambios de nota) y consulta el observador |
| Plataforma | Da de alta los colegios que usan el servicio y ve su uso, sin ver datos de estudiantes |

Funciona en Windows, Linux y macOS, en español, inglés y portugués, y con modo claro y oscuro («Campo marino»), que se elige en Ajustes.

## Cómo probarla

Hay dos formas.

1. **Modo demo, sin cuenta.** Usa datos simulados de un colegio de ejemplo y deja recorrer los tres roles. Es la forma más rápida de verla.
2. **Con cuenta real.** Entra contra la base de datos en Supabase. Las cuentas de prueba para el profesor están en el documento de cuentas de prueba del portafolio (`docs/Cuentas de prueba.md` en el repo [mi-portafolio](https://github.com/diarpicu2022-commits/mi-portafolio)).

El instalador de Windows está en [Releases](https://github.com/diarpicu2022-commits/notascan-escritorio/releases). La versión 0.1.0 publicada es anterior a los idiomas y al modo oscuro. Los instaladores nuevos de Windows, Linux y macOS salen del flujo de GitHub Actions `notascan-multiplataforma`, en la pestaña Actions del repo.

## Cómo correrla desde el código

Necesitas Node.js 22 (el que usa el CI) y, para la app de escritorio, Rust con los requisitos de [Tauri 2](https://v2.tauri.app/start/prerequisites/).

```bash
cd notascan-desktop
npm install

# Copia .env.example como .env.local y pon la URL y la clave publicable de tu proyecto Supabase
npm run dev            # en el navegador, con Supabase
npm run build:demo     # versión con datos simulados
npm run preview        # sirve el build en http://localhost:4173
npm run tauri dev      # la app de escritorio
npm run tauri build    # el instalador del sistema donde lo corras
```

La clave que va en `.env.local` es solo la publicable (`sb_publishable_…`). La clave secreta de Supabase nunca va en la app.

## Cómo está hecho

- **App:** Tauri 2, React 18, TypeScript, Tailwind 3 y Framer Motion.
- **Datos:** Supabase (Postgres con políticas RLS por rol y por colegio, y Supabase Auth). Las migraciones están en `notascan-desktop/supabase/`.
- **Diseño:** todo sale del sistema de diseño de `notascan-ui/`, que es el contrato y no se edita. Las decisiones de cada pantalla, las enmiendas y cómo se verificaron están en los anexos de `notascan-desktop/docs/ux/anexos/`.
- **Pruebas:** cada parte tiene su script de verificación (`npm run verify:*`), por ejemplo `verify:auth`, `verify:dark` o `verify:states`. Revisan textos, contraste, estados y tamaños sobre la app corriendo.

| Carpeta | Qué hay |
|---|---|
| `notascan-desktop/` | La app de escritorio |
| `notascan-ui/` | El sistema de diseño de NotaScan |
| `notascan-desktop/docs/legal/` | Política de tratamiento de datos, términos y autorización del acudiente (borradores) |
| `notascan-desktop/CONTINUAR.md` | Estado del proyecto y lo que falta |

## Datos personales

NotaScan maneja datos de estudiantes, muchos de ellos menores de edad, así que la política de tratamiento de datos (Ley 1581 de 2012) y la autorización del acudiente se pensaron desde el diseño. Los textos de `docs/legal/` son borradores técnicos y antes de usarse con un colegio real los tiene que revisar un abogado.

## Lo que falta

- Firmar el instalador de macOS y probar en un Mac real.
- Probar la impresión de reportes con una impresora real.
- Elegir el servicio de visión definitivo para leer las fotos. Hoy «Subir fotografías» y «Reportes» usan datos de demostración.

## Autor

Diego Armando Pinta Cuasquen · [GitHub](https://github.com/diarpicu2022-commits) · [Portafolio](https://mi-portafolio-beta-kohl.vercel.app)
