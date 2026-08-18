#!/usr/bin/env python3
"""
Recorta una hoja de sprites del generador a SOLO los cuadros que el juego
dibuja y los empaqueta en una hoja nueva, sin huecos ni rotulos quemados
(ver docs/deuda-tecnica.md, 4f). Las hojas originales pesan varios MB porque
traen filas sin usar y texto ("ETAPA 1", "DERECHA", numeros) que viaja al
telefono de Kath en cada instalacion sin dibujarse nunca.

No mide nada solo: las coordenadas de entrada son las que ya estan
verificadas al pixel en engine/motor.js (COMPANERO_ANIM, HUEVO_IDLE_X,
HUEVO_HATCH_X). Este script las lee de este mismo archivo (abajo), recorta
esos rectangulos exactos del original en arte-fuente/, los empaqueta
compactos con un margen transparente entre cuadros, cuantiza colores para
bajar peso, y devuelve la tabla de coordenadas NUEVA para pegar a mano en
motor.js / retratosCompanero.js.

No edita el codigo del juego: el resultado (imagen + coordenadas impresas)
se revisa a mano antes de comitear. Guardado aca para la proxima hoja que
llegue -- ver docs/deuda-tecnica.md 4f, "el script no quedo en el repo" fue
el problema con merli.png y kath_baile.png.

Uso: python scripts/recortar-hojas.py
"""
from PIL import Image
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(RAIZ, 'arte-fuente')
DEST = os.path.join(RAIZ, 'src', 'assets')

PAD = 2  # px transparentes entre cuadros: evita que el suavizado al
         # reescalar (construirBicho en motor.js) muestree el cuadro vecino

# 64 se eligio mirando el cuadro mas dificil (el brillo del cascaron del
# huevo, unico degrade real de las dos hojas -- el resto es sombreado plano
# de pixel art). Comparado a ojo contra el original y contra 128/32/16: a
# partir de 32 el brillo ya banda un poco, a 16 las manchas rojas/azules del
# cascaron pierden el color. 64 sale identico al original en los dos casos.


