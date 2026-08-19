#!/usr/bin/env python3
"""
Arma los tres iconos de la app a partir de la cara de Kath, recortada de su
propia hoja de sprites. No hay una imagen fuente aparte que se pueda
desincronizar: si algun dia cambia kath_hoja.png, se vuelve a correr esto y
los iconos siguen siendo ella.

    Uso:
      python scripts/icono.py            # o: npm run icono
      python scripts/icono.py --revision # ademas deja la prueba del recorte

    Necesita:  pip install pillow

Escribe en public/:

    icono-192.png       192x192   android comun, apple-touch-icon y la pestana
    icono-512.png       512x512   splash de instalacion
    icono-maskable.png  512x512   Android lo recorta a circulo o squircle
    portada.jpg         1200x630  la vista previa del link (WhatsApp, Instagram)

La portada sale de arte-fuente/portada.* si existe. 1200x630 no es un capricho:
es la medida que esperan WhatsApp, Instagram y Twitter, y la que declaran los
meta og:image:width/height de index.html. Si no coinciden, algunos clientes
recortan la imagen por su cuenta.

Tres cosas que hacen a que se vea bien y no son obvias:

  1. El escalado va con NEAREST y a multiplo entero. Cualquier suavizado, o un
     factor con coma, le come el contorno negro de 1 px al sprite: a 24x32 ese
     contorno ES el dibujo. Es el mismo problema que ya mordio con las hojas
     del companero (ver docs/deuda-tecnica.md).

  2. El maskable NO es el mismo dibujo mas chico y ya. Android recorta hasta un
     circulo inscripto, asi que todo lo que importa tiene que entrar en el 80%
     central; el 20% de afuera es relleno que se puede perder entero. Por eso
     va con su propio tamano de cara y sin el aro, que quedaria cortado.

  3. La cara se recorta MIDIENDO la hoja, no con numeros escritos aca: se busca
     la caja de lo que no es transparente en las filas del pelo y la cara. Con
     coordenadas a mano, cambiar el sprite y no acordarse de esto deja un icono
     con media frente.

Si en arte-fuente/ hay un icono propio (icono.ico, icono.png o icono.jpg), se
usa ESE en vez de la cara de Kath, y ya no se le dibuja fondo ni aro: se asume
que es un icono terminado. El maskable sigue llevando fondo, porque ahi la
imagen tiene que achicarse para sobrevivir al recorte de Android y algo tiene
que ocupar el borde.

De un .ico se toma la medida mas grande que traiga adentro. Un .ico de escritorio
suele ser de 32 o 48 px: alcanza y sobra para la pestana del navegador, pero
estirado a 512 se ve pixelado. El script avisa cuando la fuente no llega.
"""

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Falta Pillow.  pip install pillow")

RAIZ = Path(__file__).resolve().parent.parent
HOJA = RAIZ / "src" / "assets" / "kath_hoja.png"
SALIDA = RAIZ / "public"

CUADRO_W, CUADRO_H = 24, 32
# La cabeza de Kath en el cuadro de frente: del techo del pelo hasta donde
# arranca el vestido rojo. La fila 16 ya es el hombro.
CABEZA_Y0, CABEZA_Y1 = 2, 16

# Paleta del juego (src/App.css)
FONDO_BORDE = "#c2185b"      # --rosa-osc
FONDO = "#f06292"            # --rosa
FONDO_LUZ = "#f7a8c0"
ARO = "#fdf6ec"              # --crema


FUENTES = ["icono.ico", "icono.png", "icono.jpg"]


