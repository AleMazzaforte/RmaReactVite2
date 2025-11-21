import React, { useRef, useState, useEffect } from "react";
import { Contenedor } from "./utilidades/Contenedor";
import { FieldSetTintas } from "./utilidades/FieldSetTintas";
import { FieldSetTintasConfig } from "./utilidades/FieldSetTintasConfig";
import { GetInventarioStock } from "./utilidades/GetInventarioStock";
import { GuardarInventario } from "./utilidades/GuardarInventario";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { sweetAlert } from './utilidades/SweetAlertWrapper'; // Importar sweetAlert
import Urls from './utilidades/Urls';
import "../estilos/contadorDeTintas.css";


type ResultadoItem = {
  nombre: string;
  cantidad: number;
  totalSistema?: number; // Solo number para cálculos
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


export const ContadorDeTintas: React.FC = () => {
  const [resultados, setResultados] = useState<ResultadosPorCategoria[]>([]);
  const [resultadosConSistema, setResultadosConSistema] = useState<
    ResultadosPorCategoria[]
  >([]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [cambiosPendientes, setCambiosPendientes] = useState<
    { id: number; conteoFisico: number | null }[]
  >([]);

  const { productos: productosSistema, loading } = GetInventarioStock(
    urlPrepararInventario
  );

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
            console.warn("No se encontró:", item.nombre); // Debug
            return { ...item };
          }

          const total =
            (productoEnSistema.cantSistemaFemex || 0) +
            (productoEnSistema.cantSistemaBlow || 0);

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
      // Si no hay resultados, mostrar alerta
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
      // Fila de categoría (negrita, fondo gris claro)
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

  const handleGuardarInventario = async (
    productosParaGuardar: ProductoConteo[]
  ) => {
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

  const leerValor = (id: string) => {
    const ref = inputRefs.current[id];
    return ref ? parseFloat(ref.value) || 0 : 0;
  };

  const handleInputChange = () => {
    actualizarResultados();
  };

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
          {
            nombre: "EP664-EP673 N 100ML",
            cantidad: leerValor("combo664") + leerValor("negro664"),
          },
          {
            nombre: "EP664-EP673 C 100ML",
            cantidad: leerValor("combo664") + leerValor("cian664"),
          },
          {
            nombre: "EP664-EP673 M 100ML",
            cantidad: leerValor("combo664") + leerValor("magenta664"),
          },
          {
            nombre: "EP664-EP673 A 100ML",
            cantidad: leerValor("combo664") + leerValor("amarillo664"),
          },

          { nombre: "EP673 LC 100ML", cantidad: leerValor("lightCian664") },
          { nombre: "EP673 LM 100ML", cantidad: leerValor("lightMagenta664") },
        ],
      },
      {
        legend: "Tintas GI-190",
        items: [
          {
            nombre: "GI190 N 135ML",
            cantidad: leerValor("comboGI190") + leerValor("negroGI190"),
          },
          {
            nombre: "GI190 C 70ML",
            cantidad: leerValor("comboGI190") + leerValor("cianGI190"),
          },
          {
            nombre: "GI190 M 70ML",
            cantidad: leerValor("comboGI190") + leerValor("magentaGI190"),
          },
          {
            nombre: "GI190 A 70ML",
            cantidad: leerValor("comboGI190") + leerValor("amarilloGI190"),
          },
        ],
      },
      {
        legend: "Tintas 544/504",
        items: [
          {
            nombre: "EP544 N 70ML",
            cantidad: leerValor("combo544") + leerValor("negro544"),
          },
          {
            nombre: "EP555 G 70ML",
            cantidad: leerValor("gris555")
          },
          {
            nombre: "EP504-EP544 C 70ML",
            cantidad:
              leerValor("combo544") +
              leerValor("combo504") +
              leerValor("cian544") +
              leerValor("cian504"),
          },
          {
            nombre: "EP504-EP544 M 70ML",
            cantidad:
              leerValor("combo544") +
              leerValor("combo504") +
              leerValor("magenta544") +
              leerValor("magenta504"),
          },
          {
            nombre: "EP504-EP544 A 70ML",
            cantidad:
              leerValor("combo544") +
              leerValor("combo504") +
              leerValor("amarillo544") +
              leerValor("amarillo504"),
          },

          {
            nombre: "EP504 N PI 130ML",
            cantidad: leerValor("combo504") + leerValor("negro504"),
          },
        ],
      },
      {
        legend: "Tintas GT51/52",
        items: [
          {
            nombre: "GT51 N 90ML",
            cantidad: leerValor("comboGt") + leerValor("negroGt"),
          },
          {
            nombre: "GT52 C 70ML",
            cantidad: leerValor("comboGt") + leerValor("cianGt"),
          },
          {
            nombre: "GT52 M 70ML",
            cantidad: leerValor("comboGt") + leerValor("magentaGt"),
          },
          {
            nombre: "GT52 A 70ML",
            cantidad: leerValor("comboGt") + leerValor("amarilloGt"),
          },
        ],
      },
    ];

    setResultados(resultadosPorCategoria);
  };

  return (
    <div className="relative tablet-large-text">
      <Contenedor>
        <div className="grid gap-8  ">
          {FieldSetTintasConfig.map((config) => (
            <FieldSetTintas
              key={config.legend}
              legend={config.legend}
              comboId={config.comboId}
              inputs={config.inputs}
              inputRefs={inputRefs}
              onChange={handleInputChange}
              disableCombo={config.legend === "Tintas 664/673 1 L"}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 items-center md:flex-row md:justify-center md:gap-12 mt-8">
          <GuardarInventario
            productos={resultados.flatMap((categoria) =>
              categoria.items
                .map((item) => ({
                  sku: item.nombre,
                  conteoFisico: item.cantidad,
                  id:
                    productosSistema.find(
                      (p) =>
                        p.sku
                          .toLowerCase()
                          .includes(item.nombre.toLowerCase()) ||
                        item.nombre.toLowerCase().includes(p.sku.toLowerCase())
                    )?.id || 0,
                }))
                .filter((item) => item.id !== 0)
            )}
            onGuardar={handleGuardarInventario}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition tablet-large-text"
            disabled={resultados.length === 0}
          >
            Guardar Inventario
          </GuardarInventario>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition focus:outline-black focus:ring focus:ring-black"
            onClick={descargarExcel}
            disabled={resultados.length === 0}
          >
            Descargar Excel
          </button>
        </div>
      </Contenedor>
      <div className="w-full max-w-[590px] mx-auto overflow-x-auto">
        <div className="w-full flex justify-center mt-6 px-4">
          <div className="w-full max-w-6xl">
            {resultadosConSistema.length > 0 ? (
              <table className="border border-gray-300 w-full table-auto">
                <thead>
                  <tr className="bg-blue-300">
                    <th className="p-2 text-left min-w-[200px]">SKU</th>
                    <th className="p-2 text-center min-w-[120px]">
                      Total sistema
                    </th>
                    <th className="p-2 text-center min-w-[120px]">
                      Total contado
                    </th>
                    <th className="p-2 text-center min-w-[120px]">
                      Diferencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resultadosConSistema.map((categoria, catIndex) => (
                    <React.Fragment key={`cat-${catIndex}`}>
                      <tr className="bg-gray-200">
                        <td colSpan={4} className="p-2 font-bold">
                          {categoria.legend}
                        </td>
                      </tr>
                      {categoria.items.map((item, itemIndex) => (
                        <tr
                          key={`${catIndex}-${itemIndex}`}
                          className={
                            itemIndex % 2 === 0 ? "bg-white" : "bg-blue-50"
                          }
                        >
                          <td className="p-2 pl-4">{item.nombre}</td>
                          <td className="p-2 text-center">
                            {item.totalSistema ?? "-"}
                          </td>
                          <td className="p-2 text-center ">{item.cantidad}</td>
                          <td
                            className={`p-2 text-center ${item.diferencia !== undefined &&
                              item.diferencia < 0
                              ? "text-red-500 font-bold"
                              : ""
                              }`}
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
              <div className="text-center py-4 text-gray-500">
                {loading
                  ? "Cargando datos del sistema..."
                  : "Complete el formulario y haga click en Mostrar totales"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
