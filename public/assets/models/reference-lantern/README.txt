Farol de campana y dos linternas · Live Dance 1.27

Modelo reconstruido en Blender a partir de images.jpg, referencia aportada por
el usuario. La fotografía no se redistribuye. No se convirtió una imagen plana
en un cartel: la campana, cadenas, linternas, piedra y madera tienen volumen.

Editable: data/reference-lantern.blend (incluye cámara y luces de revisión).
Exportación seleccionada: lantern.glb (sin suelo/cámara/luces de estudio).
Reproducción: python scripts/prepare-reference-lantern.py
             E:/blender/blender.exe -b --python scripts/model-reference-lantern.py

Texturas: XSSheep / Pixel Perfection, colaboradores VoxeLibre.
Atlas adaptado: recortes, tonos de roble y oro, bordes de atlas, máscara emisiva.
Modelo y atlas adaptado: Creative Commons Attribution-ShareAlike 4.0.
https://creativecommons.org/licenses/by-sa/4.0/
Fuente fijada: VoxeLibre 4492ce6ff8d856daa4567abe2ea689f4e7a39842.
Créditos detallados y avisos: ../../downloaded/village/LEGAL.md.
Procedencia y huellas: provenance.json y ../../downloaded/landscape/provenance.json.

En Three.js/Electron, los seis faroles se fusionan en una malla. Las ventanas
son emisivas. Seis manchas cálidas proyectadas se activan durante la noche;
dos luces puntuales locales iluminan geometría cercana, sin sombras dinámicas.
La transición usa el mismo reloj día/noche del escenario. La campana es decorativa.
