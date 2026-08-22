#!/usr/bin/env python3
"""
Preprocesador de hojas de sprites: convierte la hoja cruda que sale del
generador en la hoja empaquetada que usa el juego, MIDIENDO SOLO donde esta
cada cuadro, y escribe las coordenadas en src/config/recortes.json, que es de
donde las lee el juego. No hay que tocar codigo para cambiar un sprite.

Reemplaza a scripts/recortar-hojas.py, que traia las coordenadas de cada
cuadro escritas adentro: cada hoja nueva obligaba a medirlas a ojo y pegarlas
a mano en motor.js. Lo unico que este script NO puede adivinar es como se
llama cada fila (que direccion mira el bicho, que etapa es); eso vive en
scripts/sprites.json, un archivo de texto corto que se edita mirando la
imagen de revision que el propio script deja.

    Uso:
      python scripts/sprites.py              # o: npm run sprites
      python scripts/sprites.py companero    # solo uno
      python scripts/sprites.py --plantillas # dibuja las plantillas de referencia

    Necesita:  pip install pillow numpy

Que hace, en orden, para cada personaje:

  1. Abre la hoja de arte-fuente/ y le saca el fondo si hace falta (damero
     gris, gris plano: lo que suele traer el generador).
  2. Encuentra los cuadros solo: parte la hoja en bandas horizontales por
     densidad de pixeles, y dentro de cada banda busca los grupos de pixeles
     pegados entre si. Los rotulos quemados en la imagen ("ETAPA 1", "DERECHA")
     se descartan por forma -- un cartel llena su caja y no tiene color -- y las
     esquirlas se le suman al cuadro del que salieron.
  3. Los empaqueta juntos y sin huecos en una hoja nueva de src/assets/, con
     la paleta cuantizada: la hoja cruda pesa MB y eso se le baja al telefono
     de Kath en cada instalacion.
  4. Escribe src/config/recortes.json con las coordenadas nuevas.
  5. Deja el original con cada cuadro marcado y numerado en
     arte-fuente/_revision/, para mirar de un vistazo si midio bien.

Si la cuenta de filas no da lo que dice el manifiesto, corta con un error que
explica cual no cierra y deja igual la imagen de revision, para poder mirarla.
Nunca pisa la hoja del juego con una deteccion que no cerro.
"""
import argparse
import json
import os
import sys

try:
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit('Falta una dependencia. Instalar con:  pip install pillow numpy')

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
FUENTE = os.path.join(RAIZ, 'arte-fuente')
DEST = os.path.join(RAIZ, 'src', 'assets')
REVISION = os.path.join(FUENTE, '_revision')
PLANTILLAS = os.path.join(FUENTE, '_plantillas')
MANIFIESTO = os.path.join(AQUI, 'sprites.json')
SALIDA = os.path.join(RAIZ, 'src', 'config', 'recortes.json')

PAD = 2        # px transparentes entre cuadros de la hoja empaquetada: evita que
               # el suavizado al reescalar muestree el cuadro vecino
ALFA_MIN = 16  # por debajo de esto, un pixel cuenta como vacio al medir
DIRS = ['abajo', 'izquierda', 'derecha', 'arriba']  # el orden de motor.js#DIRS


# ---------------------------------------------------------------------------
#  Medir: donde esta cada cuadro dentro de la hoja cruda
# ---------------------------------------------------------------------------

def _tramos(banderas, hueco=0):
    """Tramos [inicio, fin) de True seguidos, uniendo huecos de hasta `hueco`.

    El hueco importa: entre las patas de un bicho puede haber una columna
    vacia, y eso no significa que ahi termine el cuadro."""
    idx = np.flatnonzero(banderas)
    if idx.size == 0:
        return []
    cortes = np.flatnonzero(np.diff(idx) > hueco + 1)
    inicios = np.concatenate(([idx[0]], idx[cortes + 1]))
    finales = np.concatenate((idx[cortes], [idx[-1]]))
    return [(int(a), int(b) + 1) for a, b in zip(inicios, finales)]


def _partir(densidad, x0, x1, partes):
    """Separa un tramo que junto varios cuadros pegados.

    Pasa cuando dos cuadros se tocan (el huevo estallando, que salpica). Corta
    por la columna con menos pixeles cerca de donde caeria el corte parejo, no
    por el corte parejo a secas: asi el tajo cae en el aire entre los dos
    dibujos y no por la mitad de uno."""
    if partes <= 1:
        return [(x0, x1)]
    izq = partes // 2
    ideal = x0 + (x1 - x0) * izq / partes
    margen = max(1, int((x1 - x0) / partes * 0.25))
    a = max(x0 + 1, int(ideal) - margen)
    b = min(x1 - 1, int(ideal) + margen)
    corte = a + int(np.argmin(densidad[a:b])) if b > a else int(ideal)
    return _partir(densidad, x0, corte, izq) + _partir(densidad, corte, x1, partes - izq)


