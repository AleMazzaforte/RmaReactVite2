import React, { useState, useEffect } from "react";
import { StockManager } from "./utilidades/StockManager";
import * as XLSX from "xlsx";
import { FiltrosInventario } from "./utilidades/FiltrosInventario";
import { GetInventarioStock } from "./utilidades/GetInventarioStock";
import { GuardarInventario } from "./utilidades/GuardarInventario";
import Swal from "sweetalert2";

interface Producto {
  id: number;
  sku: string;
  idBloque: string;
  cantSistemaFemex: number;
  cantSistemaBlow: number;
  conteoFisico: number | null;
  fechaConteo: string | null;
  observacion: string | null;
}
interface ProductoConteo {
  id: number;
  sku: string;
  conteoFisico: number | null;
}

let urlPrepararInventario = "https://rma-back.vercel.app/prepararInventario";
let urlActualizarInventario =
  "https://rma-back.vercel.app/actualizarProductoInventario";
let urlGuardarInventario = "https://rma-back.vercel.app/guardarInventario";
if (window.location.hostname === "localhost") {
  urlPrepararInventario = "http://localhost:8080/prepararInventario";
  urlActualizarInventario =
    "http://localhost:8080/actualizarProductoInventario";
  urlGuardarInventario = "http://localhost:8080/guardarInventario";
}

