import React, { useState, useEffect } from "react";
import { Contenedor } from "./utilidades/Contenedor";
import { FieldSetTintas } from "./utilidades/FieldSetTintas";
import { FieldSetTintasConfig } from "./utilidades/FieldSetTintasConfig";
import { GetInventarioStock } from "./utilidades/GetInventarioStock";
import { GuardarInventario } from "./utilidades/GuardarInventario";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { sweetAlert } from './utilidades/SweetAlertWrapper';
import Urls from './utilidades/Urls';
import "../estilos/contadorDeTintas.css";
import { actualizarProductoReposicion } from "./utilidades/ReposicionManager";

type ResultadoItem = {
  nombre: string;
  cantidad: number;
  totalSistema?: number;
  diferencia?: number;
};

type ResultadosPorCategoria = {
  legend: string;
  items: ResultadoItem[];
};

interface ProductoConteo {
  id: number;
  sku: string;
  conteoFisico: number | null;
}

let urlPrepararInventario = Urls.inventario.preparar;
let urlGuardarInventario = Urls.inventario.guardar;
let urlObtenerReposicion = Urls.reposicion.obtener;

export const ContadorDeTintas: React.FC = () => {
  const [loadingReposicion, setLoadingReposicion] = useState(false);
  const [resultados, setResultados] = useState<ResultadosPorCategoria[]>([]);
  const [resultadosConSistema, setResultadosConSistema] = useState<ResultadosPorCategoria[]>([]);
  const [valores, setValores] = useState<Record<string, number>>({});
  const [cambiosPendientes, setCambiosPendientes] = useState<{ id: number; conteoFisico: number | null }[]>([]);
  const [productosReposicion, setProductosReposicion] = useState<{sku: string; cantidad: number}[]>([]);

  const { productos: productosSistema, loading } = GetInventarioStock(urlPrepararInventario);

  // Cargar reposiciones del backend al iniciar
  const cargarReposiciones = async () => {
    try {
      const response = await fetch(urlObtenerReposicion);
      if (!response.ok) throw new Error("Error al obtener reposiciones");
      const data = await response.json();
      const reposicionesActivas = data.filter(
        (item: { sku: string; cantidad: number }) => item.cantidad > 0
      );
      setProductosReposicion(reposicionesActivas);
    } catch (error) {
      console.error("Error al cargar reposiciones:", error);
    }
  };

  useEffect(() => {
    cargarReposiciones();
  }, []);

  const leerValor = (id: string) => valores[id] || 0;

  const actualizarResultados = () => {
    const resultadosPorCategoria: ResultadosPorCategoria[] = [
      {
        legend: "Tintas 664/673 1 L",
        items: [
          { nombre: "EP544-EP664-EP673 N", cantidad: leerValor("negro1L") },
          { nombre: "EP544-EP664-EP673 C", cantidad: leerValor("cian1L") },
          { nombre: "EP544-EP664-EP673 M", cantidad: leerValor("magenta1L") },
          { nombre: "EP544-EP664-EP673 A", cantidad: leerValor("amarillo1L") },
          { nombre: "EP673 LC", cantidad: leerValor("lightCian1L") },
          { nombre: "EP673 LM", cantidad: leerValor("lightMagenta1L") },
        ],
      },
      {
        legend: "Tintas 664/673 100 ml",
        items: [
          { nombre: "EP664-EP673 N 100ML", cantidad: leerValor("combo664") + leerValor("negro664") },
          { nombre: "EP664-EP673 C 100ML", cantidad: leerValor("combo664") + leerValor("cian664") },
          { nombre: "EP664-EP673 M 100ML", cantidad: leerValor("combo664") + leerValor("magenta664") },
          { nombre: "EP664-EP673 A 100ML", cantidad: leerValor("combo664") + leerValor("amarillo664") },
          { nombre: "EP673 LC 100ML", cantidad: leerValor("lightCian664") },
          { nombre: "EP673 LM 100ML", cantidad: leerValor("lightMagenta664") },
        ],
      },
      {
        legend: "Tintas GI-190",
        items: [
          { nombre: "GI190 N 135ML", cantidad: leerValor("comboGI190") + leerValor("negroGI190") },
          { nombre: "GI190 C 70ML", cantidad: leerValor("comboGI190") + leerValor("cianGI190") },
          { nombre: "GI190 M 70ML", cantidad: leerValor("comboGI190") + leerValor("magentaGI190") },
          { nombre: "GI190 A 70ML", cantidad: leerValor("comboGI190") + leerValor("amarilloGI190") },
        ],
      },
      {
        legend: "Tintas 544/504",
        items: [
          { nombre: "EP544 N 70ML", cantidad: leerValor("combo544") + leerValor("negro544") },
          { nombre: "EP555 G 70ML", cantidad: leerValor("gris555") },
          { nombre: "EP504-EP544 C 70ML", cantidad: leerValor("combo544") + leerValor("combo504") + leerValor("cian544") + leerValor("cian504") },
          { nombre: "EP504-EP544 M 70ML", cantidad: leerValor("combo544") + leerValor("combo504") + leerValor("magenta544") + leerValor("magenta504") },
          { nombre: "EP504-EP544 A 70ML", cantidad: leerValor("combo544") + leerValor("combo504") + leerValor("amarillo544") + leerValor("amarillo504") },
          { nombre: "EP504 N PI 130ML", cantidad: leerValor("combo504") + leerValor("negro504") },
        ],
      },
      {
        legend: "Tintas GT51/52",
        items: [
          { nombre: "GT51 N 90ML", cantidad: leerValor("comboGt") + leerValor("negroGt") },
          { nombre: "GT52 C 70ML", cantidad: leerValor("comboGt") + leerValor("cianGt") },
          { nombre: "GT52 M 70ML", cantidad: leerValor("comboGt") + leerValor("magentaGt") },
          { nombre: "GT52 A 70ML", cantidad: leerValor("comboGt") + leerValor("amarilloGt") },
        ],
      },
    ];

    setResultados(resultadosPorCategoria);
  };

  // Actualizar reposición en BD y estado local
const handleActualizarReposicion = async (sku: string, cantidad: number): Promise<boolean> => {
  try {
    await actualizarProductoReposicion(
      sku,
      cantidad,
      setProductosReposicion,
      setLoadingReposicion
    );
    return true;
  } catch (error) {
    console.error("Error en handleActualizarReposicion:", error);
    return false;
  }
};

  const handleValorChange = (id: string, value: number) => {
    setValores((prev) => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    actualizarResultados();
  }, [valores]);

  useEffect(() => {
    if (productosSistema.length > 0 && resultados.length > 0) {
      const resultadosActualizados = resultados.map((categoria) => {
        const itemsActualizados = categoria.items.map((item) => {
          const productoEnSistema = productosSistema.find((p) => {
            const match =
              p.sku.toLowerCase().includes(item.nombre.toLowerCase()) ||
              item.nombre.toLowerCase().includes(p.sku.toLowerCase());
            if (match) return match;
          });

          if (!productoEnSistema) {
            console.warn("No se encontró:", item.nombre);
            return { ...item };
          }

          const total = (productoEnSistema.cantSistemaFemex || 0) + (productoEnSistema.cantSistemaBlow || 0);

          return {
            ...item,
            totalSistema: total,
            diferencia: item.cantidad - total,
          };
        });

        return { ...categoria, items: itemsActualizados };
      });

      setResultadosConSistema(resultadosActualizados);
    }
  }, [resultados, productosSistema]);

  const descargarExcel = async () => {
    if (resultados.length === 0) {
      sweetAlert.fire({
        title: "No hay resultados",
        text: "Por favor, complete el formulario antes de exportar",
        icon: "warning",
        confirmButtonText: "OK",
      });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Resultados");

    worksheet.columns = [
      { header: "Color", key: "color", width: 30 },
      { header: "Cantidad", key: "cantidad", width: 15 },
    ];

    resultados.forEach((categoria) => {
      const row = worksheet.addRow({
        color: categoria.legend,
        cantidad: "",
      });
      row.font = { bold: true };
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEEEEEE" },
      };

      categoria.items.forEach((item) => {
        worksheet.addRow({
          color: item.nombre,
          cantidad: item.cantidad,
        });
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, "resultados-tintas.xlsx");
  };

  const handleGuardarInventario = async (productosParaGuardar: ProductoConteo[]) => {
    try {
      const response = await fetch(urlGuardarInventario, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productosParaGuardar),
      });

      if (!response.ok) throw new Error("Error al guardar");

      const result = await response.json();
      sweetAlert.fire({
        title: "Éxito",
        text: `${result.updatedCount} productos actualizados`,
        icon: "success",
        confirmButtonText: "OK",
      });
      setCambiosPendientes([]);
    } catch (error) {
      console.error("Error:", error);
      sweetAlert.fire({
        title: "Error",
        text: "Error al guardar cambios",
        icon: "error",
        confirmButtonText: "OK",
      });
    }
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    padding: '1rem',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gap: '2rem',
  };

  const buttonsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    alignItems: 'center',
    marginTop: '2rem',
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    color: 'white',
    borderRadius: '0.375rem',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background-color 0.2s',
  };

  const tableContainerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '590px',
    margin: '0 auto',
    overflowX: 'auto',
  };

  const tableWrapperStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1.5rem',
    padding: '0 1rem',
  };

  const tableStyle: React.CSSProperties = {
    border: '1px solid #d1d5db',
    width: '100%',
    maxWidth: '72rem',
    borderCollapse: 'collapse',
  };

  const thStyle: React.CSSProperties = {
    padding: '0.5rem',
    textAlign: 'left',
    backgroundColor: '#93c5fd',
    border: '1px solid #d1d5db',
    minWidth: '200px',
  };

  const thCenterStyle: React.CSSProperties = {
    ...thStyle,
    textAlign: 'center',
    minWidth: '120px',
  };

  const trHeaderStyle: React.CSSProperties = {
    backgroundColor: '#e5e7eb',
  };

  const trEvenStyle: React.CSSProperties = {
    backgroundColor: 'white',
  };

  const trOddStyle: React.CSSProperties = {
    backgroundColor: '#eff6ff',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
  };

  const tdCenterStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: 'center',
  };

  const emptyMessageStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '1rem',
    color: '#6b7280',
  };

  return (
    <div style={containerStyle} className="tablet-large-text">
      <Contenedor>
        <div style={gridStyle}>
          {FieldSetTintasConfig.map((config) => (
            <FieldSetTintas
              key={config.legend}
              legend={config.legend}
              comboId={config.comboId}
              valores={valores}
              onValorChange={handleValorChange}
              inputs={config.inputs}
              disableCombo={config.legend === "Tintas 664/673 1 L"}
              productosReposicion={productosReposicion}
              onUpdateReposicion={handleActualizarReposicion}
            />
          ))}
        </div>

        <div style={buttonsContainerStyle}>
          <GuardarInventario
            productos={resultados.flatMap((categoria) =>
              categoria.items
                .map((item) => ({
                  sku: item.nombre,
                  conteoFisico: item.cantidad,
                  id:
                    productosSistema.find(
                      (p) =>
                        p.sku.toLowerCase().includes(item.nombre.toLowerCase()) ||
                        item.nombre.toLowerCase().includes(p.sku.toLowerCase())
                    )?.id || 0,
                }))
                .filter((item) => item.id !== 0)
            )}
            onGuardar={handleGuardarInventario}
            disabled={resultados.length === 0}
          >
            <span style={{ ...buttonBaseStyle, backgroundColor: '#16a34a' }}>
              Guardar Inventario
            </span>
          </GuardarInventario>
          <button
            style={{
              ...buttonBaseStyle,
              backgroundColor: resultados.length === 0 ? '#9ca3af' : '#2563eb',
              cursor: resultados.length === 0 ? 'not-allowed' : 'pointer',
            }}
            onClick={descargarExcel}
            disabled={resultados.length === 0}
          >
            Descargar Excel
          </button>
        </div>
      </Contenedor>

      <div style={tableContainerStyle}>
        <div style={tableWrapperStyle}>
          <div style={{ width: '100%', maxWidth: '72rem' }}>
            {resultadosConSistema.length > 0 ? (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>SKU</th>
                    <th style={thCenterStyle}>Total sistema</th>
                    <th style={thCenterStyle}>Total contado</th>
                    <th style={thCenterStyle}>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosConSistema.map((categoria, catIndex) => (
                    <React.Fragment key={`cat-${catIndex}`}>
                      <tr style={trHeaderStyle}>
                        <td colSpan={4} style={{ ...tdStyle, fontWeight: 'bold' }}>
                          {categoria.legend}
                        </td>
                      </tr>
                      {categoria.items.map((item, itemIndex) => (
                        <tr
                          key={`${catIndex}-${itemIndex}`}
                          style={itemIndex % 2 === 0 ? trEvenStyle : trOddStyle}
                        >
                          <td style={{ ...tdStyle, paddingLeft: '1rem' }}>{item.nombre}</td>
                          <td style={tdCenterStyle}>{item.totalSistema ?? "-"}</td>
                          <td style={tdCenterStyle}>{item.cantidad}</td>
                          <td
                            style={{
                              ...tdCenterStyle,
                              color: item.diferencia !== undefined && item.diferencia < 0 ? '#ef4444' : 'inherit',
                              fontWeight: item.diferencia !== undefined && item.diferencia < 0 ? 'bold' : 'normal',
                            }}
                          >
                            {item.diferencia ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={emptyMessageStyle}>
                {loading ? "Cargando datos del sistema..." : "Complete el formulario"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};