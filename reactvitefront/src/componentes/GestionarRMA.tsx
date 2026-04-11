import { useState } from "react";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import { TablaListarRmas } from "./TablaListarRmas";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import { Contenedor } from "./utilidades/Contenedor";
import Loader from "./utilidades/Loader";
import Urls from "./utilidades/Urls";
import Axios from "axios";
import ExcelJS from "exceljs";

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

interface Rma {
  idRma: string;
  modelo: string;
  cantidad: number;
  marca: string;
  solicita: string;
  opLote: string;
  vencimiento: string;
  seEntrega: string;
  seRecibe: string;
  observaciones: string;
  nIngreso: string;
  nEgreso: string;
}

interface RmaInforme {
  idRma: string
  cantidad: number
  marca: string
}

interface RmaAgrupado {
  cliente: string;
  rmas: Rma[];
}

export const GestionarRMA = (): JSX.Element => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [rmas, setRmas] = useState<Rma[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [rmasNoEntregados, setRmasNoEntregados] = useState<RmaAgrupado[]>([]);
  const [rmaInforme, setRmaTnfornme] = useState<RmaInforme[]>([])
  // Estados para el reporte
  const [reporteVisible, setReporteVisible] = useState<boolean>(false);
  const [reporteResumen, setReporteResumen] = useState<Array<{sku: string, marca: string, cantidad: number}>>([]);
  const [reporteFechas, setReporteFechas] = useState<{desde: string, hasta: string} | null>(null);

// Helper: parsea "DD/MM/YYYY" → Date (para comparar)
  const parsearFechaSolicita = (fecha: string): Date | null => {
  if (!fecha || fecha.length !== 10) return null;
  const [d, m, y] = fecha.split('/');
  const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return isNaN(parsed.getTime()) ? null : parsed;
  };

  const generarResumen = (desde: string, hasta: string) => {
  // Convertimos las fechas de input (YYYY-MM-DD) a objetos Date para comparar
  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  // Ajustamos hasta para que incluya todo el día (23:59:59)
  fechaHasta.setHours(23, 59, 59, 999);

  // Filtramos y agrupamos
  const agrupado = rmas
    .filter(rma => {
      const fecha = parsearFechaSolicita(rma.solicita);
      return fecha && fecha >= fechaDesde && fecha <= fechaHasta;
    })
    .reduce((acc, rma) => {
      const key = `${rma.modelo}|${rma.marca}`; // Clave única SKU+Marca
      if (!acc[key]) {
        acc[key] = { sku: rma.modelo, marca: rma.marca, cantidad: 0 };
      }
      acc[key].cantidad += Number(rma.cantidad) || 0;
      return acc;
    }, {} as Record<string, {sku: string, marca: string, cantidad: number}>);

  // Convertimos a array y ordenamos por cantidad (desc)
  const resultado = Object.values(agrupado).sort((a, b) => b.cantidad - a.cantidad);
  
  setReporteResumen(resultado);
  setReporteFechas({ desde, hasta });
  setReporteVisible(true);

  // Feedback visual
  sweetAlert.fire({
    title: "✅ Reporte generado",
    text: `Se encontraron ${resultado.length} SKUs en el período.`,
    icon: "success",
    timer: 1500,
    showConfirmButton: false
  });
};

const abrirModalReporte = () => {
  sweetAlert.fire({
    title: "📅 Generar reporte por período",
    // ✅ Usamos html directamente en lugar de content
    html: `
      <div style="text-align: left; margin-top: 10px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Desde:</label>
        <input type="date" id="fechaDesde" class="swal2-input" style="width: 100%; margin-bottom: 15px;" />
        <label style="display: block; margin-bottom: 5px; font-weight: 500;">Hasta:</label>
        <input type="date" id="fechaHasta" class="swal2-input" style="width: 100%;" />
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Generar reporte",
    cancelButtonText: "Cancelar",
    // ✅ La validación se mantiene igual
    preConfirm: () => {
      const desdeInput = document.getElementById('fechaDesde') as HTMLInputElement;
      const hastaInput = document.getElementById('fechaHasta') as HTMLInputElement;
      const desde = desdeInput?.value;
      const hasta = hastaInput?.value;
      
      if (!desde || !hasta) {
        sweetAlert.fire({
          icon: 'warning',
          title: 'Faltan datos',
          text: 'Seleccioná ambas fechas',
          confirmButtonColor: '#3085d6'
        });
        return false;
      }
      if (new Date(desde) > new Date(hasta)) {
        sweetAlert.fire({
          icon: 'warning',
          title: 'Fechas inválidas',
          text: '"Desde" no puede ser mayor que "Hasta"',
          confirmButtonColor: '#3085d6'
        });
        return false;
      }
      return { desde, hasta };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value && typeof result.value === 'object') {
      const { desde, hasta } = result.value as { desde: string; hasta: string };
      generarResumen(desde, hasta);
    }
  });
};

const exportarResumenExcel = () => {
  if (reporteResumen.length === 0 || !cliente) {
    return sweetAlert.fire({
      title: "Sin datos",
      text: "No hay información para exportar.",
      icon: "info",
      confirmButtonColor: "#3085d6"
    });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resumen RMA");

    // Columnas
    worksheet.columns = [
      { header: "SKU", key: "sku", width: 30 },
      { header: "Cantidad Total", key: "cantidad", width: 20 }
    ];

    // Datos
    reporteResumen.forEach(item => {
      worksheet.addRow({
        sku: item.sku,
        cantidad: item.cantidad
      });
    });

    // Estilos header
    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4A90E2" }
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Alinear cantidades a la derecha
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(3).alignment = { horizontal: "right" };
        row.getCell(3).font = { bold: true };
      }
    });

    // Nombre del archivo: resumen-rma-[Cliente]-[fecha].xlsx
    const nombreCliente = cliente.nombre
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    const hoy = new Date();
    const fechaArchivo = `${hoy.getFullYear()}${String(hoy.getMonth()+1).padStart(2,'0')}${String(hoy.getDate()).padStart(2,'0')}`;
    const nombreArchivo = `resumen-rma-${nombreCliente}-${fechaArchivo}.xlsx`;

    // Descargar
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      URL.revokeObjectURL(url);
    });

    sweetAlert.fire({
      title: "📥 Exportado",
      text: `Archivo "${nombreArchivo}" generado.`,
      icon: "success",
      timer: 2000,
      showConfirmButton: false
    });

  } catch (error) {
    console.error("Error al exportar:", error);
    sweetAlert.fire({
      title: "Error",
      text: "No se pudo generar el Excel.",
      icon: "error",
      confirmButtonColor: "#d33"
    });
  }
};

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setLoading(true);
    setCliente(cliente);
    setMostrarFormulario(false);
    buscarRmas(cliente.id);
  };

  const buscarRmas = async (clienteId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${Urls.rma.getPorCliente}/${clienteId}`);
      const data = await response.json();

      if (data.length > 0) {
        setRmas(data);
      } else {
        // Si no hay RMA asociados al cliente, mostrar alerta
        sweetAlert
          .fire({
            title: "Sin RMA",
            text: "Este cliente no tiene RMA asociado.",
            icon: "warning",
            confirmButtonText: "Aceptar",
          })
          .then(() => {
            cambiarCliente();
          });
      }
    } catch (error) {
      console.error("Error al buscar RMA:", error);
      setRmas([]);
    } finally {
      setLoading(false);
    }
  };
  

  const cambiarCliente = () => {
    setMostrarFormulario(true);
    setCliente(null);
    setRmas([]);
  };

  const handleActualizar = async (rmaActualizada: Rma) => {

    setRmas(
      rmas.map((rma) =>
        rma.idRma === rmaActualizada.idRma ? rmaActualizada : rma
      )
    );

    try {
      setLoading(true);
      const response = await fetch(
        `${Urls.rma.actualizarProducto}/${rmaActualizada.idRma}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rmaActualizada),
        }
      );

      if (response.ok) {
        const updatedRma = await response.json();
        // Mostrar alerta de éxito
        sweetAlert.fire({
          title: "Éxito",
          text: updatedRma.message,
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
      } else {
        // Si hay un error en la respuesta
        sweetAlert.fire({
          title: "Error",
          text: response.statusText || "Hubo un problema al actualizar el RMA",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error al actualizar el RMA:", error);
    }finally {
      setLoading(false);
    }

  };

  const handleEliminar = async (idRma: string | undefined) => {
    if (!idRma) {
      return sweetAlert.fire({
        title: "Error",
        text: "El ID del RMA no es válido.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }

    const result = await sweetAlert.fire({
      title: "Estas seguro?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await fetch(`${Urls.rma.eliminar}/${idRma}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Si la respuesta es exitosa
        sweetAlert.fire({
          title: "Éxito",
          text: data.message,
          icon: "success",
          confirmButtonColor: "#3085d6",
        });

        setRmas(rmas.filter((rma) => rma.idRma !== idRma));
      } else {
        // Si hay un error en la respuesta
        console.error("Error al eliminar RMA:", data);
        sweetAlert.fire({
          title: "Error",
          text: data.message || "Hubo un problema al eliminar el RMA.",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error al eliminar RMA:", error);
      // Mostrar alerta de error en la conexión
      sweetAlert.fire({
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }finally {
      setLoading(false);
    }
  };

  const handleCargarRmaNoEntregado = async () => {
    setLoading(true);
    try {
      const response = await Axios.get<RmaAgrupado[]>(
        Urls.rma.cargarRmaNoEntregado
      );
      if (response.status === 200) {
        setRmasNoEntregados(response.data);
        if (response.data.length === 0) {
          sweetAlert.fire({
            title: "Sin RMA pendientes",
            text: "No hay RMA no entregados.",
            icon: "info",
            confirmButtonColor: "#3085d6",
          });
        }
      } else {
        sweetAlert.fire({
          title: "Error",
          text: "Hubo un problema al cargar el RMA pendiente.",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error al cargar RMA pediente:", error);
      sweetAlert.fire({
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
        icon: "error",
        confirmButtonColor: "#d33",
      });
      setRmasNoEntregados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInformeMensual = async () => {
  setLoading(true);
  try {
    // 1. Calcular fechas: primer día del mes actual hasta hoy
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    // Formatear a YYYY-MM-DD para enviar a la API
    const formatoFecha = (fecha: Date) => {
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const desde = formatoFecha(primerDiaMes);
    const hasta = formatoFecha(hoy);

    // 2. Petición al backend con las fechas como query params
    const response = await Axios.get<RmaInforme[]>(
      `${Urls.rma.informeMensual}?desde=${desde}&hasta=${hasta}`
    );

    // 3. Validar y guardar la respuesta
    if (response.status === 200 && response.data.length > 0) {
      setRmaTnfornme(response.data);
      sweetAlert.fire({
        title: "Informe listo",
        text: `Se encontraron ${response.data.length} SKUs en el período.`,
        icon: "success",
        confirmButtonColor: "#3085d6",
      });
    } else {
      // Si la respuesta está vacía
      setRmaTnfornme([]);
      sweetAlert.fire({
        title: "Sin datos",
        text: "No hay RMA registrados en el período seleccionado.",
        icon: "info",
        confirmButtonColor: "#3085d6",
      });
    }
  } catch (error) {
    console.error("Error al generar informe mensual:", error);
    setRmaTnfornme([]);
    sweetAlert.fire({
      title: "Error",
      text: "No se pudo generar el informe. Verificá la conexión o intentá más tarde.",
      icon: "error",
      confirmButtonColor: "#d33",
    });
  } finally {
    setLoading(false);
  }
};

const handleExportarExcel = async (marcaFiltro?: string) => {
  // Filtrar por marca si se especifica, sino usar todos
  const datosFiltrados = marcaFiltro 
    ? rmaInforme.filter(item => item.marca === marcaFiltro)
    : rmaInforme;

  if (datosFiltrados.length === 0) {
    return sweetAlert.fire({
      title: "Sin datos",
      text: marcaFiltro 
        ? `No hay RMA de la marca "${marcaFiltro}" para exportar.`
        : "No hay información para exportar.",
      icon: "info",
      confirmButtonColor: "#3085d6",
    });
  }

  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("RMA Mensual");

    worksheet.columns = [
      { header: "SKU", key: "sku", width: 25 },
      { header: "Marca", key: "marca", width: 20 },
      { header: "Cantidad", key: "cantidad", width: 15 }
    ];

    datosFiltrados.forEach(item => {
      worksheet.addRow({
        sku: item.idRma,
        marca: item.marca,
        cantidad: Number(item.cantidad)
      });
    });

    // Estilos
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" }
    };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.getCell(3).alignment = { horizontal: "right" };
      }
    });

    // Nombre del archivo con la marca
    const hoy = new Date();
    const nombreMarca = marcaFiltro ? `-${marcaFiltro.toLowerCase().replace(/\s+/g, '-')}` : '';
    const nombreArchivo = `informe-rma${nombreMarca}-${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}.xlsx`;

    await workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nombreArchivo;
      link.click();
      URL.revokeObjectURL(url);
    });

    sweetAlert.fire({
      title: "Exportado",
      text: `Archivo "${nombreArchivo}" generado correctamente.`,
      icon: "success",
      confirmButtonColor: "#3085d6",
      timer: 2000,
      showConfirmButton: false
    });

  } catch (error) {
    console.error("Error al exportar Excel:", error);
    sweetAlert.fire({
      title: "Error",
      text: "No se pudo generar el archivo Excel.",
      icon: "error",
      confirmButtonColor: "#d33",
    });
  }
};

  const handleActualizarGlobal = async (rmaActualizada: Rma) => {
    // 1. Actualizar en el backend (igual que antes)
    try {
      const response = await fetch(
        `${Urls.rma.actualizarProducto}/${rmaActualizada.idRma}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rmaActualizada),
        }
      );

      if (!response.ok) throw new Error("Error al actualizar");

      // 2. Actualizar el estado local de rmasNoEntregados
      setRmasNoEntregados((prev) =>
        prev.map((grupo) => ({
          ...grupo,
          rmas: grupo.rmas.map((rma) =>
            rma.idRma === rmaActualizada.idRma ? rmaActualizada : rma
          ),
        }))
      );
      // 3. Mostrar alerta de éxito

      sweetAlert.fire({
        title: "Éxito",
        text: "RMA actualizado correctamente.",
        icon: "success",
        confirmButtonColor: "#3085d6",
      });
    } catch (error) {
      console.error("Error al actualizar RMA global:", error);
      sweetAlert.fire({
        title: "Error",
        text: "No se pudo actualizar el RMA.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  return (
    <>
      {loading && <Loader />}
      {/* Mostrar los contenedores de búsqueda SOLO si no se está viendo ninguna tabla */}
      {mostrarFormulario && rmasNoEntregados.length === 0 && (
        <div>
          <Contenedor>
            <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
              Gestión de productos por cliente
            </h1>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label
                  htmlFor="clienteSearch"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Cliente:
                </label>
                <BusquedaClientes
                  endpoint={Urls.clientes.buscar}
                  onClienteSeleccionado={handleClienteSeleccionado}
                  campos={["nombre"]}
                />
              </div>
            </form>
          </Contenedor>

          <Contenedor>
            <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
              Gestión total de productos
            </h1>
            <button
              type="button"
              onClick={handleCargarRmaNoEntregado}
              id="botonCargar"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
            >
              {loading ? "Cargando..." : "Cargar productos"}
            </button>
          </Contenedor>
          <Contenedor>
            <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
              Resumen mensual de RMA
            </h1>
            <button
              type="button"
              onClick={handleInformeMensual}
              id="botonResumen"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
            >
              {loading ? "Cargando..." : "Preparar resumen"}
            </button>
          </Contenedor>
        </div>
      )}

      {/* Tabla de RMA no entregados (vista global) */}
      {rmasNoEntregados.length > 0 && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              RMA pendientes de entrega (de todos los clientes)
            </h2>
            <button
              onClick={() => {
                setRmasNoEntregados([]);
                setMostrarFormulario(true);
              }}
              className="bg-gradient-to-b from-blue-500 to-green-500 text-white px-4 py-2 rounded focus:outline-black focus:ring focus:ring-black"
            >
              Volver
            </button>
          </div>
          <div className="space-y-6">
            {rmasNoEntregados.map((grupo, idx) => (
              <div key={idx} className="border border-gray-300 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-700 mb-2">
                  Cliente: {grupo.cliente}
                </h3>
                <TablaListarRmas
                  rmas={grupo.rmas}
                  handleActualizar={handleActualizarGlobal}
                  handleEliminar={handleEliminar}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla por cliente */}
      {!mostrarFormulario && cliente && rmas.length > 0 && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              Cliente: {cliente?.nombre}
            </h2>
            <div>
              <button
                type="button"
                onClick={abrirModalReporte}
                className="py-2 px-4 bg-gradient-to-b from-blue-500 to-green-500 mr-4 text-white font-semibold rounded-lg hover:bg-emerald-700 focus:outline-black focus:ring focus:ring-emerald-500"
              >
                📊 Reporte
              </button>

              <button
                onClick={cambiarCliente}
                className="bg-gradient-to-b from-blue-500 to-green-500 text-white px-4 py-2 rounded focus:outline-black focus:ring focus:ring-black"
              >
                Cambiar Cliente
              </button>
            </div>
          </div>
          {!loading && (
            <TablaListarRmas
              rmas={rmas}
              handleActualizar={handleActualizar}
              handleEliminar={handleEliminar}
            />
          )}
        </div>
      )}

      {/* 👇 Sección de resumen de reporte */}
{reporteVisible && reporteResumen.length > 0 && cliente && (
  <Contenedor>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-semibold text-gray-700">
        📋 Resumen: {cliente.nombre} 
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({reporteFechas?.desde} al {reporteFechas?.hasta})
        </span>
      </h3>
      <div className="flex gap-2">
        <button
          onClick={() => setReporteVisible(false)}
          className="py-1 px-3 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          ✕ Cerrar
        </button>
        <button
          onClick={exportarResumenExcel}
          className="py-1 px-3 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          📥 Descargar Excel
        </button>
      </div>
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300 rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">SKU</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Marca</th>
            <th className="py-2 px-4 border-b text-right text-sm font-semibold text-gray-700">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {reporteResumen.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b text-sm font-mono">{item.sku}</td>
              <td className="py-2 px-4 border-b text-sm">{item.marca}</td>
              <td className="py-2 px-4 border-b text-sm text-right font-bold">{item.cantidad}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td colSpan={2} className="py-2 px-4 border-t text-right text-sm font-semibold">Total:</td>
            <td className="py-2 px-4 border-t text-right text-lg font-bold text-blue-700">
              {reporteResumen.reduce((sum, item) => sum + item.cantidad, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </Contenedor>
)}

{/* Caso: reporte generado pero sin resultados */}
{reporteVisible && reporteResumen.length === 0 && (
  <Contenedor>
    <div className="text-center py-8">
      <p className="text-gray-500">No hay RMA registrados en el período seleccionado.</p>
      <button
        onClick={() => setReporteVisible(false)}
        className="mt-4 py-2 px-4 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
      >
        Volver
      </button>
    </div>
  </Contenedor>
)}

      {rmaInforme.length > 0 && (
  <Contenedor>
    <h3 className="text-lg font-semibold text-gray-700 mb-4">
      Resumen del mes ({rmaInforme.length} SKUs)
    </h3>
    
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300 rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">SKU</th>
            <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-700">Marca</th>
            <th className="py-2 px-4 border-b text-right text-sm font-semibold text-gray-700">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {rmaInforme.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="py-2 px-4 border-b text-sm">{item.idRma}</td>
              <td className="py-2 px-4 border-b text-sm">{item.marca}</td>
              <td className="py-2 px-4 border-b text-sm text-right font-medium">{item.cantidad}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="mt-4 flex justify-end gap-3">
  <button
    onClick={() => handleExportarExcel("BLOW INK")}
    className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-blue-500"
  >
    📥 Descargar Blow
  </button>
  
  <button
    onClick={() => handleExportarExcel("GNEISS")}
    className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 focus:outline-black focus:ring focus:ring-purple-500"
  >
    📥 Descargar Gneiss
  </button>
</div>
  </Contenedor>
)}
    </>
  );
};
