// ./utilidades/printUtils.ts
interface OrderItem {
  sku: string;
  quantity: number;
  description: string;
}

interface Order {
  numeroOperacion: string;
  buyer_nickname: string;
  seller_nickname: string;
  date_created: string;
  etiqueta_impresa: boolean;
  tipo_envio: string;
  items: OrderItem[];
  buyer_full_name?: string;
}

export const printRetiroLocalHTML = (orders: Order[], selectedOrders: Set<string>) => {
  const selectedRetiroOrders = orders.filter(
    (o) => selectedOrders.has(o.numeroOperacion) && o.tipo_envio === "retiro_local"
  );

  if (selectedRetiroOrders.length === 0) {
    alert("Selecciona al menos una orden de 'Retiro en local'.");
    return;
  }

  const order = selectedRetiroOrders[0];

  const productosHtml = order.items.map(item =>
    `<label style="display: block; margin: 10px 0;">
        Artículo:
        <input type="text" value="${item.sku}" 
               style="width: 350px;" class="campoDeEntrada" readonly>
        
        <input type="text" value=" ${item.quantity} un." 
               style="width: 110px; margin-left: 30px;" class="campoDeEntrada" readonly>
     </label><br>`
  ).join('');

  const nombreCliente = order.buyer_full_name || order.buyer_nickname || "";
  const numeroOperacion = order.numeroOperacion;
  const fechaHoy = new Date().toISOString().slice(0, 10);

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de venta - ${numeroOperacion}</title>
        <!-- 🆕 Librería JsBarcode para generar el código de barras -->
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
            main {
                width: 750px;
                border: 1px solid black;
                margin: 0 auto;
                text-align: center;
                font-size: 1.3rem;
                padding-bottom: 15px;
                padding-top: 15px;
            }
            #nombre {
                width: 510px;
            }
            #labelNombre {
                margin-bottom: 40px;
            }
            .campoDeEntrada {
                font-size: 1.2rem;
                text-align: left;
                border: 1px solid black;
                padding: 10px;
                box-sizing: border-box;
            }
            #campoDeControl {
                display: flex;
                justify-content: space-evenly;
                width: 80%;
                margin: 0 auto;
            }
            .observaciones {
                width: 450px;
            }
            input, textarea {
                border: 2px solid black;
            }
            .check {
                border: solid 1px black;
                width: 16px;
                height: 16px;
                margin-right: 5px;
                vertical-align: middle;
            }
            /* 🆕 Estilos para el contenedor del código de barras */
            .barcode-section {
                
                padding: 5px;
                margin: 10px auto;
                max-width: 500px;
                background: #fff;
            }
            .barcode-section h3 {
                margin: 0 0 10px 0;
                font-size: 1.3rem;
                letter-spacing: 2px;
            }
            #barcode {
                display: block;
                margin: 0 auto;
            }
            .barcode-number {
                font-family: monospace;
                font-size: 1.5rem;
                font-weight: bold;
                margin-top: 10px;
                letter-spacing: 3px;
            }
            @media print {
                body { margin: 0; padding: 0; }
            }
        </style>
    </head>
    <body>
        <main>
            <h1>Recibo de venta</h1>
            
            <h2>1. Datos del comprador</h2>
            <br>
            <label id="labelNombre">
                Nombre completo:
                <input type="text" id="nombre" class="campoDeEntrada" value="${nombreCliente}" readonly>
            </label>
            <br><br>
            <label>
                CUIT:
                <input type="text" style="margin-right: 1%;" class="campoDeEntrada">
            </label>
            
            <label>
                Número de teléfono:
                <input type="text" style="width: 150px;" class="campoDeEntrada">
            </label>
            <br><br>
            <h2>2. Información del producto</h2>
            <br>
            ${productosHtml}

            <br>
            <label>
                Número de operación:
                <input type="text" value="${numeroOperacion}" style="margin-right: 20px;" class="campoDeEntrada" readonly>
            </label>
            
            <label>Fecha
                <input type="date" id="fecha" class="campoDeEntrada" value="${fechaHoy}">
            </label>
            
            <div style="border: 2px solid black; padding: 10px; margin: 15px 0; display: inline-block; min-width: 200px;">
                <strong>Vendedor:</strong> ${order.seller_nickname}
            </div>
            
            <div>Observaciones:</div>
            <label>
                <textarea name="observaciones" id="observaciones" cols="50" rows="2" class="campoDeEntrada"></textarea>
            </label>
            <br><br>
            <fieldset id="campoDeControl">
                <legend style="text-align: left;">Controló</legend>
                <div><input type="checkbox" class="check"><label>Javi</label></div>
                <div><input type="checkbox" class="check"><label>Lu</label></div>
                <div><input type="checkbox" class="check"><label>Rodri</label></div>
                <div><input type="checkbox" class="check"><label>Magenta</label></div>
            </fieldset>

            <!-- 🆕 SECCIÓN DEL CÓDIGO DE BARRAS -->
            <div class="barcode-section">
                <svg id="barcode"></svg>
                <div class="barcode-number">${numeroOperacion}</div>
            </div>
        </main>

        <!-- 🆕 Script que genera el código de barras al cargar la página -->
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                try {
                    JsBarcode("#barcode", "${numeroOperacion}", {
                        format: "CODE128",
                        width: 2,
                        height: 80,
                        displayValue: false,
                        margin: 10,
                        background: "#ffffff",
                        lineColor: "#000000"
                    });
                } catch (e) {
                    console.error("Error generando barcode:", e);
                    document.getElementById("barcode").outerHTML = 
                        '<div style="color:red;">Error al generar el código de barras</div>';
                }
            });
        </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(fullHtml);
    printWindow.document.close();
  } else {
    alert("No se pudo abrir la ventana de impresión. ¿Bloqueador de ventanas emergentes?");
  }
};