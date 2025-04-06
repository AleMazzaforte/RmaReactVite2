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

  const generarPDF = async () => {
    if (!datosEditables || cantidadBultos === null || cantidadBultos <= 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Ingrese una cantidad de bultos válida y verifique los datos del cliente.",
      });
      return;
    }

    const doc = new jsPDF(
      paginaHorizontal ? "landscape" : "p",
      "mm",
      paginaHorizontal ? [210, 150] : [100, 190]
    );

    const marginTop = 40;
    const fontSize = paginaHorizontal ? 12 : 16;

    for (let i = 1; i < cantidadBultos + 1; i++) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.text(
        `${datosEditables.nombre}`,
        doc.internal.pageSize.getWidth() / 2,
        marginTop,
        { align: "center" }
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      const lineHeight = 1;

      doc.text(
        `Domicilio: ${datosEditables.domicilio}`,
        14,
        marginTop + 10 + lineHeight
      );
      doc.text(
        `Ciudad: ${datosEditables.ciudad}, ${datosEditables.provincia}`,
        14,
        marginTop + 18 + lineHeight
      );
      doc.text(
        `Teléfono: ${datosEditables.telefono}`,
        14,
        marginTop + 26 + lineHeight
      );
      doc.text(
        `Transporte: ${datosEditables.transporte}`,
        14,
        marginTop + 34 + lineHeight
      );
      doc.text(
        `Seguro: ${datosEditables.seguro}`,
        14,
        marginTop + 42 + lineHeight
      );
      doc.text(
        `Entrega a ${datosEditables.condicionDeEntrega}`,
        14,
        marginTop + 50 + lineHeight
      );
      doc.text(
        `Pago en ${datosEditables.condicionDePago}`,
        14,
        marginTop + 58 + lineHeight
      );

      doc.text(`------------------------`, 14, marginTop + 68 + lineHeight);

      // Datos del remitente
      doc.text(`Rte: Femex S.A.`, 14, marginTop + 80 + lineHeight);
      doc.text(`CUIT: 30-71130830-6`, 14, marginTop + 88 + lineHeight);
      doc.text(
        `Domicilio: Duarte Quirós 4105`,
        14,
        marginTop + 96 + lineHeight
      );
      doc.text(`Provincia: Córdoba`, 14, marginTop + 104 + lineHeight);
      doc.text(`Ciudad: Córdoba`, 14, marginTop + 112 + lineHeight);
      doc.text(`Teléfono: 351 8509718`, 14, marginTop + 120 + lineHeight);

      doc.setFontSize(16);
      doc.text(
        `Bulto ${i} de ${cantidadBultos}`,
        doc.internal.pageSize.getWidth() / 2,
        marginTop + 140,
        { align: "center" }
      );

      if (i < cantidadBultos) doc.addPage();
    }

    doc.output("dataurlnewwindow");
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
          <button
            onClick={generarPDF}
            className="mt-2 w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg"
          >
            Generar etiquetas
          </button>
        </div>
      )}
    </Contenedor>
  );
};