def _ajustar(tramos, densidad, esperado):
    """Deja exactamente `esperado` cuadros: parte los pegados, tira la basura."""
    tramos = list(tramos)
    # De mas: sobra alguna manchita suelta del generador.
    while len(tramos) > esperado:
        tramos.remove(min(tramos, key=lambda t: t[1] - t[0]))
    # De menos: hay cuadros pegados. Se parte el mas ancho, y de nuevo.
    while len(tramos) < esperado:
        i = max(range(len(tramos)), key=lambda k: tramos[k][1] - tramos[k][0])
        x0, x1 = tramos[i]
        tramos[i:i + 1] = _partir(densidad, x0, x1, 2)
    return sorted(tramos)


def _componentes(mascara, y0):
    """Grupos de pixeles pegados entre si, como cajas (x0, y0, x1, y1).

    Es union-find sobre los tramos de cada fila (no pixel por pixel, que en una
    hoja de 1600x900 seria eterno en Python). Se usa esto y no cortar la banda
    por columnas vacias porque los cuadros a veces se solapan: el huevo que
    estalla manda esquirlas encima del cuadro de al lado, y por columnas los dos
    salen pegados en un rectangulo solo."""
    padre = {}

    def raiz(a):
        while padre[a] != a:
            padre[a] = padre[padre[a]]
            a = padre[a]
        return a

    def unir(a, b):
        ra, rb = raiz(a), raiz(b)
        if ra != rb:
            padre[max(ra, rb)] = min(ra, rb)

    cajas = {}
    previos = []
    for y in range(mascara.shape[0]):
        actuales = []
        for (x0, x1) in _tramos(mascara[y]):
            etq = len(padre)
            padre[etq] = etq
            cajas[etq] = [x0, y, x1, y + 1]
            # 8-vecinos: alcanza con que los tramos se toquen en diagonal
            for (px0, px1, petq) in previos:
                if px0 <= x1 and x0 <= px1:
                    unir(etq, petq)
            actuales.append((x0, x1, etq))
        previos = actuales

    juntas = {}
    for etq, caja in cajas.items():
        r = raiz(etq)
        if r in juntas:
            c = juntas[r]
            juntas[r] = [min(c[0], caja[0]), min(c[1], caja[1]),
                         max(c[2], caja[2]), max(c[3], caja[3])]
        else:
            juntas[r] = list(caja)
    return [(c[0], c[1] + y0, c[2], c[3] + y0) for c in juntas.values()]


def _agrupar(comps, mascara, densidad, esperado):
    """Convierte los grupos de pixeles en los `esperado` cuadros de la fila.

    Los grupos mas grandes son los cuadros; todo lo chico que sobra son
    esquirlas (el cascaron que salta, una gota) y se le suma al cuadro mas
    cercano, que es de donde salieron. Si hay MENOS grupos que cuadros, es que
    dos dibujos se tocan: ahi si hay que cortar al medio, por la columna con
    menos pixeles entre los dos."""
    if len(comps) < esperado:
        tramos = _ajustar([(c[0], c[2]) for c in comps], densidad, esperado)
        y0 = min(c[1] for c in comps)
        y1 = max(c[3] for c in comps)
        return [_apretar(mascara, x0, y0, x1, y1) for (x0, x1) in sorted(tramos)]

    # Junta de a dos los grupos mas pegados hasta que queden `esperado`. Las
    # esquirlas y las mitades de un cascaron partido estan a cero o dos pixeles
    # de su cuadro, y los cuadros entre si estan a decenas: cerrando siempre por
    # el hueco mas chico, lo que sobrevive son los huecos grandes, que son los
    # bordes de cuadro de verdad. Lo bueno de cerrar por hueco y no por tamano
    # es que no supone que el dibujo mas grande sea el cuadro: un cascaron que
    # se parte al medio deja dos pedazos medianos y ninguno es "el" cuadro.
    cajas = [list(c) for c in sorted(comps, key=lambda c: c[0])]
    while len(cajas) > esperado:
        i = min(range(len(cajas) - 1), key=lambda k: cajas[k + 1][0] - cajas[k][2])
        a, b = cajas[i], cajas[i + 1]
        cajas[i:i + 2] = [[min(a[0], b[0]), min(a[1], b[1]),
                           max(a[2], b[2]), max(a[3], b[3])]]

    # Al sumarle las esquirlas, dos cuadros vecinos pueden terminar pisandose.
    # Se los separa por la columna mas vacia del solape, asi ninguno se lleva
    # pedazos del otro cuando se recorta.
    for i in range(len(cajas) - 1):
        if cajas[i][2] > cajas[i + 1][0]:
            a, b = cajas[i + 1][0], cajas[i][2]
            corte = a + int(np.argmin(densidad[a:b])) if b > a else a
            cajas[i][2] = corte
            cajas[i + 1][0] = corte
    return [tuple(c) for c in cajas]


