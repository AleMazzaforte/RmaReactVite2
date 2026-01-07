import { useState, useRef, useEffect } from "react";
import { ListarProductos } from "./utilidades/ListarProductos";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import Loader from "./utilidades/Loader";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";

interface Producto {
  id: string;
  sku: string;
}

interface StockItem {
  sku: string;
  descripcion: string;
  totalEntregado: number;
  totalFacturado: number;
  diferencia: number;
}

interface StockFacturado {
  id: string;
  idSku: number;
  cantidad: number;
  numFactura: number;
}

export const Magia: React.FC = () => {
  // Estados para el formulario de Stock
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);
  const [productosAgregados, setProductosAgregados] = useState<any[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [numeroPresupuesto, setNumeroPresupuesto] = useState("");

  // Estados para el formulario de Factura
  const [productoSeleccionadoFactura, setProductoSeleccionadoFactura] =
    useState<Producto | null>(null);
  const [loadingFactura, setLoadingFactura] = useState(false);
  const [numeroFactura, setNumeroFactura] = useState("");

  // Estados para la tabla de stock
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [facturadosData, setFacturadosData] = useState<StockFacturado[]>([]);

  const urlProductos = Urls.productos.listar;
  const urlAgregarMagia = Urls.magia.agregar;
  const urlAgregarFactura = Urls.magia.agregarFactura;
  const urlObtenerStock = Urls.magia.obtenerStock;
  const urlObtenerFacturados = Urls.magia.obtenerFacturados;

  const skuInputRef = useRef<HTMLInputElement>(null);
  const skuInputRefFactura = useRef<HTMLInputElement>(null);

  // Cargar stock al montar el componente
  useEffect(() => {
    cargarStock();
  }, []);
  useEffect(() => {
    cargarFacturados();
  }, []);

  const cargarStock = async () => {
    try {
      setLoadingStock(true);
      const response = await fetch(urlObtenerStock);
      if (response.ok) {
        const data = await response.json();
        setStockData(data);
      } else {
        console.error("Error al cargar stock");
      }
    } catch (error) {
      console.error("Error al cargar stock:", error);
    } finally {
      setLoadingStock(false);
    }
  };

  const cargarFacturados = async () => {
    try {
      setLoadingStock(true);
      const response = await fetch(urlObtenerFacturados);
      if (response.ok) {
        const data = await response.json();

        setFacturadosData(data);
      } else {
        console.error("Error al cargar stock");
      }
    } catch (error) {
      console.error("Error al cargar stock:", error);
    } finally {
      setLoadingStock(false);
    }
  };

  const handleReposicionStock = async () => {
    const productosAReponer = stockData
      .filter((item) => item.diferencia !== 0)
      .map((item) => ({
        sku: item.sku,
        cantidad: item.diferencia,
      }));

    if (productosAReponer.length === 0) {
      sweetAlert.fire({
        icon: "info",
        title: "Sin diferencias",
        text: "No hay productos con diferencias para reponer.",
      });
      return;
    }

    try {
      setLoadingStock(true);
      const response = await fetch(Urls.reposicion.guardar, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productos: productosAReponer,
          fecha: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        sweetAlert.fire({
          icon: "success",
          title: "Éxito",
          text: "Reposición generada correctamente.",
        });
      } else {
        sweetAlert.fire({
          icon: "error",
          title: "Error",
          text: "Hubo un problema al generar la reposición.",
        });
      }
    } catch (error) {
      console.error("Error al enviar reposición:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor.",
      });
    } finally {
      setLoadingStock(false);
    }
  };

  // ========== FUNCIONES PARA FORMULARIO DE STOCK ==========
  const handleProductoSeleccionado = (producto: Producto) => {
    if (!producto.sku.toLowerCase().startsWith("wm")) {
      sweetAlert.fire({
        icon: "warning",
        title: "SKU no válido",
        text: "Solo se permiten SKUs que comiencen con 'WM'",
      });
      setProductoSeleccionado(null);
      if (skuInputRef.current) {
        skuInputRef.current.value = "";
        skuInputRef.current.focus();
      }
      return;
    }
    setProductoSeleccionado(producto);
    if (skuInputRef.current) {
      skuInputRef.current.focus();
    }
  };

  const limpiarInputsProducto = () => {
    setProductoSeleccionado(null);
    const form = document.getElementById("formStock") as HTMLFormElement;
    const cantidadInput = document.getElementById(
      "cantidadStock"
    ) as HTMLInputElement;
    cantidadInput.value = "";
  };

  const agregarProducto = () => {
    setMostrarLista(true);

    if (!productoSeleccionado) {
      const skuInput = document.getElementById(
        "skuInputStock"
      ) as HTMLInputElement;
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un producto",
      });
      skuInput.focus();
      return;
    }

    const cantidadInput = document.getElementById(
      "cantidadStock"
    ) as HTMLInputElement;
    const cantidad = cantidadInput.value;

    if (!cantidad || cantidad === "0") {
      cantidadInput.focus();
      sweetAlert
        .fire({
          icon: "warning",
          title: "Campo vacío",
          text: "Debe ingresar una cantidad válida.",
        })
        .then(() => {
          cantidadInput.focus();
        });
      return;
    }

    if (!numeroPresupuesto || numeroPresupuesto.trim() === "") {
      const presupuestoInput = document.getElementById(
        "numeroPresupuesto"
      ) as HTMLInputElement;
      sweetAlert
        .fire({
          icon: "warning",
          title: "Campo vacío",
          text: "Debe ingresar un número de presupuesto.",
        })
        .then(() => {
          presupuestoInput.focus();
        });
      return;
    }

    const form = document.getElementById("formStock") as HTMLFormElement;
    const formData = new FormData(form);
    const producto = {
      modelo: productoSeleccionado.id,
      sku: productoSeleccionado.sku,
      cantidad: formData.get("cantidad") || "",
      numeroPresupuesto: numeroPresupuesto,
    };

    setProductosAgregados([...productosAgregados, producto]);
    limpiarInputsProducto();

    setTimeout(() => {
      if (skuInputRef.current) {
        skuInputRef.current.focus();
      }
    }, 200);
  };

  const limpiarInputs = () => {
    setProductoSeleccionado(null);
    setMostrarLista(false);
    setNumeroPresupuesto("");
    const form = document.getElementById("formStock") as HTMLFormElement;
    form.reset();
  };

  const eliminarProducto = (index: number) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);

    if (productosAgregados.length == 1) {
      setMostrarLista(false);
      setProductosAgregados([]);
    }
  };

  const enviarFormulario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (productosAgregados.length === 0) {
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe agregar al menos un producto",
      });
      return;
    }

    if (!numeroPresupuesto || numeroPresupuesto.trim() === "") {
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe ingresar un número de presupuesto",
      });
      return;
    }

    const formData = {
      numeroPresupuesto: numeroPresupuesto,
      productos: productosAgregados.map((producto) => ({
        modelo: producto.modelo,
        cantidad: producto.cantidad,
      })),
    };

    try {
      setLoading(true);
      const response = await fetch(urlAgregarMagia, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        sweetAlert
          .fire({
            icon: "success",
            title: "Éxito",
            text: "Productos agregados exitosamente",
          })
          .then(() => {
            limpiarInputs();
            setProductosAgregados([]);
            cargarStock(); // Recargar stock después de guardar
          });
      } else {
        sweetAlert.fire({
          icon: "error",
          title: "Error",
          text: "Hubo un problema al agregar los productos",
        });
      }
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
      });
    } finally {
      setLoading(false);
    }
  };

  // ========== FUNCIONES PARA FORMULARIO DE FACTURA ==========
  const handleProductoSeleccionadoFactura = (producto: Producto) => {
    if (!producto.sku.startsWith("WM")) {
      sweetAlert.fire({
        icon: "warning",
        title: "SKU no válido",
        text: "Solo se permiten SKUs que comiencen con 'WM'",
      });
      setProductoSeleccionadoFactura(null);
      if (skuInputRefFactura.current) {
        skuInputRefFactura.current.value = "";
        skuInputRefFactura.current.focus();
      }
      return;
    }
    setProductoSeleccionadoFactura(producto);
  };

  const limpiarInputsProductoFactura = () => {
    setProductoSeleccionadoFactura(null);
    const form = document.getElementById("formFactura") as HTMLFormElement;
    const cantidadInput = document.getElementById(
      "cantidadFactura"
    ) as HTMLInputElement;
    cantidadInput.value = "";
  };

  // ========== FUNCIÓN PARA GUARDAR FACTURA ==========
  const guardarFactura = async () => {
    // Validaciones
    if (!numeroFactura || numeroFactura.trim() === "") {
      const facturaInput = document.getElementById(
        "numeroFactura"
      ) as HTMLInputElement;
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe ingresar un número de factura.",
      });
      facturaInput?.focus();
      return;
    }

    if (!productoSeleccionadoFactura) {
      const skuInput = document.getElementById(
        "skuInputFactura"
      ) as HTMLInputElement;
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un producto.",
      });
      skuInput?.focus();
      return;
    }

    const cantidadInput = document.getElementById(
      "cantidadFactura"
    ) as HTMLInputElement;
    const cantidad = cantidadInput?.value;

    if (!cantidad || cantidad === "0" || parseInt(cantidad, 10) <= 0) {
      sweetAlert.fire({
        icon: "warning",
        title: "Cantidad inválida",
        text: "Debe ingresar una cantidad mayor a 0.",
      });
      cantidadInput?.focus();
      return;
    }

    // Preparar datos
    const formData = {
      numFactura: numeroFactura,
      productos: [
        {
          modelo: productoSeleccionadoFactura.id,
          cantidad: cantidad,
        },
      ],
    };

    try {
      setLoadingFactura(true);
      const response = await fetch(urlAgregarFactura, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        sweetAlert
          .fire({
            icon: "success",
            title: "Éxito",
            text: "Factura guardada exitosamente.",
          })
          .then(() => {
            // Limpiar formulario
            setProductoSeleccionadoFactura(null);
            setNumeroFactura("");
            if (cantidadInput) cantidadInput.value = "";
            if (skuInputRefFactura.current) {
              skuInputRefFactura.current.value = "";
              skuInputRefFactura.current.focus();
            }
            // Recargar datos
            cargarStock();
            cargarFacturados();
          });
      } else {
        const errorData = await response.json().catch(() => ({}));
        sweetAlert.fire({
          icon: "error",
          title: "Error",
          text: errorData?.message || "Hubo un problema al guardar la factura.",
        });
      }
    } catch (error) {
      console.error("Error al guardar factura:", error);
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "No se pudo conectar con el servidor.",
      });
    } finally {
      setLoadingFactura(false);
    }
  };
