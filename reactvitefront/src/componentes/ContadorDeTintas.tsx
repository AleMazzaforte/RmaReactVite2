import React, { useRef, useState } from "react";
import { Contenedor } from "./utilidades/Contenedor";
import { FieldSetTintas } from "./utilidades/FieldSetTintas";
import { FieldSetTintasConfig } from "./utilidades/FieldSetTintasConfig";
import * as XLSX from "xlsx";

type ResultadoColor = {
  nombre: string;
  cantidad: number;
};

export const ContadorDeTintas: React.FC = () => {
  const [mostrarTabla, setMostrarTabla] = useState(false);
  const [resultados, setResultados] = useState<ResultadoColor[]>([]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const descargarExcel = () => {
    if (resultados.length === 0) return;
  
    const hoja = XLSX.utils.json_to_sheet(resultados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Resultados");
  
    XLSX.writeFile(libro, "resultados-tintas.xlsx");
  };
  

  const leerValor = (id: string) => {
    const ref = inputRefs.current[id];
    return ref ? parseFloat(ref.value) || 0 : 0;
  };

  
  const calcularTotales = () => {
    const totales: Record<string, number> = {
      "EP544-EP664-EP673 C": leerValor("cian1L"),
      "EP544-EP664-EP673 M": leerValor("magenta1L"),
      "EP544-EP664-EP673 A": leerValor("amarillo1L"),
      "EP544-EP664-EP673 N": leerValor("negro1L"),

      "EP664-EP673 C 100ML": leerValor("combo664") + leerValor("cian664"),
      "EP664-EP673 M 100ML": leerValor("combo664") + leerValor("magenta664"),
      "EP664-EP673 A 100ML": leerValor("combo664") + leerValor("amarillo664"),
      "EP664-EP673 N 100ML": leerValor("combo664") + leerValor("negro664"),

      "GI190 C 70ML": leerValor("comboGI190") + leerValor("cianGI190"),
      "GI190 M 70ML": leerValor("comboGI190") + leerValor("magentaGI190"),
      "GI190 A 70ML": leerValor("comboGI190") + leerValor("amarilloGI190"),
      "GI190 N 135ML": leerValor("comboGI190") + leerValor("negroGI190"),

      "EP504-EP544 C 70ML": leerValor("combo544") + leerValor("combo504") + leerValor("cian544") + leerValor("cian504"),
      "EP504-EP544 M 70ML": leerValor("combo544") + leerValor("combo504") + leerValor("magenta544") + leerValor("magenta504"),
      "EP504-EP544 A 70ML": leerValor("combo544") + leerValor("combo504") + leerValor("amarillo544") + leerValor("amarillo504"),

      "EP544 N 70ML": leerValor("combo544") + leerValor("negro544"),
      "EP504 N PI 130ML": leerValor("combo504") + leerValor("negro504"),

      "GT51 N 90ML": leerValor("comboGt") + leerValor("negroGt"),
      "GT52 C 70ML": leerValor("comboGt") + leerValor("cianGt"),
      "GT52 M 70ML": leerValor("comboGt") + leerValor("magentaGt"),
      "GT52 A 70ML": leerValor("comboGt") + leerValor("amarilloGt"),
    };

    const resultadosFormateados: ResultadoColor[] = Object.entries(totales).map(([nombre, cantidad]) => ({
      nombre,
      cantidad,
    }));

    setResultados(resultadosFormateados);
    setMostrarTabla(true);
  };

  return (
    <div className="relative">
    <Contenedor>
      <div className="grid gap-8">
        {FieldSetTintasConfig.map((config) => (
          <FieldSetTintas
            key={config.legend}
            legend={config.legend}
            comboId={config.comboId}
            inputs={config.inputs}
            inputRefs={inputRefs}
          />
        ))}
      </div>
        <div className="flex justify-evenly mt-6">
      <button
        onClick={calcularTotales}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Mostrar totales
      </button>
      <button 
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        onClick={descargarExcel}
        disabled={resultados.length === 0}
      >
        Descargar Excel
      </button>
      </div>

    </Contenedor>
        
      {mostrarTabla && (
        <div className="w-full inset-0 flex items-center justify-center">
          <table className=" border border-gray-300">
            <thead>
              <tr className="bg-blue-300">
                <th className="p-2 text-left">Color</th>
                <th className="p-2 text-left">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((item, index) => (
                <tr key={item.nombre}
                  className={index % 2 === 0 ? "bg-white" : "bg-blue-100"}>
                  <td className="p-2">{item.nombre}</td>
                  <td className="p-2">{item.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
