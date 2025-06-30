import React, { useState, useEffect } from "react";
import { StockManager } from "./utilidades/StockManager";
import * as XLSX from "xlsx";

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

let urlPrepararInventario = "https://rma-back.vercel.app/prepararInventario";
let urlActualizarInventario =
  "https://rma-back.vercel.app/actualizarProductoInventario";
if (window.location.hostname === "localhost") {
  urlPrepararInventario = "http://localhost:8080/prepararInventario";
  urlActualizarInventario =
    "http://localhost:8080/actualizarProductoInventario";
}

export const Inventario: React.FC = () => {
  const [stockManager] = useState(() => new StockManager());
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState("");
  const [bloques, setBloques] = useState<string[]>([]);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch(`${urlPrepararInventario}`);
        const data: Producto[] = await response.json();
        setProductos(data);
        stockManager.cargarProductos(data);
        const bloquesUnicos: string[] = [
          ...new Set(data.map((p) => p.idBloque)),
        ].sort();
        setBloques(bloquesUnicos);
      } catch (error) {
        console.error("Error al cargar productos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  const calcularDiferencia = (producto: Producto): number => {
    const totalSistema = producto.cantSistemaFemex + producto.cantSistemaBlow;
    return producto.conteoFisico !== null
      ? producto.conteoFisico - totalSistema
      : 0;
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
                numericValue !== null ? new Date().toISOString() : null,
            }
          : producto
      )
    );

    stockManager.actualizarConteoFisico(id, numericValue);
  };

  const handleGuardarTodo = async () => {
    try {
      const productosParaGuardar = productos.filter(
        (p) => p.conteoFisico !== null
      );

      const response = await fetch(urlActualizarInventario, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productosParaGuardar),
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const result = await response.json();
      alert(
        `${result.affectedRows} productos actualizados correctamente en la base de datos`
      );
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar los cambios en la base de datos");
    }
  };

  const handleFileUpload = async (file: File, empresa: "Femex" | "Blow") => {
    setLoading(true);
    try {
      const data = await readExcelFile(file);
      const skuCantidadMap = extractSkuCantidad(data);

      // Preparar datos para enviar al backend
      const productosParaGuardar = Array.from(skuCantidadMap.entries()).map(
        ([sku, cantidad]) => ({
          sku,
          cantidad,
        })
      );

      // Enviar al backend para actualizar la base de datos
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
        setLoading(false);
      }

      const result = await response.json();

      // Actualizar el estado local con los cambios
      const productosActualizados = productos.map((producto) => {
        if (skuCantidadMap.has(producto.sku)) {
          const cantidad = skuCantidadMap.get(producto.sku)!;
          return {
            ...producto,
            [empresa === "Femex" ? "cantSistemaFemex" : "cantSistemaBlow"]:
              cantidad,
            conteoFisico: cantidad,
            fechaConteo: new Date().toISOString(),
          };
        }
        return producto;
      });

      setProductos(productosActualizados);
      setLoading(false);
      alert(
        result.message ||
          `Archivo de ${empresa} procesado correctamente. ${result.updatedCount} productos actualizados.`
      );
    } catch (error) {
      console.error(`Error al procesar archivo de ${empresa}:`, error);
      alert(`Error al procesar archivo de ${empresa}`);
      setLoading(false);
    }
  };

  const handleBorrarDatos = async (tipoArchivo: "Femex" | "Blow") => {
    if (
      !window.confirm(
        `¿Estás seguro que deseas borrar TODOS los datos de ${tipoArchivo}?`
      )
    ) {
      return;
    }

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

      // Actualizar el estado local
      setProductos((prev) =>
        prev.map((producto) => ({
          ...producto,
          [tipoArchivo === "Femex" ? "cantSistemaFemex" : "cantSistemaBlow"]: 0,
          fechaConteo: new Date().toISOString(),
        }))
      );

      alert(result.message);
    } catch (error) {
      console.error(`Error al borrar datos de ${tipoArchivo}:`, error);
      alert(`Error al borrar datos de ${tipoArchivo}`);
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
    .filter(
      (p) =>
        p.sku.toLowerCase().includes(filtro.toLowerCase()) &&
        (bloqueSeleccionado === "" || p.idBloque == bloqueSeleccionado)
    )
    .sort((a, b) => {
      // Solo ordenar si hay un bloque seleccionado
      if (bloqueSeleccionado !== "") {
        return a.sku.localeCompare(b.sku);
      }
      // Si no hay bloque seleccionado, no ordenar (mantener orden original)
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
      <h1 className="text-xl font-bold mb-4">Conteo Físico de Inventario</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Buscar SKU</label>
          <input
            type="text"
            placeholder="Ej: EP504 N PI 130ML"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Bloque/Estantería
          </label>
          <select
            value={bloqueSeleccionado}
            onChange={(e) => setBloqueSeleccionado(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Todos los bloques</option>
            {bloques.map((bloque) => (
              <option key={bloque} value={bloque}>
                {bloque}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={handleGuardarTodo}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 w-full"
          >
            Guardar Todo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Cargar Excel Femex
            </label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) =>
                e.target.files?.[0] &&
                handleFileUpload(e.target.files[0], "Femex")
              }
              className="w-full p-2 border rounded-md"
            />
          </div>
          <button
            onClick={() => handleBorrarDatos("Femex")}
            className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 mt-6"
            title="Borrar todos los datos de Femex"
          >
            ×
          </button>
        </div>

        <div className="flex space-x-2">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">
              Cargar Excel Blow
            </label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) =>
                e.target.files?.[0] &&
                handleFileUpload(e.target.files[0], "Blow")
              }
              className="w-full p-2 border rounded-md"
            />
          </div>
          <button
            onClick={() => handleBorrarDatos("Blow")}
            className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 mt-6"
            title="Borrar todos los datos de Blow"
          >
            ×
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border text-left">SKU</th>
              <th className="p-2 border text-right">Stock Sistema</th>
              <th className="p-2 border text-right">Conteo Físico</th>
              <th className="p-2 border text-right">Diferencia</th>
              <th className="p-2 border text-right">Fecha Conteo</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => {
                const diferencia = calcularDiferencia(producto);
                return (
                  <tr key={producto.id} className="hover:bg-gray-50">
                    <td className="p-2 border">{producto.sku}</td>
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
                        className="w-full p-1 border rounded text-right"
                      />
                    </td>
                    <td
                      className={`p-2 border text-right ${
                        diferencia > 0
                          ? "text-green-600"
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
                    <td className="p-2 border text-right text-sm">
                      {producto.fechaConteo
                        ? new Date(producto.fechaConteo).toLocaleString()
                        : "-"}
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
        </div>
      </div>
    </div>
  );
};
