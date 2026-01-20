import { useState, useEffect } from "react";
import axios from "axios";
import { sweetAlert } from "../componentes/utilidades/SweetAlertWrapper";
import Urls from "../componentes/utilidades/Urls";
import Select, { SingleValue } from "react-select";
import { Contenedor } from "./utilidades/Contenedor";

interface ProductoConDescuento {
  id: number;
  sku: string;
  totalUnidadesConDescuento?: number;
}

interface ProductoConDescuentoVendidos extends ProductoConDescuento {
  idSku: number;
  fecha: string;
  cantidad: number;
  numeroOperacion: number;
  canalVenta: string;
}

interface OptionType {
  value: number;
  label: string;
}

interface ItemParaGuardar {
  idSku: number;
  sku: string;
  canalVenta: string;
  numeroOperacion: string;
  cantidad: number;
  fecha: string; // en formato dd/mm/yyyy (vista)
}

const urlProductosConDescuento = Urls.ProductosConDescuento.listar;
const urlProductosConDescuentoVendidos =
  Urls.ProductosConDescuento.ListarVendidos;
const urlGuardarVenta = Urls.ProductosConDescuento.guardarVenta; // Asegúrate de tener esta ruta en Urls

// Helper: formatear fecha a dd/mm/yyyy
const formatDateToInput = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper: convertir dd/mm/yyyy → YYYY-MM-DD (MySQL)
const parseDateForMySQL = (dateStr: string): string | null => {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  // Validar fecha
  const d = new Date(isoDate);
  return d.toISOString().startsWith(isoDate) ? isoDate : null;
};

