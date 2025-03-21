import React, { useState, useRef } from "react";
import Loader from "./utilidades/Loader";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import FechaInput from "./utilidades/FechaInput";
import { ListarProductos } from "./utilidades/ListarProductos";
import { ListarMarcas } from "./utilidades/ListarMarcas";

interface Cliente {
  id: string;
  nombre: string;
}

interface Producto {
  id: string;
  sku: string;
}

interface Marca {
  id: string;
  nombre: string;
}

interface Op {
  id: number;
  nombre: string;
  fechaIngreso?: string;
}

export const DevolucionAGondola = () => {
  const [loading, setLoading] = useState(false);
  const [mostrarCampos, setMostrarCampos] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);

  const handleClienteSeleccionado = async (cliente: Cliente) => {
    //setClienteSeleccionado(cliente);
    setMostrarCampos(true);

    /*
        try {
          const response = await fetch(`${urlNumeroRemito}?clienteId=${cliente.id}`);
          const data = await response.json();
    
          if (data.length !== 0) {
            setUltimoNIngreso(data.nIngreso + 1);
          } else {
            setUltimoNIngreso(1);
          }
        } catch (error) {
          console.error("Error al obtener el último nIngreso:", error);
          setUltimoNIngreso(1);
        }
          */
  };

  const skuInputRef = useRef<HTMLInputElement>(null);

  const handleProductoSeleccionado = (producto: Producto) => {
    //setProductoSeleccionado(producto);
    if (skuInputRef.current) {
      skuInputRef.current.focus();
    }
  };

  const handleMarcaSeleccionada = (marca: Marca) => {
    //setMarcaSeleccionada(marca);
  };

  return (
    <div
      className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
      style={{ maxWidth: "590px", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)" }}
    >
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 font-bold">LOGO</span>
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
        Devolución a góndola
      </h2>
      <form id="formRma" className="space-y-6">
        <div>
          <h3 className="hidden">N° de Remito: {/*ultimoNIngreso*/}</h3>
          <label
            htmlFor="clienteSearch"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cliente<span className="text-red-500">*</span>:
          </label>{" "}
          <input
            type="text"
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
          {/*<BusquedaClientes endpoint={urlClientes} onClienteSeleccionado={handleClienteSeleccionado} campos={['nombre']} value={clienteSeleccionado ? clienteSeleccionado.nombre : ''} />*/}
        </div>
        {/*clienteSeleccionado && <input type="hidden" name="idCliente" value={clienteSeleccionado.id} />*/}

        <div>
          <label
            htmlFor="solicita"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Ingreso<span className="text-red-500">*</span>:
          </label>
          {/*<FechaInput id="solicita" value={solicita} onChange={setSolicita} />*/}
          <input
            type="date"
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="modelo"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            SKU<span className="text-red-500">*</span>:
          </label>
          <input
            type="text"
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
          {/*<ListarProductos endpoint={urlProductos} onProductoSeleccionado={handleProductoSeleccionado} campos={['sku']} inputRef={skuInputRef} value={productoSeleccionado ? productoSeleccionado.sku : ''} />*/}
        </div>
        {productoSeleccionado && (
          <input type="hidden" name="idProducto" required />
        )}

        <div>
          <label
            htmlFor="cantidad"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Cantidad<span className="text-red-500">*</span>:
          </label>
          <input
            type="number"
            id="cantidad"
            name="cantidad"
            min="1"
            required
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="marca"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Marca<span className="text-red-500">*</span>:
          </label>
          {/*<ListarMarcas endpoint={urlMarcas} onMarcaSeleccionada={handleMarcaSeleccionada} campos={['nombre']} value={marcaSeleccionada ? marcaSeleccionada.nombre : ''} />*/}
          <input
            type="text"
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
        </div>
        {marcaSeleccionada && <input type="hidden" name="idMarca" required />}

        <div>
          <label
            htmlFor="observaciones"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Motivo:
          </label>
          <select name="" id="">
            <option value="">Elija una opción</option>
            <option value="">Devolucion Meli</option>
            <option value="">Enviado por error</option>
            <option value="">El cliente compró mal</option>
            <option value="">Devolución por cambio</option>
            <option value="">otro</option>
          </select>
          <br />
          <br />
          <input
            type="text"
            placeholder="Ingrese otro motivo"
            className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
          />
          {/*<textarea
                        id="observaciones"
                        name="observaciones"
                        //value={observaciones}
                        //onChange={(e) => setObservaciones(e.target.value)}
                        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                    ></textarea>*/}
        </div>

        <button
          type="button"
          //onClick={enviarFormulario}
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
        >
          {loading ? "Cargando..." : "Guardar Devolución"}
        </button>
      </form>
      {loading && <Loader />}
    </div>
  );
};
