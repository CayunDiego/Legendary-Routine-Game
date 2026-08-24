# Estado, guardado, nube y fusión

Todo en `src/state/`. `EST` es la partida entera, un objeto plano serializable.

## Forma de `EST` (v4)

| Campo | Qué |
|---|---|
| `v` | versión del formato. Hoy 4 |
| `dia` | día lógico `YYYY-MM-DD`. **Arranca a las 4 AM** (trasnochar no rompe la racha) |
| `nivel` `xp` | curva: `xpNecesaria(n) = 80 + (n-1)*55` |
| `oro` | monedas disponibles (baja al canjear) |
| `oroGanado` | todo el oro de la vida. **Sólo sube.** Lo necesita la fusión |
| `racha` `mejorRacha` `diasCompletos` `totalMisiones` | contadores |
| `hoy` | `{misionId: veces}` del día |
| `hoyEn` | `{misionId: [ts,...]}` a qué hora se cumplió cada vez |
| `animoHoy` | id de `config/animos.js` |
| `historial` | `[{d, animo, hechas}]`, tope 90 días |
| `cartaVista` `cartaIdx` | la nota de Diego del día |
| `eclosionado` `eclosionadoEn` | mascota nacida + `Date.now()` del nacimiento |
| `bichoNombre` | nombre puesto por Kath, o null |
| `disfraces` `disfrazPuesto` | ids encontrados / el que tiene puesto |
| `canjeados` | `[{cid, id, fecha, cumplidoEn}]`. `cumplidoEn` = el segundo tilde |
| `extras` | misiones secundarias `[{eid, dia, texto, ts, xp, oro}]`, tope 200 |
| `pomo` | pomodoro corriendo o null: `{fase:'foco'\|'pausa', rato, desde, hasta}` |
| `pomodoros` | bloques de foco terminados `[{pid, dia, ts, minutos, rato, xp, oro}]`, tope 300 |
| `sonido` `primeraVez` `versionVista` | preferencias / primera vez / última novedad vista |
| `seq` `guardadoEn` `escritoPor` | metadatos de sincronización |

Nota: `pomo.hasta` es un instante FUTURO, no un contador. Por eso el pomodoro
corre con el juego cerrado.

## Cambiar el formato: las tres cosas

Nunca una sola. Si falta alguna, la nube come progreso en silencio.

1. Campo nuevo en `EST_INICIAL()`.
2. Paso en `MIGRACIONES` (`{versionVieja: fn}`) **y** subir `V_ACTUAL`. Los
   pasos se aplican en cadena: una partida v1 llega sola a v4.
3. Regla en `fusion.js` si el campo puede diferir entre dispositivos.

`cargar()` hace `Object.assign(EST_INICIAL(), migrar(partida))`, así que un
campo nuevo con default seguro no rompe nada — pero el paso de migración va
igual, porque si no la partida sigue declarándose vieja y la próxima migración
de verdad arranca del lugar equivocado.

## Tres capas de guardado

| Capa | Dónde | Nota |
|---|---|---|
| 1. Dispositivo | `localStorage` + respaldo | fuente de verdad. Si queda ilegible **deja de guardar** en vez de pisar, y avisa en Ajustes |
| 2. Nube | Worker + D1 | opcional: `CONFIG.nube` vacío = todo local, sin errores |
| 3. Archivo | Ajustes → Copia de seguridad | lo único que sobrevive a perder los dos dispositivos |

`persistencia.js` también genera el **código de partida** (99 bits, formateado
en grupos de 5 con guiones, sin caracteres especiales). Es la única llave de la
partida en la nube: no hay forma de reemitirlo (ver deuda).

## Sincronización (`sync.js`)

Optimista, con debounce de 4 s. `GET` → fusionar → `PUT` con compare-and-swap
sobre `seq`. Un 409 se resuelve solo: baja lo del otro, fusiona, reintenta.

Si después de fusionar tiene exactamente lo que el servidor devolvió, **no manda
el PUT** (ahorra la mitad de los viajes; el costo está anotado en la deuda).

## Fusión (`fusion.js`) — la parte delicada

Nunca "gana el último". Base: `{...viejo, ...ultimo}` (así los campos que este
código todavía no conoce sobreviven), y encima reglas por campo:

| Campo | Regla |
|---|---|
| nivel + xp | se aplanan a XP total, se toma el máximo, se vuelve. Nivel 3 con 10 xp > nivel 2 con 70 |
| contadores, racha | máximo |
| `eclosionadoEn` | **mínimo** de los que existan. Tomar el más nuevo le regalaría vida a la cáscara del jardín en cada sync |
| `disfraces` | unión. No hay "desencontrar" |
| `disfrazPuesto` | del último, pero se anula si no está en la colección fusionada |
| mismo `dia` | `hoy` suma por misión; `hoyEn` elige entera la lista del que hizo más veces (mezclarlas armaría una mañana que no pasó) |
| distinto `dia` | manda el más nuevo; el día del otro se cierra y va al historial |
| `extras`, `pomodoros` | unión por `eid`/`pid` |
| `pomo` | gana el que **no venció**; entre dos vivos, el que termina más tarde. El último en escribir no sirve: el dispositivo donde Kath trabaja es justo el que se queda callado |
| `oro` | **no se puede tomar el máximo** (baja al canjear). Se reconstruye: `max(oroGanado) - suma(costo de canjeados fusionados)` |
| `canjeados` | por `cid`. Los viejos sin `cid` se agrupan por `id+fecha` y gana la lista más larga |

## Reglas de juego que viven en gameLogic

- `completarMision(id)` — respeta `veces` por día, anota la hora, paga XP/oro,
  devuelve `{xp, oro, completa, subio, ts, texto, resta}`.
- `canjear(id)` sólo descuenta monedas. **`confirmarCanje(canje)` es el segundo
  tilde**: Kath marca que Diego se lo cumplió de verdad. Recibe el canje, no su
  `cid`, porque los viejos pueden no tener.
- `agregarExtra(texto)` — tope diario `EXTRA.porDia`, recorta a `largoMax`.
- Pomodoro: `arrancarPomodoro` / `cortarPomodoro` / `cerrarFasePomodoro`. Este
  último lo llama el latido de `juego.js`; devuelve qué pasó o `null`. Una fase
  vencida hace más de 4 h se descarta sin pagar ni festejar (pomodoro olvidado).
- `buscarDisfrazEnCesped()` — sortea sólo entre los que faltan, así el último no
  se vuelve cada vez más improbable.
