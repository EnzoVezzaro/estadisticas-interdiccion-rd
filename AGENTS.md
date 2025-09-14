Crea un **sitio web HTML5** totalmente **interactivo, moderno y responsivo**, titulado:
**“Costo de la guerra contra las drogas en nuestras fuerzas de seguridad”**.

### Requerimientos Generales

* Utilizar **JavaScript** (vanilla, D3.js o Chart.js) para las visualizaciones.
* Diseño **claro e intuitivo**, con **paneles interactivos** y **filtros dinámicos** que permitan a los usuarios explorar la información de manera flexible.
* Los datos estarán en la carpeta `/data` y provienen de:

  1. **PGR – Estadísticas de Casos Sometidos (2017–2022)** → Procesos judiciales (desglosados por tipo de infracción).
  2. **DNCD – Estadísticas de Arrestos por edad, sexo y nacionalidad (2017–2025)**.
  3. **DNCD – Estadísticas de Drogas Decomisadas (2017–2025)**.

### Secciones Interactivas

**1. Visión General**

* Línea de tiempo con los principales indicadores: arrestos totales, decomisos y casos judiciales.
* Contadores dinámicos que muestren cifras acumuladas y actualizadas según los filtros aplicados.

**2. Arrestos**

* Gráfico de barras (apiladas o agrupadas) que muestre los arrestos por **grupo de edad, sexo y nacionalidad**.
* Filtros por **año** y **trimestre**.
* Tooltips con información exacta y desagregada al pasar el cursor.

**3. Drogas Decomisadas**

* Gráfico dinámico (línea o área apilada) con la evolución de cada sustancia (cocaína, marihuana, crack, heroína, éxtasis, etc.).
* Opción de **activar/desactivar sustancias** para realizar comparaciones.
* Botón **“Ver equivalencia”** que convierta los decomisos en una estimación de su valor monetario.

**4. Casos Judiciales**

* Dashboard con el número de casos procesados por año y tipo de infracción.
* Filtros para visualizar **drogas específicas** o el total de casos.

**5. Costo Social y Seguridad**

* Visualización combinada (ej. Sankey, radar o dashboard interactivo) que muestre la conexión entre:
  **Arrestos → Procesos judiciales → Decomisos**.
* Objetivo: transmitir la magnitud y el **“costo” de la política represiva**.

### Extras

* **Filtros globales**: año, trimestre, tipo de droga, sexo, nacionalidad.
* **Tooltips contextuales** con explicaciones sobre el impacto de los datos en la “guerra contra las drogas”.
* **Diseño responsivo y accesible** para móviles y escritorio.
* Estilo visual **minimalista y contrastante** (ejemplo: cocaína = azul, marihuana = verde, crack = rojo).
* Posibilidad de **exportar gráficos** en **PNG o CSV** desde la misma interfaz.