def _apretar(mascara, x0, y0, x1, y1):
    """Achica el rectangulo hasta donde llega el dibujo de verdad."""
    sub = mascara[y0:y1, x0:x1]
    filas = np.flatnonzero(sub.any(axis=1))
    cols = np.flatnonzero(sub.any(axis=0))
    if filas.size == 0 or cols.size == 0:
        return None
    return (x0 + int(cols[0]), y0 + int(filas[0]),
            x0 + int(cols[-1]) + 1, y0 + int(filas[-1]) + 1)


def _es_rotulo(mascara, arr, caja):
    """True si el recuadro es un cartel de la hoja y no un dibujo.

    Los rotulos que el generador quema en la imagen ("DERECHA", "ETAPA 1") son
    carteles: un rectangulo macizo, blanco sobre negro. Se los reconoce por dos
    cosas juntas, medidas en esta hoja: llenan casi toda su caja (0.95 contra
    0.61-0.69 de un bicho, que siempre deja aire en las esquinas) y no tienen
    color (saturacion 0.06 contra 0.30-0.35). Filtrar por tamano no alcanza: el
    cartel de "DERECHA" es mas alto que los cuadros de la etapa 1.

    El limite de saturacion es el que importa: sin el, un cuadro que llene su
    caja se perderia. Un sprite gris del todo se filtraria mal, pero eso se ve
    de una en la imagen de revision."""
    x0, y0, x1, y1 = caja
    if mascara[y0:y1, x0:x1].mean() < 0.9:
        return False
    px = arr[y0:y1, x0:x1, :3].astype(np.int16)
    maximo, minimo = px.max(axis=2), px.min(axis=2)
    saturacion = np.where(maximo > 0, (maximo - minimo) / np.maximum(maximo, 1), 0).mean()
    return saturacion < 0.15


def _bandas(mascara, cfg):
    """Las franjas horizontales con dibujos, de arriba hacia abajo.

    Una fila cuenta como "con dibujo" recien cuando pasa `ruido` (una fraccion
    del ancho de la hoja): las hojas del generador vienen con basurita suelta
    entre fila y fila, y con `.any()` a secas una sola mota pega dos filas en
    una sola banda. Despues se descartan las bandas mucho mas bajas que la mas
    alta, que son los rotulos de titulo ("ETAPA 1", "FRAME 1")."""
    perfil = mascara.sum(axis=1)
    bandas = _tramos(perfil > mascara.shape[1] * cfg.get('ruido', 0.005),
                     cfg.get('hueco', 8))
    if not bandas:
        raise SystemExit('   la hoja esta vacia (no se encontro ningun dibujo)')
    alto_max = max(b - a for a, b in bandas)
    return [(a, b) for a, b in bandas if (b - a) >= alto_max * cfg.get('minima_banda', 0.4)]


def medir(mascara, cfg, arr):
    """Encuentra las bandas de la hoja y los cuadros de cada una.

    Devuelve banda -> bloque -> [(x, y, w, h)] * cuadros. Los "bloques" son las
    columnas de bloques que a veces trae la hoja: la del companero pone las
    tres etapas una al lado de la otra, y cada banda horizontal las cruza."""
    bloques = cfg.get('bloques', 1)
    cuadros = cfg['cuadros']
    bandas = _bandas(mascara, cfg)

    cortes = cfg.get('cortes', {})
    salida = []
    for i, (y0, y1) in enumerate(bandas):
        densidad = mascara[y0:y1].sum(axis=0)
        if str(i) in cortes:
            # Salida de emergencia para una fila que la medicion no puede
            # resolver sola (la del huevo estallando: las esquirlas de un cuadro
            # caen encima del de al lado, asi que no hay hueco donde cortar).
            # Los numeros se leen de la regla de la imagen de revision.
            bordes = [0] + list(cortes[str(i)]) + [mascara.shape[1]]
            cajas = [_apretar(mascara, a, y0, b, y1) for a, b in zip(bordes, bordes[1:])]
        else:
            comps = [c for c in _componentes(mascara[y0:y1], y0)
                     if not _es_rotulo(mascara, arr, c)]
            if not comps:
                raise SystemExit(f'   la fila de y={y0} quedo sin dibujos despues de '
                                 f'sacar los rotulos')
            cajas = _agrupar(comps, mascara, densidad, bloques * cuadros)

        rects = []
        for (x0, cy0, x1, cy1) in cajas:
            caja = _apretar(mascara, x0, y0, x1, y1)
            rects.append((caja[0], caja[1], caja[2] - caja[0], caja[3] - caja[1]))
        salida.append([rects[i * cuadros:(i + 1) * cuadros] for i in range(bloques)])
    return salida


# ---------------------------------------------------------------------------
#  Fondo: el generador rara vez entrega transparencia
# ---------------------------------------------------------------------------