export const Inventario: React.FC = () => {
  const [stockManager] = useState(() => new StockManager());
  const [filtro, setFiltro] = useState("");
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState("");

  const [skuABuscar, setSkuABuscar] = useState("");
  const [mostrarModalCoincidencias, setMostrarModalCoincidencias] =
    useState(false);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");
  const [coincidenciasEncontradas, setCoincidenciasEncontradas] = useState<
    Producto[]
  >([]);
  const [mostrarNoAsignados, setMostrarNoAsignados] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState<
    { id: number; conteoFisico: number | null }[]
  >([]);

  const { productos, setProductos, setLoading, bloques, loading, error } =
    GetInventarioStock(urlPrepararInventario);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const calcularDiferencia = (producto: Producto): number => {
    const totalSistema = producto.cantSistemaFemex + producto.cantSistemaBlow;
    return producto.conteoFisico !== null
      ? producto.conteoFisico - totalSistema
      : 0;
  };

  const encontrarCoincidenciasAproximadas = (
    skuBuscado: string
  ): Producto[] => {
    if (!skuBuscado || skuBuscado.trim() === "") return [];

    const skuLower = skuBuscado.toLowerCase();

    return productos
      .filter(
        (producto) =>
          producto.sku.toLowerCase().includes(skuLower) ||
          producto.sku
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(skuLower.replace(/\s+/g, ""))
      )
      .sort((a, b) => {
        const aStartsWith = a.sku.toLowerCase().startsWith(skuLower) ? 0 : 1;
        const bStartsWith = b.sku.toLowerCase().startsWith(skuLower) ? 0 : 1;

        if (aStartsWith !== bStartsWith) {
          return aStartsWith - bStartsWith;
        }
        return a.sku.length - b.sku.length;
      });
  };

  const handleBuscarSku = () => {
    if (!skuABuscar || skuABuscar.trim() === "") return;

    const elementoExacto = document.getElementById(`sku-${skuABuscar}`);

    if (elementoExacto) {
      elementoExacto.scrollIntoView({ behavior: "smooth", block: "center" });
      elementoExacto.parentElement?.classList.add("bg-yellow-100");
      setTimeout(() => {
        elementoExacto.parentElement?.classList.remove("bg-yellow-100");
      }, 2000);
      return;
    }

    const coincidencias = encontrarCoincidenciasAproximadas(skuABuscar);

    if (coincidencias.length > 0) {
      setCoincidenciasEncontradas(coincidencias);
      setSkuSeleccionado(coincidencias[0].sku);
      setMostrarModalCoincidencias(true);
    } else {
      Swal.fire({
        icon: "warning",
        title: "Sin coincidencias",
        text: "No se encontraron coincidencias para el SKU ingresado",
      });
    }
  };

  const confirmarSeleccion = () => {
    setSkuABuscar(skuSeleccionado);
    setMostrarModalCoincidencias(false);

    setTimeout(() => {
      const elemento = document.getElementById(`sku-${skuSeleccionado}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", block: "center" });
        elemento.parentElement?.classList.add("bg-yellow-100");
        setTimeout(() => {
          elemento.parentElement?.classList.remove("bg-yellow-100");
        }, 2000);
      }
    }, 100);
  };

  const handleConteoChange = (id: number, value: string) => {
    const numericValue = value === "" ? null : Number(value);

    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === id
          ? {
              ...producto,
              conteoFisico: numericValue,
              fechaConteo:
                numericValue !== null
                  ? new Date().toISOString().split("T")[0]
                  : null,
            }
          : producto
      )
    );

    stockManager.actualizarConteoFisico(id, numericValue);

    setCambiosPendientes((prev) => {
      const cambiosFiltrados = prev.filter((cambio) => cambio.id !== id);
      if (numericValue !== null) {
        return [...cambiosFiltrados, { id, conteoFisico: numericValue }];
      }
      return cambiosFiltrados;
    });
  };

  const exportarAExcel = (productosParaExportar: Producto[]) => {
    const datosParaExportar = productosParaExportar.map((producto) => ({
      SKU: producto.sku,
      Bloque: producto.idBloque,
      "Stock Sistema Total":
        producto.cantSistemaFemex + producto.cantSistemaBlow,
      "Conteo Físico": producto.conteoFisico || 0,
      Diferencia: calcularDiferencia(producto),
    }));

    const ws = XLSX.utils.json_to_sheet(datosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");

    const fecha = new Date().toISOString().split("T")[0];
    let nombreArchivo = `Inventario_${fecha}`;

    if (mostrarNoAsignados) {
      nombreArchivo += "_NoAsignados";
    } else if (bloqueSeleccionado) {
      nombreArchivo += `_Bloque-${bloqueSeleccionado}`;
    }

    if (filtro) {
      nombreArchivo += `_Filtro-${filtro.substring(0, 10)}`;
    }

    nombreArchivo += ".xlsx";

    XLSX.writeFile(wb, nombreArchivo);
  };

  const handleGuardar = async (productosParaGuardar: ProductoConteo[]) => {
    try {
      const response = await fetch(urlGuardarInventario, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productosParaGuardar),
      });

      if (!response.ok) throw new Error("Error al guardar");

      const result = await response.json();
      Swal.fire({
        icon: "success",
        title: "Guardado exitoso",
        text: `${result.updatedCount} productos actualizados`,
      });


      setCambiosPendientes([]);
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: "No se pudo guardar los cambios.",
      });
    }
  };

  const handleBorrarConteos = async () => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Resetear conteos?",
      text: "¿Estás seguro que deseas resetear TODOS los conteos físicos a cero?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, resetear",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      // Crear array con todos los IDs y conteoFisico como 0
      const productosParaResetear = productos.map((p) => ({
        id: p.id,
        sku: p.sku,
        conteoFisico: 0, // O null si prefieres
      }));

      const response = await fetch(urlGuardarInventario, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productosParaResetear),
      });

      if (!response.ok) throw new Error("Error al resetear conteos");

      const result = await response.json();
      Swal.fire({
        icon: "success",
        title: "Conteos reseteados",
        text: `${result.updatedCount} conteos reseteados correctamente`,
      });

      // Actualizar estado local
      setProductos((prev) =>
        prev.map((p) => ({
          ...p,
          conteoFisico: 0, // O null
          fechaConteo: null,
        }))
      );
      setCambiosPendientes([]);
    } catch (error) {
      console.error("Error al resetear conteos:", error);
      Swal.fire({
        icon: "error",
        title: "Error al resetear",
        text: "Error al resetear conteos físicos.",
      });
    }
  };

  const handleFileUpload = async (file: File, empresa: "Femex" | "Blow") => {
    setLoading(true);
    try {
      const data = await readExcelFile(file);
      const skuCantidadMap = extractSkuCantidad(data);

      const productosParaGuardar = Array.from(skuCantidadMap.entries()).map(
        ([sku, cantidad]) => ({
          sku,
          cantidad,
        })
      );

      const response = await fetch(urlActualizarInventario, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productos: productosParaGuardar,
          tipoArchivo: empresa,
        }),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const result = await response.json();

      const productosActualizados = productos.map((producto) => {
        if (skuCantidadMap.has(producto.sku)) {
          const cantidad = skuCantidadMap.get(producto.sku)!;
          return {
            ...producto,
            [empresa === "Femex" ? "cantSistemaFemex" : "cantSistemaBlow"]:
              cantidad,
            fechaConteo: new Date().toISOString(),
          };
        }
        return producto;
      });

      setProductos(productosActualizados);
      Swal.fire({
        icon: "success",
        title: "Archivo procesado",
        text: `Archivo de ${empresa} procesado correctamente. ${result.updatedCount} productos actualizados.`,
      });
    } catch (error) {
      console.error(`Error al procesar archivo de ${empresa}:`, error);
      Swal.fire({
        icon: "error",
        title: "Error al guardar",
        text: `Error al procesar archivo de ${empresa}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBorrarDatos = async (tipoArchivo: "Femex" | "Blow") => {
    const { isConfirmed } = await Swal.fire({
      title: `Borrar datos de ${tipoArchivo}`,
      text: `¿Estás seguro que deseas borrar TODOS los datos de ${tipoArchivo}? Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      const response = await fetch(urlActualizarInventario, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipoArchivo,
          accion: "borrar",
        }),
      });

      if (!response.ok) throw new Error("Error en la respuesta del servidor");

      const result = await response.json();

      setProductos((prev) =>
        prev.map((producto) => ({
          ...producto,
          [tipoArchivo === "Femex" ? "cantSistemaFemex" : "cantSistemaBlow"]: 0,
          fechaConteo: new Date().toISOString(),
        }))
      );
      Swal.fire({
        icon: "success",
        title: "Datos borrados correctamente",
        text: `${result.message}`,
      });
    } catch (error) {
      console.error(`Error al borrar datos de ${tipoArchivo}:`, error);
      Swal.fire({
        icon: "error",
        title: "Error al borrar datos",
        text: `Error al borrar datos de ${tipoArchivo}`,
      });
    }
  };

  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const extractSkuCantidad = (data: any[]): Map<string, number> => {
    const map = new Map<string, number>();

    data.forEach((row) => {
      const sku =
        row["SKU"] || row["sku"] || row["Código"] || row["Código depósito"];
      const cantidad = row["Cantidad"] || row["cantidad"];

      if (sku && cantidad !== undefined) {
        map.set(sku.toString(), Number(cantidad));
      }
    });

    return map;
  };

  const productosFiltrados = productos
    .filter((p) => p.sku.toLowerCase().includes(filtro.toLowerCase()))
    .filter((p) => {
      if (bloqueSeleccionado === "") return true;
      if (bloqueSeleccionado === "No asignado") {
        return !p.idBloque || p.idBloque === "";
      }
      return p.idBloque == bloqueSeleccionado;
    })
    .sort((a, b) => {
      if (bloqueSeleccionado !== "") {
        return a.sku.localeCompare(b.sku);
      }
      return 0;
    });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Conteo Físico de Inventario
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <FiltrosInventario
          filtro={filtro}
          setFiltro={setFiltro}
          skuABuscar={skuABuscar}
          setSkuABuscar={setSkuABuscar}
          handleBuscarSku={handleBuscarSku}
          bloqueSeleccionado={bloqueSeleccionado}
          setBloqueSeleccionado={setBloqueSeleccionado}
          bloques={bloques}
        />

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Acciones
          </label>
          <div className="flex space-x-2">
            <GuardarInventario
              productos={cambiosPendientes.map((c) => ({
                id: c.id,
                conteoFisico: c.conteoFisico,
                sku: productos.find((p) => p.id === c.id)?.sku || "",
              }))}
              onGuardar={handleGuardar}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Guardar
            </GuardarInventario>
            <button
              onClick={() => exportarAExcel(productosFiltrados)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center flex-1"
              title="Exportar a Excel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1.5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargar Excel Femex
              </label>
              <div className="flex">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleFileUpload(e.target.files[0], "Femex")
                  }
                  className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:hidden"
                />
                <button
                  onClick={() => handleBorrarDatos("Femex")}
                  className="bg-red-600 text-white px-3 py-2 rounded-r-md hover:bg-red-700 transition-colors"
                  title="Borrar todos los datos de Femex"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargar Excel Blow
              </label>
              <div className="flex">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleFileUpload(e.target.files[0], "Blow")
                  }
                  className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:hidden"
                />
                <button
                  onClick={() => handleBorrarDatos("Blow")}
                  className="bg-red-600 text-white px-3 py-2 rounded-r-md hover:bg-red-700 transition-colors"
                  title="Borrar todos los datos de Blow"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <button
                  onClick={handleBorrarConteos}
                  className="bg-red-600 text-white px-3 py-2 rounded-r-md hover:bg-red-700 transition-colors rounded-l-md ml-2"
                  title="Resetear todos los conteos físicos"
                >
                  Borrar Conteos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">SKU</th>
              <th className="p-2 border text-left">Bloque</th>
              <th className="p-2 border text-right">Stock Sistema</th>
              <th className="p-2 border text-right">Conteo</th>
              <th className="p-2 border text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => {
                const diferencia = calcularDiferencia(producto);
                return (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="p-2 border" id={`sku-${producto.sku}`}>
                      {producto.sku}
                    </td>
                    <td className="p-2 border">
                      {producto.idBloque || "No asignado"}
                    </td>
                    <td className="p-2 border text-right">
                      {producto.cantSistemaFemex + producto.cantSistemaBlow}
                    </td>
                    <td className="p-2 border">
                      <input
                        type="number"
                        min="0"
                        value={producto.conteoFisico ?? ""}
                        onChange={(e) =>
                          handleConteoChange(producto.id, e.target.value)
                        }
                        onFocus={handleFocus}
                        className="w-full p-1 rounded text-right border-0 focus:border-0 focus:ring-0 focus:outline-none"
                      />
                    </td>
                    <td
                      className={`p-2 border text-right ${
                        diferencia > 0
                          ? "text-blue-700"
                          : diferencia < 0
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {diferencia !== 0
                        ? diferencia > 0
                          ? `+${diferencia}`
                          : diferencia
                        : "0"}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No se encontraron productos con los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="flex justify-between">
          <span>Productos totales: {productos.length}</span>
          <span>Filtrados: {productosFiltrados.length}</span>
          <span className="font-medium">
            Con conteo:{" "}
            {productos.filter((p) => p.conteoFisico !== null).length}
          </span>
          {mostrarNoAsignados && (
            <span className="text-red-600">
              No asignados: {productos.filter((p) => !p.idBloque).length}
            </span>
          )}
        </div>
      </div>

      {mostrarModalCoincidencias && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              Seleccione el SKU deseado
            </h3>
            <p className="mb-4">
              No se encontró el SKU exacto. Coincidencias aproximadas:
            </p>
            <div className="max-h-60 overflow-y-auto mb-4">
              {coincidenciasEncontradas.slice(0, 10).map((producto) => (
                <label
                  key={producto.id}
                  className="flex items-center p-2 hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="skuSeleccionado"
                    value={producto.sku}
                    checked={skuSeleccionado === producto.sku}
                    onChange={() => setSkuSeleccionado(producto.sku)}
                    className="mr-2"
                  />
                  {producto.sku}
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setMostrarModalCoincidencias(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSeleccion}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