export const ProductosConDescuento: React.FC = () => {
  const [listadoProductosConDescuento, setListadoProductosConDescuento] =
    useState<ProductoConDescuento[]>([]);
  const [selectedOption, setSelectedOption] =
    useState<SingleValue<OptionType>>(null);
  const [productoConDescuentoVendidos, setProductoConDescuentoVendidos] =
    useState<ProductoConDescuentoVendidos[]>([]);

  // Formulario
  const [canalVenta, setCanalVenta] = useState("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(formatDateToInput(new Date())); // Hoy por defecto

  // Lista acumulada
  const [itemsParaGuardar, setItemsParaGuardar] = useState<ItemParaGuardar[]>(
    []
  );

  //Busqueda de numeros ya cargados
  const [busquedaOperacion, setBusquedaOperacion] = useState("");
  const [operacionesFiltradas, setOperacionesFiltradas] = useState<ProductoConDescuentoVendidos[]>([]);

  // Fetch inicial
  useEffect(() => {
    axios
      .get<ProductoConDescuento[]>(urlProductosConDescuento)
      .then((response) => setListadoProductosConDescuento(response.data))
      .catch((error) => {
        sweetAlert.error("Error al obtener los productos con descuento");
        console.error("Error fetching productos con descuento:", error);
      });
  }, []);

  useEffect(() => {
    axios
      .get<ProductoConDescuentoVendidos[]>(urlProductosConDescuentoVendidos)
      .then((response) => setProductoConDescuentoVendidos(response.data))
      .catch((error) => {
        sweetAlert.error(
          "Error al obtener los productos con descuento vendidos"
        );
        console.error(
          "Error fetching productos con descuento vendidos:",
          error
        );
      });
  }, []);


  useEffect(() => {
  if (!busquedaOperacion.trim()) {
    setOperacionesFiltradas([]);
    return;
  }

  const query = busquedaOperacion.trim().toLowerCase();
  const filtradas = productoConDescuentoVendidos.filter((venta) =>
    venta.numeroOperacion.toString().toLowerCase().includes(query)
  );

  setOperacionesFiltradas(filtradas);
}, [busquedaOperacion, productoConDescuentoVendidos]);

  const options = listadoProductosConDescuento.map((producto) => ({
    value: producto.id,
    label: producto.sku,
  }));

  

  const handleAgregar = () => {
    if (!selectedOption) {
      sweetAlert.warning("Seleccione un producto");
      return;
    }
    if (
      !canalVenta.trim() ||
      !numeroOperacion.trim() ||
      !cantidad.trim() ||
      !fecha.trim()
    ) {
      sweetAlert.warning("Complete todos los campos");
      return;
    }
    const cantidadNum = parseInt(cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      sweetAlert.warning("La cantidad debe ser un número positivo");
      return;
    }

    const producto = listadoProductosConDescuento.find(
      (p) => p.id === selectedOption.value
    );
    if (!producto) return;

    // Validar formato de fecha
    const fechaValida = parseDateForMySQL(fecha);
    if (!fechaValida) {
      sweetAlert.warning("Formato de fecha inválido. Use dd/mm/aaaa");
      return;
    }

    const newItem: ItemParaGuardar = {
      idSku: selectedOption.value,
      sku: producto.sku,
      canalVenta,
      numeroOperacion,
      cantidad: cantidadNum,
      fecha, // en formato dd/mm/aaaa (para mostrar)
    };

    setItemsParaGuardar((prev) => [...prev, newItem]);

    // Resetear formulario, mantener el producto seleccionado
    setCanalVenta("");
    setSelectedOption(null)
    setNumeroOperacion("");
    setCantidad("");
    setFecha(formatDateToInput(new Date()));
  };

  const handleGuardarTodo = async () => {
    if (itemsParaGuardar.length === 0) {
      sweetAlert.warning("No hay productos para guardar");
      return;
    }

    // Convertir fechas al formato MySQL
    const payload = itemsParaGuardar.map((item) => {
      const fechaMySQL = parseDateForMySQL(item.fecha);
      if (!fechaMySQL) {
        throw new Error(`Fecha inválida: ${item.fecha}`);
      }
      return {
        idSku: item.idSku,
        canalVenta: item.canalVenta,
        numeroOperacion: item.numeroOperacion,
        cantidad: item.cantidad,
        fecha: fechaMySQL,
      };
    });

    try {
      const response = await axios.post(urlGuardarVenta, payload); // ✅ Capturar respuesta

      const { count, message } = response.data;

      if (count > 0) {
        sweetAlert.success(message || "Ventas guardadas correctamente");
        setItemsParaGuardar([]);
      } else {
        // count === 0 → nada se guardó (todo duplicado o sin SKU válido)
        sweetAlert.info(message || "No se guardaron nuevas ventas.");

        setItemsParaGuardar([]);
      }
    } catch (error) {
      console.error("Error al guardar ventas:", error);
      sweetAlert.error("Error al enviar las ventas");
    }
  };

  // Dentro del componente, antes del return
  const resumenPorSku = () => {
    // 1. Agrupar ventas por idSku (que es el ID del producto)
    const ventasPorProducto: Record<number, number> = {};
    productoConDescuentoVendidos.forEach((venta) => {
      const idProducto = venta.idSku; // ✅ ahora es claro
      const cantidad = venta.cantidad || 0;
      ventasPorProducto[idProducto] =
        (ventasPorProducto[idProducto] || 0) + cantidad;
    });

    // 2. Generar resumen
    return listadoProductosConDescuento.map((producto) => {
      const vendidos = ventasPorProducto[producto.id] || 0;
      const diferencia = (producto.totalUnidadesConDescuento || 0) - vendidos;
      const totalesIniciales = producto.totalUnidadesConDescuento || 0;
      return {
        sku: producto.sku,
        vendidosTotales: vendidos,
        diferencia,
        totalesIniciales,
      };
    });
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-6 p-4">
        {/* Formulario */}
        <div className="w-full md:w-1/2">
          <Contenedor>
            <Select<OptionType, false>
              options={options}
              value={selectedOption}
              onChange={setSelectedOption}
              placeholder="Seleccione un SKU..."
              isSearchable={true}
              className="block w-full mb-4"
            />
            {selectedOption && (
              <>
                <label htmlFor="canalVenta" className="block mb-1">
                  Canal de venta
                </label>
                <select
                  id="canalVenta"
                  value={canalVenta}
                  onChange={(e) => setCanalVenta(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none mb-4"
                >
                  <option value="">-- Seleccione un canal --</option>
                  <option value="Femex">Femex</option>
                  <option value="Blow">Blow</option>
                  <option value="Nube MA">Nube MA</option>
                  <option value="Nube CF">Nube CF</option>
                </select>

                <label htmlFor="numeroOperacion" className="block mb-1">
                  Número de operación
                </label>
                <input
                  type="text"
                  id="numeroOperacion"
                  value={numeroOperacion}
                  onChange={(e) => setNumeroOperacion(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none mb-4"
                />

                <label htmlFor="cantidad" className="block mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  id="cantidad"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none mb-4"
                />

                <label htmlFor="fecha" className="block mb-1">
                  Fecha (dd/mm/aaaa)
                </label>
                <input
                  type="text"
                  id="fecha"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  placeholder="dd/mm/aaaa"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none mb-4"
                />

                <button
                  type="button"
                  className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none mb-4"
                  onClick={handleAgregar}
                >
                  Agregar
                </button>
              </>
            )}
          </Contenedor>
        </div>
        <div className="mb-6">
          <label htmlFor="buscarOperacion" className="block mb-1">
            Buscar número de operación
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="buscarOperacion"
              value={busquedaOperacion}
              onChange={(e) => setBusquedaOperacion(e.target.value)}
              placeholder="Ingrese número de operación"
              className="px-4 py-2 border border-gray-300 rounded-lg flex-1"
              onKeyDown={(e) => e.key === "Enter" }
            />
           
          </div>

          {busquedaOperacion.trim() && (
  <div className="mt-3">
    <h3 className="text-sm font-semibold mb-1">
      Resultados ({operacionesFiltradas.length}):
    </h3>
    {operacionesFiltradas.length === 0 ? (
      <p className="text-gray-500 text-sm">No se encontraron operaciones.</p>
    ) : (
      <div className="overflow-x-auto max-h-60 overflow-y-auto border rounded">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="px-2 py-1">Operación</th>
              <th className="px-2 py-1">SKU</th>
              <th className="px-2 py-1">Cantidad</th>
              <th className="px-2 py-1">Canal</th>
            </tr>
          </thead>
          <tbody>
            {operacionesFiltradas.map((venta, index) => (
              <tr key={`${venta.numeroOperacion}-${venta.idSku}-${index}`} className="border-t text-center">
                <td className="px-2 py-1 font-mono">{venta.numeroOperacion}</td>
                <td className="px-2 py-1">{venta.sku}</td>
                <td className="px-2 py-1 text-center">{venta.cantidad}</td>
                <td className="px-2 py-1">{venta.canalVenta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
        </div>
        {/* Tabla de resumen */}
        <div className="w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-2">
            Productos a guardar ({itemsParaGuardar.length})
          </h2>
          {itemsParaGuardar.length === 0 ? (
            <p className="text-gray-500">No hay productos agregados aún.</p>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 text-left">
                      <th className="px-4 py-2">SKU</th>
                      <th className="px-4 py-2">Canal</th>
                      <th className="px-4 py-2">Operación</th>
                      <th className="px-4 py-2">Cantidad</th>
                      <th className="px-4 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsParaGuardar.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{item.sku}</td>
                        <td className="px-4 py-2">{item.canalVenta}</td>
                        <td className="px-4 py-2">{item.numeroOperacion}</td>
                        <td className="px-4 py-2">{item.cantidad}</td>
                        <td className="px-4 py-2">{item.fecha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="w-full mt-4 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none"
                onClick={handleGuardarTodo}
              >
                Guardar todo
              </button>
            </>
          )}
        </div>
      </div>
      <div className="mt-8 w-200 ">
        <h2 className="text-xl font-bold mb-2 ml-30">
          Resumen: Descuento vs Vendido
        </h2>
        <div className="w-115 ml-30  rounded-lg">
          <table className=" bg-white">
            <thead className="bg-gray-100">
              <tr className="border rounded-lg">
                <th className="px-4 py-2 text-left">SKU</th>
                <th className=" py-2 text-center">Vendidos</th>
                <th className="px-4 py-2 text-center">Totales</th>
                <th className="px-4 py-2 text-left">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorSku().map((item, index) => (
                <tr
                  key={index}
                  className={
                    " py-2 border " + // clases base (opcional)
                    (item.diferencia <= 0
                      ? "bg-red-600 text-white"
                      : item.vendidosTotales > 0
                      ? "bg-green-200 text-black" // o el color que quieras
                      : "bg-white border-t")
                  }
                >
                  <td className="px-4 py-2">{item.sku}</td>
                  <td className="px-4 py-2 text-center">
                    {item.vendidosTotales}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {item.totalesIniciales}
                  </td>
                  <td className="px-4 py-2 text-center">{item.diferencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
