# Verificación del respaldo · 2026-11-17

## Fuente

Proyecto LiveDance Minecraft · Dance Party, versión 1.27.0. Copia actual de los archivos seleccionados, sin historial Git previo. El README original tenía 38.522 bytes nulos de 41.181 y no era recuperable como documento completo. Este README se reconstruyó a partir del código, scripts, tests y archivos de procedencia. La copia antigua de Downloads sólo tiene cinco archivos comparables, todos diferentes: no reemplaza esta fuente. El README dañado permanece en el proyecto original; no se subió como documentación válida.

## Controles previos a publicar

Instalación desde lockfile con `npm ci --ignore-scripts`, suite de 167 pruebas y ensayo local en Edge con solicitudes externas bloqueadas. En el clásico también se compila TypeScript/Vite y se instala el lockfile del conector. Los temporales de estos procesos de verificación se crean en la copia de trabajo de E:, sin cambiar TEMP/TMP globales. Esto permite conservar la reserva de disco de 5 GiB exigida por el escritor de caché Roblox.

Los tests comprueban lógica, eventos, bailes, integridad de recursos y servicios con datos de prueba. El ensayo de navegador añade un participante, activa una Rosa y reinicia la escena desde los controles reales. No es una prueba LIVE ni un benchmark de FPS. La captura Electron y todos los scripts históricos de grabación no se ejecutaron.

## Archivos privados y reproducibilidad

Se seleccionan código, lockfiles, recursos estáticos, licencias y fuentes de arte requeridas por los tests. Se excluyen claves, configuración privada, sesiones, perfiles, música personal, dependencias y derivados. Algunos informes históricos y sus capturas no se incluyen. Se conserva el estado y los hashes de los archivos originales en el inventario privado del propietario.

## Comprobación remota exigida

Antes de publicar se revisa con Gitleaks la selección y cada commit, comprobando el número real de commits analizados. La subida usa un repositorio público nuevo sin forzar historial. Se compara el árbol remoto completo y después se clona desde GitHub en otra carpeta, se reinstala desde los lockfiles y se repiten pruebas, compilación cuando corresponde y ensayo de navegador. La evidencia final se registra en el inventario local; este documento no anticipa resultados de pasos aún pendientes.

No se borró, movió ni reconfiguró la aplicación original. La recuperación del código no implica que los datos privados y medios excluidos estén respaldados.
