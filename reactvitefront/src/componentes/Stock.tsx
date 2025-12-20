import { useState, useEffect, useMemo } from "react";
import Loader from "./utilidades/Loader";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import axios from "axios";
import Urls from "./utilidades/Urls";
import { ListarOp } from "./utilidades/ListarOp";

import AsyncSelect from "react-select/async";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ✅ Interfaz principal
interface StockRMA {
  idRma: number;
  sku: string;
  marca: string;
  cantidad: number;
  opLote: string | null;
  cliente: string;
}

// ✅ Tipo derivado: mismo que StockRMA pero SIN id ni cliente
type StockRMAAgrupado = Omit<StockRMA, "idRma" | "cliente">;

// ✅ Tipo unión para manejar ambos modoFiltros
type StockItem = StockRMA | StockRMAAgrupado;

// ✅ Tipo para items del informe
interface ItemInforme {
  sku: string;
  ops: { [op: string]: number }; // { "OP-123": 5, "OP-456": 3 }
  cantidadTotal: number;
}

export const Stock: React.FC = () => {
  // ✅ Datos crudos del backend (solo se cargan una vez)
  const [stockCrudo, setStockCrudo] = useState<StockRMA[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filtro, setFiltro] = useState<string>("");
  const [opSeleccionada, setOpSeleccionada] = useState<string>("");
  const [modoFiltro, setmodoFiltro] = useState<"total" | "detalle">("total");
  const [modoInforme, setmodoInforme] = useState<"preparandoInforme" | "normal">("normal");

  // Estado para modal de ajuste
  const [modalAjusteAbierto, setModalAjusteAbierto] = useState(false);
  const [registroSeleccionado, setRegistroSeleccionado] =
    useState<StockRMA | null>(null);
  const [asignaciones, setAsignaciones] = useState<
    Array<{
      op: string | null;
      cantidad: number;
      cliente: string;
      idRma: number;
    }>
  >([]);

  const [cargandoOps, setCargandoOps] = useState(false);

  // Estado para modo informe
  const [itemsInforme, setItemsInforme] = useState<ItemInforme[]>([]);

  // Estado para gestión de lotes
  const [modalLotesAbierto, setModalLotesAbierto] = useState(false);
  const [lotes, setLotes] = useState<Array<{
    id: number;
    fecha_descarga: string;
    estado: string;
    fecha_confirmacion: string | null;
    total_productos: number;
  }>>([]);

  const urlStockRMA = Urls.stock.obtener;
  const urlListarOp = Urls.rma.listarOp;
  const urlActualizarOp = Urls.stock.actualizarOp;

  // Cargar stock inicial (solo una vez)
  const fetchStockRMA = async () => {
    setLoading(true);
    try {
      const response = await axios.get<StockRMA[]>(urlStockRMA);
      setStockCrudo(response.data);
    } catch (error) {
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text:
          axios.isAxiosError(error) && error.response?.data?.error
            ? error.response.data.error
            : "No se pudo cargar el stock de RMA",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockRMA();
  }, []);

  // Función para cargar OPs con búsqueda (para react-select)
  const loadOptions = async (inputValue: string) => {
    if (!inputValue.trim()) return [];

    try {
      const response = await axios.get<{ id: number; nombre: string }[]>(
        `${urlListarOp}/${inputValue}`
      );
      return response.data.map((op) => ({
        value: op.nombre,
        label: op.nombre,
        id: op.id,
      }));
    } catch (error) {
      console.error("Error al cargar OPs:", error);
      return [];
    }
  };

  // Abrir modal de ajuste
  const handleAjustarClick = (item: StockRMA) => {
    // Filtrar todos los registros del mismo SKU
    const registrosDelSku = stockCrudo.filter((r) => r.sku === item.sku);

    // Convertir a asignaciones iniciales (con los valores actuales)
    const asignacionesIniciales = registrosDelSku.map((r) => ({
      op: r.opLote,
      cantidad: r.cantidad,
      cliente: r.cliente,
      idRma: r.idRma,
    }));

    setRegistroSeleccionado(item);
    setAsignaciones(asignacionesIniciales);
    loadOptions(""); // Cargar todas las OPs inicialmente
    setModalAjusteAbierto(true);
  };

  // Guardar ajustes (actualizar SOLO opLote por idRma)
  const handleGuardarAjustes = async () => {
    if (!registroSeleccionado) return;

    // Validar asignaciones
    for (let asig of asignaciones) {
      if (!asig.op) {
        sweetAlert.fire({
          icon: "warning",
          title: "Advertencia",
          text: "Selecciona una OP para cada registro.",
          confirmButtonText: "Cerrar",
        });
        return;
      }
    }

    try {
      setLoading(true);
      // Actualizar cada registro individualmente
      for (const asignacion of asignaciones) {
        const { idRma, op } = asignacion;

        // Llamar al nuevo endpoint
        await axios.post(
          `${urlActualizarOp}/${idRma}`,
          { opLote: op },
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      sweetAlert.fire({
        icon: "success",
        title: "¡Éxito!",
        text: "OPs asignadas correctamente.",
        confirmButtonText: "Cerrar",
      });

      setModalAjusteAbierto(false);
      fetchStockRMA(); // Recargar datos crudos
    } catch (error) {
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: axios.isAxiosError(error)
          ? error.response?.data?.error || "Error al guardar ajustes"
          : "Error desconocido",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };
  // Manejar selección de item en modo informe
  const handleSeleccionarItem = (item: StockRMA) => {
    // Verificar si el item ya está seleccionado
    const yaSeleccionado = itemsInforme.some(
      (i) => i.sku === item.sku && i.ops[item.opLote || "Sin OP"] !== undefined
    );

    if (yaSeleccionado) {
      sweetAlert.fire({
        icon: "warning",
        title: "Item ya seleccionado",
        text: `${item.sku} - ${item.opLote || "Sin OP"} ya está en el informe`,
        timer: 1500,
        showConfirmButton: false,
      });
      return;
    }

    setItemsInforme((prevItems) => {
      // Buscar si ya existe un item con este SKU
      const indexExistente = prevItems.findIndex((i) => i.sku === item.sku);

      if (indexExistente !== -1) {
        // Si existe, actualizar las ops y cantidad total
        const itemExistente = prevItems[indexExistente];
        const nuevasOps = { ...itemExistente.ops };
        const op = item.opLote || "Sin OP";

        // Agregar o sumar la cantidad de esta OP
        nuevasOps[op] = (nuevasOps[op] || 0) + item.cantidad;

        const nuevaCantidadTotal = Object.values(nuevasOps).reduce(
          (sum, cant) => sum + cant,
          0
        );

        const nuevosItems = [...prevItems];
        nuevosItems[indexExistente] = {
          sku: item.sku,
          ops: nuevasOps,
          cantidadTotal: nuevaCantidadTotal,
        };

        return nuevosItems;
      } else {
        // Si no existe, crear nuevo item
        const op = item.opLote || "Sin OP";
        return [
          ...prevItems,
          {
            sku: item.sku,
            ops: { [op]: item.cantidad },
            cantidadTotal: item.cantidad,
          },
        ];
      }
    });
  };

  // Manejar selección de todos los items visibles
  const handleSeleccionarTodos = () => {
    // Seleccionar todos los items filtrados que son StockRMA (modo detalle)
    if (modoFiltro === "detalle") {
      let agregados = 0;
      let yaSeleccionados = 0;

      (stockFiltrado as StockRMA[]).forEach((item) => {
        // Verificar si el item ya está seleccionado
        const yaSeleccionado = itemsInforme.some(
          (i) => i.sku === item.sku && i.ops[item.opLote || "Sin OP"] !== undefined
        );

        if (!yaSeleccionado) {
          handleSeleccionarItem(item);
          agregados++;
        } else {
          yaSeleccionados++;
        }
      });

      if (agregados > 0) {

      } else if (yaSeleccionados > 0) {
        sweetAlert.fire({
          icon: "info",
          title: "Sin cambios",
          text: "Todos los items ya estaban seleccionados",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    }
  };

  // Manejar selección de OP en filtro
  const handleOpSeleccionada = (
    opLote: { id: number; nombre: string; fechaIngreso?: string }[]
  ) => {
    if (opLote.length > 0) {
      setOpSeleccionada(opLote[0].nombre);
    } else {
      setOpSeleccionada("");
    }
  };

  // Generar Excel con los items seleccionados - UNA FILA POR CADA OP
  const generarExcel = async () => {
    if (itemsInforme.length === 0) {
      sweetAlert.fire({
        icon: "warning",
        title: "Sin items",
        text: "No hay items seleccionados para generar el informe",
        confirmButtonText: "Cerrar",
      });
      return;
    }

    try {
      setLoading(true);

      // 1. Preparar los datos para crear el lote
      const productosParaLote: Array<{
        rma_id: number;
        sku: string;
        cantidad: number;
        op: string;
      }> = [];

      // Recorrer itemsInforme y buscar los idRma correspondientes en stockCrudo
      itemsInforme.forEach((item) => {
        Object.entries(item.ops).forEach(([op, cantidad]) => {
          // Buscar todos los registros que coincidan con este SKU y OP
          const registrosCoincidentes = stockCrudo.filter(
            (r) => r.sku === item.sku && r.opLote === op
          );

          // Agregar cada registro al array
          registrosCoincidentes.forEach((registro) => {
            productosParaLote.push({
              rma_id: registro.idRma,
              sku: registro.sku,
              cantidad: registro.cantidad,
              op: registro.opLote || "Sin OP",
            });
          });
        });
      });

      // Debug: ver qué productos se están enviando
      console.log('Productos para lote:', productosParaLote);
      console.log('Total de productos:', productosParaLote.length);

      // 2. Llamar al endpoint para crear el lote
      const responseLote = await axios.post(
        Urls.stock.crearLote,
        { productos: productosParaLote },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const loteId = responseLote.data.loteId;

      // 3. Generar el Excel con el loteId incluido
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Informe Stock RMA");

      // Configurar columnas
      worksheet.columns = [
        { header: "SKU", key: "sku", width: 20 },
        { header: "OP/Lote", key: "op", width: 25 },
        { header: "Cantidad", key: "cantidad", width: 15 },
      ];

      // Estilo del header
      // Estilo del header - solo columnas 1-3
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };

      // Aplicar fondo azul solo a las 3 columnas
      for (let col = 1; col <= 3; col++) {
        headerRow.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
      }

      let totalGeneral = 0;

      // Agregar datos - una fila por cada OP de cada SKU
      itemsInforme.forEach((item) => {
        const ops = Object.entries(item.ops);

        // Agregar una fila por cada OP
        ops.forEach(([op, cantidad], index) => {
          worksheet.addRow({
            sku: index === 0 ? item.sku : "", // Solo mostrar SKU en la primera fila
            op: op,
            cantidad: cantidad,
          });
          totalGeneral += cantidad;
        });

        // Agregar fila de subtotal para este SKU (SIEMPRE, incluso con 1 OP)
        // Agregar fila de subtotal para este SKU (SIEMPRE, incluso con 1 OP)
        const rowSubtotal = worksheet.addRow({
          sku: "",
          op: `Subtotal ${item.sku}`,
          cantidad: item.cantidadTotal,
        });
        rowSubtotal.font = { bold: true, italic: true };

        // Aplicar fondo gris solo a las 3 columnas
        for (let col = 1; col <= 3; col++) {
          rowSubtotal.getCell(col).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE7E6E6" },
          };
        }
      });

      // Estilo de las celdas de datos
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
            cell.alignment = { vertical: "middle", horizontal: "left" };
          });

          // Alinear cantidad a la derecha
          row.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
        }
      });

      // Agregar fila de total general
      // Agregar fila de total general
      const rowTotal = worksheet.addRow({
        sku: "",
        op: "TOTAL GENERAL",
        cantidad: totalGeneral,
      });
      rowTotal.font = { bold: true, size: 12 };
      rowTotal.getCell(3).alignment = { vertical: "middle", horizontal: "right" };

      // Aplicar fondo amarillo solo a las 3 columnas
      for (let col = 1; col <= 3; col++) {
        rowTotal.getCell(col).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF2CC" },
        };
      }

      // 4. Crear hoja oculta con el loteId
      const metadataSheet = workbook.addWorksheet("Metadata");
      metadataSheet.getCell("A1").value = loteId;
      metadataSheet.state = "hidden"; // Ocultar la hoja

      // Generar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fecha = new Date().toISOString().split("T")[0];
      saveAs(blob, `Informe_Stock_RMA_${fecha}.xlsx`);

      sweetAlert.fire({
        icon: "success",
        title: "Excel generado",
        text: `Lote #${loteId} creado correctamente`,
        confirmButtonText: "Cerrar",
      });

    } catch (error) {
      console.error("Error al generar Excel:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: axios.isAxiosError(error)
          ? error.response?.data?.message || "No se pudo generar el archivo Excel"
          : "No se pudo generar el archivo Excel",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };

  // Confirmar recepción de productos (subir Excel y actualizar BD)
  const confirmarRecepcion = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);

      // 1. Leer el archivo Excel
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      // 2. Extraer el loteId de la hoja Metadata
      const metadataSheet = workbook.getWorksheet("Metadata");
      if (!metadataSheet) {
        sweetAlert.fire({
          icon: "error",
          title: "Excel inválido",
          text: "El archivo no contiene la hoja de Metadata. Asegúrate de usar un Excel generado por este sistema.",
          confirmButtonText: "Cerrar",
        });
        return;
      }

      const loteId = metadataSheet.getCell("A1").value;
      if (!loteId || typeof loteId !== "number") {
        sweetAlert.fire({
          icon: "error",
          title: "Excel inválido",
          text: "No se pudo leer el ID del lote. El archivo puede estar corrupto.",
          confirmButtonText: "Cerrar",
        });
        return;
      }

      // 3. Confirmar con el usuario
      const confirmacion = await sweetAlert.fire({
        icon: "warning",
        title: "Confirmar recepción",
        html: `¿Estás seguro de confirmar la recepción del lote <b>#${loteId}</b>?<br><br>Esto actualizará el estado de los productos en la base de datos.`,
        showCancelButton: true,
        confirmButtonText: "Sí, confirmar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      });

      if (!confirmacion.isConfirmed) {
        return;
      }

      // 4. Llamar al endpoint para confirmar el lote
      const response = await axios.post(
        Urls.stock.confirmarLote,
        { loteId },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      sweetAlert.fire({
        icon: "success",
        title: "¡Recepción confirmada!",
        text: response.data.message || `Lote #${loteId} confirmado correctamente`,
        confirmButtonText: "Cerrar",
      });

      // 5. Recargar el stock para reflejar los cambios
      fetchStockRMA();

    } catch (error) {
      console.error("Error al confirmar recepción:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: axios.isAxiosError(error)
          ? error.response?.data?.message || "No se pudo confirmar la recepción"
          : "No se pudo confirmar la recepción",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
      // Limpiar el input file
      event.target.value = "";
    }
  };

  // Cargar lista de lotes
  const fetchLotes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(Urls.stock.listarLotes);
      setLotes(response.data);
      setModalLotesAbierto(true);
    } catch (error) {
      console.error("Error al cargar lotes:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los lotes",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };

  // Revertir confirmación de un lote por ID
  const revertirLotePorId = async (loteId: number) => {
    try {
      // Confirmar con el usuario
      const confirmacion = await sweetAlert.fire({
        icon: "warning",
        title: "Revertir confirmación",
        html: `¿Estás seguro de revertir la confirmación del lote <b>#${loteId}</b>?<br><br>Esto volverá a marcar los productos como <b>enExistencia = true</b>.`,
        showCancelButton: true,
        confirmButtonText: "Sí, revertir",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!confirmacion.isConfirmed) {
        return;
      }

      setLoading(true);

      // Llamar al endpoint para revertir el lote
      const response = await axios.post(
        Urls.stock.revertirLote,
        { loteId },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      sweetAlert.fire({
        icon: "success",
        title: "¡Lote revertido!",
        text: response.data.message || `Lote #${loteId} revertido correctamente`,
        confirmButtonText: "Cerrar",
      });

      // Recargar lotes y stock
      fetchLotes();
      fetchStockRMA();

    } catch (error) {
      console.error("Error al revertir lote:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error",
        text: axios.isAxiosError(error)
          ? error.response?.data?.message || "No se pudo revertir el lote"
          : "No se pudo revertir el lote",
        confirmButtonText: "Cerrar",
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ Calcular stock filtrado/agrupado REACTIVAMENTE (sin recargar del backend)
  const stockFiltrado: StockItem[] = useMemo(() => {
    // Primero, aplicar filtro por OP
    let resultado = stockCrudo.filter((item) => {
      if (opSeleccionada === "") return true;
      return item.opLote === opSeleccionada;
    });

    // Luego, aplicar filtro de texto
    if (filtro) {
      const filtroLower = filtro.toLowerCase();
      resultado = resultado.filter(
        (item) =>
          item.sku.toLowerCase().includes(filtroLower) ||
          item.marca.toLowerCase().includes(filtroLower) ||
          (item.opLote && item.opLote.toLowerCase().includes(filtroLower))
      );
    }

    // Si modoFiltro es "total", agrupamos
    if (modoFiltro === "total") {
      const agrupado = resultado.reduce((acc, item) => {
        const key = `${item.sku}#${item.marca}`;
        if (!acc[key]) {
          acc[key] = {
            sku: item.sku,
            marca: item.marca,
            cantidad: 0,
            opLote: null,
          };
        }
        acc[key].cantidad += item.cantidad;
        return acc;
      }, {} as Record<string, StockRMAAgrupado>);

      return Object.values(agrupado);
    }

    // Si modoFiltro es "detalle", devolvemos los datos filtrados (sin agrupar)
    return resultado;
  }, [stockCrudo, modoFiltro, opSeleccionada, filtro]);

  // ✅ Función para verificar si un item ya está seleccionado
  const isItemSeleccionado = (item: StockRMA): boolean => {
    return itemsInforme.some(
      (i) => i.sku === item.sku && i.ops[item.opLote || "Sin OP"] !== undefined
    );
  };

  // ✅ Verificar si todos los SKU son iguales y calcular suma total
  const sumaTotalSKU = useMemo(() => {
    // Solo aplicar cuando hay filtro de texto y estamos en modo detalle
    if (!filtro || modoFiltro === "total" || stockFiltrado.length === 0) {
      return null;
    }

    // Verificar si todos los SKU son iguales
    const primerSKU = stockFiltrado[0].sku;
    const todosIguales = stockFiltrado.every((item) => item.sku === primerSKU);

    if (!todosIguales) {
      return null;
    }

    // Calcular suma total
    const total = stockFiltrado.reduce((sum, item) => sum + item.cantidad, 0);

    return {
      sku: primerSKU,
      total: total,
    };
  }, [stockFiltrado, filtro, modoFiltro]);

  return (
    <div
      className="p-4 max-w-2xl mx-auto bg-white rounded-lg shadow-lg shadow-gray-500 mb-6"
      style={{ boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Stock de RMA</h1>
      {loading && <Loader />}

      {/* Botón para confirmar recepción */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-300">
        <h3 className="text-lg font-bold mb-2 text-gray-800">
          Gestión de Lotes
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Confirma la recepción de productos o revierte confirmaciones anteriores.
        </p>
        <div className="flex gap-3">
          <label className="inline-block px-6 py-2 bg-green-600 text-white rounded-lg shadow cursor-pointer hover:bg-green-700">
            <input
              type="file"
              accept=".xlsx"
              onChange={confirmarRecepcion}
              className="hidden"
            />
            📤 Subir Excel y Confirmar
          </label>
          <button
            onClick={fetchLotes}
            className="px-6 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700"
          >
            📋 Ver Lotes y Revertir
          </button>
        </div>
      </div>

      {/* Filtro de texto */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por SKU, marca..."
          className="w-100 p-3 border text-gray-700 border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* Botón para cambiar modoFiltro */}
      <div className="mb-4 flex">
        <button
          onClick={() => setmodoFiltro(modoFiltro === "total" ? "detalle" : "total")}
          className={`px-6 py-2 rounded-lg shadow max-h-11 ${modoFiltro === "total"
            ? "bg-green-600 text-white"
            : "bg-blue-600 text-white"
            }`}
        >
          {modoFiltro === "total" ? "Mostrar por OP" : "Ver total"}
        </button>

        {/* Selector de OP (solo en modoFiltro detalle) */}
        {modoFiltro === "detalle" && (
          <div className="ml-4 w-70">
            <ListarOp
              endpoint={urlListarOp}
              onSeleccionado={handleOpSeleccionada}
              campos={["nombre"]}
            />
          </div>
        )}
      </div>

      {/* Botón para modo informe */}
      <div>
        <button
          onClick={() => setmodoInforme(modoInforme === "preparandoInforme" ? "normal" : "preparandoInforme")}
          className="bg-green-600 text-white px-6 py-2 rounded-lg shadow max-h-11 mb-6"
        >
          {modoInforme === "preparandoInforme" ? "Cancelar Informe" : "Preparar Informe"}
        </button>

        {modoInforme === "preparandoInforme" && itemsInforme.length > 0 && (
          <>
            <button
              onClick={() => setItemsInforme([])}
              className="ml-4 bg-red-600 text-white px-6 py-2 rounded-lg shadow max-h-11 mb-6"
            >
              Limpiar Selección ({itemsInforme.length})
            </button>
            <button
              onClick={generarExcel}
              className="ml-4 bg-blue-600 text-white px-6 py-2 rounded-lg shadow max-h-11 mb-6"
            >
              Generar Excel
            </button>
          </>
        )}
      </div>

      {/* Mostrar items seleccionados en modo informe */}
      {modoInforme === "preparandoInforme" && itemsInforme.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-300">
          <h3 className="text-lg font-bold mb-3 text-gray-800">
            Items Seleccionados para Informe ({itemsInforme.length})
          </h3>
          <div className="max-h-60 overflow-y-auto">
            {itemsInforme.map((item, index) => (
              <div
                key={index}
                className="mb-3 p-3 bg-white rounded shadow-sm border border-gray-200"
              >
                <div className="font-bold text-gray-900 mb-1">
                  SKU: {item.sku}
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-semibold">OPs:</span>{" "}
                  {Object.entries(item.ops)
                    .map(([op, cant]) => `${op}: ${cant}`)
                    .join(", ")}
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  Cantidad Total: {item.cantidadTotal}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Op/Lote
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {modoInforme === "preparandoInforme" ? (
                    <div className="flex items-center justify-end gap-2">
                      <span>Seleccionar</span>
                      {modoFiltro === "detalle" && (
                        <input
                          type="checkbox"
                          onChange={handleSeleccionarTodos}
                          className="w-4 h-4 cursor-pointer"
                          title="Seleccionar todos"
                        />
                      )}
                    </div>
                  ) : (
                    "Ajustar"
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockFiltrado.length > 0 ? (
                <>
                  {stockFiltrado.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-100">
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                        {modoFiltro === "total" ? "-" : item.opLote || "Sin OP"}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                        {item.marca}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                        {item.cantidad}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                        {modoFiltro === "detalle" ? (
                          modoInforme === "preparandoInforme" ? (
                            <input
                              type="checkbox"
                              checked={isItemSeleccionado(item as StockRMA)}
                              onChange={() => handleSeleccionarItem(item as StockRMA)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          ) : (
                            <button
                              id="ajustar-stock-btn"
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-700"
                              onClick={() => handleAjustarClick(item as StockRMA)}
                            >
                              Ajustar
                            </button>
                          )
                        ) : (
                          <button
                            id="ajustar-stock-btn"
                            className="px-4 py-2 bg-blue-300 text-white rounded-lg shadow hover:bg-blue-200"
                          >
                            Ajustar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Fila de total cuando todos los SKU son iguales */}
                  {sumaTotalSKU && (
                    <tr className="bg-yellow-50 border-t-2 border-yellow-400">
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        TOTAL {sumaTotalSKU.sku}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                        -
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                        -
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        {sumaTotalSKU.total}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-right">
                        -
                      </td>
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {loading ? "Cargando..." : "No hay stock disponible"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Ajuste de OP */}
      {modalAjusteAbierto && registroSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Ajustar OP para {registroSeleccionado.sku} (
                {registroSeleccionado.cantidad} unidades)
              </h2>

              {asignaciones.map((asignacion, idx) => (
                <div
                  key={idx}
                  className="flex gap-4 mb-4 p-4 bg-gray-50 rounded"
                >
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OP ({asignacion.cliente})
                    </label>
                    {cargandoOps ? (
                      <div>Cargando...</div>
                    ) : (
                      <AsyncSelect
                        cacheOptions
                        defaultOptions
                        loadOptions={loadOptions}
                        placeholder="Buscar OP..."
                        noOptionsMessage={() => "Escribe para buscar..."}
                        value={
                          asignacion.op
                            ? { value: asignacion.op, label: asignacion.op }
                            : null
                        }
                        onChange={(selectedOption) => {
                          const nuevasAsignaciones = [...asignaciones];
                          nuevasAsignaciones[idx].op = selectedOption
                            ? (selectedOption as { value: string }).value
                            : null;
                          setAsignaciones(nuevasAsignaciones);
                        }}
                        className="w-full"
                        classNamePrefix="react-select"
                      />
                    )}
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={asignacion.cantidad}
                      onChange={(e) => {
                        const nuevasAsignaciones = [...asignaciones];
                        nuevasAsignaciones[idx].cantidad =
                          parseInt(e.target.value) || 0;
                        setAsignaciones(nuevasAsignaciones);
                      }}
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </div>
                  {asignaciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const nuevasAsignaciones = asignaciones.filter(
                          (_, i) => i !== idx
                        );
                        setAsignaciones(nuevasAsignaciones);
                      }}
                      className="mt-6 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {loading && <Loader />}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setModalAjusteAbierto(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarAjustes}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Guardar Ajustes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Lotes */}
      {modalLotesAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Gestión de Lotes</h2>

              {lotes.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No hay lotes registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Descarga</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Confirmación</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Productos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lotes.map((lote) => (
                        <tr key={lote.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">#{lote.id}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(lote.fecha_descarga).toLocaleString('es-AR')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${lote.estado === 'confirmado'
                                ? 'bg-green-100 text-green-800'
                                : lote.estado === 'pendiente'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                              {lote.estado}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {lote.fecha_confirmacion
                              ? new Date(lote.fecha_confirmacion).toLocaleString('es-AR')
                              : '-'
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            {lote.total_productos}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {lote.estado === 'confirmado' && (
                              <button
                                onClick={() => revertirLotePorId(lote.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                              >
                                ↩️ Revertir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setModalLotesAbierto(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
