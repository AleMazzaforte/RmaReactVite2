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

  // Sólo tomamos la **primera** orden (asumimos que se imprime de a una constancia a la vez)
  // Si necesitas imprimir varias, habría que hacer una página por orden, pero tu HTML original es para una.
  const order = selectedRetiroOrders[0];

  // Formatear productos como líneas de texto (sin inputs, porque en tu HTML original no son editables)
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
  const fechaHoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recibo de venta - ${numeroOperacion}</title>
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
            @media print {
                body {
                    margin: 0;
                    padding: 0;
                }
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
            
            <ul style="list-style: none; padding: 0; margin: 15px 0;">
                <li style="margin: 15px;"><input type="checkbox" class="check">Tienda IT</li>
                <li style="margin: 15px;"><input type="checkbox" class="check">Blow SAS</li>
                <li><input type="checkbox" class="check">Tienda Nube</li>
            </ul>
            <div>Observaciones:</div>
            <label>
                
                <textarea name="observaciones" id="observaciones" cols="50" rows="2" class="campoDeEntrada"></textarea>
            </label>
            <br><br>
            <fieldset id="campoDeControl">
                <legend style="text-align: left;">Controló</legend>
                <div><input type="checkbox" class="check"><label>César</label></div>
                <div><input type="checkbox" class="check"><label>Javi</label></div>
                <div><input type="checkbox" class="check"><label>Lu</label></div>
                <div><input type="checkbox" class="check"><label>Rodri</label></div>
                <div><input type="checkbox" class="check"><label>Magenta</label></div>
            </fieldset>
        </main>
        <!-- Sin window.print() automático -->
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