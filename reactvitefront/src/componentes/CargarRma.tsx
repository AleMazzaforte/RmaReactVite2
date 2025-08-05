import React, { useState, useRef } from "react";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import { ListarProductos } from "./utilidades/ListarProductos";
import { ListarMarcas } from "./utilidades/ListarMarcas";
import { ListarOp } from "./utilidades/ListarOp";
import {sweetAlert} from "./utilidades/SweetAlertWrapper"; // Importar sweetAlert
import Loader from "./utilidades/Loader";
import FechaInput from "./utilidades/FechaInput";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";


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

export const CargarRma: React.FC = () => {
  const [ultimoNIngreso, setUltimoNIngreso] = useState<number>(0);
  const [solicita, setSolicita] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [seEntrega, setSeEntrega] = useState("");
  const [seRecibe, setSeRecibe] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [nEgreso, setNEgreso] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] =
    useState<Cliente | null>(null);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<Marca | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [mostrarCampos, setMostrarCampos] = useState(false);
  const [productosAgregados, setProductosAgregados] = useState<any[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [listarProductosKey, setListarProductosKey] = useState(0);
  const [opLoteSeleccionado, setOpLoteSeleccionado] = useState<Op | null>(null);

  const urlClientes = Urls.clientes.buscar;
  const urlProductos = Urls.productos.listar;
  const urlMarcas = Urls.marcas.listar;
  const urlAgregarRma = Urls.rma.agregar;
  const urlOp = Urls.rma.listarOp;
  const urlNumeroRemito = Urls.remito.getUltimoNumero;


  const handleClienteSeleccionado = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarCampos(true);

    try {
      const response = await fetch(
        `${urlNumeroRemito}?clienteId=${cliente.id}`
      );
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
  };

  const skuInputRef = useRef<HTMLInputElement>(null);

  const handleProductoSeleccionado = (producto: Producto) => {
    setProductoSeleccionado(producto);
    if (skuInputRef.current) {
      skuInputRef.current.focus();
    }
  };

  const handleMarcaSeleccionada = (marca: Marca) => {
    setMarcaSeleccionada(marca);
  };

  const handleOpLoteSeleccionado = (opLote: Op[]) => {
    if (opLote.length > 0) {
      setOpLoteSeleccionado(opLote[0]); // Tomar el primer elemento del array
    } else {
      setOpLoteSeleccionado(null);
    }
  };

  const limpiarInputsProducto = () => {
    setProductoSeleccionado(null);
    setMarcaSeleccionada(null);
    setOpLoteSeleccionado(null);
    setObservaciones("");
    setVencimiento("");
    setSeEntrega("");
    setSeRecibe("");
    setNEgreso("");
    const form = document.getElementById("formRma") as HTMLFormElement;
    form.reset();
  };

  const agregarProducto = () => {
    setMostrarLista(true);

    if (!productoSeleccionado) {
      const skuInput = document.getElementById("skuInput") as HTMLInputElement;
      console.log(skuInput);
      skuInput.focus();
      // Mostrar alerta si el campo SKU está vacío
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un producto",
      });
      skuInput.focus();
      return;
    }

    const cantidadInput = document.getElementById(
      "cantidad"
    ) as HTMLInputElement;
    const cantidad = cantidadInput.value;

    if (!cantidad || cantidad === "0") {
      cantidadInput.focus();
      // Mostrar alerta si la cantidad es cero o no está definida
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe ingresar una cantidad válida.",
      }).then(() => {
        cantidadInput.focus();
      });
      return;
    }

    if (!marcaSeleccionada) {
      const marcaInput = document.getElementById("marca") as HTMLInputElement;
      marcaInput.focus();
      // Mostrar alerta si la marca no está seleccionada
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar una marca",
      });
      marcaInput.focus();
      return;
    }
    if (!opLoteSeleccionado) {
      const opLoteInput = document.getElementById("opLote") as HTMLInputElement;
      opLoteInput.focus();
      // Mostrar alerta si la OP/Lote no está seleccionada
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar una OP/Lote",
      });
      
      opLoteInput.focus();
      return;
    }

    const form = document.getElementById("formRma") as HTMLFormElement;
    const formData = new FormData(form);
    const producto = {
      modelo: productoSeleccionado.id,
      sku: productoSeleccionado.sku,
      cantidad: formData.get("cantidad") || "",
      marca: marcaSeleccionada.id,
      nombreMarca: marcaSeleccionada.nombre,
      opLote: opLoteSeleccionado ? opLoteSeleccionado.id : null, // Guardar el ID de la OP
      observaciones: formData.get("observaciones") || null,
      vencimiento,
      seRecibe,
      seEntrega,
      nEgreso,
    };

    setProductosAgregados([...productosAgregados, producto]);
    limpiarInputsProducto();

    setTimeout(() => {
      if (skuInputRef.current) {
        skuInputRef.current.focus();
      }
    }, 200);

    setListarProductosKey((prevKey) => prevKey + 1);
  };

  const limpiarInputs = () => {
    setClienteSeleccionado(null);
    setProductoSeleccionado(null);
    setMarcaSeleccionada(null);
    setOpLoteSeleccionado(null);
    setSolicita("");
    setObservaciones("");
    setVencimiento("");
    setSeEntrega("");
    setSeRecibe("");
    setNEgreso("");
    setMostrarCampos(false);
    setMostrarLista(false);
    const form = document.getElementById("formRma") as HTMLFormElement;
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

    if (!clienteSeleccionado) {
      // Mostrar alerta si no se ha seleccionado un cliente
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un cliente",
      });
      return;
    }

    if (productosAgregados.length === 0) {
      // Mostrar alerta si no se han agregado productos
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe agregar al menos un producto",
      });
      return;
    }

    const formData = {
      cliente: clienteSeleccionado.id,
      solicita,
      nIngreso: ultimoNIngreso,
      productos: productosAgregados.map((producto) => ({
        modelo: producto.modelo,
        cantidad: producto.cantidad,
        marca: producto.marca,
        opLote: producto.opLote, // Enviar el ID de la OP
        observaciones: producto.observaciones,
        vencimiento: producto.vencimiento,
        seEntrega: producto.seEntrega,
        seRecibe: producto.seRecibe,
        nEgreso: producto.nEgreso,
      })),
    };

    try {
      setLoading(true);
      const response = await fetch(urlAgregarRma, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        sweetAlert.fire({
          icon: "success",
          title: "Éxito",
          text: "RMA agregado exitosamente",
        }).then(() => {
          limpiarInputs();
          setProductosAgregados([]);
        });
      } else {
        sweetAlert.fire({
          icon: "error",
          title: "Error",
          text: "Hubo un problema al agregar el RMA",
        });
      }
    } catch (error) {
      console.error("Error al enviar el formulario:", error);
      // Mostrar alerta de error en la conexión
      sweetAlert.fire({
        icon: "error",
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
      });
    } finally {
      setLoading(false);
    }

    setListarProductosKey((prevKey) => prevKey + 1);
  };

  return (
    <div className="absolute justify-end w-full h-full p-4">
      <Contenedor>
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
            Cargar RMA
          </h2>
          <form id="formRma" className="space-y-6">
            <div>
              <h3 className="hidden">N° de Remito: {ultimoNIngreso}</h3>
              <label
                htmlFor="clienteSearch"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Cliente<span className="text-red-500">*</span>:
              </label>
              <BusquedaClientes
                endpoint={urlClientes}
                onClienteSeleccionado={handleClienteSeleccionado}
                campos={["nombre"]}
                value={clienteSeleccionado ? clienteSeleccionado.nombre : ""}
              />
            </div>
            {clienteSeleccionado && (
              <input
                type="hidden"
                name="idCliente"
                value={clienteSeleccionado.id}
              />
            )}

            <div>
              <label
                htmlFor="solicita"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Solicita<span className="text-red-500">*</span>:
              </label>
              <FechaInput
                id="solicita"
                value={solicita}
                onChange={setSolicita}
              />
            </div>

            {mostrarCampos && (
              <>
                <div>
                  <label
                    htmlFor="modelo"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    SKU<span className="text-red-500">*</span>:
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
                  <ListarMarcas
                    endpoint={urlMarcas}
                    onMarcaSeleccionada={handleMarcaSeleccionada}
                    campos={["nombre"]}
                    value={marcaSeleccionada ? marcaSeleccionada.nombre : ""}
                  />
                </div>
                {marcaSeleccionada && (
                  <input
                    type="hidden"
                    name="idMarca"
                    required
                    value={marcaSeleccionada.id}
                  />
                )}

                <div>
                  <label
                    htmlFor="opLote"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    OP/Lote<span className="text-red-500">*</span>:
                  </label>
                  <ListarOp
                    key={listarProductosKey}
                    endpoint={urlOp}
                    onSeleccionado={(opLote: Op[]) =>
                      handleOpLoteSeleccionado(opLote)
                    } // Pasar el array de OPs
                    campos={["nombre"]}
                    value={opLoteSeleccionado ? opLoteSeleccionado.nombre : ""}
                  />
                </div>
                {opLoteSeleccionado && (
                  <input
                    type="hidden"
                    name="idOp"
                    value={opLoteSeleccionado.id}
                  />
                )}

                <div>
                  <label
                    htmlFor="observaciones"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Observaciones:
                  </label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  ></textarea>
                </div>

                <div>
                  <label
                    htmlFor="vencimiento"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Vencimiento:
                  </label>
                  <FechaInput
                    id="vencimiento"
                    value={vencimiento}
                    onChange={setVencimiento}
                  />
                </div>

                <div>
                  <label
                    htmlFor="seEntrega"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Se Entrega:
                  </label>
                  <FechaInput
                    id="seEntrega"
                    value={seEntrega}
                    onChange={setSeEntrega}
                  />
                </div>

                <div>
                  <label
                    htmlFor="seRecibe"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Se Recibe:
                  </label>
                  <FechaInput
                    id="seRecibe"
                    value={seRecibe}
                    onChange={setSeRecibe}
                  />
                </div>

                <div>
                  <label
                    htmlFor="nEgreso"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    N° de Egreso:
                  </label>
                  <input
                    type="text"
                    id="nEgreso"
                    name="nEgreso"
                    value={nEgreso}
                    onChange={(e) => setNEgreso(e.target.value)}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  />
                </div>

                <button
                  key={listarProductosKey}
                  type="button"
                  onClick={agregarProducto}
                  className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring focus:ring-green-300"
                >
                  Agregar Producto
                </button>

                <button
                  type="button"
                  onClick={enviarFormulario}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
                >
                  {loading ? "Cargando..." : "Guardar RMA"}
                </button>
              </>
            )}
          </form>
          {loading && <Loader />}
        </div>
      </Contenedor>
      {mostrarLista && (
        <div className="bg-white absolute top-4 right-0 pb-2">
          <h3 className="text-xl font-semibold mb-4">
            N° de Remito: {ultimoNIngreso}
          </h3>
          <table>
            <thead>
              <tr>
                <th></th>
                <th></th>
                <th></th>
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
                  <td className="pr-2">{producto.nombreMarca}</td>
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
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
