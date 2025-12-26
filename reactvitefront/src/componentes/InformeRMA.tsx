import { useState, useEffect, useMemo } from "react";
import Loader from "./utilidades/Loader";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import axios from "axios";
import Urls from "./utilidades/Urls";
import { ListarOp } from "./utilidades/ListarOp";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// ✅ Interfaz principal (idéntica a StockRMA en Stock.tsx)
interface StockRMA {
    idRma: number;
    sku: string;
    marca: string;
    cantidad: number;
    opLote: string | null;
    cliente: string;
}

// ✅ Tipo para items del informe agrupados para la matriz
interface ItemInforme {
    sku: string;
    ops: { [op: string]: number };
    cantidadTotal: number;
}

export const InformeRMA: React.FC = () => {
    const [stockCrudo, setStockCrudo] = useState<StockRMA[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [filtro, setFiltro] = useState<string>("");
    const [opSeleccionada, setOpSeleccionada] = useState<string>("");

    // Estado para gestión de informes y selección
    const [registrosConfirmadosIds, setRegistrosConfirmadosIds] = useState<number[]>([]);
    const [registrosChequeadosIds, setRegistrosChequeadosIds] = useState<number[]>([]);

    // Estado para gestión de lotes (historial)
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

    // Cargar stock inicial
    const fetchStockRMA = async () => {
        setLoading(true);
        try {
            const response = await axios.get<StockRMA[]>(urlStockRMA);
            setStockCrudo(response.data);
        } catch (error) {
            sweetAlert.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo cargar el stock de RMA",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStockRMA();
    }, []);

    // ✅ Filtrado de stock para la lista de selección
    const stockFiltrado = useMemo(() => {
        let resultado = stockCrudo.filter((item) => {
            if (opSeleccionada === "") return true;
            return item.opLote === opSeleccionada;
        });

        if (filtro) {
            const filtroLower = filtro.toLowerCase();
            resultado = resultado.filter(
                (item) =>
                    item.sku.toLowerCase().includes(filtroLower) ||
                    item.marca.toLowerCase().includes(filtroLower) ||
                    (item.opLote && item.opLote.toLowerCase().includes(filtroLower))
            );
        }
        return resultado;
    }, [stockCrudo, opSeleccionada, filtro]);

    // ✅ Cálculo de unidades totales visibles (para el footer de la tabla)
    const totalUnidadesVisibles = useMemo(() => {
        return stockFiltrado.reduce((acc, item) => acc + item.cantidad, 0);
    }, [stockFiltrado]);

    // ✅ Memo para agrupar los items confirmados para la MATRIZ
    const itemsInforme: ItemInforme[] = useMemo(() => {
        const confirmados = stockCrudo.filter((r) =>
            registrosConfirmadosIds.includes(r.idRma)
        );
        const agrupado: Record<string, ItemInforme> = {};

        confirmados.forEach((item) => {
            if (!agrupado[item.sku]) {
                agrupado[item.sku] = {
                    sku: item.sku,
                    ops: {},
                    cantidadTotal: 0,
                };
            }
            const op = item.opLote || "Sin OP";
            agrupado[item.sku].ops[op] = (agrupado[item.sku].ops[op] || 0) + item.cantidad;
            agrupado[item.sku].cantidadTotal += item.cantidad;
        });

        return Object.values(agrupado);
    }, [stockCrudo, registrosConfirmadosIds]);

    // Manejar selección
    const handleToggleCheck = (id: number) => {
        if (registrosChequeadosIds.includes(id)) {
            setRegistrosChequeadosIds(prev => prev.filter(i => i !== id));
            setRegistrosConfirmadosIds(prev => prev.filter(i => i !== id));
        } else {
            setRegistrosChequeadosIds(prev => [...prev, id]);
        }
    };

    const handleAgregarSeleccion = () => {
        setRegistrosConfirmadosIds(prev => {
            const nuevoSet = new Set([...prev, ...registrosChequeadosIds]);
            return Array.from(nuevoSet);
        });
        sweetAlert.fire({
            icon: "success",
            title: "Agregado",
            text: `${registrosChequeadosIds.length} ítems agregados al informe`,
            timer: 1500,
            showConfirmButton: false,
        });
    };

    const handleSeleccionarTodos = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        if (checked) {
            const idsVisibles = stockFiltrado.map(item => item.idRma);
            setRegistrosChequeadosIds(prev => Array.from(new Set([...prev, ...idsVisibles])));
        } else {
            const idsVisibles = stockFiltrado.map(item => item.idRma);
            setRegistrosChequeadosIds(prev => prev.filter(id => !idsVisibles.includes(id)));
            setRegistrosConfirmadosIds(prev => prev.filter(id => !idsVisibles.includes(id)));
        }
    };

    const todosSeleccionados = useMemo(() => {
        if (stockFiltrado.length === 0) return false;
        return stockFiltrado.every(item => registrosChequeadosIds.includes(item.idRma));
    }, [stockFiltrado, registrosChequeadosIds]);

    // ✅ Generación de Excel (Extraído de Stock.tsx)
    const generarExcel = async () => {
        if (itemsInforme.length === 0) {
            sweetAlert.fire({ icon: "warning", title: "Sin items", text: "No hay items seleccionados" });
            return;
        }

        try {
            setLoading(true);
            const productosParaLote = stockCrudo
                .filter(r => registrosConfirmadosIds.includes(r.idRma))
                .map(r => ({
                    rma_id: r.idRma,
                    sku: r.sku,
                    cantidad: r.cantidad,
                    op: r.opLote || "Sin OP",
                }));

            const responseLote = await axios.post(
                Urls.stock.crearLote,
                { productos: productosParaLote },
                { headers: { "Content-Type": "application/json" } }
            );

            const loteId = responseLote.data.loteId;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Informe Stock RMA");

            const todasLasOps = Array.from(
                new Set(itemsInforme.flatMap((item) => Object.keys(item.ops)))
            ).sort();

            const columnasExcel = [
                { header: "SKU", key: "sku", width: 25 },
                ...todasLasOps.map((op) => ({ header: op, key: op, width: 15 })),
                { header: "TOTAL", key: "total", width: 15 },
            ];
            worksheet.columns = columnasExcel;

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
            headerRow.alignment = { vertical: "middle", horizontal: "center" };

            for (let col = 1; col <= columnasExcel.length; col++) {
                headerRow.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
                headerRow.getCell(col).border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
            }

            let totalGeneral = 0;
            const totalesPorOp: Record<string, number> = {};

            itemsInforme.forEach((item) => {
                const filaData: any = { sku: item.sku };
                todasLasOps.forEach((op) => {
                    const cant = item.ops[op] || 0;
                    filaData[op] = cant > 0 ? cant : "";
                    totalesPorOp[op] = (totalesPorOp[op] || 0) + (item.ops[op] || 0);
                });
                filaData.total = item.cantidadTotal;
                totalGeneral += item.cantidadTotal;

                const row = worksheet.addRow(filaData);
                row.eachCell((cell, colNumber) => {
                    cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                    cell.alignment = { vertical: "middle", horizontal: colNumber === 1 ? "left" : "right" };
                });
            });

            const totalRow = worksheet.addRow({ sku: "TOTAL", ...totalesPorOp, total: totalGeneral });
            totalRow.font = { bold: true };
            totalRow.eachCell((cell) => {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
                cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
                cell.alignment = { vertical: "middle", horizontal: "right" };
            });
            totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };

            const metadataSheet = workbook.addWorksheet("Metadata");
            metadataSheet.getCell("A1").value = loteId;
            metadataSheet.state = "hidden";

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const fecha = new Date().toISOString().split("T")[0];
            saveAs(blob, `Informe_Stock_RMA_${fecha}.xlsx`);

            sweetAlert.fire({ icon: "success", title: "Excel generado", text: `Lote #${loteId} creado correctamente` });
        } catch (error) {
            sweetAlert.fire({ icon: "error", title: "Error", text: "No se pudo generar el Excel" });
        } finally {
            setLoading(false);
        }
    };

    // ✅ Confirmar Recepción Directa desde Historial
    const confirmarLotePorId = async (loteId: number) => {
        try {
            const confirmacion = await sweetAlert.fire({
                icon: "warning",
                title: "Confirmar recepción",
                html: `¿Estás seguro de confirmar la recepción del lote <b>#${loteId}</b>?<br><br>Esto actualizará el estado de los productos.`,
                showCancelButton: true,
                confirmButtonText: "Sí, confirmar",
            });

            if (!confirmacion.isConfirmed) return;

            setLoading(true);
            const response = await axios.post(Urls.stock.confirmarLote, { loteId });
            sweetAlert.fire({ icon: "success", title: "¡Éxito!", text: response.data.message });
            fetchLotes();
            fetchStockRMA();
        } catch (error) {
            sweetAlert.fire({ icon: "error", title: "Error", text: "No se pudo confirmar la recepción" });
        } finally {
            setLoading(false);
        }
    };

    const eliminarLotePorId = async (loteId: number) => {
        try {
            const confirmacion = await sweetAlert.fire({
                icon: "warning",
                title: "Eliminar lote",
                html: `¿Estás seguro de eliminar el registro del lote <b>#${loteId}</b>?<br><br><span class="text-red-500 font-bold">Esta acción no se puede deshacer y no revertirá los cambios en el stock.</span>`,
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                confirmButtonColor: "#d33",
            });

            if (!confirmacion.isConfirmed) return;

            setLoading(true);
            await axios({
                method: 'DELETE',
                url: Urls.stock.eliminarLote,
                data: { loteId }
            });

            sweetAlert.fire({ icon: "success", title: "Eliminado", text: "Lote eliminado correctamente" });
            fetchLotes();
        } catch (error) {
            sweetAlert.fire({ icon: "error", title: "Error", text: "No se pudo eliminar el lote" });
        } finally {
            setLoading(false);
        }
    };

    const fetchLotes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(Urls.stock.listarLotes);
            setLotes(response.data);
            setModalLotesAbierto(true);
        } catch (error) {
            sweetAlert.fire({ icon: "error", title: "Error", text: "No se pudieron cargar los lotes" });
        } finally {
            setLoading(false);
        }
    };

    const revertirLotePorId = async (loteId: number) => {
        try {
            const confirmacion = await sweetAlert.fire({
                icon: "warning",
                title: "Revertir lote",
                html: `¿Revertir lote <b>#${loteId}</b>?`,
                showCancelButton: true,
            });

            if (!confirmacion.isConfirmed) return;

            setLoading(true);
            await axios.post(Urls.stock.revertirLote, { loteId });
            sweetAlert.fire({ icon: "success", title: "Revertido" });
            fetchLotes();
            fetchStockRMA();
        } catch (error) {
            sweetAlert.fire({ icon: "error", title: "Error", text: "No se pudo revertir el lote" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                <h1 className="text-3xl font-extrabold text-gray-800 mb-2 text-center">Informe de RMA</h1>
                <h2 className="text-2xl font-extrabold text-gray-800 mb-2 text-center">Gestión de Lotes</h2>


                {loading && <Loader />}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* Gestión de Lotes */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <h3 className="text-lg font-bold text-green-800 mb-3">Gestión de Lotes</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={fetchLotes}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition flex items-center gap-2"
                            >
                                📋 Ver Historial y Confirmar Recepciones
                            </button>
                        </div>
                    </div>

                    {/* Acciones de Selección */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-lg font-bold text-blue-800 mb-3">Acciones de Informe</h3>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleAgregarSeleccion}
                                disabled={registrosChequeadosIds.length === 0}
                                className={`px-4 py-2 rounded-lg shadow transition ${registrosChequeadosIds.length > 0 ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    }`}
                            >
                                Cargar a Selección ({registrosChequeadosIds.length})
                            </button>
                            {registrosConfirmadosIds.length > 0 && (
                                <>
                                    <button onClick={() => { setRegistrosConfirmadosIds([]); setRegistrosChequeadosIds([]); }} className="px-4 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600">
                                        Limpiar
                                    </button>
                                    <button onClick={generarExcel} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700">
                                        Generar Excel ({itemsInforme.length})
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <input
                        type="text"
                        placeholder="Buscar por SKU, marca..."
                        className="flex-1 h-10 min-w-[300px] max-w-[530px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                    <div className="w-64">
                        <ListarOp endpoint={urlListarOp} onSeleccionado={(ops) => setOpSeleccionada(ops.length > 0 ? ops[0].nombre : "")} campos={["nombre"]} />
                    </div>
                </div>

                {/* Contenido Principal: Dos Columnas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Columna Izquierda: Selección */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-gray-100 p-3 font-bold border-b border-gray-200 flex justify-between items-center">
                            <span>Productos Disponibles</span>
                            <div className="flex items-center gap-2 text-sm font-normal">
                                <label>Seleccionar todo</label>
                                <input type="checkbox" checked={todosSeleccionados} onChange={handleSeleccionarTodos} className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr className="border-b">
                                        <th className="p-3 text-left">SKU</th>
                                        <th className="p-3 text-left">OP</th>
                                        <th className="p-3 text-right">Cant.</th>
                                        <th className="p-3 text-center">Selec.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockFiltrado.map((item) => (
                                        <tr key={item.idRma} className={`border-b hover:bg-blue-50 transition ${registrosChequeadosIds.includes(item.idRma) ? 'bg-blue-50' : ''}`}>
                                            <td className="p-3 font-medium">{item.sku}</td>
                                            <td className="p-3 text-gray-600">{item.opLote || "Sin OP"}</td>
                                            <td className="p-3 text-right font-bold">{item.cantidad}</td>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={registrosChequeadosIds.includes(item.idRma)}
                                                    onChange={() => handleToggleCheck(item.idRma)}
                                                    className="w-4 h-4 cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {stockFiltrado.length > 0 && (
                                    <tfoot className="sticky bottom-0 bg-gray-50 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.1)]">
                                        <tr className="border-t-2 border-gray-300 font-bold bg-gray-100 text-gray-800">
                                            <td className="p-3 text-left text-[11px] uppercase" colSpan={2}>Suma Unidades Visibles</td>
                                            <td className="p-3 text-right text-blue-700 font-extrabold text-lg">{totalUnidadesVisibles}</td>
                                            <td className="p-3"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* Columna Derecha: Previsualización Matriz */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-indigo-600 p-3 font-bold text-white border-b border-indigo-700 flex justify-between items-center">
                            <span>Previsualización del Informe</span>
                        </div>
                        <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
                            {itemsInforme.length > 0 ? (
                                <table className="w-full text-xs border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 border bg-gray-100 text-left">SKU</th>
                                            {Array.from(new Set(itemsInforme.flatMap(i => Object.keys(i.ops)))).sort().map(op => (
                                                <th key={op} className="p-2 border bg-gray-100 text-center">{op}</th>
                                            ))}
                                            <th className="p-2 border bg-gray-100 text-right">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsInforme.map(item => (
                                            <tr key={item.sku} className="hover:bg-gray-50">
                                                <td className="p-2 border font-medium bg-gray-50">{item.sku}</td>
                                                {Array.from(new Set(itemsInforme.flatMap(i => Object.keys(i.ops)))).sort().map(op => (
                                                    <td key={op} className="p-2 border text-center">{item.ops[op] || "-"}</td>
                                                ))}
                                                <td className="p-2 border text-right font-bold bg-gray-50">{item.cantidadTotal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    <p>No has cargado items a la selección aún.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Modal de Lotes (Igual que en Stock.tsx) */}
            {modalLotesAbierto && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-800">Historial de Lotes / Reportes</h2>
                            <button onClick={() => setModalLotesAbierto(false)} className="text-gray-500 hover:text-gray-800 text-2xl">✕</button>
                        </div>
                        <div className="p-6 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 uppercase text-xs text-gray-500 font-bold">
                                    <tr>
                                        <th className="p-3 text-left">ID</th>
                                        <th className="p-3 text-left">Fecha Descarga</th>
                                        <th className="p-3 text-left">Estado</th>
                                        <th className="p-3 text-left">Fecha Confirmación</th>
                                        <th className="p-3 text-right">Cant. Prod</th>
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lotes.map((lote) => (
                                        <tr key={lote.id} className="hover:bg-gray-50 transition">
                                            <td className="p-3 font-mono text-blue-600">#{lote.id}</td>
                                            <td className="p-3 text-[11px] leading-tight">
                                                {new Date(lote.fecha_descarga).toLocaleDateString('es-AR')}<br />
                                                <span className="text-gray-400">{new Date(lote.fecha_descarga).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${lote.estado === 'confirmado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {lote.estado}
                                                </span>
                                            </td>
                                            <td className="p-3 text-[11px] leading-tight max-w-[100px]">
                                                {lote.fecha_confirmacion ? (
                                                    <>
                                                        {new Date(lote.fecha_confirmacion).toLocaleDateString('es-AR')}<br />
                                                        <span className="text-gray-400">{new Date(lote.fecha_confirmacion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </>
                                                ) : '-'}
                                            </td>
                                            <td className="p-3 text-right font-bold">{lote.total_productos}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {lote.estado === 'pendiente' ? (
                                                        <button
                                                            onClick={() => confirmarLotePorId(lote.id)}
                                                            className="px-3 py-1 bg-green-50 text-green-600 rounded border border-green-200 hover:bg-green-600 hover:text-white transition text-xs font-bold"
                                                            title="Confirmar Recepción"
                                                        >
                                                            Confirmar
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => revertirLotePorId(lote.id)}
                                                            className="px-3 py-1 bg-orange-50 text-orange-600 rounded border border-orange-200 hover:bg-orange-600 hover:text-white transition text-xs font-bold"
                                                            title="Revertir a Pendiente"
                                                        >
                                                            Revertir
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => eliminarLotePorId(lote.id)}
                                                        className="px-3 py-1 bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-600 hover:text-white transition text-xs font-bold"
                                                        title="Eliminar Registro de Lote"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button onClick={() => setModalLotesAbierto(false)} className="px-6 py-2 bg-gray-800 text-white rounded-lg shadow">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
