import React, { useState, useRef, useEffect } from "react";
import Swal from "sweetalert2";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import Loader from "./utilidades/Loader";
import { jsPDF } from "jspdf";
import { Contenedor } from "./utilidades/Contenedor";

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

interface TransporteData {
  idTransporte: number;
  nombre: string;
  telefono: number;
  direccionLocal: string;
}

// Agrega esto en tu archivo o en declarations.d.ts
declare global {
  interface Navigator {
    usb?: {
      requestDevice: (options: {
        filters: { vendorId: number }[];
      }) => Promise<USBDevice>;
      getDevices: () => Promise<USBDevice[]>;
    };
  }
}

interface USBDevice {
  open: () => Promise<void>;
  selectConfiguration: (configurationValue: number) => Promise<void>;
  claimInterface: (interfaceNumber: number) => Promise<void>;
  transferOut: (
    endpointNumber: number,
    data: BufferSource
  ) => Promise<USBOutTransferResult>;
  close: () => Promise<void>;
  vendorId: number;
  productId: number;
}

interface USBOutTransferResult {
  bytesWritten: number;
  status: string;
}

export const ImprimirEtiqueta = () => {
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [cantidadBultos, setCantidadBultos] = useState<number | null>(null);
  const [mostrarInput, setMostrarInput] = useState(false);
  const [mostrarDatosEditable, setMostrarDatosEditable] = useState(false);
  const [paginaHorizontal, setPaginaHorizontal] = useState(false);
  const [datosEditables, setDatosEditables] = useState<Cliente | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  let urlListarClientes = "https://rma-back.vercel.app/listarCliente";
  let urlListartransporte = "https://rma-back.vercel.app/buscarTransporte";
  let urlBuscarRMA = "https://rma-back.vercel.app/buscarRMA";

  if (window.location.hostname === "localhost") {
    urlListarClientes = "http://localhost:8080/listarCliente";
    urlListartransporte = "http://localhost:8080/buscarTransporte";
    urlBuscarRMA = "http://localhost:8080/buscarRMA";
  }

  // Función para obtener el nombre del transporte
  const obtenerNombreTransporte = async (
    transporteId: string
  ): Promise<string> => {
    if (!transporteId) return "No disponible";

    try {
      const respuesta = await fetch(`${urlListartransporte}`);
      const transporteData: TransporteData[] = await respuesta.json();
      if (respuesta.ok && transporteData) {
        const transporteEncontrado = transporteData.find(
          (transporte) => transporte.idTransporte === Number(transporteId)
        );

        return transporteEncontrado
          ? transporteEncontrado.nombre
          : "No disponible";
      } else {
        return "No disponible";
      }
    } catch (error) {
      console.error("Error al obtener el transporte:", error);
      return "Error al obtener transporte";
    }
  };

  // Efecto para actualizar el nombre del transporte cuando se selecciona un cliente
  useEffect(() => {
    const actualizarNombreTransporte = async () => {
      if (clienteSeleccionado && clienteSeleccionado.transporte) {
        const nombreTransporte = await obtenerNombreTransporte(
          clienteSeleccionado.transporte
        );
        setDatosEditables((prevState) => ({
          ...prevState!,
          transporte: nombreTransporte,
        }));
      }
    };

    actualizarNombreTransporte();
  }, [clienteSeleccionado]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Por favor, seleccione un cliente antes de generar la etiqueta.",
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
          (rma: any) => !rma.nEgreso || rma.nEgreso === null
        );

        if (rmaPendiente) {
          Swal.fire({
            icon: "warning",
            title: "RMA Pendiente",
            text: `El cliente "${clienteSeleccionado.nombre}" tiene RMA pendiente de entrega.`,
          });
        } else {
          Swal.fire({
            icon: "success",
            title: "Generar etiqueta",
            text: `No hay RMA pendiente para el cliente "${clienteSeleccionado.nombre}".`,
          });
        }

        setDatosEditables(clienteSeleccionado);
        const nombreTransporte = await obtenerNombreTransporte(
          clienteSeleccionado.transporte
        );
        setDatosEditables((prevState) => ({
          ...prevState!,
          transporte: nombreTransporte,
        }));
        setMostrarInput(true);
        setMostrarDatosEditable(true);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Hubo un problema al buscar en la tabla RMA.",
        });
      }
    } catch (error) {
      console.error("Error al buscar en la tabla RMA:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Hubo un problema al buscar en la tabla RMA.",
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

  const generarZPL = (): string => {
    if (!datosEditables || cantidadBultos === null || cantidadBultos <= 0) {
      throw new Error("Datos incompletos o cantidad de bultos inválida");
    }

    const zplCodes = [];
    const desplazamientoVertical = 320; // 4 cm en dots (203 DPI)

    for (let i = 1; i <= cantidadBultos; i++) {
      let zpl = `
            ^XA
            ^PW800       // Ancho: 800 dots (10 cm)
            ^LL1520      // Longitud total: 1200 + 320 = 1520 dots (15 cm + área no imprimible)
            ^FO20,${320 + 20}^A0N,40,40^FD${datosEditables.nombre}^FS
            ^FO20,${320 + 70}^A0N,30,30^FDDomicilio: ${datosEditables.domicilio}^FS
            ^FO20,${320 + 110}^A0N,30,30^FDCiudad: ${datosEditables.ciudad}, ${
                    datosEditables.provincia
                  }^FS
            ^FO20,${320 + 150}^A0N,30,30^FDTeléfono: ${datosEditables.telefono}^FS
            ^FO20,${320 + 190}^A0N,30,30^FDTransporte: ${datosEditables.transporte}^FS
            ^FO20,${320 + 230}^A0N,30,30^FDSeguro: ${datosEditables.seguro}^FS
            ^FO20,${320 + 270}^A0N,30,30^FDEntrega a ${datosEditables.condicionDeEntrega}^FS
            ^FO20,${320 + 310}^A0N,30,30^FDPago en ${datosEditables.condicionDePago}^FS
            ^FO20,${320 + 350}^A0N,30,30^FD------------------------^FS
            ^FO20,${320 + 390}^A0N,30,30^FDRte: Femex S.A.^FS
            ^FO20,${320 + 430}^A0N,30,30^FDCUIT: 30-71130830-6^FS
            ^FO20,${320 + 470}^A0N,30,30^FDDomicilio: Duarte Quirós 4105^FS
            ^FO20,${320 + 510}^A0N,30,30^FDProvincia: Córdoba^FS
            ^FO20,${320 + 550}^A0N,30,30^FDCiudad: Córdoba^FS
            ^FO20,${320 + 590}^A0N,30,30^FDTeléfono: 351 8509718^FS
            ^FO20,${320 + 650}^A0N,50,50^FDBulto ${i} de ${cantidadBultos}^FS
            ^XZ
          `;
      zplCodes.push(zpl);
    }

    return zplCodes.join("\n");
  };

  const imprimirDirectamenteUSB = async () => {
    try {
      if (!datosEditables || cantidadBultos === null || cantidadBultos <= 0) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Ingrese una cantidad de bultos válida y verifique los datos del cliente.",
        });
        return;
      }

      if (!navigator.usb) {
        throw new Error("Web USB API no soportada en este navegador");
      }

      // Solicitar dispositivo
      const device = await navigator.usb.requestDevice({
        filters: [{ vendorId: 0x0a5f }], // Zebra Technologies vendor ID
      });

      await device.open();
      await device.selectConfiguration(1);
      await device.claimInterface(0);

      // Generar el código ZPL
      const zplToPrint = generarZPL();

      // Convertir el texto a ArrayBuffer
      const encoder = new TextEncoder();
      const data = encoder.encode(zplToPrint);

      // Enviar a la impresora
      await device.transferOut(1, data);

      await device.close();

      Swal.fire({
        icon: "success",
        title: "Impresión exitosa",
        text: `Se enviaron ${cantidadBultos} etiquetas.`,
      });
    } catch (error) {
      console.error("Error al imprimir:", error);
      Swal.fire({
        icon: "error",
        title: "Error de impresión",
        text: "No se pudo conectar con la impresora. Asegúrese de que está conectada por USB y tiene los drivers instalados.",
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
      Swal.fire({
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
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
            <div>
              <button
                type="button"
                onClick={() => setPaginaHorizontal(!paginaHorizontal)}
                className="w-full py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg"
              >
                En construcción
              </button>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={imprimirDirectamenteUSB}
              className="flex-1 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg"
            >
              Imprimir directamente (USB)
            </button>
            <button
              onClick={descargarArchivoZPL}
              className="flex-1 py-2 px-4 bg-green-600 text-white font-semibold rounded-lg"
            >
              Descargar ZPL (.txt)
            </button>
          </div>
        </div>
      )}
    </Contenedor>
  );
};