def icono_propio():
    """El icono de arte-fuente/, si hay. Devuelve (imagen cuadrada, medida real)."""
    for nombre in FUENTES:
        ruta = RAIZ / "arte-fuente" / nombre
        if not ruta.exists():
            continue
        im = Image.open(ruta)
        # Un .ico es un contenedor con varias medidas adentro: se toma la mayor.
        if getattr(im, "ico", None):
            im.size = max(im.ico.sizes(), key=lambda s: s[0] * s[1])
            im.load()
        im = im.convert("RGBA")
        real = max(im.width, im.height)
        caja = im.getbbox()
        if caja:
            im = im.crop(caja)
        lado = max(im.width, im.height)
        lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
        lienzo.paste(im, ((lado - im.width) // 2, (lado - im.height) // 2))
        return lienzo, ruta, real
    return None, None, 0


def cara():
    """El recorte cuadrado de la cabeza, medido de la hoja y no escrito aca."""
    hoja = Image.open(HOJA).convert("RGBA")
    cuadro = hoja.crop((0, 0, CUADRO_W, CUADRO_H))

    banda = cuadro.crop((0, CABEZA_Y0, CUADRO_W, CABEZA_Y1))
    caja = banda.getbbox()
    if not caja:
        sys.exit("La hoja no tiene nada dibujado en las filas de la cabeza")
    x0, y0, x1, y1 = caja
    cabeza = banda.crop(caja)

    # A cuadrado, centrada, con el sobrante repartido. Se hace ANTES de
    # agrandar para que el margen tambien caiga en pixeles enteros.
    lado = max(cabeza.width, cabeza.height)
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    lienzo.paste(cabeza, ((lado - cabeza.width) // 2, (lado - cabeza.height) // 2))
    return lienzo, (x0, CABEZA_Y0 + y0, x1, CABEZA_Y0 + y1)


def agrandar(im, destino):
    """NEAREST y factor entero: el contorno de 1 px del sprite no se negocia.

    Si no entra un factor entero (una fuente de 48 px para un destino de 512),
    se usa el mayor que quepa y despues se completa con LANCZOS. Estirar pixel
    art con coma es lo que le come el contorno; hacerlo en dos pasos deja el
    grueso del agrandado en multiplos limpios."""
    factor = max(1, destino // im.width)
    grande = im.resize((im.width * factor, im.height * factor), Image.NEAREST)
    if grande.width < destino * 0.9:
        grande = grande.resize((destino, destino), Image.LANCZOS)
    return grande


def a_sangre(im):
    """True si el dibujo llega a los cuatro bordes.

    Decide como se arma el maskable. Una imagen a sangre puede ir a pantalla
    completa: lo que Android le recorta de las esquinas es fondo, no dibujo. Una
    con transparencia alrededor (la cara de Kath recortada del sprite) tiene que
    achicarse y apoyarse en un fondo, o el recorte se le come el pelo."""
    a = im.getchannel("A")
    w, h = im.size
    borde = ([a.getpixel((x, 0)) for x in range(w)]
             + [a.getpixel((x, h - 1)) for x in range(w)]
             + [a.getpixel((0, y)) for y in range(h)]
             + [a.getpixel((w - 1, y)) for y in range(h)])
    return min(borde) > 200


def tono(hexa):
    hexa = hexa.lstrip("#")
    return tuple(int(hexa[i:i + 2], 16) for i in (0, 2, 4))


def fondo(lado, con_aro):
    im = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, lado, lado], fill=FONDO_BORDE)
    m = lado // 22
    # Degrade de arriba a abajo, fila por fila. El primer intento fueron dos
    # bandas planas (clara arriba, normal abajo) y a 512 px la union se ve como
    # una linea recta en el medio del icono: se lee como un error, no como luz.
    luz = tono(FONDO_LUZ)
    base = tono(FONDO)
    alto = lado - 2 * m
    for i in range(alto):
        t = i / max(1, alto - 1)
        color = tuple(round(luz[c] + (base[c] - luz[c]) * t) for c in range(3))
        d.rectangle([m, m + i, lado - m, m + i], fill=color)
    if con_aro:
        r = int(lado * 0.36)
        c = lado // 2
        d.ellipse([c - r, c - r, c + r, c + r], fill=ARO)
    return im


COLORES = 64


def guardar(im, ruta):
    """Cuantiza a COLORES antes de escribir. Un .ico exportado de un editor
    trae unos 3000 colores porque el borde viene suavizado, y eso hace que el
    PNG pese cinco veces mas sin que se note ninguna diferencia: son dibujos de
    pocos colores planos. Mismo criterio y mismo numero que ya se uso con las
    hojas del huevo y el companero (ver docs/deuda-tecnica.md).

    FASTOCTREE y no el metodo por defecto: es el unico de Pillow que cuantiza
    RGBA sin tirar el canal alfa, y sin alfa el maskable pierde el recorte."""
    im.convert("RGBA").quantize(colors=COLORES, method=Image.FASTOCTREE).save(
        ruta, optimize=True)


def armar(lado, alto_cara, con_aro, ruta, propio=None):
    """`propio` a pantalla completa no lleva fondo: ya es un icono terminado."""
    if propio is not None and alto_cara >= 1:
        im = agrandar(propio, lado).resize((lado, lado), Image.LANCZOS)             if propio.width * (lado // max(1, propio.width)) != lado else agrandar(propio, lado)
        im = im.convert("RGBA")
    else:
        im = fondo(lado, con_aro)
        dibujo = propio if propio is not None else cara()[0]
        grande = agrandar(dibujo, int(lado * alto_cara))
        im.paste(grande, ((lado - grande.width) // 2, (lado - grande.height) // 2), grande)
    guardar(im, ruta)
    print(f"  {ruta.name:<20} {lado}x{lado}  ({ruta.stat().st_size / 1024:.1f} kB)")


def revision():
    """Deja el maskable recortado al circulo, que es como lo ve Android.

    Va en una funcion y no al final de main() porque el camino del icono propio
    corta antes con un return, y la primera version dejaba la revision del
    dibujo anterior: se mira una imagen que no es la que se acaba de generar,
    que es peor que no mirar ninguna."""
    if "--revision" not in sys.argv:
        return
    rev = RAIZ / "arte-fuente" / "_revision"
    rev.mkdir(parents=True, exist_ok=True)
    ruta = rev / "icono.png"
    base = Image.open(SALIDA / "icono-maskable.png").convert("RGBA")
    mascara = Image.new("L", base.size, 0)
    ImageDraw.Draw(mascara).ellipse([0, 0, base.size[0], base.size[1]], fill=255)
    base.putalpha(mascara)
    base.save(ruta)
    print(f"  {ruta.relative_to(RAIZ)}  (el maskable recortado, como lo ve Android)")


PORTADA = ["portada.png", "portada.jpg", "portada.jpeg", "portada.jfif"]
PORTADA_MEDIDA = (1200, 630)


def portada():
    """La vista previa del link, recortada al 1.91:1 que pide Open Graph."""
    for nombre in PORTADA:
        ruta = RAIZ / "arte-fuente" / nombre
        if not ruta.exists():
            continue
        im = Image.open(ruta).convert("RGB")
        ancho, alto = PORTADA_MEDIDA
        # Se recorta al centro en vez de deformar: la cara de Kath esta en el
        # medio, y estirarla para que entre es peor que perder un poco de borde.
        r_orig, r_dest = im.width / im.height, ancho / alto
        if r_orig > r_dest:
            w = int(im.height * r_dest)
            caja = ((im.width - w) // 2, 0, (im.width + w) // 2, im.height)
        else:
            h = int(im.width / r_dest)
            caja = (0, (im.height - h) // 2, im.width, (im.height + h) // 2)
        salida = SALIDA / "portada.jpg"
        im.crop(caja).resize(PORTADA_MEDIDA, Image.LANCZOS).save(
            salida, quality=88, optimize=True)
        print(f"fuente: {ruta.relative_to(RAIZ)}  ({im.width}x{im.height} de verdad)")
        print(f"  {salida.name:<20} {ancho}x{alto}  "
              f"({salida.stat().st_size / 1024:.1f} kB)")
        return
    print("sin arte-fuente/portada.*: la vista previa del link queda como estaba")


def main():
    if not HOJA.exists():
        sys.exit(f"No esta la hoja de Kath: {HOJA}")
    SALIDA.mkdir(parents=True, exist_ok=True)

    portada()

    propio, ruta, real = icono_propio()
    if propio is not None:
        print(f"fuente: {ruta.relative_to(RAIZ)}  ({real}x{real} de verdad)")
        if real < 512:
            print(f"  OJO: {real} px no llega a 512. Para la pestana y el celular")
            print("       alcanza, pero el splash de instalacion se va a ver blando.")
        armar(512, 1, False, SALIDA / "icono-512.png", propio)
        armar(192, 1, False, SALIDA / "icono-192.png", propio)
        if a_sangre(propio):
            print("  la fuente llega a los bordes: el maskable va a pantalla completa")
            armar(512, 1, False, SALIDA / "icono-maskable.png", propio)
        else:
            print("  la fuente tiene transparencia al borde: el maskable se achica")
            armar(512, 0.62, False, SALIDA / "icono-maskable.png", propio)
        revision()
        return

    _, caja = cara()
    print(f"fuente: la cara de Kath, medida en la hoja "
          f"(x{caja[0]}-{caja[2]}  y{caja[1]}-{caja[3]})")
    armar(512, 0.62, True, SALIDA / "icono-512.png")
    armar(192, 0.62, True, SALIDA / "icono-192.png")
    # El maskable pierde el 20% de afuera y el aro con el: cara mas chica, sin aro.
    armar(512, 0.58, False, SALIDA / "icono-maskable.png")
    revision()




if __name__ == "__main__":
    main()
