import React, { useState, useRef } from "react";
import Swal from "sweetalert2";
import Loader from "./utilidades/Loader"; // Importar el componente Loader
import { ListarMarcas } from "./utilidades/ListarMarcas"; // Importar el componente ListarMarcas
import { Contenedor } from "./utilidades/Contenedor"; // Importar el componente Contenedor
import Urls from "./utilidades/Urls";
import InputCheckbox from "./utilidades/InputCheckbox";

export const CargarProductos: React.FC = () => {
  const [loading, setLoading] = useState(false); // Estado para el loader
  const formRef = useRef<HTMLFormElement>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<any>(null); // Estado para la marca seleccionada
  const [isActive, setIsActive] = useState(false); // Estado para el checkbox de producto activo

  const urlProductos = Urls.productos.cargar;
  const urlListarMarcas = Urls.marcas.listar;

  const enviarFormulario = async () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const data = {
        sku: formData.get("sku") as string,
        marca: marcaSeleccionada ? marcaSeleccionada.nombre : "",
        descripcion: formData.get("descripcion") as string,
        rubro: formData.get("rubro") as string,
        isActive: isActive,
      };

      try {
        setLoading(true);
        const response = await fetch(urlProductos, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Producto agregado",
            text: `El producto SKU ${data.sku} se ha agregado correctamente`,
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
              setMarcaSeleccionada(null); // Resetear la marca seleccionada
            }
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: result.message || "Hubo un problema al agregar el producto",
          });
        }
      } catch (error) {
        console.error("Error al enviar el formulario:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Hubo un problema al enviar el formulario",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sku = formData.get("sku") as string;

    Swal.fire({
      title: `¿Quiere guardar el producto SKU ${sku}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        enviarFormulario();
      }
    });
  };

  
  return (
    <div>
      <Contenedor>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Cargar Productos
        </h2>
        <form
          id="formProductos"
          className="space-y-6"
          onSubmit={handleFormSubmit}
          ref={formRef}
        >
          <div>
            <label
              htmlFor="sku"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              SKU:
            </label>
            <input
              name="sku"
              type="text"
              id="sku"
              required
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
              required
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
              required
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="checkbox"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Producto activo
            </label>
            <InputCheckbox 
            checked={isActive}
              onChange={(checked) => setIsActive(checked)}
            />
          </div>

          <div>
            <button
              type="submit"
              id="botonCargar"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
            >
              {loading ? "Cargando..." : "Cargar producto"}
            </button>
          </div>
        </form>
      </Contenedor>
      {loading && <Loader />}
    </div>
  );
};
