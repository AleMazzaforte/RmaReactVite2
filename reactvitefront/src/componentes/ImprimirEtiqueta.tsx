import { useState, useRef } from "react";
import { sweetAlert } from "./utilidades/SweetAlertWrapper"; // Importar sweetAlert
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import Loader from "./utilidades/Loader";
import { jsPDF } from "jspdf";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from './utilidades/Urls';

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  provincia: string;
  ciudad: string;
  domicilio: string;
  telefono: string;
  transporte: string;
  seguro: string;
  condicionDeEntrega: string;
  condicionDePago: string;
}

export const ImprimirEtiqueta = () => {
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [cantidadBultos, setCantidadBultos] = useState<number | null>(null);
  const [mostrarInput, setMostrarInput] = useState(false);
  const [mostrarDatosEditable, setMostrarDatosEditable] = useState(false);
  const [datosEditables, setDatosEditables] = useState<Cliente | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  let urlListarClientes = Urls.clientes.listar;
  let urlBuscarRMA = Urls.rma.buscar;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clienteSeleccionado || clienteSeleccionado.id === undefined) {
      // Mostrar alerta si no se ha seleccionado un cliente
      sweetAlert.fire({
        icon: "warning",
        title: "Cliente no seleccionado",
        text: "Por favor, seleccione un cliente antes de continuar.",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${urlBuscarRMA}?idCliente=${clienteSeleccionado.id}`
      );
      const data = await response.json();

      if (response.ok) {
        const rmaPendiente = data.some(
          (rma: { nEgreso: string | null }) => !rma.nEgreso || rma.nEgreso === null
        );

        if (rmaPendiente) {
          // Si hay RMA pendiente, mostrar alerta y permitir editar datos
          sweetAlert.fire({
            icon: "info",
            title: "RMA Pendiente",
            text: `El cliente "${clienteSeleccionado.nombre}" tiene RMA pendiente.`,
          });
        } 

        setDatosEditables(clienteSeleccionado);
        setMostrarInput(true);
        setMostrarDatosEditable(true);
      } else {
        // Si hay un error en la respuesta
        console.error("Error al buscar RMA:", data);
        sweetAlert.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Hubo un problema al buscar RMA.",
        });
      }
    } catch (error) {
      console.error("Error al buscar en la tabla RMA:", error);
      // Mostrar alerta de error en la conexión
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (datosEditables) {
      setDatosEditables({
        ...datosEditables,
        [name]: value,
      });
    }
  };

  //Funcion para dividir el domicilio si es muy largo
  function dividirDomicilio(domicilio: string): [string, string] {
    if (!domicilio) return ["", ""];

    if (domicilio.length <= 25) {
      return [domicilio, ""];
    }

    const corte = 26;
    let adelante = domicilio.indexOf(" ", corte);
    let atras = domicilio.lastIndexOf(" ", corte);

    let indice: number;

    if (adelante === -1 && atras === -1) {
      // No hay espacios → lo partimos directo en 25
      indice = 25;
    } else if (adelante === -1) {
      indice = atras;
    } else if (atras === -1) {
      indice = adelante;
    } else {
      // Elegir el más cercano
      indice =
        Math.abs(corte - atras) <= Math.abs(adelante - corte) ? atras : adelante;
    }

    const primera = domicilio.slice(0, indice).trim();
    const segunda = domicilio.slice(indice).trim();

    return [primera, segunda];
  }

  const generarZPL = (): string => {
    if (!datosEditables || cantidadBultos === null || cantidadBultos <= 0) {
      throw new Error("Datos incompletos o cantidad de bultos inválida");
    }
    const zplCodes: string[] = [];

    // === Generación automática de renglones desde 520, cada 50 ===
    const renglones: Record<string, number> = {};
    let y = 520; 
    for (let i = 1; i <= 20; i++) {
      renglones[`renglon${i}`] = y;
      y += 50;
    }
    // Esto genera: renglon1=520, renglon2=570, ..., renglon17=1320, etc.
    if (datosEditables.telefono === null) datosEditables.telefono = '';
    if ((datosEditables.domicilio === null) || datosEditables.condicionDeEntrega === 'Retira en depósito') datosEditables.domicilio = '';
    // Cálculo del desplazamiento en X según la longitud del nombre
    let offsetX = 0;
    if (datosEditables.nombre.length > 18) {
      offsetX = Math.min(datosEditables.nombre.length - 18, 5);
    }
    if (datosEditables.transporte === null) datosEditables.transporte = '';
    if (datosEditables.seguro === null) datosEditables.seguro = '';
    const [domicilioLinea1, domicilioLinea2] = dividirDomicilio(datosEditables.domicilio);

    // === Generar una etiqueta por cada bulto ===
    for (let i = 1; i <= cantidadBultos; i++) {
      const zpl = `
^XA
^PW800
^LL1520
^CI28
^LH0,20

// ==============================================
// BLOQUE SUPERIOR (RESERVADO) - NADA AQUÍ
// ==============================================

// --- DATOS DEL DESTINATARIO ---
^FO${offsetX},400^A0N,55,55^FB760,1,0,C^FD${datosEditables.nombre}^FS 
^FO75,${renglones.renglon1}^A0N,38,38^FDCUIT: ${datosEditables.cuit}^FS
^FO75,${renglones.renglon2}^A0N,38,38^FDProvincia: ${datosEditables.provincia}^FS
^FO75,${renglones.renglon3}^A0N,38,38^FDCiudad: ${datosEditables.ciudad}^FS
^FO75,${renglones.renglon4}^A0N,38,38^FDDomicilio: ${domicilioLinea1}^FS
^FO75,${renglones.renglon5}^A0N,38,38^FD${domicilioLinea2}^FS
^FO75,${renglones.renglon6}^A0N,38,38^FDTeléfono: ${datosEditables.telefono}^FS
^FO75,${renglones.renglon7}^A0N,38,38^FDTransporte: ${datosEditables.transporte}^FS
^FO75,${renglones.renglon8}^A0N,38,38^FDSeguro: ${datosEditables.seguro}^FS
^FO75,${renglones.renglon9}^A0N,38,38^FD${datosEditables.condicionDeEntrega}^FS
^FO76,${renglones.renglon9}^A0N,38,38^FD${datosEditables.condicionDeEntrega}^FS
^FO75,${renglones.renglon10}^A0N,38,38^FD${datosEditables.condicionDePago}^FS
^FO76,${renglones.renglon10}^A0N,38,38^FD${datosEditables.condicionDePago}^FS


// Aquí no imprimimos nada, solo dejamos espacio visual en el diseño

// --- DATOS DEL REMITENTE ---
^FO75,${renglones.renglon12}^A0N,38,38^FDRte: Femex S.A.^FS
^FO75,${renglones.renglon13}^A0N,38,38^FDCUIT: 30-71130830-6^FS
^FO75,${renglones.renglon14}^A0N,38,38^FDDomicilio: Duarte Quirós 4105^FS
^FO75,${renglones.renglon15}^A0N,38,38^FDProvincia: Córdoba^FS
^FO75,${renglones.renglon16}^A0N,38,38^FDCiudad: Córdoba^FS
^FO75,${renglones.renglon17}^A0N,38,38^FDTeléfono: 351 8509718^FS

// --- BULTO (centrado abajo) ---
^FO120,${renglones.renglon19}^A0N,75,75^FB560,1,0,C^FDBulto ${i} de ${cantidadBultos}^FS

^XZ`.trim();

      zplCodes.push(zpl);
    }

    return zplCodes.join('\n\n');
  }
  const generarPDF = () => {
    try {
      if (!datosEditables || cantidadBultos === null || cantidadBultos <= 0) {
        sweetAlert.fire({
          icon: "error",
          title: "Datos incompletos",
          text: "Por favor, complete todos los campos antes de generar el PDF.",
        });
        return;
      }

      // Crear un nuevo PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [100, 170] // Tamaño aproximado de una etiqueta Zebra
      });

      // Configuración de estilo
      const styles = {
        title: {
          fontSize: 17,
          fontStyle: 'bold' as const,
          textColor: [0, 0, 0] as [number, number, number],
          fontFamily: 'helvetica'
        },
        subtitle: {
          fontSize: 14,
          textColor: [0, 0, 0] as [number, number, number],
          fontFamily: 'helvetica'
        },
        header: {
          fontSize: 14,
          fontStyle: 'bold' as const,
          textColor: [0, 0, 0] as [number, number, number],
          fontFamily: 'helvetica'
        },
        normal: {
          fontSize: 12,
          textColor: [0, 0, 0] as [number, number, number],
          fontFamily: 'helvetica'
        }
      };

      // === Ajuste de margen izquierdo para el nombre en PDF ===
      let offsetX = 0;
      if (datosEditables.nombre.length > 18) {
        offsetX = Math.min(datosEditables.nombre.length - 18, 5);
      }
      const [domicilioLinea1, domicilioLinea2] = dividirDomicilio(datosEditables.domicilio);

      const marginLeft = 15;
      let y = 20;

      if (datosEditables.telefono === null) datosEditables.telefono = "";
      if (datosEditables.transporte === null) datosEditables.transporte = "";
      if (datosEditables.seguro === null) datosEditables.seguro = "";
      if (datosEditables.condicionDeEntrega === null) datosEditables.condicionDeEntrega = "";
      if (datosEditables.condicionDePago === null) datosEditables.condicionDePago = "";
      if (datosEditables.domicilio === null) datosEditables.domicilio = "";
      if (datosEditables.cuit === null) datosEditables.cuit = "";
      // Generar una página por cada bulto
      for (let i = 1; i <= cantidadBultos; i++) {
        if (i > 1) {
          doc.addPage([100, 170], "portrait");
          y = 20; // Resetear posición Y para nueva página
        }

        // Título (nombre del cliente)
        doc.setFontSize(styles.title.fontSize);
        doc.setFont(styles.title.fontFamily, styles.title.fontStyle);
        doc.setTextColor(...styles.title.textColor);
        doc.text(datosEditables.nombre, 50 - offsetX, y, { align: 'center' });
        y += 12;

        // Datos del cliente
        doc.setFontSize(styles.normal.fontSize);
        doc.setFont(styles.normal.fontFamily, 'normal');
        doc.setTextColor(...styles.normal.textColor);

        doc.text(`CUIT: ${datosEditables.cuit}`, marginLeft, y);
        y += 8;
        doc.text(`Provincia: ${datosEditables.provincia}`, marginLeft, y);
        y += 8;
        doc.text(`Ciudad: ${datosEditables.ciudad}`, marginLeft, y);
        y += 8;
        doc.text(`Domicilio: ${domicilioLinea1}`, marginLeft, y);
        y += 8;
        if (domicilioLinea2) {
          doc.text(domicilioLinea2, marginLeft, y);
          y += 8;
        }
        doc.text(`Teléfono: ${datosEditables.telefono}`, marginLeft, y);
        y += 8;
        doc.text(`Transporte: ${datosEditables.transporte}`, marginLeft, y);
        y += 8;
        doc.text(`Seguro: ${datosEditables.seguro}`, marginLeft, y);
        y += 8;
        doc.text(`Entrega: ${datosEditables.condicionDeEntrega}`, marginLeft, y);
        y += 8;
        doc.text(`Pago: ${datosEditables.condicionDePago}`, marginLeft, y);
        y += 12;

        // Línea divisoria
        doc.line(marginLeft, y, 85, y);
        y += 8;

        // Datos de Femex
        doc.setFontSize(styles.subtitle.fontSize);
        doc.text("Rte: Femex S.A.", marginLeft, y);
        y += 8;
        doc.text("CUIT: 30-71130830-6", marginLeft, y);
        y += 8;
        doc.text("Domicilio: Duarte Quirós 4105", marginLeft, y);
        y += 8;
        doc.text("Provincia: Córdoba", marginLeft, y);
        y += 8;
        doc.text("Ciudad: Córdoba", marginLeft, y);
        y += 8;
        doc.text("Teléfono: 351 8509718", marginLeft, y);
        y += 12;

        // Número de bulto
        doc.setFontSize(styles.header.fontSize);
        doc.setFont(styles.header.fontFamily, styles.header.fontStyle);
        doc.text(`Bulto ${i} de ${cantidadBultos}`, 50, y, { align: 'center' });
      }

      // Generar URL para el PDF
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Abrir en nueva pestaña
      window.open(pdfUrl, '_blank');

      // Liberar memoria después de un tiempo
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);

    } catch (error) {
      console.error("Error al generar PDF:", error);
      // Mostrar alerta de error
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el PDF. Verifique los datos.",
      });
    }
  };

  const descargarArchivoZPL = () => {
    try {
      const zplToPrint = generarZPL();

      const blob = new Blob([zplToPrint], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `etiqueta_${datosEditables?.nombre.replace(
        /\s+/g,
        "_"
      )}_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al generar el archivo ZPL:", error);
      // Mostrar alerta de error
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el archivo ZPL. Verifique los datos.",
      });
    }
  };
  return (
    <Contenedor>
      <h2 className="text-2xl font-semibold text-gray-700 mb-8 text-center">
        Imprimir etiqueta
      </h2>
      <form
        id="formEtiqueta"
        className="space-y-6"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cliente
          </label>
          <BusquedaClientes
            endpoint={urlListarClientes}
            onClienteSeleccionado={setClienteSeleccionado}
            campos={["nombre"]}
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg"
        >
          {loading ? "Cargando..." : "Verificar RMA"}
        </button>
      </form>
      {loading && <Loader />}
      {mostrarInput && (
        <div>
          {mostrarDatosEditable && datosEditables && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={datosEditables?.nombre || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT
                </label>
                <input
                  type="text"
                  name="cuit"
                  value={datosEditables?.cuit || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domicilio
                </label>
                <input
                  type="text"
                  name="domicilio"
                  value={datosEditables?.domicilio || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  name="ciudad"
                  value={datosEditables?.ciudad || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provincia
                </label>
                <input
                  type="text"
                  name="provincia"
                  value={datosEditables?.provincia || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  name="telefono"
                  value={datosEditables?.telefono || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transporte
                </label>
                <input
                  type="text"
                  name="transporte"
                  value={datosEditables?.transporte || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seguro
                </label>
                <input
                  type="text"
                  name="seguro"
                  value={datosEditables?.seguro || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 bg-green-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición de Entrega
                </label>
                <input
                  type="text"
                  name="condicionDeEntrega"
                  value={datosEditables?.condicionDeEntrega || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condición de Pago
                </label>
                <input
                  type="text"
                  name="condicionDePago"
                  value={datosEditables?.condicionDePago || ""}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex space-x-4">
            <div className="flex-1">
              <input
                min={1}
                placeholder="Cantidad de bultos"
                type="number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                value={cantidadBultos || ""}
                onChange={(e) => setCantidadBultos(Number(e.target.value))}
              />
            </div>

          </div>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={descargarArchivoZPL}
              className="flex-1 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black"
            >
              Descargar ZPL (.txt)
            </button>
            <button
              onClick={generarPDF}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black"
            >
              Generar PDF
            </button>

          </div>
        </div>
      )}
    </Contenedor>
  );
};
