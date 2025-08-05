import React, { useState, useEffect } from "react";
import { StockManager } from "./utilidades/StockManager";
import * as XLSX from "xlsx";
import { FiltrosInventario } from "./utilidades/FiltrosInventario";
import { GetInventarioStock } from "./utilidades/GetInventarioStock";
import { GuardarInventario } from "./utilidades/GuardarInventario";
import { InputWithCalculator } from "./utilidades/InputWithCalculator";
// --- Reemplazamos Swal por nuestro wrapper ---
// import Swal from "sweetalert2";
import { sweetAlert } from "./utilidades/SweetAlertWrapper"; // Asegúrate de que la ruta sea correcta
// --- Fin del cambio ---
import Loader from "./utilidades/Loader";
import Urls from "./utilidades/Urls";
import "../estilos/Inventario.css";

interface Producto {
  id: number;
  sku: string;
  idBloque: string;
  cantSistemaFemex: number;
  cantSistemaBlow: number;
  conteoFisico: number | null;
  fechaConteo: string | null;
  cantidadPorBulto: number;
  isActive?: number | boolean;
}

interface ProductoConteo {
  id: number;
  sku: string;
  conteoFisico: number | null;
}

interface ProductoReposicion {
  sku: string;
  cantidad: number;
}

let urlPrepararInventario = Urls.inventario.preparar;
let urlActualizarInventario = Urls.inventario.actualizarProducto;
let urlGuardarInventario = Urls.inventario.guardar;
let urlGuardarReposicion = Urls.reposicion.guardar;
let urlObtenerReposicion = Urls.reposicion.obtener;
let urlLimpiarReposicion = Urls.reposicion.limpiar

