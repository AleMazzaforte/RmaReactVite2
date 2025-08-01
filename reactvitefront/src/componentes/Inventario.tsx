import React, { useState, useEffect } from "react";
import { StockManager } from "./utilidades/StockManager";
import * as XLSX from "xlsx";
import { FiltrosInventario } from "./utilidades/FiltrosInventario";
import { GetInventarioStock } from "./utilidades/GetInventarioStock";
import { GuardarInventario } from "./utilidades/GuardarInventario";
import { InputWithCalculator } from "./utilidades/InputWithCalculator";
import Swal from "sweetalert2";
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

interface FilaExcel {
  SKU: string;
  __rowNum__?: number; // Opcional, si existe
}

let urlPrepararInventario = Urls.inventario.preparar;
let urlActualizarInventario = Urls.inventario.actualizarProducto;
let urlGuardarInventario = Urls.inventario.guardar;
let urlGuardarReposicion = Urls.reposicion.guardar;
let urlObtenerReposicion = Urls.reposicion.obtener;

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
  
  const [cambiosPendientes, setCambiosPendientes] = useState<
    { id: number; conteoFisico: number | null }[]
  >([]);
  const [modoReposicion, setModoReposicion] = useState(false);
  const [productosReposicion, setProductosReposicion] = useState<
    ProductoReposicion[]
  >([]);
  const [skuReposicionABuscar, setSkuReposicionABuscar] = useState("");
  const [nuevaCantidadReposicion, setNuevaCantidadReposicion] = useState("");
  const [
    mostrarModalCoincidenciasReposicion,
    setMostrarModalCoincidenciasReposicion,
  ] = useState(false);
  const [skuSeleccionadoReposicion, setSkuSeleccionadoReposicion] =
    useState("");
  const [
    coincidenciasReposicionEncontradas,
    setCoincidenciasReposicionEncontradas,
  ] = useState<Producto[]>([]);

  const [skusValidos, setSkusValidos] = useState<Set<string>>(new Set());

// Al iniciar el componente o cuando necesites actualizar
useEffect(() => {
  const cargarSkusValidos = async () => {
    try {
      const response = await fetch(`${Urls.productos.listar}`);
      if (!response.ok) throw new Error("Error al obtener SKUs válidos");
      
      const data: Producto[] = await response.json();
      const skus = data.map(p => p.sku).filter(Boolean); 
      setSkusValidos(new Set(skus));     
    } catch (error) {
      console.error("Error cargando SKUs válidos:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los SKUs válidos",
      });
    }
  };

  cargarSkusValidos();
}, []);

