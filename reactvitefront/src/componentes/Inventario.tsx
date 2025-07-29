import React, { useState, useEffect } from "react";
import { StockManager } from "./utilidades/StockManager";
import * as XLSX from "xlsx";
import { FiltrosInventario } from "./utilidades/FiltrosInventario";
import { GetInventarioStock } from "./utilidades/GetInventarioStock";
import { GuardarInventario } from "./utilidades/GuardarInventario";
import { InputWithCalculator } from "./utilidades/InputWithCalculator";
import Swal from "sweetalert2";
import Loader from "./utilidades/Loader";
import Urls from './utilidades/Urls';

interface Producto {
  id: number;
  sku: string;
  idBloque: string;
  cantSistemaFemex: number;
  cantSistemaBlow: number;
  conteoFisico: number | null;
  fechaConteo: string | null;
  cantidadPorBulto: number;
}
interface ProductoConteo {
  id: number;
  sku: string;
  conteoFisico: number | null;
}

let urlPrepararInventario = Urls.inventario.preparar;
let urlActualizarInventario = Urls.inventario.actualizarProducto;
let urlGuardarInventario = Urls.inventario.guardar;

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
    setLoading(true);
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
    }finally {
      setLoading(false);
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
    setLoading(true);
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
      setLoading(false);
      setCambiosPendientes([]);
    } catch (error) {
      console.error("Error al resetear conteos:", error);
      setLoading(false);
      Swal.fire({
        icon: "error",
        title: "Error al resetear",
        text: "Error al resetear conteos físicos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    empresa: "Femex" | "Blow"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    await handleFileUpload(file, empresa);
  };

  const handleFileUpload = async (file: File, empresa: "Femex" | "Blow") => {
    try {
      setLoading(true);
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
    setLoading(true);
    const { isConfirmed } = await Swal.fire({
      title: `Borrar datos de ${tipoArchivo}`,
      text: `¿Estás seguro que deseas borrar TODOS los datos de ${tipoArchivo}? Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;
    setLoading(true);
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
      setLoading(false);
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
    } finally {
      setLoading(false);
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

  return (
  <>
    {loading && (
      <div style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50
      }}>
        <Loader />
      </div>
    )}
    <div style={{
      padding: '1rem',
      maxWidth: '72rem',
      marginLeft: 'auto',
      marginRight: 'auto',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#1f2937'
        }}
        id="titulo-inventario"
      >
        Conteo Físico de Inventario
      </h1>

      {/* Primera fila: Filtros */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
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
      </div>

      {/* Segunda fila: Acciones */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          flex: 1,
          minHeight: '120px'
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.25rem'
          }}>
            Acciones
          </label>
          <div style={{display: 'flex', gap: '0.5rem'}}>
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
                style={{height: '1.25rem', width: '1.25rem', marginRight: '0.5rem'}}
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
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                transition: 'background-color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1
              }}
              title="Exportar a Excel"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{height: '1.25rem', width: '1.25rem', marginRight: '0.375rem'}}
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

      {/* Tercera fila: Cargas de Excel */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Cargar Excel Femex */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          flex: 1
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.25rem'
          }}>
            Cargar Excel Femex
          </label>
          <div style={{display: 'flex'}}>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) =>
                e.target.files?.[0] && handleFileInputChange(e, "Femex")
              }
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid rgb(156, 158, 163)',
                borderRadius: '0.375rem 0 0 0.375rem',
                outline: 'none',
                width: '40%'
              }}
            />
            <button
              onClick={() => handleBorrarDatos("Femex")}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '0 0.375rem 0.375rem 0',
                transition: 'background-color 0.2s'
              }}
              title="Borrar todos los datos de Femex"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{height: '1.25rem', width: '1.25rem'}}
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

        {/* Cargar Excel Blow */}
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '0.75rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb',
          flex: 1
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.25rem'
          }}>
            Cargar Excel Blow
          </label>
          <div style={{display: 'flex'}}>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) =>
                e.target.files?.[0] && handleFileInputChange(e, "Blow")
              }
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid rgb(156, 158, 163)',
                borderRadius: '0.375rem 0 0 0.375rem',
                outline: 'none',
                width: '500%'
              }}
            />
            <button
              onClick={() => handleBorrarDatos("Blow")}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '0 0.375rem 0.375rem 0',
                transition: 'background-color 0.2s'
              }}
              title="Borrar todos los datos de Blow"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{height: '1.25rem', width: '1.25rem'}}
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
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                marginLeft: '0.5rem',
                transition: 'background-color 0.2s'
              }}
              title="Resetear todos los conteos físicos"
            >
              Borrar Conteos
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      <div style={{overflowX: 'auto'}}>
        <table style={{minWidth: '100%', border: '1px solid #d1d5db'}}>
          <thead>
            <tr style={{backgroundColor: '#f3f4f6'}}>
              <th style={{padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left'}}>SKU</th>
              <th style={{padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'left'}}>Bloque</th>
              <th style={{padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'right'}}>Stock Sistema</th>
              <th style={{padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'right'}}>Conteo</th>
              <th style={{padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'right'}}>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((producto) => {
                const diferencia = calcularDiferencia(producto);

                return (
                  <tr key={producto.id} style={{}}>
                    <td style={{padding: '0.5rem', border: '1px solid #d1d5db'}} id={`sku-${producto.sku}`}>
                      {producto.sku}
                    </td>
                    <td style={{padding: '0.5rem', border: '1px solid #d1d5db'}}>
                      {producto.idBloque || "No asignado"}
                    </td>
                    <td style={{padding: '0.5rem', border: '1px solid #d1d5db', textAlign: 'right'}}>
                      {producto.cantSistemaFemex + producto.cantSistemaBlow}
                    </td>
                    <td style={{padding: '0.5rem', border: '1px solid #d1d5db'}}>
                      <InputWithCalculator
                        value={producto.conteoFisico}
                        onChange={(value) =>
                          handleConteoChange(
                            producto.id,
                            value?.toString() ?? ""
                          )
                        }
                        cantidadPorBulto={producto.cantidadPorBulto}
                        idProducto={producto.id}
                        onFocus={() =>
                          handleFocus({
                            target: document.createElement("input"),
                          } as React.FocusEvent<HTMLInputElement>)
                        }
                      />
                    </td>
                    <td
                      style={{
                        padding: '0.5rem',
                        border: '1px solid #d1d5db',
                        textAlign: 'right',
                        color: diferencia > 0 ? '#1d4ed8' : diferencia < 0 ? '#dc2626' : '#4b5563'
                      }}
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
                <td colSpan={5} style={{padding: '1rem', textAlign: 'center', color: '#6b7280'}}>
                  No se encontraron productos con los filtros aplicados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Botón flotante y resumen */}
      <div>
        <button
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            transition: 'background-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            position: 'fixed',
            bottom: '0.25rem',
            right: '0.25rem',
            zIndex: 50
          }}
          onClick={() =>
            document.getElementById("titulo-inventario")?.scrollIntoView()
          }
        >
          Ir arriba
        </button>
      </div>
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem',
        fontSize: '0.875rem'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <span>Productos totales: {productos.length}</span>
          <span>Filtrados: {productosFiltrados.length}</span>
          <span style={{fontWeight: '500'}}>
            Con conteo:{" "}
            {productos.filter((p) => p.conteoFisico !== null).length}
          </span>
          {mostrarNoAsignados && (
            <span style={{color: '#dc2626'}}>
              No asignados: {productos.filter((p) => !p.idBloque).length}
            </span>
          )}
        </div>
      </div>

      {mostrarModalCoincidencias && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            maxWidth: '32rem',
            width: '100%'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 'bold',
              marginBottom: '1rem'
            }}>
              Seleccione el SKU deseado
            </h3>
            <p style={{marginBottom: '1rem'}}>
              No se encontró el SKU exacto. Coincidencias aproximadas:
            </p>
            <div style={{
              maxHeight: '15rem',
              overflowY: 'auto',
              marginBottom: '1rem'
            }}>
              {coincidenciasEncontradas.slice(0, 10).map((producto) => (
                <label
                  key={producto.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.5rem',
                    
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="skuSeleccionado"
                    value={producto.sku}
                    checked={skuSeleccionado === producto.sku}
                    onChange={() => setSkuSeleccionado(producto.sku)}
                    style={{marginRight: '0.5rem'}}
                  />
                  {producto.sku}
                </label>
              ))}
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '0.5rem'}}>
              <button
                onClick={() => setMostrarModalCoincidencias(false)}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarSeleccion}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.375rem',
                  
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
);}