def _con_mezclas(colores, pasos=8):
    """Los colores de fondo mas todas las mezclas entre dos de ellos.

    El damero de un generador casi nunca viene con dos grises limpios: el borde
    entre cuadro y cuadro trae los tonos intermedios (195 y 243 dejan un 220 en
    el medio). Esos intermedios no aparecen en el marco de 1 px, asi que la
    deteccion no los ve, y sobreviven como una reja de lineas finas encima de
    todo -- que es exactamente lo que se vio con la hoja del baile de Diego.

    Mezclar de a pares y sacar los repetidos alcanza: son unas pocas decenas de
    colores mas, y el dibujo no suele tener un gris justo entre los dos del
    fondo (si lo tiene, aparece agujereado en la imagen de revision)."""
    salida = [c.astype(np.int16) for c in colores]
    for i, a in enumerate(colores):
        for b in colores[i + 1:]:
            for k in range(1, pasos):
                t = k / pasos
                salida.append(np.round(a.astype(np.float64) * (1 - t)
                                       + b.astype(np.float64) * t).astype(np.int16))
    return np.unique(np.array(salida), axis=0)


def quitar_fondo(img, modo, tolerancia=30):
    """Pasa a transparente los colores de fondo (damero gris, gris plano).

    Mira el marco de 1 px de la imagen: lo que este ahi es fondo por
    definicion. Un damero aporta dos grises; un fondo plano, uno solo. Es un
    reemplazo por color, no un relleno desde el borde, asi que si el dibujo
    usa exactamente el mismo gris que el fondo le van a aparecer agujeros:
    para eso esta la imagen de revision, que los muestra enseguida."""
    if modo in (None, False, 'no'):
        return img
    arr = np.array(img)
    if modo == 'auto':
        borde = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
        if (borde[:, 3] < ALFA_MIN).mean() > 0.9:
            return img  # ya viene con transparencia: no hay fondo que sacar
        colores, cuentas = np.unique(borde[:, :3], axis=0, return_counts=True)
        elegidos = _con_mezclas(colores[cuentas >= borde.shape[0] * 0.05])
    else:
        elegidos = np.array([modo], dtype=np.int16)  # un [r, g, b] a mano
    rgb = arr[:, :, :3].astype(np.int16)
    for color in elegidos:
        dist = np.abs(rgb - color).sum(axis=2)
        arr[:, :, 3] = np.where(dist <= tolerancia, 0, arr[:, :, 3])
    return Image.fromarray(arr, 'RGBA')


# ---------------------------------------------------------------------------
#  Empaquetar: la hoja que termina viajando al telefono
# ---------------------------------------------------------------------------

def cuantizar(hoja, colores, dither=True):
    """Baja la paleta sin tocar el alfa.

    El arte trae degrades suaves (miles de colores unicos) pero el alfa es
    binario, asi que conviene aplanar lo transparente a un solo color antes de
    cuantizar: si no, el ruido de RGB que queda "debajo" de los pixeles
    invisibles se come cupos de paleta que nunca se ven. 64 se eligio mirando
    el cuadro mas dificil (el brillo del cascaron del huevo): con 32 el degrade
    ya banda, con 16 se pierden los colores de las manchas.

    El difuminado (dither) sirve para los degrades, pero en pixel art de colores
    planos mete ruido: se ve peor Y pesa mas, porque el PNG comprime por filas
    repetidas. Por eso el manifiesto lo puede apagar con "dither": false."""
    if not colores:
        return hoja
    alfa = hoja.split()[3]
    rgb = hoja.convert('RGB')
    rgb.paste((0, 0, 0), mask=Image.eval(alfa, lambda a: 255 - a))
    plana = rgb.quantize(colors=colores, method=Image.Quantize.MEDIANCUT,
                         dither=Image.Dither.FLOYDSTEINBERG if dither
                         else Image.Dither.NONE).convert('RGBA')
    plana.putalpha(alfa)
    return plana


def empaquetar(img, filas, destino, colores=64, dither=True):
    """Pega los cuadros medidos en una hoja nueva, sin huecos ni rotulos.

    Devuelve las coordenadas NUEVAS (las de la hoja empaquetada), que son las
    que usa el juego."""
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
            hoja.paste(img.crop((x, y, x + w, y + h)), (x_dst, y_dst))
            fila_dst.append((x_dst, y_dst, w, h))
            x_dst += w + PAD
        filas_dst.append(fila_dst)
        y_dst += alto_fila + PAD

    cuantizar(hoja, colores, dither).save(destino, optimize=True, compress_level=9)
    return filas_dst, (ancho, alto)


def informe(cfg, tam, salida):
    crudo = os.path.getsize(os.path.join(FUENTE, cfg['fuente'])) / 1024
    print(f'   {cfg["salida"]}: {tam[0]}x{tam[1]} px, '
          f'{os.path.getsize(salida) / 1024:.0f} kB  (la cruda pesa {crudo:.0f} kB)')


# ---------------------------------------------------------------------------
#  Revision: la imagen que hay que mirar cuando algo sale raro
# ---------------------------------------------------------------------------