def empaquetar(img, filas, out_path, colores=64):
    """filas: lista de filas, cada fila es una lista de (x, y, w, h) en la
    hoja fuente. Devuelve (filas_destino, tamano_hoja) con las mismas
    coordenadas ya reescritas a la hoja empaquetada."""
    alturas = [max(h for (_, _, _, h) in fila) for fila in filas]
    ancho = max(sum(w for (_, _, w, _) in fila) + PAD * (len(fila) - 1) for fila in filas)
    alto = sum(alturas) + PAD * (len(filas) - 1)
    hoja = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0))

    filas_dst = []
    y_dst = 0
    for fila, alto_fila in zip(filas, alturas):
        x_dst = 0
        fila_dst = []
        for (x, y, w, h) in fila:
            cuadro = img.crop((x, y, x + w, y + h))
            hoja.paste(cuadro, (x_dst, y_dst))
            fila_dst.append((x_dst, y_dst, w, h))
            x_dst += w + PAD
        filas_dst.append(fila_dst)
        y_dst += alto_fila + PAD

    # Cuantizar la paleta baja mucho el peso: el arte trae degrades suaves
    # (miles de colores unicos) pero el alfa es binario (0 o 255, sin
    # antialiasing), asi que conviene aplanar el area transparente a un solo
    # color antes de cuantizar -- si no, el ruido de RGB que suele quedar
    # "debajo" de los pixeles invisibles se come cupos de paleta que nunca se
    # ven.
    alfa = hoja.split()[3]
    rgb = hoja.convert('RGB')
    rgb.paste((0, 0, 0), mask=Image.eval(alfa, lambda a: 255 - a))
    paleta = rgb.quantize(colors=colores, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    paleta = paleta.convert('RGBA')
    paleta.putalpha(alfa)
    hoja = paleta

    hoja.save(out_path, optimize=True, compress_level=9)
    return filas_dst, hoja.size


def companero():
    img = Image.open(os.path.join(FUENTE, 'companero.png')).convert('RGBA')
    # y, w, h, x[] tal cual estan hoy en motor.js#COMPANERO_ANIM
    ETAPAS = [
        [
            (771, 75, 109, [163, 268, 370, 476]),
            (388, 89, 74, [158, 266, 372, 475]),
            (205, 87, 72, [161, 265, 365, 470]),
            (548, 73, 124, [163, 270, 372, 475]),
        ],
        [
            (755, 73, 137, [596, 702, 810, 919]),
            (355, 85, 119, [585, 696, 811, 918]),
            (164, 85, 121, [599, 710, 818, 927]),
            (544, 81, 134, [592, 696, 804, 914]),
        ],
        [
            (743, 115, 166, [1025, 1156, 1282, 1406]),
            (133, 117, 157, [1037, 1161, 1286, 1408]),
            (329, 118, 150, [1020, 1146, 1272, 1397]),
            (509, 112, 194, [1025, 1153, 1279, 1408]),
        ],
    ]
    NOMBRES_DIR = ['abajo', 'izquierda', 'derecha', 'arriba']

    filas = []
    etiquetas = []
    for et_i, etapa in enumerate(ETAPAS):
        for dir_i, (y, w, h, xs) in enumerate(etapa):
            filas.append([(x, y, w, h) for x in xs])
            etiquetas.append(f'etapa {et_i} {NOMBRES_DIR[dir_i]}')

    out = os.path.join(DEST, 'companero_hoja.png')
    filas_dst, tam = empaquetar(img, filas, out)

    print(f'\n== companero_hoja.png -> {tam[0]}x{tam[1]}, {os.path.getsize(out) / 1024:.0f} kB')
    print('const COMPANERO_ANIM = [')
    idx = 0
    for et_i in range(3):
        print(f'  [ // etapa {et_i + 1}')
        for dir_i in range(4):
            fila = filas_dst[idx]
            y = fila[0][1]
            w = fila[0][2]
            h = fila[0][3]
            xs = ', '.join(str(x) for (x, _, _, _) in fila)
            print(f'    {{ y: {y}, w: {w}, h: {h}, x: [{xs}] }},   // {NOMBRES_DIR[dir_i]}')
            idx += 1
        print('  ],')
    print('];')


def huevo():
    img = Image.open(os.path.join(FUENTE, 'huevo_mascota.png')).convert('RGBA')
    IDLE_X = [(35, 173), (200, 336), (364, 501), (529, 667), (705, 843),
              (871, 1013), (1040, 1178), (1208, 1348), (1368, 1501), (1521, 1654)]
    HATCH_X = [(17, 143), (156, 280), (288, 415), (435, 564), (586, 715),
               (731, 920), (920, 1129), (1144, 1262), (1278, 1473), (1473, 1659)]
    Y_IDLE, H_IDLE = 41, 180
    Y_HATCH, H_HATCH = 729, 181

    fila_idle = [(x0, Y_IDLE, x1 - x0, H_IDLE) for (x0, x1) in IDLE_X]
    fila_hatch = [(x0, Y_HATCH, x1 - x0, H_HATCH) for (x0, x1) in HATCH_X]

    out = os.path.join(DEST, 'huevo_hoja.png')
    filas_dst, tam = empaquetar(img, [fila_idle, fila_hatch], out)

    print(f'\n== huevo_hoja.png -> {tam[0]}x{tam[1]}, {os.path.getsize(out) / 1024:.0f} kB')
    y_idle_dst = filas_dst[0][0][1]
    y_hatch_dst = filas_dst[1][0][1]
    print(f"const HUEVO_Y = {{ idle: {y_idle_dst}, hatch: {y_hatch_dst} }};")
    print(f"const HUEVO_H = {{ idle: {H_IDLE}, hatch: {H_HATCH} }};")
    idle_pairs = ', '.join(f'[{x}, {x + w}]' for (x, _, w, _) in filas_dst[0])
    hatch_pairs = ', '.join(f'[{x}, {x + w}]' for (x, _, w, _) in filas_dst[1])
    print('const HUEVO_IDLE_X = [')
    print(f'  {idle_pairs},')
    print('];')
    print('const HUEVO_HATCH_X = [')
    print(f'  {hatch_pairs},')
    print('];')


if __name__ == '__main__':
    companero()
    huevo()
