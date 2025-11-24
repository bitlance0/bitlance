"use client";

import { useState, useMemo } from "react";

interface Lesson {
  id: string;
  title: string;
  content: string;
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

// 🔹 Función que combina el formato con ** y el resaltado de búsqueda
function renderFormattedContent(content: string, searchTerm: string) {
  if (!content) return null;

  // 1️⃣ Escapar caracteres peligrosos
  let formatted = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2️⃣ Convertir **texto** → <strong>texto</strong> (resaltado principal)
  // formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_, text) => {
  //   return `<strong class="text-foreground font-semibold">${text}</strong>`;
  // });

  // Detecta ***texto*** → resaltado amarillo
  formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, (_, text) => {
    return `<strong class="text-[var(--amarillo-principal)] font-semibold">${text}</strong>`;
  });

  // Luego detecta **texto** → resaltado normal (foreground)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, (_, text) => {
    return `<strong class="text-foreground font-semibold">${text}</strong>`;
  });


  // 3️⃣ Resaltado del término buscado
  if (searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, "gi");
    formatted = formatted.replace(
      regex,
      '<mark class="bg-yellow-200 text-black">$1</mark>'
    );
  }

  // 4️⃣ Separar líneas para procesar sangrías
  const lines = formatted.split("\n");

  // 5️⃣ Procesar línea por línea
  const elements = lines.map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;

    // Detectar espacios iniciales para calcular indentación
    const spaces = line.match(/^(\s+)/);
    const indentLevel = spaces ? Math.floor(spaces[0].length / 2) : 0;
    // const paddingLeft = `${indentLevel * 1.25}rem`;
    const paddingLeft = `${Math.max(indentLevel - 8, 0) * 1.25}rem`;

    const isSubtitle = trimmed.startsWith("<strong>");



    return (
      <p
        key={i}
        className={`leading-7 lg:text-base mb-1 ${
          isSubtitle
            ? "font-semibold text-[var(--amarillo-principal)]"
            : "text-muted-foreground"
        }`}
        style={{ paddingLeft }}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  });

  return <div className="space-y-1">{elements}</div>;
}