def revision(img, bandas, nombres, destino):
    """El original con cada cuadro marcado y numerado.

    Si un recuadro no encierra un cuadro entero, el problema esta en la
    deteccion (ver "hueco" y "minimo_cuadro" en el manifiesto). Si los encierra
    bien pero el nombre de la fila no es el que corresponde, el problema esta
    en el manifiesto y se arregla ahi, sin tocar codigo."""
    os.makedirs(REVISION, exist_ok=True)
    lienzo = Image.new('RGBA', img.size, (24, 24, 32, 255))
    lienzo.alpha_composite(img)
    d = ImageDraw.Draw(lienzo)
    # Regla: si alguna fila hay que cortarla a mano ("cortes" en el manifiesto),
    # los numeros se leen de aca.
    for x in range(0, img.size[0], 100):
        d.line([x, 0, x, 8], fill=(90, 90, 120, 255))
        d.text((x + 2, 0), str(x), fill=(90, 90, 120, 255))
    for i, banda in enumerate(bandas):
        for b, grupo in enumerate(banda):
            for k, (x, y, w, h) in enumerate(grupo):
                d.rectangle([x, y, x + w - 1, y + h - 1], outline=(255, 64, 96, 255), width=2)
                d.text((x + 3, y + 3), str(k + 1), fill=(255, 220, 0, 255))
            etq = nombres[i][b] if i < len(nombres) and b < len(nombres[i]) else f'fila {i + 1}'
            d.text((grupo[0][0] + 3, max(0, grupo[0][1] - 14)), etq, fill=(120, 255, 180, 255))
    lienzo.convert('RGB').save(destino, optimize=True)


def orden_declarado(nombre, cfg, bandas):
    """Chequea que la hoja tenga las filas que dice el manifiesto.

    Es el unico control duro del script: si no cierra, corta sin escribir nada,
    porque una hoja con una fila de mas o de menos significa que los nombres
    (que direccion mira cada fila) estan corridos, y eso saldria como un bicho
    caminando de costado. La imagen de revision ya quedo escrita."""
    nombres = cfg['orden']
    if len(bandas) == len(nombres):
        return nombres
    raise SystemExit(
        f'   se encontraron {len(bandas)} filas de dibujos y el manifiesto describe '
        f'{len(nombres)}.\n'
        f'   Mirar arte-fuente/_revision/{nombre}.png y ajustar "orden" en '
        f'scripts/sprites.json.')


# ---------------------------------------------------------------------------
#  Modos
# ---------------------------------------------------------------------------

def modo_bloques(nombre, cfg, img):
    """Hoja sin grilla y con bloques al lado (el companero: 3 etapas).

    El manifiesto dice como se llama cada fila dentro de cada bloque. Para el
    companero eso importa de verdad: en la hoja cruda los rotulos de los
    laterales estan cruzados (la fila que dice "LEFT" tiene al bicho mirando a
    la derecha) y la etapa 3 vino al reves que las otras dos. El nombre de la
    fila no se puede deducir de la imagen: se mira la revision y se escribe."""
    arr = np.array(img)
    bandas = medir(arr[:, :, 3] > ALFA_MIN, cfg, arr)
    # La revision se dibuja ANTES de validar: si la cuenta de filas no cierra,
    # la imagen es justo lo que hay que mirar para arreglar el manifiesto.
    revision(img, bandas, cfg['orden'], os.path.join(REVISION, f'{nombre}.png'))
    nombres = orden_declarado(nombre, cfg, bandas)

    # Ordena para la hoja final: por bloque (etapa), y dentro del bloque en el
    # orden de DIRS, que es el que espera el motor.
    bloques = cfg.get('bloques', 1)
    filas_src, etiquetas = [], []
    for b in range(bloques):
        for d in DIRS:
            for i, banda in enumerate(bandas):
                if nombres[i][b] == d:
                    filas_src.append(banda[b])
                    etiquetas.append((b, d))
                    break
            else:
                raise SystemExit(f'   el bloque {b + 1} no tiene fila "{d}" en el manifiesto')

    salida = os.path.join(DEST, cfg['salida'])
    filas_dst, tam = empaquetar(img, filas_src, salida, cfg.get('colores', 64),
                                cfg.get('dither', True))
    informe(cfg, tam, salida)

    etapas = []
    for b in range(bloques):
        etapa = []
        for d in DIRS:
            fila = filas_dst[etiquetas.index((b, d))]
            etapa.append({'y': fila[0][1], 'w': fila[0][2], 'h': fila[0][3],
                          'x': [f[0] for f in fila]})
        etapas.append(etapa)
    return etapas