export const Inventario: React.FC = () => {
  const [stockManager] = useState(() => new StockManager());
  const [filtro, setFiltro] = useState("");
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState("");
  const [skuABuscar, setSkuABuscar] = useState("");
  const [mostrarModalCoincidencias, setMostrarModalCoincidencias] = useState(false);
  const [skuSeleccionado, setSkuSeleccionado] = useState("");
  const [coincidenciasEncontradas, setCoincidenciasEncontradas] = useState<Producto[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState<{ id: number; conteoFisico: number | null }[]>([]);
  const [modoReposicion, setModoReposicion] = useState(false);
  const [productosReposicion, setProductosReposicion] = useState<ProductoReposicion[]>([]);
  const [skuReposicionABuscar, setSkuReposicionABuscar] = useState("");
  const [nuevaCantidadReposicion, setNuevaCantidadReposicion] = useState("");
  const [mostrarModalCoincidenciasReposicion, setMostrarModalCoincidenciasReposicion] = useState(false);
  const [skuSeleccionadoReposicion, setSkuSeleccionadoReposicion] = useState("");
  const [coincidenciasReposicionEncontradas, setCoincidenciasReposicionEncontradas] = useState<Producto[]>([]);
  const [skusValidos, setSkusValidos] = useState<Set<string>>(new Set());

  // Cargar SKUs válidos
  useEffect(() => {
    const cargarSkusValidos = async () => {
      try {
        const response = await fetch(`${Urls.productos.listar}`);
        if (!response.ok) throw new Error("Error al obtener SKUs válidos");
        const data: Producto[] = await response.json();
        const skus = data.map((p) => p.sku).filter(Boolean);
        setSkusValidos(new Set(skus));
      } catch (error) {
        console.error("Error cargando SKUs válidos:", error);
        sweetAlert.error("Error", "No se pudieron cargar los SKUs válidos");
      }
    };
    cargarSkusValidos();
  }, []);

  // Validar SKUs del Excel
  const validarSkus = (skus: string[]): { valido: boolean; skusInvalidos: string[] } => {
    const skusInvalidos = skus.filter((sku) => !skusValidos.has(sku));
    if (skusInvalidos.length > 0) {
      sweetAlert.error("SKUs inválidos", `SKUs no encontrados: <br> ${skusInvalidos.slice(0, 5).join(", ")}${skusInvalidos.length > 5 ? "..." : ""}`);
    }
    return {
      valido: skusInvalidos.length === 0,
      skusInvalidos,
    };
  };

  // Cargar reposiciones
  const cargarReposiciones = async () => {
    setLoading(true);
    try {
      const response = await fetch(urlObtenerReposicion);
      if (!response.ok) throw new Error("Error al obtener reposiciones");
      const data = await response.json();
      const reposicionesActivas = data.filter((item: ProductoReposicion) => item.cantidad > 0);
      setProductosReposicion(reposicionesActivas);
    } catch (error) {
      console.error("Error al cargar reposiciones:", error);
      sweetAlert.error("Error", "No se pudieron cargar las reposiciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarReposiciones();
  }, []);

  const { productos, setProductos, setLoading, bloques, loading, error } = GetInventarioStock(urlPrepararInventario);

  bloques.sort((a, b) => {
    if (typeof a === "string") return 1;
    if (typeof b === "string") return -1;
    return a - b;
  });

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const calcularDiferencia = (producto: Producto): number => {
    const totalSistema = producto.cantSistemaFemex + producto.cantSistemaBlow;
    return producto.conteoFisico !== null ? producto.conteoFisico - totalSistema : 0;
  };

  const encontrarCoincidenciasAproximadas = (skuBuscado: string): Producto[] => {
    if (!skuBuscado || skuBuscado.trim() === "") return [];
    const skuLower = skuBuscado.toLowerCase();
    return productos
      .filter(
        (producto) =>
          producto.sku.toLowerCase().includes(skuLower) ||
          producto.sku.toLowerCase().replace(/\s+/g, "").includes(skuLower.replace(/\s+/g, ""))
      )
      .sort((a, b) => {
        const aStartsWith = a.sku.toLowerCase().startsWith(skuLower) ? 0 : 1;
        const bStartsWith = b.sku.toLowerCase().startsWith(skuLower) ? 0 : 1;
        return aStartsWith !== bStartsWith ? aStartsWith - bStartsWith : a.sku.length - b.sku.length;
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
      sweetAlert.warning("Sin coincidencias", "No se encontraron coincidencias para el SKU ingresado");
    }
  };

  const confirmarSeleccion = () => {
    setSkuABuscar(skuSeleccionado);
    setMostrarModalCoincidencias(false);
    setTimeout(() => {
      const elemento = document.getElementById(`sku-${skuSeleccionado}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: "smooth", block: "center" });
        const parent = elemento.parentElement;
        if (parent) {
          parent.style.backgroundColor = "#fef9c3";
          setTimeout(() => {
            parent.style.backgroundColor = "";
          }, 2000);
        }
      }
    }, 100);
  };

  const activarModoReposicion = () => {
    setModoReposicion(true);
  };

  const volverAModoNormal = () => {
    setModoReposicion(false);
  };

  const handleBuscarSkuReposicion = () => {
    if (!skuReposicionABuscar || skuReposicionABuscar.trim() === "") return;
    const coincidencias = encontrarCoincidenciasAproximadas(skuReposicionABuscar);
    if (coincidencias.length > 0) {
      setCoincidenciasReposicionEncontradas(coincidencias);
      setSkuSeleccionadoReposicion(coincidencias[0].sku);
      setMostrarModalCoincidenciasReposicion(true);
    } else {
      sweetAlert.warning("Sin coincidencias", "No se encontraron coincidencias para el SKU ingresado");
    }
  };

  const confirmarSeleccionReposicion = () => {
    setSkuReposicionABuscar(skuSeleccionadoReposicion);
    setMostrarModalCoincidenciasReposicion(false);
  };

  const agregarAReposicion = (): void => {
    if (!skuSeleccionadoReposicion || !nuevaCantidadReposicion) {
      sweetAlert.warning("Datos incompletos", "Debes seleccionar un SKU e ingresar una cantidad");
      return;
    }
    const cantidad = Number(nuevaCantidadReposicion);
    if (isNaN(cantidad) || cantidad <= 0) {
      sweetAlert.error("Cantidad inválida", "La cantidad debe ser un número mayor a cero");
      return;
    }
    const existe = productosReposicion.some((p) => p.sku === skuSeleccionadoReposicion);
    if (existe) {
      sweetAlert.warning("SKU duplicado", "Este SKU ya fue agregado a la reposición");
      return;
    }
    setProductosReposicion((prev) => [...prev, { sku: skuSeleccionadoReposicion, cantidad }]);
    setSkuReposicionABuscar("");
    setSkuSeleccionadoReposicion("");
    setNuevaCantidadReposicion("");
  };

  const eliminarDeReposicion = async (sku: string) => {
    const { isConfirmed } = await sweetAlert.fire({
      title: "¿Eliminar de reposición?",
      text: `¿Estás seguro de que deseas eliminar el SKU ${sku} de la reposición?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    setLoading(true);
    try {
      const response = await fetch(urlLimpiarReposicion, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sku }), // Enviamos el SKU a limpiar
      });

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const result = await response.json();

      // Solo actualizamos el estado local si el back responde bien
      setProductosReposicion((prev) => prev.filter((p) => p.sku !== sku));

      sweetAlert.success("SKU eliminado", `El SKU ${sku} fue eliminado de la reposición.`);
    } catch (error) {
      console.error("Error al eliminar SKU de reposición:", error);
      sweetAlert.error("Error", "No se pudo eliminar el SKU de la base de datos.");
      // No eliminamos localmente si falló
    } finally {
      setLoading(false);
    }
  };

  const guardarReposicion = async () => {
    if (productosReposicion.length === 0) {
      sweetAlert.warning("Reposición vacía", "No hay productos para guardar");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(urlGuardarReposicion, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: productosReposicion,
          fecha: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Error al guardar la reposición");
      const result = await response.json();
      sweetAlert.success("Reposición guardada", `Se guardaron ${productosReposicion.length} productos correctamente`);
      setProductosReposicion([]);
      cargarReposiciones();
    } catch (error) {
      console.error("Error al guardar reposición:", error);
      sweetAlert.error("Error", "No se pudo guardar la reposición");
    } finally {
      setLoading(false);
    }
  };

  const handleConteoChange = (id: number, value: string) => {
    const numericValue = value === "" ? null : Number(value);
    setProductos((prev) =>
      prev.map((producto) =>
        producto.id === id
          ? {
            ...producto,
            conteoFisico: numericValue,
            fechaConteo: numericValue !== null ? new Date().toISOString().split("T")[0] : null,
          }
          : producto
      )
    );
    stockManager.actualizarConteoFisico(id, numericValue);
    setCambiosPendientes((prev) => {
      const cambiosFiltrados = prev.filter((cambio) => cambio.id !== id);
      return numericValue !== null ? [...cambiosFiltrados, { id, conteoFisico: numericValue }] : cambiosFiltrados;
    });
  };

  const exportarAExcel = (productosParaExportar: Producto[]) => {
    const datosParaExportar = productosParaExportar.map((producto) => ({
      SKU: producto.sku,
      Bloque: producto.idBloque,
      "Stock Sistema Total": producto.cantSistemaFemex + producto.cantSistemaBlow,
      "Conteo Físico": producto.conteoFisico || 0,
      Diferencia: calcularDiferencia(producto),
    }));
    const ws = XLSX.utils.json_to_sheet(datosParaExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventario");
    const fecha = new Date().toISOString().split("T")[0];
    let nombreArchivo = `Inventario_${fecha}`;
    if (bloqueSeleccionado) nombreArchivo += `_Bloque-${bloqueSeleccionado}`;
    if (filtro) nombreArchivo += `_Filtro-${filtro.substring(0, 10)}`;
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
      sweetAlert.success("Guardado exitoso", `${result.updatedCount} productos actualizados`);
      setCambiosPendientes([]);
    } catch (error) {
      console.error("Error:", error);
      sweetAlert.error("Error al guardar", "No se pudo guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrarConteos = async () => {
    const { isConfirmed } = await sweetAlert.fire({
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
      const productosParaResetear = productos.map((p) => ({
        id: p.id,
        sku: p.sku,
        conteoFisico: 0,
      }));
      const response = await fetch(urlGuardarInventario, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productosParaResetear),
      });
      if (!response.ok) throw new Error("Error al resetear conteos");
      const result = await response.json();
      sweetAlert.success("Conteos reseteados", `${result.updatedCount} conteos reseteados correctamente`);
      setProductos((prev) =>
        prev.map((p) => ({
          ...p,
          conteoFisico: 0,
          fechaConteo: null,
        }))
      );
      setCambiosPendientes([]);
    } catch (error) {
      console.error("Error al resetear conteos:", error);
      sweetAlert.error("Error al resetear", "Error al resetear conteos físicos.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>, empresa: "Femex" | "Blow") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    await handleFileUpload(file, empresa);
  };

  const handleFileUpload = async (file: File, empresa: "Femex" | "Blow") => {
    setLoading(true);
    try {
      const datosExcelParaCargar = await readExcelFile(file);
      const skuCantidadMap = extractSkuCantidad(datosExcelParaCargar);
      const productosParaGuardar: ProductoReposicion[] = Array.from(skuCantidadMap.entries()).map(([sku, cantidad]) => ({ sku, cantidad }));
      const skusArchivo = productosParaGuardar.map((p) => p.sku);
      const validacion = validarSkus(skusArchivo);
      if (!validacion.valido) {
        sweetAlert.error("SKUs no válidos", `Los siguientes SKUs no existen: <br><strong>${validacion.skusInvalidos.join(", ")}</strong>`);
        return;
      }
      const response = await fetch(urlActualizarInventario, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: productosParaGuardar,
          tipoArchivo: empresa,
        }),
      });
      if (!response.ok) throw new Error("Error en la respuesta del servidor");
      const result = await response.json();
      setProductos((prev: Producto[]) =>
        prev.map((producto) => {
          if (skuCantidadMap.has(producto.sku)) {
            const cantidad = skuCantidadMap.get(producto.sku)!;
            return {
              ...producto,
              [empresa === "Femex" ? "cantSistemaFemex" : "cantSistemaBlow"]: cantidad,
              fechaConteo: new Date().toISOString(),
            };
          }
          return producto;
        })
      );
      sweetAlert.success("Archivo procesado", `Archivo de ${empresa} procesado correctamente. ${result.updatedCount} productos actualizados.`);
    } catch (error) {
      console.error(`Error al procesar archivo de ${empresa}:`, error);
      sweetAlert.error("Error al guardar", `Error al procesar archivo de ${empresa}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrarDatos = async (tipoArchivo: "Femex" | "Blow") => {
    const { isConfirmed } = await sweetAlert.fire({
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipoArchivo, accion: "borrar" }),
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
      sweetAlert.success("Datos borrados correctamente", `${result.message}`);
    } catch (error) {
      console.error(`Error al borrar datos de ${tipoArchivo}:`, error);
      sweetAlert.error("Error al borrar datos", `Error al borrar datos de ${tipoArchivo}`);
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
      const sku = row["SKU"];
      const cantidad = row["Cantidad"];
      if (sku) {
        map.set(sku.toString(), Number(cantidad));
      }
    });
    return map;
  };

  const productosFiltrados = productos
    .filter((p) => p.sku.toLowerCase().includes(filtro.toLowerCase()))
    .filter((p) => {
      if (bloqueSeleccionado === "") return true;
      if (bloqueSeleccionado === "No asignado") return !p.idBloque || p.idBloque === "";
      return p.idBloque == bloqueSeleccionado;
    })
    .sort((a, b) => (bloqueSeleccionado !== "" ? a.sku.localeCompare(b.sku) : 0));

  return (
    <>
      {loading && (
        <div className="loader-container">
          <Loader />
        </div>
      )}
      <div className="inventario-container">
        <div>
          <h1 className="inventario-title" id="titulo-inventario">
            Conteo Físico de Inventario
          </h1>
          <button className="reposicion-button" onClick={activarModoReposicion}>
            Carga de reposición
          </button>
        </div>

        <div className="filtros-container">
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

        {!modoReposicion && (
          <div className="acciones-container">
            <div className="acciones-panel">
              <label className="acciones-label">Acciones</label>
              <div className="acciones-buttons">
                <GuardarInventario
                  productos={cambiosPendientes.map((c) => ({
                    id: c.id,
                    conteoFisico: c.conteoFisico,
                    sku: productos.find((p) => p.id === c.id)?.sku || "",
                    loading,
                  }))}
                  onGuardar={handleGuardar}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ height: "1.25rem", width: "1.25rem", marginRight: "0.5rem" }} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Guardar
                </GuardarInventario>
                <button onClick={() => exportarAExcel(productosFiltrados)} className="excel-button" title="Exportar a Excel">
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ height: "1.25rem", width: "1.25rem", marginRight: "0.375rem" }} viewBox="0 0 20 20" fill="currentColor">
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
        )}

        {modoReposicion && (
          <div style={{ marginBottom: "1.5rem", backgroundColor: "#f3f4f6", padding: "1rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1rem", color: "#1f2937" }}>Carga de Reposición</h2>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ flex: 2, display: "flex" }}>
                <input
                  type="text"
                  placeholder="Buscar SKU"
                  value={skuReposicionABuscar}
                  onChange={(e) => setSkuReposicionABuscar(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarSkuReposicion()}
                  style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem 0 0 0.375rem", flex: 1, backgroundColor: "white"}}
                />
                <button
                  onClick={handleBuscarSkuReposicion}
                  style={{ backgroundColor: "#3b82f6", color: "white", padding: "0.5rem", borderRadius: "0 0.375rem 0.375rem 0", display: "flex", alignItems: "center" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ height: "1rem", width: "1rem" }} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
              <input
                type="number"
                placeholder="Cantidad"
                value={nuevaCantidadReposicion}
                onChange={(e) => setNuevaCantidadReposicion(e.target.value)}
                style={{ padding: "0.5rem", border: "1px solid #d1d5db", borderRadius: "0.375rem", flex: 1, backgroundColor: "white" }}
              />
              <button
                onClick={agregarAReposicion}
                style={{ backgroundColor: "#10b981", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem" }}
              >
                Agregar
              </button>
            </div>
            {skuSeleccionadoReposicion && (
              <div style={{ backgroundColor: "#e0e7ff", padding: "0.5rem", borderRadius: "0.375rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  SKU seleccionado: <strong>{skuSeleccionadoReposicion}</strong>
                </span>
                <button
                  onClick={() => setSkuSeleccionadoReposicion("")}
                  style={{ backgroundColor: "#ef4444", color: "white", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.75rem" }}
                >
                  Cambiar
                </button>
              </div>
            )}
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                Productos en reposición ({productosReposicion.length})
              </h3>
              {productosReposicion.length > 0 ? (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "0.375rem", overflow: "hidden" }}>
                  {productosReposicion.map((producto, index) => (
                    <div className={`producto-reposicion-lista ${index % 2 === 0 ? "fila-par" : "fila-impar"}`} key={index}>
                      <div>
                        <div style={{ fontWeight: "500" }}>{producto.sku}</div>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Cantidad: {producto.cantidad}</div>
                      </div>
                      <button className="eliminar-reposicion-button" onClick={() => eliminarDeReposicion(producto.sku)}>
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-productos">No hay productos agregados</div>
              )}
            </div>
            <div className="modal-buttons">
              <button onClick={volverAModoNormal} className="cancel-button">
                Cerrar
              </button>
              <button
                onClick={guardarReposicion}
                style={{ backgroundColor: "#3b82f6", color: "white", padding: "0.5rem 1rem", borderRadius: "0.375rem" }}
              >
                Guardar Reposición
              </button>
            </div>
          </div>
        )}

        {!modoReposicion && (
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="acciones-panel">
              <label className="acciones-label">Cargar Excel Femex</label>
              <div style={{ display: "flex" }}>
                <input
                  className="input-file"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => e.target.files?.[0] && handleFileInputChange(e, "Femex")}
                />
                <button
                  onClick={() => handleBorrarDatos("Femex")}
                  className="borrar-datos-button"
                  title="Borrar todos los datos de Femex"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ height: "1.25rem", width: "1.25rem" }} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ backgroundColor: "#f9fafb", padding: "0.75rem", borderRadius: "0.5rem", border: "1px solid #e5e7eb", flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", color: "#374151", marginBottom: "0.25rem" }}>
                Cargar Excel Blow
              </label>
              <div style={{ display: "flex" }}>
                <input
                  className="input-file"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => e.target.files?.[0] && handleFileInputChange(e, "Blow")}
                />
                <button
                  className="borrar-datos-button"
                  onClick={() => handleBorrarDatos("Blow")}
                  title="Borrar todos los datos de Blow"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ height: "1.25rem", width: "1.25rem" }} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  onClick={handleBorrarConteos}
                  className="borrar-conteos-button"
                  title="Resetear todos los conteos físicos"
                >
                  Borrar Conteos
                </button>
              </div>
            </div>
          </div>
        )}

        {!modoReposicion && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ fontSize: "2rem", border: "1px solid #d1d5db" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th style={{ padding: "0.5rem", border: "1px solid #d1d5db", textAlign: "left" }}>SKU</th>
                  <th className="td-diferencia">Bloque</th>
                  <th className="td-diferencia">Stock</th>
                  <th className="td-diferencia">Conteo</th>
                  <th className="td-diferencia">Dif</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length > 0 ? (
                  productosFiltrados.map((producto) => {
                    const diferencia = calcularDiferencia(producto);
                    return (
                      <tr key={producto.id}>
                        <td className="td-sku" id={`sku-${producto.sku}`}>
                          {producto.sku}
                        </td>
                        <td className="td-body">{producto.idBloque || "No asignado"}</td>
                        <td className="td-body">{producto.cantSistemaFemex + producto.cantSistemaBlow}</td>
                        <td className="td-body">
                          <InputWithCalculator
                            value={producto.conteoFisico}
                            onChange={(value) => handleConteoChange(producto.id, value?.toString() ?? "")}
                            cantidadPorBulto={producto.cantidadPorBulto}
                            idProducto={producto.id}
                            productosReposicion={productosReposicion}
                            sku={producto.sku}
                            onFocus={() =>
                              handleFocus({
                                target: document.createElement("input"),
                              } as React.FocusEvent<HTMLInputElement>)
                            }
                          />
                        </td>
                        <td className={`td-diferencia ${diferencia > 0 ? "positivo" : diferencia < 0 ? "negativo" : ""}`}>
                          {diferencia !== 0 ? (diferencia > 0 ? `+${diferencia}` : diferencia) : "0"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center-td1">
                      No se encontraron productos con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div>
          <button
            className="float-button"
            onClick={() => document.getElementById("titulo-inventario")?.scrollIntoView()}
          >
            Ir arriba
          </button>
        </div>

        <div className="resumen-container">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Productos totales: {productos.length}</span>
            <span>Filtrados: {productosFiltrados.length}</span>
            <span style={{ fontWeight: "500" }}>
              Con conteo: {productos.filter((p) => p.conteoFisico !== null).length}
            </span>
          </div>
        </div>

        {mostrarModalCoincidencias && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Seleccione el SKU deseado</h3>
              <p style={{ marginBottom: "1rem" }}>
                No se encontró el SKU exacto. Coincidencias aproximadas:
              </p>
              <div className="modal-coincidencias-list">
                {coincidenciasEncontradas.slice(0, 10).map((producto) => (
                  <label key={producto.id} className="radio-label">
                    <input
                      type="radio"
                      name="skuSeleccionado"
                      value={producto.sku}
                      checked={skuSeleccionado === producto.sku}
                      onChange={() => setSkuSeleccionado(producto.sku)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {producto.sku}
                  </label>
                ))}
              </div>
              <div className="modal-buttons">
                <button onClick={() => setMostrarModalCoincidencias(false)} className="cancel-button">
                  Cancelar
                </button>
                <button className="btn-aceptar" onClick={confirmarSeleccion}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarModalCoincidenciasReposicion && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 className="modal-title">Seleccione el SKU deseado</h3>
              <p style={{ marginBottom: "1rem" }}>Coincidencias encontradas:</p>
              <div className="modal-coincidencias-list">
                {coincidenciasReposicionEncontradas.slice(0, 10).map((producto) => (
                  <label className="radio-label" key={producto.id}>
                    <input
                      className="radio-input"
                      type="radio"
                      name="skuSeleccionadoReposicion"
                      value={producto.sku}
                      checked={skuSeleccionadoReposicion === producto.sku}
                      onChange={() => setSkuSeleccionadoReposicion(producto.sku)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {producto.sku}
                  </label>
                ))}
              </div>
              <div className="modal-buttons">
                <button onClick={() => setMostrarModalCoincidenciasReposicion(false)} className="cancel-button">
                  Cancelar
                </button>
                <button className="btn-aceptar" onClick={confirmarSeleccionReposicion}>
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};