export default function TypesOfAccountsPage() {
  // 🔹 Definición de secciones dinámicas (puedes agregar más sin cambiar el resto del código)
  const sections: Section[] = useMemo(() => [
    {
      id: "section1",
      title: "Sección 1: Comprensión de los mercados e instrumentos financieros",
      lessons: [
        {
          id: "lesson1",
          title: "Lección 1: Introducción a los mercados financieros",
          content: `
                    1️⃣ **La magia del mercado:** Son como grandes centros donde todos se reúnen para comerciar.
                    2️⃣ **Secretos comerciales:** Se compra a bajo precio y se vende más caro, generando ganancias.
                    3️⃣ **Diferentes tipos de cosas:** Acciones, divisas, materias primas e índices.`,
        },
        {
          id: "lesson2",
          title: "Lección 2: Comercio de Forex y pares de divisas principales",
          content: `    
                    **Forex:** Comercio global de divisas.
                    **Pares de divisas:** EUR/USD, USD/JPY, GBP/USD...
                    **Acción 24/7:** Mercado abierto todo el tiempo.
          `,
        },
        {
          id: "lesson3",
          title: "Lección 3: Acciones, materias primas e índices",
          content: `
                    **Acciones:** Certificados de propiedad de empresas.
                    **Materias primas:** Oro, petróleo, café, trigo.
                    **Índices bursátiles:** S&P 500, DJIA.`,
        },
      ],
    },
    {
      id: "section2",
      title: "Sección 2: Órdenes comerciales básicas y gestión de riesgos",
      lessons: [
        {
          id: "lesson4",
          title: "Lección 4: Órdenes comerciales básicas",
          content: `Las órdenes comerciales son como instrucciones para el mercado, diciéndole lo que desea hacer con un activo en particular. Aquí hay tres órdenes comerciales fundamentales que debe comprender:
                    
                    1️⃣ **Orden de compra:**
                      **- Qué hace:** una orden de compra es como decir: "Quiero comprar este activo al precio actual de mercado".
                      **- Cuándo usarlo:** utilizaría una orden de compra cuando cree que el precio del activo aumentará y desee adquirirlo para beneficiarse del aumento potencial.

                    2️⃣ **Orden de venta:**
                      **- Qué hace:** una orden de venta significa que desea vender un activo que ya posee, generalmente al precio de mercado actual.
                      **- Cuándo usarlo:** utilizaría una orden de venta cuando crea que el precio del activo disminuirá y desea venderlo para evitar pérdidas potenciales o asegurar ganancias si ya lo posee.

                    3️⃣ **Venta corta:**
                      **- Qué hace:** la venta en corto es lo opuesto a una orden de compra. Implica pedir prestado un activo que no es de su propiedad, venderlo al precio actual de mercado y esperar volver a comprarlo más tarde a un precio más bajo para devolvérselo al prestamista.
                      **- Cuándo usarlo:** las ventas en corto se utilizan cuando se cree que el precio de un activo disminuirá. Es una forma de sacar provecho de la caída de los precios.

                    En pocas palabras, estas órdenes comerciales son sus herramientas para navegar por los mercados financieros:
                      **- Comprar:** Adquirir un activo cuando se espera que su precio suba.
                      **- Vender:** Enajenar un activo, ya sea para asegurar ganancias o evitar pérdidas cuando se espera que su precio baje.
                      **- Venta en corto:** para beneficiarse de la caída del precio de un activo tomándolo prestado y vendiéndolo, y luego comprándolo de nuevo a un precio más bajo.
                    
                    Comprender y utilizar estas órdenes de forma eficaz es esencial para una negociación exitosa.

                        ***Órdenes de obtención de beneficios y stop-loss: protegiendo sus operaciones***

                    Las órdenes **“Take Profit” y “Stop Loss”** son como su red de seguridad comercial. Le ayudan a gestionar el riesgo y asegurar las ganancias. Exploremos estas herramientas comerciales esenciales:
                    1️⃣ **Orden de obtención de beneficios:**
                      **- ¿Qué hace?:** Una orden Take Profit es como establecer un objetivo para su operación. Vende automáticamente un activo cuando alcanza un precio específico, asegurando sus ganancias.
                      **- ¿Por qué es importante?:** Evita que te vuelvas demasiado codicioso y ayuda a garantizar que no pierdas ganancias potenciales al vender demasiado pronto.

                    2️⃣ **Orden Stop Loss:**
                      **- ¿Qué hace?:** una orden Stop-Loss es su mecanismo de seguridad. Vende automáticamente un activo cuando su precio alcanza un cierto nivel que usted ha predefinido. Esto limita sus pérdidas potenciales.
                      **- ¿Por qué es importante?:** Le protege de pérdidas significativas en caso de que el mercado se mueva en contra de su operación. Es como una salida de emergencia.

                    **Cuándo usarlos:**
                      **- Take Profit:** Úselo cuando tenga un objetivo de ganancias específico en mente. Por ejemplo, si compra una acción a $50 y cree que alcanzará los $60, puede establecer una orden Take Profit a $60 para asegurar esa ganancia.
                      **- Stop-Loss:** Úselo para limitar sus pérdidas potenciales. Por ejemplo, si compra una acción a $50 dólares, pero no quiere perder más de $5 dólares por acción, puede establecer una orden Stop Loss a $45 dólares.

                    En resumen, las órdenes Take Profit y Stop-Loss son como sus guardaespaldas comerciales. Le ayudan a cumplir sus objetivos de ganancias y le protegen de pérdidas excesivas. El uso inteligente de estas órdenes es una parte clave de la gestión de riesgos en el comercio.

                        ***Órdenes limitadas de venta y de compra: precisión comercial***   

                    - **Limitar venta:** Establezca un objetivo para vender un activo a un precio específico o mejor cuando espere que su valor aumente.
                    - **Limitar compra:** Especifique el precio al que desea comprar un activo, buscando una mejor oferta cuando crea que su precio bajará.
                    Estas órdenes añaden precisión a sus operaciones y le ayudan a entrar y salir a los precios correctos.


                        ***Trailing Stop-Loss y Take Profit: Gestión dinámica de riesgos***

                    - **Trailing Stop-Loss:** Ajusta automáticamente su stop-loss a medida que el precio del activo se mueve a su favor para limitar pérdidas potenciales.
                    - **Take Profit final:** Aumenta automáticamente su objetivo de ganancias a medida que aumenta el precio del activo, asegurando ganancias sin ajustes manuales.`,
        },
        {
          id: "lesson5",
          title: "Lección 5: Lotes, Apalancamiento, Margen y Gestión de Riesgos",
          content: `
                  **Lotes de Forex:** Gestión del tamaño de las operaciones
                  Los lotes de Forex son como las unidades que utiliza para medir y controlar el tamaño de su operación en el mercado de divisas. Aquí tienes una explicación clara de qué son y cómo calcularlos:

                  **¿Qué son los lotes de Forex?**

                  Un lote es una medida estandarizada que se utiliza en el comercio de divisas para especificar el volumen o tamaño de una operación. Determina qué cantidad de un par de divisas estás comprando o vendiendo.

                  **Tipos de Lotes:** Existen tres tipos principales de lotes:
                    **- Lote Estándar:** 100.000 unidades de la moneda base.
                    **- Mini Lote:** 10.000 unidades de la moneda base.
                    **- Micro Lote:** 1.000 unidades de la moneda base.

                  **Calcular el tamaño del lote:** Para calcular el tamaño del lote, debe considerar:
                    - El tamaño de su cuenta comercial.
                    - El porcentaje de su cuenta que está dispuesto a arriesgar en una operación.
                    - La distancia (en pips) entre su punto de entrada y su nivel de stop-loss.

                  **Aquí hay una fórmula simplificada para calcular el tamaño del lote:**
                    **Tamaño del lote** = (Tamaño de la cuenta x Porcentaje de riesgo) / (Stop-Loss en pips x Valor del pip por lote)

                  **Apalancamiento en el comercio de CFD:**
                    El apalancamiento en el comercio de CFD significa pedir prestados fondos para ampliar su posición comercial. Para calcular el tamaño de la posición, divida su capital comercial por el índice de apalancamiento. Por ejemplo, con $10,000 y un apalancamiento de 10x, el tamaño de su posición es $10,000 / 10 = $1,000.

                  **Margen:**
                    El margen en el comercio es la garantía que necesita depositar para abrir y mantener una posición apalancada. Garantiza que pueda cubrir pérdidas potenciales. Si sus pérdidas exceden el margen, puede enfrentar una llamada de margen o la liquidación de su posición.
                    Las llamadas de margen son advertencias de los corredores que ocurren cuando las pérdidas de un comerciante se acercan al margen depositado para cubrir sus posiciones. Sirven para proteger a los comerciantes evitando que sus cuentas entren en saldos negativos, lo que puede conducir a la ruina financiera. Cuando se emite una llamada de margen, los operadores deben depositar más fondos o cerrar posiciones para reducir el riesgo de mayores pérdidas. Esto ayuda a garantizar un comercio responsable y protege a los operadores de pérdidas excesivas más allá de su inversión inicial.`,
        },
      ],
    },
    {
      id: "section3",
      title: "Sección 3: Análisis técnico",
      lessons: [
        {
          id: "lesson6",
          title: "Lección 6: Introducción al Análisis Técnico",
          content: `
                    El análisis técnico es un aspecto fundamental de la negociación que implica analizar datos históricos del mercado, centrándose principalmente en el precio y el volumen de negociación. Los comerciantes utilizan este enfoque para obtener información sobre los posibles movimientos futuros de precios de los activos. La idea central detrás del análisis técnico es que los patrones y tendencias históricas de precios tienden a repetirse, lo que permite a los operadores hacer predicciones informadas sobre hacia dónde se dirigirá el precio de un activo. Esto contrasta con el análisis fundamental, que se basa en la evaluación de la salud financiera y los factores económicos de una empresa para determinar el valor de un activo.

                    La importancia del análisis técnico en el comercio radica en su capacidad de proporcionar a los operadores herramientas valiosas para la toma de decisiones. Al examinar los gráficos de precios, los operadores pueden identificar patrones como cabeza y hombros, doble techo o banderas alcistas. Estos patrones pueden indicar posibles oportunidades de compra o venta. Además, los indicadores técnicos como los promedios móviles, el RSI (índice de fuerza relativa) y el MACD (convergencia y divergencia del promedio móvil) brindan información cuantitativa sobre el impulso de un activo y sus posibles puntos de reversión. Los operadores utilizan estas herramientas para gestionar el riesgo, cronometrar sus operaciones y mejorar sus estrategias comerciales generales.

                    En resumen, el análisis técnico es un aspecto crucial del comercio porque brinda a los operadores la capacidad de analizar datos históricos y hacer predicciones informadas sobre futuros movimientos de precios. Al comprender los patrones de los gráficos y utilizar indicadores técnicos, los operadores pueden desarrollar estrategias efectivas, gestionar el riesgo y potencialmente aumentar sus posibilidades de éxito en los mercados financieros.`,
        },
        {
          id: "lesson7",
          title: "Lección 7: Indicadores técnicos comunes",
          content: `
                    1️⃣ **Medias móviles (MA):** Las medias móviles suavizan los datos de precios para identificar tendencias. Dos tipos principales son la media móvil simple (SMA) y la media móvil exponencial (EMA). Ayudan a los operadores a detectar la dirección de la tendencia y posibles reversiones.

                    2️⃣ **Índice de fuerza relativa (RSI):** El RSI mide la velocidad y el cambio de los movimientos de precios. Se utiliza para identificar condiciones de sobrecompra o sobreventa, lo que indica posibles cambios de tendencia.

                    3️⃣ **Bandas de Bollinger:** Las Bandas de Bollinger constan de una banda media (SMA) y dos bandas exteriores basadas en la volatilidad. Ayudan a identificar la volatilidad de los precios y posibles puntos de ruptura.

                    4️⃣ **Convergencia y divergencia de media móvil (MACD):** MACD combina dos EMA para mostrar la relación entre las tendencias de precios a corto y largo plazo. Ayuda a identificar cambios de tendencia y divergencias.

                    5️⃣ **Oscilador estocástico:** Este indicador mide el precio de cierre de un activo en relación con su rango de precios durante un período específico. Indica posibles puntos de reversión.

                    6️⃣ **Retroceso de Fibonacci:** Los niveles de Fibonacci se utilizan para identificar posibles niveles de soporte y resistencia basados en índices clave de Fibonacci. Los comerciantes los utilizan para predecir reversiones de precios.

                    7️⃣ **Nube Ichimoku:** Este indicador proporciona una visión completa del soporte, la resistencia y la dirección de la tendencia. Consta de cinco líneas y una nube, lo que ayuda a los operadores a tomar decisiones informadas.

                    8️⃣ **Rango verdadero promedio (ATR):** ATR mide la volatilidad del mercado analizando el rango entre los precios altos y bajos de un activo durante un período específico. Ayuda a establecer niveles de stop-loss.

                    9️⃣ **SAR parabólico (detener y revertir):** Los puntos SAR aparecen por encima o por debajo del precio, lo que indica posibles cambios de tendencia. Es útil para establecer órdenes de trailing stop.

                    🔟 **Volumen:** Si bien no es un indicador tradicional, el volumen de operaciones es esencial. Ayuda a confirmar las tendencias de los precios e identificar posibles rupturas o reversiones cuando se combina con otros indicadores.

                  Estos indicadores técnicos comunes son herramientas valiosas para que los operadores analicen movimientos de precios, detecten tendencias y tomen decisiones comerciales informadas. Los comerciantes suelen utilizar una combinación de estos indicadores para crear estrategias comerciales efectivas.`,
        },
        {
          id: "lesson8",
          title: "Lección 8: Estrategias comerciales simples",
          content: `
                  1️⃣ **Estrategia de cruce de media móvil:**
                    **- Indicador:** Medias Móviles Simples (SMA) con períodos de 50 y 200 días.
                    **- Estrategia:** Comprar cuando la SMA de 50 días cruce por encima de la SMA de 200 días (cruz dorada) y vender cuando cruce por debajo (cruce de la muerte).
                    **- Ejemplo:** Si compró acciones de Apple Inc. (AAPL) Cuando la SMA de 50 días cruzó por encima de la SMA de 200 días en enero de 2020, habría ingresado a alrededor de $73 por acción. Al vender en septiembre de 2021, cuando se produjo el cruce inverso, podría haber salido a aproximadamente $149 por acción, lo que podría duplicar su inversión.

                  2️⃣ **Estrategia de sobrecompra/sobreventa del RSI:**
                    **- Indicador:** Índice de Fuerza Relativa (RSI)
                    **- Estrategia:** Comprar cuando RSI < 30 (sobreventa) y vender cuando RSI > 70 (sobrecompra).
                    **- Ejemplo:** Si aplicó esta estrategia a Bitcoin (BTC) en marzo de 2020, cuando el RSI cayó por debajo de $30, podría haber comprado a alrededor de $6200 por BTC. Vender cuando el RSI cruzó por encima de $70 en diciembre de 2020 le habría permitido vender a aproximadamente $29,000 por BTC, lo que podría generar ganancias sustanciales.

                  3️⃣ **Estrategia de ruptura de Bandas de Bollinger:**
                    **- Indicador:** Bandas de Bollinger
                    **- Estrategia:** Comprar cuando el precio supera la banda superior y vender cuando cae por debajo de la inferior.
                    **- Ejemplo:** Utilizando esta estrategia con acciones de Amazon (AMZN) en abril de 2020, cuando superaron la banda de Bollinger superior a aproximadamente $ 2,400 por acción, podría haber comprado. Vender cuando cayó por debajo de la Banda de Bollinger inferior en julio de 2020 a alrededor de $2.870 dólares por acción habría dado lugar a posibles beneficios.
            
                Tenga en cuenta que estos ejemplos están simplificados con fines ilustrativos y no consideran los costos de transacción, los impuestos ni la volatilidad del mercado. El comercio real implica riesgos y el desempeño pasado no garantiza resultados futuros. Es esencial realizar una prueba retrospectiva y practicar minuciosamente cualquier estrategia antes de aplicarla en el comercio real.`,
        },
      ],
    },
    {
      id: "section4",
      title: "Sección 4: Análisis fundamental",
      lessons: [
        {
          id: "lesson-9",
          title: "Lección 9: Introducción al análisis fundamental",
          content: `
                  El análisis fundamental es un método para evaluar el valor intrínseco de un activo, como acciones, bonos o criptomonedas, mediante el examen de factores económicos y financieros subyacentes. Implica evaluar la salud financiera de una empresa, las condiciones de la industria, los indicadores económicos y otra información relevante para tomar decisiones de inversión informadas. 

                  El análisis fundamental es importante en el comercio porque ayuda a los operadores e inversores a comprender el verdadero valor de un activo, ya sea que esté sobrevaluado o infravalorado, y si tiene potencial de crecimiento o disminución a largo plazo. Al analizar estos fundamentos, los operadores pueden tomar decisiones más informadas sobre cuándo comprar o vender activos, lo que les ayuda a gestionar el riesgo y alcanzar sus objetivos financieros.`,
        },
        {
          id: "lesson-10",
          title: "Lección 10: Principales acontecimientos económicos",
          content: `
                  1️⃣ **Nóminas no agrícolas (NFP):** El informe NFP, publicado mensualmente en Estados Unidos, indica la cantidad de empleos agregados o perdidos en el mes anterior. Puede tener un impacto significativo en los mercados de divisas e influir en las decisiones sobre tipos de interés de los bancos centrales.

                  2️⃣ **Informes de ganancias:** Cuando las empresas públicas publican sus informes de ganancias trimestrales o anuales, pueden producirse movimientos significativos en los precios de sus acciones. Las sorpresas positivas en las ganancias a menudo conducen a aumentos en el precio de las acciones.

                  3️⃣ **Decisiones sobre tipos de interés:** Los bancos centrales, como la Reserva Federal (Fed) de Estados Unidos, anuncian cambios en los tipos de interés. Las tasas más altas pueden fortalecer la moneda y afectar los mercados de acciones y bonos.

                  4️⃣ **Producto Interno Bruto (PIB):** Los informes del PIB brindan información sobre la salud económica de un país. Un PIB fuerte puede impulsar la confianza de los inversores, mientras que uno débil puede tener el efecto contrario.

                  5️⃣ **Índice de Precios al Consumidor (IPC):** El IPC mide la inflación. Un IPC superior a lo esperado puede generar preocupaciones sobre el aumento de precios y posibles cambios en las políticas del banco central.

                  6️⃣ **Balanza comercial:** Los informes de la balanza comercial revelan las exportaciones e importaciones de un país. Un superávit comercial (exportaciones > importaciones) puede fortalecer la moneda nacional.

                  7️⃣ **Tasa de desempleo:** La tasa de desempleo indica la salud del mercado laboral. Las tasas de desempleo más bajas pueden impulsar el gasto de los consumidores y la confianza.

                  8️⃣ **Ventas minoristas:** Las cifras de ventas minoristas reflejan el gasto de los consumidores, un componente crucial del crecimiento económico. Las fuertes ventas pueden ser positivas para la economía y los mercados.

                  9️⃣ **Eventos políticos:** Las elecciones, referendos o acontecimientos políticos importantes pueden provocar volatilidad en el mercado, ya que pueden afectar las políticas que afectan a las empresas y las industrias.

                  🔟 **Desastres naturales:** Eventos como huracanes, terremotos o pandemias pueden alterar las cadenas de suministro y afectar los mercados. Las acciones de seguros y relacionadas con desastres pueden experimentar una mayor actividad durante tales eventos.
                  
                Estos acontecimientos económicos tienen el potencial de mover los mercados significativamente, impactando los precios de los activos, el sentimiento de los inversores y las estrategias comerciales. Los comerciantes e inversores siguen de cerca estos eventos para tomar decisiones informadas y gestionar el riesgo de forma eficaz.
            `,
        },
        {
          id: "lesson-11",
          title: "Lección 11: Estrategias de análisis fundamental",
          content: `
                  1️⃣ **Inversión de valor:**
                    **- Estrategia:** Identifique activos infravalorados mediante el análisis de estados financieros, informes de ganancias y relaciones como precio-beneficio (P/E) o precio-valor contable (P/B). Busque activos que coticen por debajo de su valor intrínseco.
                    **- Uso en Trading:** Comprar activos infravalorados y conservarlos hasta que su precio de mercado se acerque a su valor intrínseco.

                  2️⃣ **Inversión en crecimiento:**
                    **- Estrategia:** Centrarse en empresas con un gran potencial de crecimiento futuro mediante el análisis de las tasas de crecimiento de ingresos y ganancias, las tendencias del mercado y las ventajas competitivas.
                    **- Uso en Trading:** Compre acciones de empresas en crecimiento con perspectivas prometedoras de revalorización del capital a largo plazo.

                  3️⃣ **Inversión de dividendos:**
                    **- Estrategia:** Invertir en empresas que paguen dividendos periódicamente. Analice el historial de dividendos, los índices de pago y la estabilidad financiera.
                    **- Uso en Trading:** Compre acciones que paguen dividendos para obtener ingresos o reinvertir, aprovechando los posibles aumentos de dividendos con el tiempo.

                  4️⃣ **Inversión impulsada por eventos:**
                    **- Estrategia:** Capitalizar eventos específicos como fusiones, adquisiciones, anuncios de ganancias o cambios regulatorios analizando su impacto potencial en los precios de los activos.
                    **- Uso en Trading:** Opere basándose en las expectativas de cómo los eventos afectarán los valores de los activos. Por ejemplo, compre antes de un informe de ganancias positivo y venda después de uno negativo.

                  5️⃣ **Análisis de sentimiento:**
                    **- Estrategia:** Evaluar el sentimiento del mercado mediante el análisis de noticias, redes sociales y encuestas para medir las emociones de los inversores y las expectativas de consenso.
                    **- Uso en Trading:** Los comerciantes contrarios pueden comprar cuando el sentimiento es excesivamente negativo y vender cuando es demasiado positivo.

                      ***En cuanto al calendario económico:***

                Un calendario económico es una herramienta que proporciona un cronograma de próximos eventos económicos, publicaciones de datos e informes. Aquí se explica cómo usarlo:

                  1️⃣ **Acceda a un calendario económico:** Utilice sitios web financieros, plataformas comerciales o aplicaciones para acceder a un calendario económico. Enumerará eventos, fechas, horas y el impacto esperado en los mercados.
                  
                  2️⃣ **Selección de eventos:** Elija los eventos económicos que sean relevantes para su estrategia comercial. Por ejemplo, los operadores de divisas suelen centrarse en decisiones sobre tipos de interés, mientras que los operadores de acciones pueden observar los informes de ganancias.

                  3️⃣ **Preparación:** Revisar los detalles del evento y las expectativas del mercado. Esté atento a los pronósticos de consenso y los datos históricos para el contexto.

                  4️⃣ **Estrategia comercial:** Determine cómo operará durante el evento. Por ejemplo, si se espera que un banco central aumente las tasas de interés, considere el impacto potencial en los pares de divisas o los bonos.

                  5️⃣ **Gestión de riesgos:** Implemente una gestión de riesgos adecuada, incluido el establecimiento de órdenes de limitación de pérdidas, para proteger sus posiciones de movimientos inesperados del mercado.

                  6️⃣ **Ejecución:** Ejecute sus operaciones en función de su análisis y estrategia, ya sea antes, durante o después del evento, según su enfoque.


            Un calendario económico ayuda a los operadores a mantenerse informados sobre eventos críticos que pueden afectar los mercados, permitiéndoles tomar decisiones comerciales oportunas y bien informadas.`,
        },
      ],
    },
    {
      id: "section",
      title: "Sección 5: Comercio de criptomonedas",
      lessons: [
        {
          id: "lesson-12",
          title: "Lección 12: Introducción a las criptomonedas",
          content: `
                Las criptomonedas son monedas digitales o virtuales que utilizan criptografía por motivos de seguridad. Están descentralizadas y normalmente operan con una tecnología llamada blockchain, que es un libro de contabilidad distribuido que registra todas las transacciones en una red de computadoras. Las criptomonedas cumplen varias funciones en el mercado financiero:

                  1️⃣ **Moneda digital:** Las criptomonedas se pueden utilizar como medio de intercambio de bienes y servicios, similar a las monedas fiduciarias tradicionales como el dólar estadounidense o el euro. Algunas criptomonedas tienen como objetivo proporcionar transacciones transfronterizas rápidas y de bajo costo.

                  2️⃣ **Reserva de valor:** Ciertas criptomonedas, como Bitcoin, a menudo se consideran oro digital o una reserva de valor. Los inversores pueden utilizarlos para protegerse contra la inflación o la inestabilidad económica.

                  3️⃣ **Inversión:** Muchas personas e instituciones invierten en criptomonedas como activos especulativos, con la esperanza de que su valor aumente con el tiempo. Las criptomonedas han mostrado una importante volatilidad de precios, lo que puede presentar tanto riesgos como oportunidades para los inversores.

                  4️⃣ **Tecnología Blockchain:** Las criptomonedas están estrechamente vinculadas a la tecnología blockchain, que tiene aplicaciones más allá de la moneda. Blockchain se utiliza para la gestión de la cadena de suministro, sistemas de votación y más, lo que convierte a las criptomonedas en una puerta de entrada para explorar el potencial de blockchain.

                  5️⃣ **Inclusión financiera:** Las criptomonedas pueden brindar acceso a servicios financieros a personas en regiones con acceso limitado a los sistemas bancarios tradicionales. Las personas pueden enviar, recibir y almacenar valor sin depender de los bancos tradicionales.

                  6️⃣ **Contratos inteligentes:** Algunas criptomonedas, como Ethereum, admiten contratos inteligentes, que son contratos autoejecutables con los términos del acuerdo escritos directamente en código. Estos contratos automatizan y facilitan varios tipos de acuerdos y transacciones.

              Las criptomonedas han llamado la atención por su potencial disruptivo en la industria financiera, al ofrecer nuevas formas de transferir valor, realizar negocios e invertir. Sin embargo, su naturaleza descentralizada, los desafíos regulatorios y la volatilidad de los precios también plantean riesgos y consideraciones únicos para quienes participan en el mercado de las criptomonedas.`,
        },
        {
          id: "lesson-13",
          title: "Lección 13: Tecnología Blockchain",
          content: `
                La tecnología Blockchain es un sistema de contabilidad descentralizado y distribuido que registra transacciones en múltiples computadoras de una manera que garantiza transparencia, seguridad e inmutabilidad. Aquí hay una explicación de la tecnología blockchain y su importancia en las criptomonedas:

                  1️⃣ **Libro mayor distribuido:** Blockchain es un libro de contabilidad digital que opera en una red descentralizada de computadoras, a menudo denominadas nodos. Cada nodo tiene una copia de toda la cadena de bloques, lo que garantiza que no haya un punto central de control o falla.

                  2️⃣ **Bloques y transacciones:** Las transacciones se agrupan en “bloques”. Estos bloques se vinculan en orden cronológico, formando una cadena de bloques, de ahí el nombre "blockchain". Cada bloque contiene un conjunto de transacciones, una marca de tiempo y una referencia al bloque anterior (excepto el primer bloque, conocido como "bloque génesis").

                  3️⃣ **Transparencia e inmutabilidad:** Una vez que se agrega una transacción a la cadena de bloques, se registra de forma transparente y no se puede modificar ni eliminar. Esta inmutabilidad garantiza la integridad del historial de transacciones, lo que lo hace altamente seguro contra manipulaciones.

                  4️⃣ **Descentralización:** Blockchain opera sin una autoridad central. Las transacciones son verificadas por los participantes de la red (nodos) a través de un mecanismo de consenso, como Prueba de trabajo ( PoW ) o Prueba de participación ( PoS ), lo que reduce la necesidad de intermediarios como los bancos.

                  5️⃣ **Criptografía:** La criptografía se utiliza para asegurar transacciones y controlar la creación de nuevas unidades de criptomonedas. Las claves públicas y privadas garantizan que solo los usuarios autorizados puedan acceder y realizar cambios en sus activos digitales.

                  6️⃣ **Importancia de las criptomonedas:** Blockchain es la tecnología subyacente de las criptomonedas como Bitcoin. Resuelve el problema del doble gasto, garantizando que los activos digitales no puedan duplicarse ni gastarse más de una vez. También permite transacciones entre pares sin confianza, eliminando la necesidad de intermediarios como los bancos en las transacciones financieras.

                  7️⃣ **Transparencia y seguridad:** Las características de transparencia y seguridad de Blockchain la hacen muy adecuada para registrar transacciones financieras de manera segura y transparente. Los usuarios pueden verificar de forma independiente las transacciones en blockchain, lo que reduce el riesgo de fraude.

                  8️⃣ **Contratos inteligentes:** Algunas plataformas blockchain, como Ethereum, admiten contratos inteligentes: contratos autoejecutables con reglas y condiciones predefinidas. Estos contratos automatizan acuerdos complejos, lo que permite una amplia gama de aplicaciones descentralizadas (DApps) más allá de las criptomonedas.


            En resumen, la tecnología blockchain es la tecnología fundamental detrás de las criptomonedas. Su importancia radica en su capacidad de proporcionar una forma segura, transparente y descentralizada de registrar y verificar transacciones, lo que lo convierte en un punto de inflexión en el mundo de las finanzas y más allá. Tiene el potencial de revolucionar diversas industrias al proporcionar soluciones eficientes y a prueba de manipulaciones a problemas de larga data.`,
        },
        {
          id: "lesson-14",
          title: "Lección 14: Las 10 principales criptomonedas",
          content: `
                      ***Presentamos las 10 principales criptomonedas por capitalización de mercado***
          
                Estas son las 10 principales criptomonedas por capitalización de mercado según mi última actualización de conocimientos en septiembre de 2021. Tenga en cuenta que las clasificaciones y los valores pueden haber cambiado desde entonces, por lo que es una buena idea comprobar los datos más recientes:

                  1️⃣ **Bitcoin (BTC):** A menudo llamado oro digital, es la primera y más conocida criptomoneda.
                  
                  2️⃣ **Ethereum (ETH):** Conocido por sus capacidades de contratos inteligentes, es una plataforma para crear aplicaciones descentralizadas.
                  
                  3️⃣ **Binance Coin (BNB):** Se utiliza en el intercambio de Binance, para tarifas comerciales y diversos servicios.
                  
                  4️⃣ **Cardano (ADA):** Tiene como objetivo proporcionar una infraestructura segura y escalable para el desarrollo de aplicaciones descentralizadas.
                  
                  5️⃣ **Solana (SOL):** Ganó popularidad por sus rápidas velocidades de transacción y bajas tarifas, y se utiliza para proyectos DeFi y NFT.
                  
                  6️⃣ **XRP (XRP):** Desarrollado por Ripple, se enfoca en transferencias de dinero internacionales rápidas y de bajo costo.
                  
                  7️⃣ **Polkadot (DOT):** Diseñado para conectar diferentes blockchains y permitirles trabajar juntas.
                  
                  8️⃣ **Dogecoin (DOGE):** Inicialmente comenzó como un meme, es una moneda digital que se utiliza para dar propinas y pequeñas transacciones.
                  
                  9️⃣ **USD Coin (USDC):** Una moneda estable, su valor está vinculado al dólar estadounidense, lo que proporciona estabilidad para las transacciones.
                  
                  🔟 **Avalanche (AVAX):** Una plataforma para crear y lanzar aplicaciones descentralizadas y cadenas de bloques personalizadas.

                Recuerde que los mercados de criptomonedas son muy volátiles y las clasificaciones pueden cambiar rápidamente. Es esencial investigar y mantenerse actualizado sobre los últimos desarrollos si está considerando invertir en estas criptomonedas.`,
        },
        {
          id: "lesson-15",
          title: "Lección 15: Comercio de criptomonedas con análisis técnico y CFD",
          content: `
                      ***Comercio de criptomonedas con análisis técnico:***

                  1️⃣ **Comprensión del análisis técnico:** El análisis técnico implica estudiar gráficos de precios históricos y utilizar varios indicadores para hacer predicciones sobre movimientos futuros de precios. Se supone que los datos pasados de precios y volúmenes pueden ayudar a pronosticar tendencias futuras.
                  
                  2️⃣ **Seleccione una plataforma de negociación:** Para comenzar, deberá elegir una plataforma de negociación de criptomonedas o un intercambio que ofrezca herramientas de análisis técnico. Muchos intercambios populares ofrecen gráficos e indicadores de forma gratuita.
                  
                  3️⃣ **Estudie los gráficos de velas japonesas:** Los gráficos de velas japonesas muestran los movimientos de precios a lo largo del tiempo. Aprenda a leer estos gráficos, ya que muestran información clave como precios de apertura, cierre, máximos y mínimos para un período específico.
                  
                  4️⃣ **Utilice indicadores técnicos:** Los analistas técnicos utilizan indicadores como medias móviles, índice de fuerza relativa (RSI) y bandas de Bollinger para identificar posibles puntos de entrada y salida. Estos indicadores pueden ayudarle a detectar tendencias, condiciones de sobrecompra o sobreventa, y más.
                  
                  5️⃣ **Identifique patrones:** Busque patrones en los gráficos como cabeza y hombros, dobles techos/bajos y triángulos. Estos patrones pueden indicar posibles reversiones o continuaciones en las tendencias de precios.
                  
                  6️⃣ **Establezca puntos de entrada y salida:** Según su análisis, decida cuándo comprar (entrada) y cuándo vender (salida) una criptomoneda. Esta decisión puede depender de indicadores, patrones o su tolerancia al riesgo.
                  
                  7️⃣ **Gestión de riesgos:** Utilice siempre órdenes de límite de pérdidas para limitar las pérdidas potenciales. Determine cuánto está dispuesto a arriesgar en cada operación y cumpla con su plan.
                  
                  8️⃣ **Manténgase informado:** Esté atento a las noticias y eventos que podrían afectar los mercados de criptomonedas. A veces las noticias pueden anular el análisis técnico, por lo que es esencial mantenerse informado.

                    ***Uso de CFD para el comercio de criptomonedas:***

              Los **CFD** (contratos por diferencia) son derivados financieros que permiten a los operadores especular sobre los movimientos de precios de las criptomonedas sin poseerlas realmente. Así es como funcionan:
            
                  1️⃣ **Operaciones apalancadas:** Los CFD le permiten operar con apalancamiento, lo que significa que puede controlar una posición más sustancial con una cantidad menor de capital. Si bien esto puede amplificar las ganancias, también aumenta las pérdidas potenciales.
                  
                  2️⃣ **Sin propiedad:** Con los CFD, usted no es propietario de la criptomoneda subyacente. En cambio, está celebrando un contrato con un corredor para beneficiarse de los cambios de precios.
                  
                  3️⃣ **Venta en corto:** Los CFD le permiten beneficiarse de la caída de los precios de las criptomonedas vendiendo (en corto) antes de volver a comprar a un precio más bajo.
                  
                  4️⃣ **Gestión de riesgos:** Al igual que el comercio tradicional, es fundamental gestionar el riesgo al operar con CFD. Utilice órdenes de limitación de pérdidas y órdenes de toma de ganancias para proteger su capital.
                  
                  5️⃣ **Regulación:** El comercio de CFD está sujeto a regulación en muchos países. Asegúrese de operar con un corredor regulado y de buena reputación para proteger sus intereses.

              Operar con criptomonedas con análisis técnico y utilizar CFD puede ser rentable, pero conlleva riesgos. Es recomendable comenzar con una cuenta demo para practicar sus habilidades y desarrollar una estrategia comercial antes de arriesgar dinero real. Además, invierta sólo lo que pueda permitirse perder, ya que los mercados de criptomonedas son muy volátiles.`,
        },
        {
          id: "lesson-16",
          title: "Lección 16: Gestión y práctica de riesgos",
          content: `
                    ***Conclusión:*** preparándose para comenzar su viaje comercial

                La gestión de riesgos es un aspecto fundamental del trading y se recomienda encarecidamente practicar con cuentas de demostración. Profundicemos en por qué son esenciales:

                    ***Importancia de la gestión de riesgos en el comercio:***

                  1️⃣ **Preservar el capital:** El objetivo principal de la gestión de riesgos es proteger su capital comercial. Al limitar las pérdidas potenciales, se asegura de tener fondos para operar otro día.

                  2️⃣ **Control emocional:** El trading puede ser un desafío emocional. Las estrategias de gestión de riesgos le ayudan a mantener la disciplina y reducir el impacto de emociones como el miedo y la codicia en sus decisiones.

                  3️⃣ **Coherencia:** Un plan de gestión de riesgos bien definido le mantiene coherente en su enfoque de negociación. Esta coherencia es crucial para el éxito a largo plazo.

                  4️⃣ **Sobrevivir a las reducciones:** Los mercados pueden ser impredecibles y todo el mundo experimenta pérdidas en sus operaciones. Una gestión de riesgos eficaz garantiza que pueda superar las rachas de pérdidas sin borrar su cuenta.

                  5️⃣ **Tamaño de la posición:** Le ayuda a determinar el tamaño correcto para cada operación en función de su tolerancia al riesgo. Esto evita que usted se sobreexponga a posibles pérdidas.

                    ***Fomentar la práctica con cuentas demo:***

                  1️⃣ **Entorno libre de riesgos:** Las cuentas de demostración brindan una forma libre de riesgos de practicar estrategias comerciales y perfeccionar sus habilidades. Utiliza dinero virtual, por lo que no hay riesgo financiero.

                  2️⃣ **Conozca la plataforma:** Antes de operar en vivo, domine la plataforma de operaciones que desea utilizar. Las cuentas demo le permiten explorar sus características y funciones.

                  3️⃣ **Pruebe estrategias:** Pruebe diferentes estrategias comerciales e indicadores para ver cuál funciona mejor para usted. Esta experimentación puede ayudarle a encontrar una estrategia que se adapte a su estilo.

                  4️⃣ **Generar confianza:** Adquirir experiencia a través de la práctica genera confianza. Es mejor cometer errores en una cuenta demo que con dinero real.

                  5️⃣ **Seguimiento del progreso:** Utilice el comercio de demostración para realizar un seguimiento de su progreso y evaluar la eficacia de sus técnicas de gestión de riesgos.

                  6️⃣ **Transición al comercio en vivo:** Solo cuando logre consistentemente resultados positivos en una cuenta de demostración debería considerar la transición al comercio en vivo con dinero real.`,
          },
      ],
    },

  ], []);

  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Función para resaltar coincidencias
  const highlightText = (text: string, term: string) => {
    if (!term) return text;
    const regex = new RegExp(`(${term})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // 🔹 Filtrado y colapsado dinámico (sin duplicar)
  const filteredSections = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return sections.map((section) => {
      const lessons = section.lessons
        .map((lesson) => {
          const match =
            lesson.title.toLowerCase().includes(term) ||
            lesson.content.toLowerCase().includes(term);
          return { ...lesson, open: term ? match : false };
        })
        .filter((lesson) => (!term ? true : lesson.open));

      return { ...section, lessons };
    });
  }, [searchTerm, sections]);

  return (
    <main className="mx-4 lg:mx-40 py-14 md:py-28 lg:py-24 space-y-8">
      {/* 🔹 Encabezado */}
      <div className="text-center space-y-4 text-base w-full mt-10">
        <h2 className="text-[var(--amarillo-principal)] text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-6">
          Introducción al trading para principiantes
        </h2>
        <p className="text-base lg:text-lg font-light opacity-90 max-w-2xl mx-auto">
          Al seguir estas secciones y lecciones, los principiantes obtendrán una comprensión integral del comercio y estarán mejor preparados para comenzar su viaje de comercio e inversión.
        </p>
        <div className="pt-8">
          <input
            type="search"
            placeholder="Buscar en este curso"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-96 py-2 px-4 bg-white text-gray-900 shadow border rounded-md font-light text-base placeholder-gray-500 transition duration-200 focus:outline-none focus:bg-white focus:border-gray-300"
          />
        </div>
      </div>

      {/* 🔹 Render dinámico de secciones */}
      {filteredSections.map((section) => (
        <section
          key={section.id}
          className="py-6 px-6 border-2 rounded-lg mt-12 space-y-6"
        >
          <div className="text-center">
            <h2 className="mb-6 text-2xl leading-6">{section.title}</h2>
          </div>

          {section.lessons.length > 0 ? (
            section.lessons.map((lesson) => (
              <details
                key={lesson.id}
                className="border-b border-neutral-200 p-4"
                open={lesson.open}
              >
                <summary className="flex justify-between items-center cursor-pointer py-4 px-2 text-left text-lg font-semibold text-[var(--amarillo-principal)] hover:opacity-80 transition">
                  {highlightText(lesson.title, searchTerm)}
                  <svg
                    className="w-5 h-5 transition-transform duration-300 group-open:rotate-180 text-[var(--amarillo-principal)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                {/* <p className="mt-2 text-muted-foreground leading-7 lg:text-base whitespace-pre-line">
                  {highlightText(lesson.content, searchTerm)}
                </p> */}
                <div className="mt-2 space-y-2">
                  {renderFormattedContent(lesson.content, searchTerm)}
                </div>
              </details>
            ))
          ) : (
            <p className="text-center text-gray-500 mt-6">
              No se encontraron lecciones que coincidan con tu búsqueda.
            </p>
          )}
        </section>
      ))}

      <div className="mt-12 w-full px-6 py-6 border-2 rounded-lg bg-background text-foreground">
          <div className="space-y-4 text-base leading-7 lg:pr-4">
            <h2 className="text-primary-500 dark:text-primary-400 text-sm font-medium">
              * Recuerde que el comercio, especialmente en criptomonedas, puede ser muy volátil y riesgoso. Es fundamental contar con un plan de gestión de riesgos bien pensado y utilizar cuentas de demostración para adquirir experiencia y perfeccionar sus habilidades.
            </h2>
            <h2 className="text-primary-500 dark:text-primary-400 text-sm font-medium">
              * Nunca se apresure a realizar operaciones reales sin la preparación y la práctica adecuadas.
            </h2>
          </div>
        </div>

    </main>
  );
}