def modo_tiras(nombre, cfg, img):
    """Hoja sin grilla de la que solo se usan algunas filas (el huevo).

    Igual que modo_bloques pero sin bloques: cada banda es una tira con nombre
    propio ("idle", "hatch"). Las filas que el manifiesto deja en null se
    descartan: la hoja del huevo trae cuatro y el juego dibuja dos."""
    arr = np.array(img)
    bandas = medir(arr[:, :, 3] > ALFA_MIN, cfg, arr)
    revision(img, bandas, [[n or '(sin usar)'] for n in cfg['orden']],
             os.path.join(REVISION, f'{nombre}.png'))
    nombres = orden_declarado(nombre, cfg, bandas)

    usadas = [(n, banda[0]) for n, banda in zip(nombres, bandas) if n]
    salida = os.path.join(DEST, cfg['salida'])
    filas_dst, tam = empaquetar(img, [f for _, f in usadas], salida,
                                cfg.get('colores', 64), cfg.get('dither', True))
    informe(cfg, tam, salida)

    return {n: [{'x': f[0], 'y': f[1], 'w': f[2], 'h': f[3]} for f in fila]
            for (n, _), fila in zip(usadas, filas_dst)}


def _armar_grilla(img, cfg, usadas, cols, filas, cw, ch):
    """Arma la grilla del juego a partir de las filas elegidas de una hoja cruda.

    Es para las hojas que vienen con mas filas de las que el juego dibuja y con
    los rotulos al costado: la de Merli trae nueve poses y una columna de texto
    ("NEW: IDLE LOOKING LEFT"), y el juego usa cuatro. "bandas_usadas" dice
    cuales, EN EL ORDEN DEL JUEGO (abajo, izquierda, derecha, arriba), contando
    las filas de arriba hacia abajo desde 0 como salen en la imagen de revision.

    No se recorta la fila entera y se reescala: se recorta CUADRO POR CUADRO, con
    la misma medicion que usan los otros modos, y cada uno se pega en su celda.
    Asi el texto del costado no entra ni como manchita suelta, que es lo que
    pasaba recortando la fila derecha. Todos los cuadros se achican con la MISMA
    escala (la que hace entrar al mas grande) y se apoyan en el piso de su celda,
    para que el bicho no cambie de tamano ni flote entre pose y pose."""
    arr = np.array(img)
    mascara = arr[:, :, 3] > ALFA_MIN
    bandas = _bandas(mascara, cfg)
    if max(usadas) >= len(bandas):
        raise SystemExit(f'   la hoja tiene {len(bandas)} filas y el manifiesto pide la '
                         f'{max(usadas) + 1} ("bandas_usadas")')

    por_fila = []
    for i in usadas:
        y0, y1 = bandas[i]
        comps = _componentes(mascara[y0:y1], y0)
        mayor = max((c[2] - c[0]) * (c[3] - c[1]) for c in comps)
        # Las letras del rotulo del costado son grupos chiquitos: se van por area.
        comps = [c for c in comps if (c[2] - c[0]) * (c[3] - c[1]) >= mayor * 0.2]
        por_fila.append(_agrupar(comps, mascara, mascara[y0:y1].sum(axis=0), cols))

    ancho_max = max(c[2] - c[0] for fila in por_fila for c in fila)
    alto_max = max(c[3] - c[1] for fila in por_fila for c in fila)
    escala = min(cw / ancho_max, ch / alto_max)
    print(f'   {len(usadas)} filas x {cols} cuadros, escala {escala:.2f}')

    destino = Image.new('RGBA', (cols * cw, filas * ch), (0, 0, 0, 0))
    for fila_dst, fila in enumerate(por_fila):
        for col, (x0, y0, x1, y1) in enumerate(fila):
            ancho = max(1, round((x1 - x0) * escala))
            alto = max(1, round((y1 - y0) * escala))
            cuadro = img.crop((x0, y0, x1, y1)).resize((ancho, alto), Image.Resampling.BOX)
            destino.paste(cuadro, (col * cw + (cw - ancho) // 2,
                                   fila_dst * ch + (ch - alto)))

    # Al bajar de escala promediando, el borde queda con alfa a medias; se corta
    # duro para que el pixel art vuelva a tener el filo que tenia.
    dst = np.array(destino)
    dst[:, :, 3] = np.where(dst[:, :, 3] >= 115, 255, 0)
    return Image.fromarray(dst, 'RGBA')


def _espejar_filas(img, cfg):
    """Da vuelta horizontalmente las filas que el manifiesto pida ("espejar").

    Es para cuando el generador manda una pose mirando para el lado equivocado.
    Paso con Diego: la hoja trae las DOS filas de perfil mirando a la izquierda,
    asi que su fila "derecha" lo dejaba mirando al reves justo cuando Kath se le
    paraba a la derecha. No es un problema de orden (cambiarle el nombre a la
    fila no la da vuelta) y arreglado a mano en el PNG se pierde en cuanto
    alguien vuelva a correr el script, que es lo que este archivo existe para
    evitar.

    Se espeja CUADRO POR CUADRO y no la banda entera: dar vuelta la fila de una
    tambien invierte el orden de los cuadros y la caminata sale para atras."""
    cuales = cfg.get('espejar')
    if not cuales:
        return img
    nombres = cfg.get('orden', DIRS)
    faltan = [c for c in cuales if c not in nombres]
    if faltan:
        raise SystemExit(f'   "espejar" nombra filas que no existen: {", ".join(faltan)}.\n'
                         f'   Las que hay: {", ".join(str(n) for n in nombres)}')

    cols = cfg['columnas']
    cw, ch = cfg['celda']
    out = img.copy()
    for c in cuales:
        f = nombres.index(c)
        for col in range(cols):
            caja = (col * cw, f * ch, (col + 1) * cw, (f + 1) * ch)
            out.paste(img.crop(caja).transpose(Image.FLIP_LEFT_RIGHT), caja)
    print(f'   espejadas las filas: {", ".join(cuales)}')
    return out


