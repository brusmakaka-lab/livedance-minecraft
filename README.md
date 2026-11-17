# LiveDance Minecraft · Dance Party · 1.27.0

Escenario 3D interactivo con skins Minecraft, participantes, regalos, bailes y controles para una emisión local.

Respaldo del código vigente localizado el **17 de noviembre de 2026**. Estas tres líneas tienen implementaciones diferentes y se conservan por separado. Las carpetas de origen no tenían historial Git: este repositorio inicia un historial del respaldo, sin inventar commits de desarrollo anteriores.

## Funciones y contenido

- Estudio y captura separados; comunicación en tiempo real mediante Socket.IO.
- Participantes, ingresos, filas, cámaras, skins, bailes, regalos, rankings y efectos ambientales.
- Mundo con modelos, materiales y texturas locales, junto con licencias y procedencia de terceros.
- Biblioteca musical local y captura Electron; código de recepción TikTok/Euler.
- Clips de baile procesados, seis FBX originales aportados al proyecto, catálogos de importación y fuentes Blender de la linterna y el vehículo.

**Tecnologías:** Node.js · Express 5 · Socket.IO · Three.js local · Electron · Playwright. Las versiones exactas están fijadas en los lockfiles. No hay que usar un monorepo ni copiar `node_modules` de otra aplicación para restaurar este proyecto.

## Instalar y ejecutar

Entorno verificado: Node.js 24.13.1, npm 11.8.0 y Microsoft Edge en Windows. Las dos variantes recientes requieren Node >=22.10.0. Configurar valores propios a partir de `.env.example` cuando exista; para una primera prueba mantener deshabilitada la conexión TikTok y no cargar claves reales.

```bash
npm ci
npm test
npm start
```

El puerto de ejemplo es 3000. Abrir `/estudio` para los controles y `/captura` para la escena. `npm run capture` abre la captura Electron. Para ensayos simulados, usar `DEMO_MODE=1` con `TIKTOK_ENABLED=0`; volver a desactivar demo antes de emitir.

`HOST`, `PORT`, `TIKTOK_ENABLED`, `TIKTOK_USERNAME`, `DEMO_MODE`, `MAX_AVATARS`, `JOIN_TRIGGER`, `IDLE_SECONDS` y `EULER_SIGN_API_KEY`/`SIGN_API_KEY`. `.env.example` describe las variables sin incluir las claves privadas.

La instalación normal de Electron puede descargar su ejecutable. En la verificación automatizada se usó `npm ci --ignore-scripts` y Edge, por lo que ese ejecutable no es parte del respaldo ni de la prueba de navegador. Blender y los importadores de animación son herramientas opcionales para reeditar recursos, no requisitos para servir la escena existente.

## Validación

Suite de **167 pruebas**; más un ensayo en servidor y navegador aislados. Los tests comprueban lógica, eventos, bailes, integridad de recursos y servicios con datos de prueba. El ensayo de navegador añade un participante, activa una Rosa y reinicia la escena desde los controles reales. No es una prueba LIVE ni un benchmark de FPS. La captura Electron y todos los scripts históricos de grabación no se ejecutaron.

Ver [VALIDACION-GITHUB.md](VALIDACION-GITHUB.md) para el alcance. Los recuentos viejos de documentos históricos no sustituyen la verificación actual.

## Preparación de este respaldo

El README original tenía 38.522 bytes nulos de 41.181 y no era recuperable como documento completo. Este README se reconstruyó a partir del código, scripts, tests y archivos de procedencia. La copia antigua de Downloads sólo tiene cinco archivos comparables, todos diferentes: no reemplaza esta fuente. El README dañado permanece en el proyecto original; no se subió como documentación válida.

No se incluye música personal, `.env` privado, claves DPAPI, sesiones LIVE, perfiles de captura/navegador, logs ni grabaciones de pruebas. El catálogo público Roblox y sus dependencias estáticas seleccionadas son fixtures versionados; el resto de su caché de operación queda fuera. Los originales de esos datos siguen en su equipo y requieren un respaldo privado antes de limpiar carpetas.

Los scripts históricos de diagnóstico/mantenimiento pueden mencionar rutas de la máquina original o un servicio activo. No ejecutarlos indiscriminadamente durante una emisión. La instalación/arranque anterior y los tests locales son el punto de entrada documentado para una copia nueva.

## Recursos y atribuciones

Se conservan los archivos de procedencia, créditos y licencias existentes junto a los recursos de terceros. Los modelos/avatares públicos conservan su autoría y los términos de su fuente; este respaldo no los presenta como creaciones propias ni cambia su licencia. Las escenas no son productos oficiales de Roblox, Minecraft ni TikTok. Los clips aportados al proyecto conservan la procedencia indicada en su documentación.

## Otras líneas

| Repositorio | Línea |
| --- | --- |
| [livedance-roblox](https://github.com/brusmakaka-lab/livedance-roblox) | Pasarela Roblox 0.15.13 |
| [livedance-minecraft](https://github.com/brusmakaka-lab/livedance-minecraft) | Dance Party Minecraft 1.27.0 |
| [livedance-classic](https://github.com/brusmakaka-lab/livedance-classic) | RowShow Polish 0.6.14.1 |


Las versiones clásicas anteriores, SkinLab y otros laboratorios de E:/LiveDance necesitan una comparación independiente; este repositorio no los reemplaza ni autoriza borrarlos.
