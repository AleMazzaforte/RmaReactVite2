import { useState, useRef } from "react";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import { ListarProductos } from "./utilidades/ListarProductos";
import { ListarMarcas } from "./utilidades/ListarMarcas";
import { Contenedor } from "./utilidades/Contenedor";
import {sweetAlert} from "./utilidades/SweetAlertWrapper"; // Importar sweetAlert
import Loader from "./utilidades/Loader";
import FechaInput from "./utilidades/FechaInput";
import Urls from './utilidades/Urls';

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

export const DevolucionAGondola: React.FC = () => {
  const [solicita, setSolicita] = useState("");
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
  const [devMeliSeleccionado, setDevMeliSeleccionado] = useState(false);
  const [otroMotivo, setOtroMotivo] = useState(false);

  // Endpoints (temporal)
  let urlClientes = Urls.clientes.buscar;
  let urlProductos = Urls.productos.listar;
  let urlMarcas = Urls.marcas.listar;
  let urlAgregarDevolucion = Urls.devolucion.agregar; // Nuevo endpoint temporal

  

  const handleMotivoChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const motivoSeleccionado = event.target.value;
    setDevMeliSeleccionado(motivoSeleccionado === "Devolucion Meli");
    setOtroMotivo(motivoSeleccionado === "Otro");
  };

  const handleClienteSeleccionado = async (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setMostrarCampos(true);
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

  const limpiarInputsProducto = () => {
    setProductoSeleccionado(null);
    setMarcaSeleccionada(null);
    const form = document.getElementById("formRma") as HTMLFormElement;
    form.reset();
  };

  const agregarProducto = () => {
    setMostrarLista(true);

    // Validar que se haya seleccionado un producto
    if (!productoSeleccionado) {
      const skuInput = document.getElementById("skuInput") as HTMLInputElement;
      skuInput.focus();
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un producto",
      });
      return;
    }

    // Validar la cantidad
    const cantidadInput = document.getElementById(
      "cantidad"
    ) as HTMLInputElement;
    const cantidad = cantidadInput.value;

    if (!cantidad || cantidad === "0") {
      cantidadInput.focus();
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe ingresar una cantidad válida.",
      });
      return;
    }

    // Validar que se haya seleccionado una marca
    if (!marcaSeleccionada) {
      const marcaInput = document.getElementById("marca") as HTMLInputElement;
      marcaInput.focus();
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar una marca",
      });
      return;
    }

    // Obtener el motivo seleccionado
    const motivoSelect = document.getElementById(
      "selectMotivo"
    ) as HTMLSelectElement;
    const motivo = motivoSelect.value;

    // Validar que se haya seleccionado un motivo
    if (!motivo) {
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un motivo",
      });
      return;
    }

    // Obtener el número de venta de Meli (si aplica)
    const numVentaMeliInput = document.getElementById(
      "numVentaMeli"
    ) as HTMLInputElement;
    const ventaMeli = devMeliSeleccionado ? numVentaMeliInput.value : null;

    // Validar que se haya ingresado el número de venta de Meli si es necesario
    if (devMeliSeleccionado && !ventaMeli) {
      numVentaMeliInput.focus();
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe ingresar el número de venta de Meli",
      });
      return;
    }

    // Obtener el motivo manual (si se seleccionó "Otro")
    const otroMotivoInput = document.getElementById(
      "otroMotivo"
    ) as HTMLInputElement;
    let motivoFinal: string = motivo;

    if (devMeliSeleccionado) {
      motivoFinal = otroMotivoInput.value;

      // Validar que se haya ingresado un motivo manual
      if (!motivoFinal) {
        otroMotivoInput.focus();
        sweetAlert.fire({
          icon: "warning",
          title: "Campo vacío",
          text: "Debe ingresar un motivo",
        });
        return;
      }

      // Validar que el motivo no supere los 100 caracteres
      if (motivoFinal.length > 100) {
        sweetAlert.fire({
          icon: "warning",
          title: "Motivo demasiado largo",
          text: "El motivo no puede superar los 100 caracteres.",
        });
        return;
      }
    }

    // Crear el objeto del producto
    const producto = {
      modelo: productoSeleccionado.id, // Enviar el id del producto
      sku: productoSeleccionado.sku, // Solo para mostrar en la lista
      cantidad: cantidad,
      marca: marcaSeleccionada.id, // Enviar el id de la marca
      nombreMarca: marcaSeleccionada.nombre, // Solo para mostrar en la lista
      motivo: motivoFinal, // Guardar el motivo
      ventaMeli, // Guardar el número de venta de Meli (si aplica)
    };

    // Agregar el producto a la lista
    setProductosAgregados([...productosAgregados, producto]);
    limpiarInputsProducto();

    // Enfocar el campo SKU para agregar otro producto
    setTimeout(() => {
      if (skuInputRef.current) {
        skuInputRef.current.focus();
      }
    }, 200);

    // Reiniciar la lista de productos
    setListarProductosKey((prevKey) => prevKey + 1);
  };

  const limpiarInputs = () => {
    setClienteSeleccionado(null);
    setProductoSeleccionado(null);
    setMarcaSeleccionada(null);
    setDevMeliSeleccionado(false);
    setOtroMotivo(false);
    setSolicita("");
    setMostrarCampos(false);
    setMostrarLista(false);
    const form = document.getElementById("formRma") as HTMLFormElement;
    form.reset();
  };

  const eliminarProducto = (index: number) => {
    const nuevosProductos = productosAgregados.filter((_, i) => i !== index);
    setProductosAgregados(nuevosProductos);

    if (productosAgregados.length === 1) {
      setMostrarLista(false);
      setProductosAgregados([]);
    }
  };

  const enviarFormulario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!clienteSeleccionado) {
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe seleccionar un cliente",
      });
      return;
    }

    if (productosAgregados.length === 0) {
      sweetAlert.fire({
        icon: "warning",
        title: "Campo vacío",
        text: "Debe agregar al menos un producto",
      });
      return;
    }

    // Crear un array de devoluciones (un registro por producto)
    const devoluciones = productosAgregados.map((producto) => ({
      idCliente: clienteSeleccionado.id,
      fechaIngreso: solicita, // Usar la fecha seleccionada en el formulario
      sku: producto.modelo, // Enviar el id del producto
      cantidad: producto.cantidad,
      marca: producto.marca, // Enviar el id de la marca
      motivo: producto.motivo, // Usar el motivo guardado
      ventaMeli: producto.ventaMeli, // Usar el número de venta de Meli guardado
    }));

    try {
      setLoading(true);
      const response = await fetch(urlAgregarDevolucion, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(devoluciones),
      });

      const data = await response.json();

      if (response.ok) {
        // Si la respuesta es exitosa
        sweetAlert.fire({
          icon: "success",
          title: "Éxito",
          text: "Devolución guardada exitosamente",
        }).then(() => {
          limpiarInputs();
          setProductosAgregados([]);
        });
      } else {
        // Si hay un error en la respuesta
        console.error("Error al guardar la devolución:", data);
        sweetAlert.fire({
          icon: "error",
          title: "Error",
          text: data.message || "Hubo un problema al guardar la devolución",
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
  };

  let otro: string = "";
  if (otroMotivo) {
    otro = "otro";
  } else {
    otro = "el";
  }

  return (
    <div className="absolute justify-end w-full h-full p-4">
      <Contenedor>
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
            Devolución
          </h2>
          <form id="formRma" className="space-y-6">
            <div>
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
                Ingreso<span className="text-red-500">*</span>:
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

                <label>Motivo:</label>
                <br />
                <select
                  name="selectMotivo"
                  id="selectMotivo"
                  className="w-60 mt-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  onChange={handleMotivoChange}
                >
                  <option value="">Elija una opción</option>
                  <option value="Devolucion Meli">Devolución Meli</option>
                  <option value="Enviado por error">Enviado por error</option>
                  <option value="El cliente compró mal">
                    El cliente compró mal
                  </option>
                  <option value="Devolución por cambio">
                    Devolución por cambio
                  </option>
                  <option value="Otro">Otro</option>
                </select>

                {devMeliSeleccionado && (
                  <input
                    type="number"
                    id="numVentaMeli"
                    className="ml-9 w-62 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                    placeholder="Número de venta"
                  />
                )}

                <br />

                {(otroMotivo || devMeliSeleccionado) && (
                  <input
                    type="text"
                    id="otroMotivo"
                    placeholder={`Ingrese ${otro} motivo`}
                    className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                    maxLength={100} // Limitar a 100 caracteres
                  />
                )}

                <button
                  key={listarProductosKey}
                  type="button"
                  onClick={agregarProducto}
                  className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-black focus:ring focus:ring-black"
                >
                  Agregar Producto
                </button>

                <button
                  type="button"
                  onClick={enviarFormulario}
                  className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
                >
                  {loading ? "Cargando..." : "Guardar Devolución"}
                </button>
              </>
            )}
          </form>
          {loading && <Loader />}
        </div>
      </Contenedor>
      {mostrarLista && (
        <div className="bg-white absolute top-4 right-0 pb-2">
          <h3 className="text-xl font-semibold mb-4">Productos</h3>
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
                  className={index % 2 === 0 ? "bg-gray-200" : "bg-white"}
                >
                  <td className="pl-2">{producto.sku}</td>
                  <td className="w-10 text-center">{producto.cantidad}</td>
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