def _achicar(img, destino_px):
    """Baja una hoja grande a la grilla del juego sin ensuciar los bordes.

    El detalle es que hay que promediar el color MULTIPLICADO POR EL ALFA. Un
    pixel transparente igual tiene un RGB abajo (el gris del damero que se acaba
    de borrar), y promediando a secas ese gris entra en la mezcla y deja un halo
    claro alrededor de cada dibujo. Una hoja de 1792 px que baja a 96 promedia
    ~19 px por pixel destino, asi que el halo no es sutil: se come el contorno.

    Con el alfa premultiplicado, lo transparente pesa cero. Despues se
    des-premultiplica y se corta el alfa duro, que es lo que le devuelve el filo
    al pixel art."""
    arr = np.array(img).astype(np.float64)
    alfa = arr[:, :, 3:4] / 255.0
    premul = np.concatenate([arr[:, :, :3] * alfa, arr[:, :, 3:4]], axis=2)
    chica = np.array(Image.fromarray(premul.astype(np.uint8), 'RGBA')
                     .resize(destino_px, Image.Resampling.BOX)).astype(np.float64)

    a = chica[:, :, 3:4] / 255.0
    rgb = np.divide(chica[:, :, :3], np.where(a > 0, a, 1))
    salida = np.zeros(chica.shape, dtype=np.uint8)
    salida[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    salida[:, :, 3] = np.where(chica[:, :, 3] >= 115, 255, 0)
    return Image.fromarray(salida, 'RGBA')


def modo_grilla(nombre, cfg, img):
    """Hoja en grilla pareja (Kath, el baile, Merli, Diego).

    Aca no hay nada que medir: el motor dibuja columna*ancho, fila*alto. Lo que
    hace falta es que la hoja QUEDE en la grilla que el juego espera, asi que
    si viene mas grande se baja de escala promediando el area de cada pixel
    destino (en vez de muestrear el centro) y se corta el alfa duro en 0.45:
    eso es lo que devuelve el borde nitido del pixel art."""
    cols, filas = cfg['columnas'], cfg['filas']
    cw, ch = cfg['celda']
    destino_px = (cols * cw, filas * ch)

    # La hoja cruda puede traer filas que el juego no dibuja (la de Merli
    # tiene nueve y se usan cuatro). "bandas_usadas" dice cuales quedarse,
    # contando desde 0 de arriba hacia abajo; los numeros salen de mirar la
    # imagen de revision de la corrida anterior.
    usadas = cfg.get('bandas_usadas')
    if usadas:
        img = _armar_grilla(img, cfg, usadas, cols, filas, cw, ch)

    if img.size != destino_px:
        print(f'   {img.size[0]}x{img.size[1]} -> {destino_px[0]}x{destino_px[1]} (reescalada)')
        img = _achicar(img, destino_px)

    # Antes de guardar y antes de la imagen de revision: lo que se mira en la
    # revision tiene que ser lo mismo que va a dibujar el juego.
    img = _espejar_filas(img, cfg)

    salida = os.path.join(DEST, cfg['salida'])
    cuantizar(img, cfg.get('colores'), cfg.get('dither', True)).save(
        salida, optimize=True, compress_level=9)
    informe(cfg, destino_px, salida)

    rejilla = [[[(c * cw, f * ch, cw, ch) for c in range(cols)]] for f in range(filas)]
    revision(img, rejilla, [[n] for n in cfg.get('orden', DIRS)],
             os.path.join(REVISION, f'{nombre}.png'))
    return {'w': cw, 'h': ch, 'cuadros': cols, 'filas': filas}


MODOS = {'bloques': modo_bloques, 'tiras': modo_tiras, 'grilla': modo_grilla}


# ---------------------------------------------------------------------------
#  Plantillas: para pedirle al generador una hoja ya acomodada
# ---------------------------------------------------------------------------

def plantilla(nombre, cfg, coords):
    """Dibuja la cuadricula que el juego espera para este personaje.

    Sirve para pedir una hoja nueva ya acomodada (o dibujarla a mano encima):
    cada casilla va rotulada con la fila y el numero de cuadro. La hoja que
    vuelva se procesa igual que cualquier otra: la plantilla es una guia, no un
    requisito, porque el script mide igual."""
    os.makedirs(PLANTILLAS, exist_ok=True)
    if cfg['modo'] == 'grilla':
        cols, filas = cfg['columnas'], cfg['filas']
        cw, ch = cfg['celda']
        nombres = cfg.get('orden', DIRS)
    elif cfg['modo'] == 'bloques':
        # Una plantilla por etapa saldria enorme: se dibuja la etapa mas grande.
        etapa = max(coords, key=lambda e: max(f['h'] for f in e))
        cols, filas = len(etapa[0]['x']), len(etapa)
        cw = max(f['w'] for f in etapa) + 8
        ch = max(f['h'] for f in etapa) + 8
        nombres = DIRS
    else:
        tiras = list(coords.items())
        cols = max(len(v) for _, v in tiras)
        filas = len(tiras)
        cw = max(f['w'] for _, v in tiras for f in v) + 8
        ch = max(f['h'] for _, v in tiras for f in v) + 8
        nombres = [k for k, _ in tiras]

    esc = max(1, min(6, int(360 / max(cw, ch))))
    alto_fila = ch * esc + 18
    img = Image.new('RGB', (cols * cw * esc, filas * alto_fila), (18, 18, 24))
    d = ImageDraw.Draw(img)
    for f in range(filas):
        y = f * alto_fila + 18
        etq = nombres[f] if f < len(nombres) else f'fila {f + 1}'
        d.text((2, y - 15), f'{etq}   ({cw} x {ch} px por cuadro)', fill=(120, 255, 180))
        for c in range(cols):
            x = c * cw * esc
            d.rectangle([x, y, x + cw * esc - 1, y + ch * esc - 1], outline=(90, 90, 120))
            d.text((x + 4, y + 4), str(c + 1), fill=(255, 220, 0))
    destino = os.path.join(PLANTILLAS, f'{nombre}-plantilla.png')
    img.save(destino, optimize=True)
    print(f'   plantilla -> arte-fuente/_plantillas/{nombre}-plantilla.png  '
          f'({cols} cuadros x {filas} filas)')


# ---------------------------------------------------------------------------
#  Salida
# ---------------------------------------------------------------------------

def escribir(coords):
    """Guarda las coordenadas. Lo lee src/config/recortes.js, que es el
    archivo a mano que se las pasa al motor con nombres y comentarios."""
    with open(SALIDA, 'w', encoding='utf-8') as f:
        json.dump(coords, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print('\nCoordenadas -> src/config/recortes.json')


def leer_previas():
    """Lo que ya estaba guardado, para no borrar a los personajes que esta
    corrida no toco (correr el script con un nombre solo es lo normal)."""
    if not os.path.exists(SALIDA):
        return {}
    with open(SALIDA, encoding='utf-8') as f:
        return json.load(f)


def main():
    ap = argparse.ArgumentParser(description='Preprocesador de hojas de sprites.')
    ap.add_argument('personajes', nargs='*', help='cuales procesar (por defecto, todos)')
    ap.add_argument('--plantillas', action='store_true',
                    help='dibuja las plantillas de referencia y sale')
    args = ap.parse_args()

    with open(MANIFIESTO, encoding='utf-8') as f:
        manifiesto = json.load(f)
    manifiesto.pop('_ayuda', None)

    pedidos = args.personajes or list(manifiesto)
    desconocidos = [p for p in pedidos if p not in manifiesto]
    if desconocidos:
        sys.exit(f'No conozco: {", ".join(desconocidos)}.\n'
                 f'Los que hay: {", ".join(manifiesto)}')

    coords = leer_previas()
    for nombre in pedidos:
        cfg = manifiesto[nombre]
        ruta = os.path.join(FUENTE, cfg['fuente'])
        print(f'\n== {nombre}')
        if not os.path.exists(ruta):
            if cfg['modo'] == 'grilla':
                # La grilla no se mide: el tamano de celda lo fija el manifiesto,
                # asi que se puede publicar la coordenada sin la hoja cruda.
                coords[cfg['coords']] = {'w': cfg['celda'][0], 'h': cfg['celda'][1],
                                         'cuadros': cfg['columnas'], 'filas': cfg['filas']}
                print(f'   sin arte-fuente/{cfg["fuente"]}: se deja la hoja que ya '
                      f'esta en src/assets/')
            else:
                print(f'   sin arte-fuente/{cfg["fuente"]}: se deja como estaba')
            continue
        img = quitar_fondo(Image.open(ruta).convert('RGBA'), cfg.get('fondo'),
                           cfg.get('tolerancia', 30))
        coords[cfg['coords']] = MODOS[cfg['modo']](nombre, cfg, img)
        print(f'   revision -> arte-fuente/_revision/{nombre}.png')

    if args.plantillas:
        for nombre in pedidos:
            cfg = manifiesto[nombre]
            if cfg['coords'] in coords:
                plantilla(nombre, cfg, coords[cfg['coords']])
        return

    escribir(coords)
    print('Listo. Mirar arte-fuente/_revision/ y despues probar con `npm run dev`.')


if __name__ == '__main__':
    main()
