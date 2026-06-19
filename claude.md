# Costos Sommer Quiz — Contexto del Proyecto

## Qué es
Quiz gamificado para el área de Costos de **Clínica Somer S.A.** (Rionegro, Antioquia). Sirve para preparar el examen de ascenso a Analista de Costos.

## Destino
**GitHub Pages** — archivo único `index.html` autocontenido (sin servidor, sin npm, sin frameworks).

## Stack
- HTML + CSS + JavaScript vanilla, todo embebido en `index.html`
- `localStorage` para persistencia (sin backend)
- Funciona con `file://` y `https://`

## Estado actual
| Archivo | Estado |
|---|---|
| `index.html` | Skeleton del sesión anterior — **reescribir completo** |
| `css/styles.css` | Existe (CSS base) — embeder dentro del HTML final |
| `data/` | Vacío |
| `js/` | Vacío |
| `Examen_Ascenso_Somer_v2_CON_RESPUESTAS.docx` | Fuente de las 100 preguntas originales |

**Tarea pendiente principal:** Crear el `index.html` definitivo y autocontenido.

## Estructura del HTML final
6 pantallas (show/hide con clases CSS):
1. `#screen-start` — nombre, selección de módulo, dificultad, modo
2. `#screen-quiz` — pregunta, 4 opciones, timer, score, combo, vidas
3. `#screen-feedback` — overlay correcto/incorrecto + justificación
4. `#screen-results` — estrellas, puntuación, badges
5. `#screen-dashboard` — estadísticas, barras por módulo, historial
6. `#screen-learning` — tarjetas de fórmulas, glosario

## Preguntas
- **100 originales** en `Examen_Ascenso_Somer_v2_CON_RESPUESTAS.docx` (ya extraídas, verificadas)
- **+30 adicionales** a crear (verificadas antes de incluir)
- **Regla:** solo incluir pregunta si enunciado Y respuesta están 100% correctos

### Módulos (8 total)
1. Costos hospitalarios y clasificación (Q1–13)
2. Presupuesto y control financiero (Q14–26)
3. Indicadores de gestión KPIs (Q27–39)
4. Costeo ABC (Q40–50)
5. Normativa sector salud Colombia (Q51–61)
6. Contabilidad aplicada a costos (Q62–74)
7. Caso integral de rentabilidad (Q75–83)
8. Criterio profesional e institucional Somer (Q84–100)

## Mecánicas del juego
- **3 modos:** Práctica (módulo libre), Examen Final (100 Qs, 2h, 3 vidas), Revisión de Errores
- **Puntuación:** 10 pts base + bonus velocidad (hasta 5 pts si <5s) × multiplicador combo
- **Combos:** ×1 (0), ×1.5 (3 seguidas), ×2 (5), ×3 (10+)
- **5 rangos:** Auxiliar (0–500) → Analista Junior (501–1500) → Analista de Costos (1501–3000) → Analista Senior (3001–6000) → Jefe de Costos (6001+)
- **Feedback:** Justificación siempre (acierto + error). En error: por qué falla esa opción.

## Diseño
- Paleta: `#1F4E79` (azul oscuro), `#2E75B6` (azul medio), `#1A7A1A` (verde), `#C0392B` (rojo), `#FFD700` (oro)
- Fondo: dark navy `#07111F`
- Estética: limpia, profesional, healthcare
- Fuentes: DM Serif Display (títulos) + IBM Plex Sans (cuerpo) vía Google Fonts

## Estrategia de tokens (recomendación token-orchestrator)
- **Haiku:** generar preguntas (template repetitivo) y HTML estático
- **Sonnet:** lógica del juego, CSS complejo, state machine
- No pedir a Sonnet escribir preguntas inline — sobrepago por repetición

## Cómo retomar
1. Leer este archivo
2. Leer `Examen_Ascenso_Somer_v2_CON_RESPUESTAS.docx` si se necesitan las preguntas (extrae con python zipfile)
3. Crear `index.html` con todo embebido — CSS en `<style>`, JS en `<script>`
4. Publicar en GitHub Pages (repositorio + rama main o rama gh-pages)
