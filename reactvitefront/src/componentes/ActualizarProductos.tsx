import { useState, useRef } from "react";
import Loader from "./utilidades/Loader";
import { ListarMarcas } from "./utilidades/ListarMarcas";
import { ListarProductos } from "./utilidades/ListarProductos";
import { Contenedor } from "./utilidades/Contenedor";
import InputCheckbox from "./utilidades/InputCheckbox";
import Urls from "./utilidades/Urls";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";

interface Marca {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  sku: string;
  descripcion: string;
  rubro: string;
  marca: string | Marca;
  isActive: boolean | number;
  codigoBarras?: string | null;
  pesoGr?: number | null;
  alto?: number | null;
  ancho?: number | null;
  largo?: number | null;
}

export const ActualizarProductos: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<any>(null);
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);

  const urlProductos = Urls.productos.listar;
  const urlListarMarcas = Urls.marcas.listar;
  const urlActualizarProducto = Urls.productos.actualizar;
  const urlEliminarProducto = Urls.productos.eliminar;

  const handleProductoSeleccionado = (producto: Producto) => {
    if (formRef.current) {
      const skuInput = formRef.current.querySelector(
        'input[name="sku"]'
      ) as HTMLInputElement;
      const descripcionInput = formRef.current.querySelector(
        'input[name="descripcion"]'
      ) as HTMLInputElement;
      const rubroInput = formRef.current.querySelector(
        'input[name="rubro"]'
      ) as HTMLInputElement;
      const codigoBarrasInput = formRef.current.querySelector(
        'input[name="codigoBarras"]'
      ) as HTMLInputElement;
      const pesoGrInput = formRef.current.querySelector(
        'input[name="pesoGr"]'
      ) as HTMLInputElement;
      const altoInput = formRef.current.querySelector(
        'input[name="alto"]'
      ) as HTMLInputElement;
      const anchoInput = formRef.current.querySelector(
        'input[name="ancho"]'
      ) as HTMLInputElement;
      const largoInput = formRef.current.querySelector(
        'input[name="largo"]'
      ) as HTMLInputElement;

      if (skuInput) skuInput.value = producto.sku;
      if (descripcionInput) descripcionInput.value = producto.descripcion;
      if (rubroInput) rubroInput.value = producto.rubro;
      
      // ✅ Cargar los nuevos campos
      if (codigoBarrasInput) codigoBarrasInput.value = producto.codigoBarras || '';
      if (pesoGrInput) pesoGrInput.value = producto.pesoGr?.toString() || '';
      if (altoInput) altoInput.value = producto.alto?.toString() || '';
      if (anchoInput) anchoInput.value = producto.ancho?.toString() || '';
      if (largoInput) largoInput.value = producto.largo?.toString() || '';

      const nuevoEstadoActivo = Boolean(Number(producto.isActive));
      setIsActive(nuevoEstadoActivo);
      
      if (typeof producto.marca === "string") {
        setMarcaSeleccionada({ id: 0, nombre: producto.marca });
      } else {
        setMarcaSeleccionada(producto.marca);
      }
      
      setProductoSeleccionado(producto);
    }
  };

  const actualizarProducto = async () => {
    if (formRef.current && productoSeleccionado) {
      const formData = new FormData(formRef.current);
      const data = {
        id: productoSeleccionado.id,
        sku: productoSeleccionado.sku,
        marca: marcaSeleccionada
          ? marcaSeleccionada.nombre
          : productoSeleccionado.marca,
        descripcion:
          (formData.get("descripcion") as string) ||
          productoSeleccionado.descripcion,
        rubro: (formData.get("rubro") as string) || productoSeleccionado.rubro,
        isActive: isActive,
        // ✅ Agregar los nuevos campos
        codigoBarras: (formData.get("codigoBarras") as string) || null,
        pesoGr: formData.get("pesoGr") ? parseFloat(formData.get("pesoGr") as string) : null,
        alto: formData.get("alto") ? parseFloat(formData.get("alto") as string) : null,
        ancho: formData.get("ancho") ? parseFloat(formData.get("ancho") as string) : null,
        largo: formData.get("largo") ? parseFloat(formData.get("largo") as string) : null,
      };

      try {
        setLoading(true);
        const response = await fetch(`${urlActualizarProducto}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          sweetAlert.success(
            "¡Producto actualizado exitosamente!",
            `El producto con SKU "${data.sku}" se ha actualizado correctamente`
          ).then(() => {
            if (formRef.current) {
              formRef.current.reset();
              setProductoSeleccionado(null);
            }
          });
        } else {
          const errorMessage = result.message || "Error al actualizar el producto";
          sweetAlert.error(
            "Error al actualizar el producto",
            errorMessage
          );
        }
      } catch (error) {
        console.error("Error al enviar el formulario:", error);
        sweetAlert.error(
          "Error al enviar el formulario",
          "Hubo un problema al enviar el formulario. Por favor, inténtelo de nuevo más tarde."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const eliminarProducto = async () => {
    if (productoSeleccionado) {
      try {
        setLoading(true);
        const response = await fetch(
          `${urlEliminarProducto}/${productoSeleccionado.sku}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();

        if (response.ok) {
          sweetAlert.success(
            "¡Producto eliminado exitosamente!",
            `El producto con SKU "${productoSeleccionado.sku}" se ha eliminado correctamente`
          );
          if (formRef.current) {
            formRef.current.reset();
            setProductoSeleccionado(null);
          }
        } else {
          console.error("Error al eliminar el producto:", result);
          sweetAlert.error(
            "Error al eliminar el producto",
            result.error || "Hubo un problema al eliminar el producto"
          );
        }
      } catch (error) {
        console.error("Error al eliminar el producto:", error);
        sweetAlert.error(
          "Error al eliminar el producto",
          "Hubo un problema al eliminar el producto. Por favor, inténtelo de nuevo más tarde."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (productoSeleccionado) {
      sweetAlert.fire({
        title: `¿Quiere actualizar el producto con SKU "${productoSeleccionado.sku}"?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, actualizar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          actualizarProducto();
        }
      });
    }
  };

  const handleEliminarProducto = () => {
    if (productoSeleccionado) {
      sweetAlert.fire({
        title: `¿Quiere eliminar el producto con SKU "${productoSeleccionado.sku}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          eliminarProducto();
        }
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  return (
    <div>
      <Contenedor>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Actualizar Productos
        </h2>
        <form
          id="formProductos"
          className="space-y-6"
          onSubmit={handleFormSubmit}
          ref={formRef}
          onKeyDown={handleKeyDown}
        >
          <div>
            <label
              htmlFor="sku"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              SKU:
            </label>
            <ListarProductos
              endpoint={urlProductos}
              onProductoSeleccionado={handleProductoSeleccionado}
              campos={["sku"]}
            />
          </div>

          {/* ✅ Código de Barras */}
          <div>
            <label
              htmlFor="codigoBarras"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Código de Barras:
            </label>
            <input
              type="text"
              id="codigoBarras"
              name="codigoBarras"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="marca"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Marca:
            </label>
            <ListarMarcas
              endpoint={urlListarMarcas}
              onMarcaSeleccionada={setMarcaSeleccionada}
              campos={["nombre"]}
            />
          </div>

          <div>
            <label
              htmlFor="descripcion"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Descripción:
            </label>
            <input
              type="text"
              id="descripcion"
              name="descripcion"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="rubro"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Rubro:
            </label>
            <input
              type="text"
              id="rubro"
              name="rubro"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>

          {/* ✅ Dimensiones y Peso - Grid 2x2 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Peso y Dimensiones:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="pesoGr"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Peso (gr):
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="pesoGr"
                  name="pesoGr"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="alto"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Alto (cm):
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="alto"
                  name="alto"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="ancho"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Ancho (cm):
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="ancho"
                  name="ancho"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="largo"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Largo (cm):
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="largo"
                  name="largo"
                  className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="checkbox"
              className="block text-sm font-medium text-gray-700 mb-3"
            >
              Producto Activo:
            </label>
            <InputCheckbox
              checked={isActive}
              onChange={(checked) => setIsActive(checked)}
            />
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              id="botonActualizar"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
            >
              {loading ? "Cargando..." : "Actualizar producto"}
            </button>
            <button
              type="button"
              id="botonEliminar"
              onClick={handleEliminarProducto}
              className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-black focus:ring focus:ring-black"
            >
              {loading ? "Cargando..." : "Eliminar producto"}
            </button>
          </div>
        </form>
      </Contenedor>
      {loading ? <Loader /> : ""}
    </div>
  );
};