// Función para validar SKUs del Excel
const validarSkus = (skus: string[]): { valido: boolean; skusInvalidos: string[] } => {
  const skusInvalidos = skus.filter(sku => !skusValidos.has(sku));
 
  if (skusInvalidos.length > 0) {
      Swal.fire({
        icon: "error",
        title: "SKUs inválidos",
        html: `SKUs no encontrados: <br> ${skusInvalidos.slice(0, 5).join(", ")}${skusInvalidos.length > 5 ? "..." : ""}`,
      });
    }
  return {
    valido: skusInvalidos.length === 0,
    skusInvalidos
  };
};

  // useEffect de carga de reposiciones
  useEffect(() => {
    const cargarReposiciones = async () => {
      setLoading(true);
      try {
        const response = await fetch(urlObtenerReposicion);
        if (!response.ok) throw new Error("Error al obtener reposiciones");

        const data = await response.json();
        // Filtramos solo reposiciones con cantidad > 0
        const reposicionesActivas = data.filter(
          (item: ProductoReposicion) => item.cantidad > 0
        );
        setProductosReposicion(reposicionesActivas);
      } catch (error) {
        console.error("Error al cargar reposiciones:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar las reposiciones",
        });
      } finally {
        setLoading(false);
      }
    };

    cargarReposiciones();
  }, []);

  const { productos, setProductos, setLoading, bloques, loading, error } =
    GetInventarioStock(urlPrepararInventario);

  bloques.sort((a, b) => {
    // Si 'a' es string (por ejemplo "No asignado"), lo mandamos al final
    if (typeof a === "string") return 1;
    if (typeof b === "string") return -1;

    // Ambos son números, orden normal
    return a - b;
  });

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

        return aStartsWith !== bStartsWith
          ? aStartsWith - bStartsWith
          : a.sku.length - b.sku.length;
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

        // Agrega fondo amarillo claro manualmente
        const parent = elemento.parentElement;
        if (parent) {
          parent.style.backgroundColor = "#fef9c3"; // equivalente a bg-yellow-100

          setTimeout(() => {
            parent.style.backgroundColor = ""; // remueve el fondo
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

    const coincidencias =
      encontrarCoincidenciasAproximadas(skuReposicionABuscar);
    if (coincidencias.length > 0) {
      setCoincidenciasReposicionEncontradas(coincidencias);
      setSkuSeleccionadoReposicion(coincidencias[0].sku);
      setMostrarModalCoincidenciasReposicion(true);
    } else {
      Swal.fire({
        icon: "warning",
        title: "Sin coincidencias",
        text: "No se encontraron coincidencias para el SKU ingresado",
      });
    }
  };

  const confirmarSeleccionReposicion = () => {
    setSkuReposicionABuscar(skuSeleccionadoReposicion);
    setMostrarModalCoincidenciasReposicion(false);
  };

  const agregarAReposicion = (): void => {
    // Especificamos el tipo de retorno
    if (!skuSeleccionadoReposicion || !nuevaCantidadReposicion) {
      Swal.fire({
        icon: "warning",
        title: "Datos incompletos",
        text: "Debes seleccionar un SKU e ingresar una cantidad",
      });
      return;
    }

    const cantidad = Number(nuevaCantidadReposicion);
    if (isNaN(cantidad) || cantidad <= 0) {
      Swal.fire({
        icon: "error",
        title: "Cantidad inválida",
        text: "La cantidad debe ser un número mayor a cero",
      });
      return;
    }

    const existe = productosReposicion.some(
      (p) => p.sku === skuSeleccionadoReposicion
    );
    if (existe) {
      Swal.fire({
        icon: "warning",
        title: "SKU duplicado",
        text: "Este SKU ya fue agregado a la reposición",
      });
      return;
    }

    // Agregar a la lista de reposición
    setProductosReposicion((prev) => [
      ...prev,
      { sku: skuSeleccionadoReposicion, cantidad },
    ]);
    // Limpiar campos
    setSkuReposicionABuscar("");
    setSkuSeleccionadoReposicion("");
    setNuevaCantidadReposicion("");
  };

  const eliminarDeReposicion = (sku: string) => {
    setProductosReposicion((prev) => prev.filter((p) => p.sku !== sku));
  };

  const guardarReposicion = async () => {
    if (productosReposicion.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Reposición vacía",
        text: "No hay productos para guardar",
      });
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
      Swal.fire({
        icon: "success",
        title: "Reposición guardada",
        text: `Se guardaron ${productosReposicion.length} productos correctamente`,
      });

      // Limpiar después de guardar
      setProductosReposicion([]);
    } catch (error) {
      console.error("Error al guardar reposición:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo guardar la reposición",
      });
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
      return numericValue !== null
        ? [...cambiosFiltrados, { id, conteoFisico: numericValue }]
        : cambiosFiltrados;
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
    } finally {
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
      Swal.fire({
        icon: "success",
        title: "Conteos reseteados",
        text: `${result.updatedCount} conteos reseteados correctamente`,
      });

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

  // handleFileUpload con validación y tipado completo
const handleFileUpload = async (file: File, empresa: "Femex" | "Blow") => {
  setLoading(true);
  
  try {
    const datosExcelParaCargar = await readExcelFile(file);
    const skuCantidadMap = extractSkuCantidad(datosExcelParaCargar);
    const productosParaGuardar: ProductoReposicion[] = Array.from(skuCantidadMap.entries()).map(
      ([sku, cantidad]) => ({ sku, cantidad })
    );
    
    
    
    const skusArchivo = productosParaGuardar.map(p => p.sku);
    const validacion = validarSkus(skusArchivo);



    if (!validacion.valido) {
      Swal.fire({
        icon: 'error',
        title: 'SKUs no válidos',
        html: `Los siguientes SKUs no existen: <br><strong>${validacion.skusInvalidos.join(', ')}</strong>`,
      });
      return;
    }

    // Si pasa validación, proceder con el guardado
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
    
    // Actualizar estado (ajusta el tipo según tu interfaz ProductoInventario)
    setProductos((prev: Producto[]) => prev.map((producto) => {
      if (skuCantidadMap.has(producto.sku)) {
        const cantidad = skuCantidadMap.get(producto.sku)!;
        return {
          ...producto,
          [empresa === "Femex" ? "cantSistemaFemex" : "cantSistemaBlow"]: cantidad,
          fechaConteo: new Date().toISOString(),
        };
      }
      return producto;
    }));

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
        row["SKU"]  ;
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
      if (bloqueSeleccionado === "No asignado")
        return !p.idBloque || p.idBloque === "";
      return p.idBloque == bloqueSeleccionado;
    })
    .sort((a, b) =>
      bloqueSeleccionado !== "" ? a.sku.localeCompare(b.sku) : 0
    );

  return (
    <>
      {loading && (
        <div className="loader-container"          
        >
          <Loader />
        </div>
      )}

      <div className="inventario-container"
      >
        <div>
          <h1 
            className="inventario-title"
            id="titulo-inventario"
          >
            Conteo Físico de Inventario
          </h1>
          <button
            className="reposicion-button"
            onClick={activarModoReposicion}
          >
            Carga de reposición
          </button>
        </div>

        {/* Filtros */}
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

        {/* Acciones */}
        {!modoReposicion && (
          <div className="acciones-container">
            <div
              className="acciones-panel"
            >
              <label
               className="acciones-label"
              >
                Acciones
              </label>
              <div className="acciones-buttons">
                <GuardarInventario
                  productos={cambiosPendientes.map((c) => ({
                    id: c.id,
                    conteoFisico: c.conteoFisico,
                    sku: productos.find((p) => p.id === c.id)?.sku || "",
                    loading
                  }))}
                  onGuardar={handleGuardar}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      height: "1.25rem",
                      width: "1.25rem",
                      marginRight: "0.5rem",
                    }}
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
                  className="excel-button"
                  title="Exportar a Excel"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      height: "1.25rem",
                      width: "1.25rem",
                      marginRight: "0.375rem",
                    }}
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
        )}

        {/* Carga de reposición */}
        {modoReposicion && (
          <div
            style={{
              marginBottom: "1.5rem",
              backgroundColor: "#f9fafb",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                marginBottom: "1rem",
                color: "#1f2937",
              }}
            >
              Carga de Reposición
            </h2>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ flex: 2, display: "flex" }}>
                <input
                  type="text"
                  placeholder="Buscar SKU"
                  value={skuReposicionABuscar}
                  onChange={(e) => setSkuReposicionABuscar(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleBuscarSkuReposicion()
                  }
                  style={{
                    padding: "0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem 0 0 0.375rem",
                    flex: 1,
                  }}
                />
                <button
                  onClick={handleBuscarSkuReposicion}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "0.5rem",
                    borderRadius: "0 0.375rem 0.375rem 0",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ height: "1rem", width: "1rem" }}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
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
                style={{
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  flex: 1,
                }}
              />

              <button
                onClick={agregarAReposicion}
                style={{
                  backgroundColor: "#10b981",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                }}
              >
                Agregar
              </button>
            </div>

            {skuSeleccionadoReposicion && (
              <div
                style={{
                  backgroundColor: "#e0e7ff",
                  padding: "0.5rem",
                  borderRadius: "0.375rem",
                  marginBottom: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  SKU seleccionado: <strong>{skuSeleccionadoReposicion}</strong>
                </span>
                <button
                  onClick={() => setSkuSeleccionadoReposicion("")}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "white",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    fontSize: "0.75rem",
                  }}
                >
                  Cambiar
                </button>
              </div>
            )}

            {/* Lista de productos agregados */}
            <div style={{ marginBottom: "1rem" }}>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "500",
                  marginBottom: "0.5rem",
                }}
              >
                Productos en reposición ({productosReposicion.length})
              </h3>

              {productosReposicion.length > 0 ? (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    overflow: "hidden",
                  }}
                >
                  {productosReposicion.map((producto, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        borderBottom:
                          index < productosReposicion.length - 1
                            ? "1px solid #e5e7eb"
                            : "none",
                        backgroundColor: index % 2 === 0 ? "white" : "#f9fafb",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "500" }}>{producto.sku}</div>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          Cantidad: {producto.cantidad}
                        </div>
                      </div>
                      <button
                        onClick={() => eliminarDeReposicion(producto.sku)}
                        style={{
                          backgroundColor: "#ef4444",
                          color: "white",
                          padding: "0.25rem 0.5rem",
                          borderRadius: "0.25rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    color: "#6b7280",
                    border: "1px dashed #d1d5db",
                    borderRadius: "0.375rem",
                  }}
                >
                  No hay productos agregados
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                onClick={volverAModoNormal}
                style={{
                  backgroundColor: "#6b7280",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                }}
              >
                Cerrar
              </button>
              <button
                onClick={guardarReposicion}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "white",
                  padding: "0.5rem 1rem",
                  borderRadius: "0.375rem",
                }}
              >
                Guardar Reposición
              </button>
            </div>
          </div>
        )}

        {/* Carga de Excel */}
        {!modoReposicion && (
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Cargar Excel Femex */}
            <div
              style={{
                backgroundColor: "#f9fafb",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                flex: 1,
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.25rem",
                }}
              >
                Cargar Excel Femex
              </label>
              <div style={{ display: "flex" }}>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileInputChange(e, "Femex")
                  }
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    border: "1px solid rgb(156, 158, 163)",
                    borderRadius: "0.375rem 0 0 0.375rem",
                    outline: "none",
                    width: "40%",
                  }}
                />
                <button
                  onClick={() => handleBorrarDatos("Femex")}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "white",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0 0.375rem 0.375rem 0",
                    transition: "background-color 0.2s",
                  }}
                  title="Borrar todos los datos de Femex"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ height: "1.25rem", width: "1.25rem" }}
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
            <div
              style={{
                backgroundColor: "#f9fafb",
                padding: "0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #e5e7eb",
                flex: 1,
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#374151",
                  marginBottom: "0.25rem",
                }}
              >
                Cargar Excel Blow
              </label>
              <div style={{ display: "flex" }}>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFileInputChange(e, "Blow")
                  }
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    border: "1px solid rgb(156, 158, 163)",
                    borderRadius: "0.375rem 0 0 0.375rem",
                    outline: "none",
                    width: "500%",
                  }}
                />
                <button
                  onClick={() => handleBorrarDatos("Blow")}
                  style={{
                    backgroundColor: "#dc2626",
                    color: "white",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0 0.375rem 0.375rem 0",
                    transition: "background-color 0.2s",
                  }}
                  title="Borrar todos los datos de Blow"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ height: "1.25rem", width: "1.25rem" }}
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
                    backgroundColor: "#dc2626",
                    color: "white",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.375rem",
                    marginLeft: "0.5rem",
                    transition: "background-color 0.2s",
                  }}
                  title="Resetear todos los conteos físicos"
                >
                  Borrar Conteos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de productos */}
        {!modoReposicion && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ fontSize: "2rem", border: "1px solid #d1d5db" }}>
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      textAlign: "left",
                    }}
                  >
                    SKU
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      textAlign: "left",
                      width: "0.5rem",
                    }}
                  >
                    Bloque
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      width: "6rem",
                    }}
                  >
                    Stock
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      width: "6rem",
                    }}
                  >
                    Conteo
                  </th>
                  <th
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #d1d5db",
                      textAlign: "center",
                      width: "6rem",
                    }}
                  >
                    Dif
                  </th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length > 0 ? (
                  productosFiltrados.map((producto) => {
                    const diferencia = calcularDiferencia(producto);

                    return (
                      <tr key={producto.id}>
                        <td
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            backgroundColor: "#f3f4f6",
                            borderBottom: "1px solid #d1d5db"
                          }}
                          id={`sku-${producto.sku}`}
                        >
                          {producto.sku}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            
                            textAlign: "center"
                          }}
                        >
                          {producto.idBloque || "No asignado"}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            
                          }}
                        >
                          {producto.cantSistemaFemex + producto.cantSistemaBlow}
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            textAlign: "center"
                          }}
                        >
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
                            productosReposicion={productosReposicion}
                            sku={producto.sku}
                            onFocus={() =>
                              handleFocus({
                                target: document.createElement("input"),
                              } as React.FocusEvent<HTMLInputElement>)
                            }
                          />
                        </td>
                        <td
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #d1d5db",
                            textAlign: "center",
                            color:
                              diferencia > 0
                                ? "#1d4ed8"
                                : diferencia < 0
                                ? "#dc2626"
                                : "#4b5563",
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
                    <td
                      colSpan={5}
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      No se encontraron productos con los filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Botón flotante y resumen */}
        <div>
          <button
            style={{
              backgroundColor: "#10b981",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              position: "fixed",
              bottom: "0.25rem",
              right: "0.25rem",
              zIndex: 50,
            }}
            onClick={() =>
              document.getElementById("titulo-inventario")?.scrollIntoView()
            }
          >
            Ir arriba
          </button>
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            backgroundColor: "#f9fafb",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Productos totales: {productos.length}</span>
            <span>Filtrados: {productosFiltrados.length}</span>
            <span style={{ fontWeight: "500" }}>
              Con conteo:{" "}
              {productos.filter((p) => p.conteoFisico !== null).length}
            </span>
            
          </div>
        </div>

        {mostrarModalCoincidencias && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "0.5rem",
                maxWidth: "32rem",
                width: "100%",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                }}
              >
                Seleccione el SKU deseado
              </h3>
              <p style={{ marginBottom: "1rem" }}>
                No se encontró el SKU exacto. Coincidencias aproximadas:
              </p>
              <div
                style={{
                  maxHeight: "15rem",
                  overflowY: "auto",
                  marginBottom: "1rem",
                }}
              >
                {coincidenciasEncontradas.slice(0, 10).map((producto) => (
                  <label
                    key={producto.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <button
                  onClick={() => setMostrarModalCoincidencias(false)}
                  style={{
                    backgroundColor: "#6b7280",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarSeleccion}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                  }}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {mostrarModalCoincidenciasReposicion && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                padding: "1.5rem",
                borderRadius: "0.5rem",
                maxWidth: "32rem",
                width: "100%",
              }}
            >
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "bold",
                  marginBottom: "1rem",
                }}
              >
                Seleccione el SKU deseado
              </h3>
              <p style={{ marginBottom: "1rem" }}>Coincidencias encontradas:</p>
              <div
                style={{
                  maxHeight: "15rem",
                  overflowY: "auto",
                  marginBottom: "1rem",
                }}
              >
                {coincidenciasReposicionEncontradas
                  .slice(0, 10)
                  .map((producto) => (
                    <label
                      key={producto.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="skuSeleccionadoReposicion"
                        value={producto.sku}
                        checked={skuSeleccionadoReposicion === producto.sku}
                        onChange={() =>
                          setSkuSeleccionadoReposicion(producto.sku)
                        }
                        style={{ marginRight: "0.5rem" }}
                      />
                      {producto.sku}
                    </label>
                  ))}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                }}
              >
                <button
                  onClick={() => setMostrarModalCoincidenciasReposicion(false)}
                  style={{
                    backgroundColor: "#6b7280",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarSeleccionReposicion}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "0.5rem 1rem",
                    borderRadius: "0.375rem",
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
  );
};