let mostrarFacturados: boolean = false
  if (facturadosData.length > 0) {
   mostrarFacturados = true
  }

  return (
    <div className="absolute justify-end w-full h-full p-4">
      <Contenedor>
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
            Cargar Stock
          </h2>
          <form id="formStock" className="space-y-6">
            <div>
              <label
                htmlFor="skuInputStock"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                SKU (solo WM)<span className="text-red-500">*</span>:
              </label>
              <ListarProductos
                endpoint={urlProductos}
                onProductoSeleccionado={handleProductoSeleccionado}
                campos={["sku"]}
                inputRef={skuInputRef}
                value={productoSeleccionado ? productoSeleccionado.sku : ""}
              />
            </div>
            {productoSeleccionado && (
              <input
                type="hidden"
                name="idProducto"
                value={productoSeleccionado.id}
                required
              />
            )}

            <div>
              <label
                htmlFor="cantidadStock"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cantidad<span className="text-red-500">*</span>:
              </label>
              <input
                type="number"
                id="cantidadStock"
                name="cantidad"
                min="1"
                required
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="numeroPresupuesto"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Número de Presupuesto<span className="text-red-500">*</span>:
              </label>
              <input
                type="number"
                id="numeroPresupuesto"
                name="numeroPresupuesto"
                value={numeroPresupuesto}
                onChange={(e) => setNumeroPresupuesto(e.target.value)}
                required
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={agregarProducto}
              className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-black"
            >
              Agregar Producto
            </button>
          </form>
          {loading && <Loader />}
        </div>
      </Contenedor>
      {mostrarLista && (
        <div className="bg-white absolute top-4 right-0 pb-2">
          <h3 className="text-xl font-semibold mb-4">Productos Agregados</h3>
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Cantidad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productosAgregados.map((producto, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-gray-200" : "bg-gray-50"}
                >
                  <td className="pl-0">{producto.sku}</td>
                  <td className="w-15 text-center">{producto.cantidad}</td>
                  <td>
                    <button
                      className="text-red-600 hover:text-red-800 pl-1.5 pr-2"
                      onClick={() => eliminarProducto(index)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              <button
                type="button"
                onClick={enviarFormulario}
                className="w-full py-1 px-2 bg-blue-500 mt-5  text-white  rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-blue-300"
              >
                {loading ? "Cargando..." : "Guardar Stock"}
              </button>
            </tbody>
          </table>
        </div>
      )}

      <Contenedor>
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
            Cargar Factura
          </h2>
          <form id="formFactura" className="space-y-6">
            <div>
              <label
                htmlFor="numeroFactura"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Número de Factura<span className="text-red-500">*</span>:
              </label>
              <input
  type="text"
  id="numeroFactura"
  name="numeroFactura"
  value={numeroFactura}
  onChange={(e) => {
    const valor = e.target.value.trim();
    setNumeroFactura(valor);

    // Si el campo no está vacío, validamos duplicado
    if (valor !== "") {
      const numIngresado = parseInt(valor, 10);
      if (!isNaN(numIngresado)) {
        const yaExiste = facturadosData.some(
          (f) => f.numFactura === numIngresado
        );
        if (yaExiste) {
          sweetAlert.fire({
            icon: "error",
            title: "Factura duplicada",
            text: `El número ${numIngresado} ya fue cargado. Use otro número.`,
          }).then(() => {
            setNumeroFactura(""); // limpiar
            const input = document.getElementById("numeroFactura") as HTMLInputElement;
            input?.focus();
          });
        }
      }
    }
  }}
  required
  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
/>
            </div>
            <div>
              <label
                htmlFor="skuInputFactura"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                SKU (solo WM)<span className="text-red-500">*</span>:
              </label>
              <ListarProductos
                endpoint={urlProductos}
                onProductoSeleccionado={handleProductoSeleccionadoFactura}
                campos={["sku"]}
                inputRef={skuInputRefFactura}
                value={
                  productoSeleccionadoFactura
                    ? productoSeleccionadoFactura.sku
                    : ""
                }
              />
            </div>
            {productoSeleccionadoFactura && (
              <input
                type="hidden"
                name="idProducto"
                value={productoSeleccionadoFactura.id}
                required
              />
            )}

            <div>
              <label
                htmlFor="cantidadFactura"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cantidad<span className="text-red-500">*</span>:
              </label>
              <input
                type="number"
                id="cantidadFactura"
                name="cantidad"
                min="1"
                required
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={guardarFactura}
              disabled={loadingFactura}
              className={`w-full py-2 px-4 font-semibold rounded-lg focus:outline-black ${
                loadingFactura
                  ? "bg-gray-400 cursor-not-allowed text-gray-200"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {loadingFactura ? "Guardando..." : "Guardar Factura"}
            </button>
          </form>
          {loadingFactura && <Loader />}
        </div>
      </Contenedor>
      {mostrarFacturados && (
  <Contenedor>
    <div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-4">
        Facturas Cargadas
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-700">
                SKU
              </th>
              <th className="px-4 py-2 border-b text-center text-sm font-semibold text-gray-700">
                Cantidad
              </th>
              <th className="px-4 py-2 border-b text-center text-sm font-semibold text-gray-700">
                Número de Factura
              </th>
            </tr>
          </thead>
          <tbody>
            {facturadosData.map((item, index) => (
              <tr
                key={item.id || index} // usa `item.id` si es único, sino `index`
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="px-4 py-2 border-b text-sm text-gray-700">
                  {item.idSku}
                </td>
                <td className="px-4 py-2 border-b text-center text-sm text-gray-700">
                  {item.cantidad}
                </td>
                <td className="px-4 py-2 border-b text-center text-sm text-gray-700">
                  {item.numFactura}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </Contenedor>
)}

      {/* Tabla de Stock */}
      <Contenedor>
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
            Resumen de Stock
          </h2>
          {loadingStock ? (
            <Loader />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-700">
                      SKU
                    </th>
                    <th className="px-4 py-2 border-b text-left text-sm font-semibold text-gray-700">
                      Descripción
                    </th>
                    <th className="px-4 py-2 border-b text-center text-sm font-semibold text-gray-700">
                      Total Entregado
                    </th>
                    <th className="px-4 py-2 border-b text-center text-sm font-semibold text-gray-700">
                      Total Facturado
                    </th>
                    <th className="px-4 py-2 border-b text-center text-sm font-semibold text-gray-700">
                      Diferencia
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No hay datos de stock disponibles
                      </td>
                    </tr>
                  ) : (
                    stockData.map((item, index) => (
                      <tr
                        key={index}
                        className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-4 py-2 border-b text-sm text-gray-700">
                          {item.sku}
                        </td>
                        <td className="px-4 py-2 border-b text-sm text-gray-700">
                          {item.descripcion}
                        </td>
                        <td className="px-4 py-2 border-b text-center text-sm text-gray-700">
                          {item.totalEntregado}
                        </td>
                        <td className="px-4 py-2 border-b text-center text-sm text-gray-700">
                          {item.totalFacturado}
                        </td>
                        <td
                          className={`px-4 py-2 border-b text-center text-sm font-semibold ${
                            item.diferencia > 0
                              ? "text-green-600"
                              : item.diferencia < 0
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {item.diferencia}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleReposicionStock}
              disabled={loadingStock || stockData.length === 0}
              className={`py-2 px-6 rounded-lg font-semibold text-white transition-colors ${
                loadingStock || stockData.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loadingStock ? "Procesando..." : "Reposición Stock"}
            </button>
          </div>
        </div>
      </Contenedor>
    </div>
  );
};
