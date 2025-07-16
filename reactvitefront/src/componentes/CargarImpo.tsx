import React, { useState, useRef } from "react";
import Loader from "./utilidades/Loader";
import FechaInput from "./utilidades/FechaInput";
import { ListarProductos } from "./utilidades/ListarProductos";
import Swal from "sweetalert2";
import { Contenedor } from "./utilidades/Contenedor";

let guardarOp = "https://rma-back.vercel.app/guardarOp ";
let urlProductos = "https://rma-back.vercel.app/listarProductos ";
if (window.location.hostname === "localhost") {
  guardarOp = "http://localhost:8080/guardarOp";
  urlProductos = "http://localhost:8080/listarProductos";
}

interface Op {
  op: string;
  fechaIngreso: string;
}

export class OpFactory implements Op {
  op: string;
  fechaIngreso: string;
  constructor(op: string, fecha: string) {
    this.op = op;
    this.fechaIngreso = fecha;
  }
}

export class OpService {
  async agregarOperacion(
    operacion: Op
  ): Promise<{ success: boolean; message: string; idOp?: number }> {
    try {
      const response = await fetch(guardarOp, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operacion),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
          `Error al guardar la operación. Código: ${response.status}`
        );
      }
      return {
        success: data?.success ?? true,
        message: data?.message ?? "Operación exitosa",
        idOp: data?.idOp,
      };
    } catch (error) {
      console.error("Error en OpService:", error);
      return { success: false, message: error + "" };
    }
  }
}

type GetProducto<T = {}> = T & Producto;

interface Producto {
  id: number;
  sku: string;
}

interface ProductoAgregado {
  producto: Producto;
  cantidad: number;
}

export const CargarImpo = () => {
  const [loading, setLoading] = useState(false);
  const [fechaImpo, setFechaImpo] = useState("");
  const [nombre, setNombre] = useState("");
  const cantidadRef = useRef<HTMLInputElement>(null);
  const [productosAgregados, setProductosAgregados] = useState<ProductoAgregado[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const skuInputRef = useRef<HTMLInputElement>(null); // Ref para el input de SKU
  const [listarProductosKey, setListarProductosKey] = useState(0);

  const mostrarInputsProductos = nombre.trim() !== "" && fechaImpo.trim() !== "";

  const handleProductoSeleccionado = (producto: GetProducto) => {
    if (producto && producto.sku && producto.id) {
      setProductoSeleccionado({ id: producto.id, sku: producto.sku });
      if (cantidadRef.current) {
        cantidadRef.current.focus();
      }
    } else {
      setProductoSeleccionado(null);
    }
  };

  const agregarProducto = () => {
    if (!productoSeleccionado) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debe seleccionar un producto válido.",
      }).then(() => {
        if (skuInputRef.current) {
          skuInputRef.current.focus();
        }
      });
      return;
    }

    if (!cantidadRef.current || !cantidadRef.current.value) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debe seleccionar una cantidad válida.",
      });
      return;
    }

    const cantidad = parseInt(cantidadRef.current.value, 10);
    if (isNaN(cantidad) || cantidad <= 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "La cantidad debe ser un número mayor a 0.",
      });
      return;
    }

    const nuevoProductoAgregado: ProductoAgregado = {
      producto: productoSeleccionado,
      cantidad: cantidad,
    };

    setProductosAgregados([...productosAgregados, nuevoProductoAgregado]);

    // Limpiar campos
    cantidadRef.current.value = "";
    setProductoSeleccionado(null);

    // Enfocar nuevamente el input de SKU
    setTimeout(() => {
      if (skuInputRef.current) {
        skuInputRef.current.focus();
      }
    }, 200);

    setListarProductosKey((prevKey) => prevKey + 1);
  };

  const eliminarProducto = (index: number) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);
  };

  const guardarProductosEnOpProductos = async (idOp: number, productos: ProductoAgregado[]) => {
    try {
      const urlOpProductos =
        window.location.hostname === "localhost"
          ? "http://localhost:8080/guardarOpProductos"
          : "https://rma-back.vercel.app/guardarOpProductos ";

      const response = await fetch(urlOpProductos, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          productos.map((p) => ({
            idOp,
            sku: p.producto.sku,
            cantidad: p.cantidad,
            idSku: p.producto.id,
          }))
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Error al guardar los productos en opProductos");
      }

      return { success: true, message: "Productos guardados correctamente" };
    } catch (error) {
      console.error("Error en guardarProductosEnOpProductos:", error);
      return { success: false, message: error + "" };
    }
  };

  const handleCargarOpYProductos = async () => {
    if (!nombre.trim() || !fechaImpo.trim() || productosAgregados.length === 0) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debe completar todos los campos y agregar al menos un producto.",
      });
      return;
    }

    setLoading(true);
    try {
      const nuevaOp = new OpFactory(nombre, fechaImpo);
      const opService = new OpService();
      const { success, message, idOp } = await opService.agregarOperacion(nuevaOp);

      if (!success || !idOp) {
        throw new Error(message || "No se pudo obtener el ID de la operación");
      }

      const { success: successProductos, message: messageProductos } = await guardarProductosEnOpProductos(idOp, productosAgregados);

      if (!successProductos) {
        throw new Error(messageProductos);
      }

      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Operación y productos guardados correctamente",
      });

      setNombre("");
      setFechaImpo("");
      setProductosAgregados([]);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Error", text: error + "" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Contenedor>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Cargar Impo
        </h2>
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Operación:
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha:
            </label>
            <FechaInput
              id="fechaImpo"
              value={fechaImpo}
              onChange={setFechaImpo}
            />
          </div>
          {mostrarInputsProductos && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto:
              </label>
              <ListarProductos
                key={listarProductosKey}
                endpoint={urlProductos}
                onProductoSeleccionado={handleProductoSeleccionado}
                campos={["sku"]}
                inputRef={skuInputRef} // Aquí pasamos la ref
              />
              <br />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad:
                </label>
                <input
                  type="number"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  ref={cantidadRef}
                />
              </div>
              <br />
              <button
                onClick={agregarProducto}
                type="button"
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:bg-blue-700"
              >
                Agregar producto
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={handleCargarOpYProductos}
            className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Cargando..." : "Cargar OP"}
          </button>
          {loading && <Loader />}
        </form>
      </Contenedor>

      {productosAgregados.length > 0 && (
        <div className="absolute right-5 top-35 w-[300px] bg-white p-5 h-auto">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Productos Agregados
          </h3>
          <table className="w-full">
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productosAgregados.map((item, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-gray-200" : "bg-white"}
                >
                  <td>{item.producto.sku}</td>
                  <td style={{ width: "80px" }}>{item.cantidad}</td>
                  <td>
                    <button
                      onClick={() => eliminarProducto(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};