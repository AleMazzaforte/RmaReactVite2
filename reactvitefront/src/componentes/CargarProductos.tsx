import { useState, useRef } from "react";
import {sweetAlert} from "./utilidades/SweetAlertWrapper";
import Loader from "./utilidades/Loader";
import { ListarMarcas } from "./utilidades/ListarMarcas";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";
import InputCheckbox from "./utilidades/InputCheckbox";

export const CargarProductos: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<any>(null);
  const [isActive, setIsActive] = useState(false);

  const urlProductos = Urls.productos.cargar;
  const urlListarMarcas = Urls.marcas.listar;

  const enviarFormulario = async () => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      
      // 🆕 Normalizar código de barras: string limpio o null si está vacío
      const cbRaw = (formData.get("codigoBarras") as string || "").trim();
      const codigoBarras = cbRaw === "" ? null : cbRaw;

      const data = {
        sku: formData.get("sku") as string,
        marca: marcaSeleccionada ? marcaSeleccionada.nombre : "",
        descripcion: formData.get("descripcion") as string,
        rubro: formData.get("rubro") as string,
        codigoBarras: codigoBarras, // ✅ string o null
        // ✅ Corregido: la clave debe ser "pesoKgr" para que coincida con el backend
        pesoKgr: formData.get("peso") ? Number(formData.get("peso")) : null,
        alto: formData.get("alto") ? Number(formData.get("alto")) : null,
        ancho: formData.get("ancho") ? Number(formData.get("ancho")) : null,
        largo: formData.get("largo") ? Number(formData.get("largo")) : null,
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
          sweetAlert.fire({
            icon: "success",
            title: "Éxito",
            text: "Producto cargado exitosamente",
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
              setMarcaSeleccionada(null);
              setIsActive(false);
            }
          });
        } else {
          console.error("Error al cargar el producto:", result);
          sweetAlert.fire({
            icon: "error",
            title: "Error",
            text: result.message || "Hubo un problema al cargar el producto",
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
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sku = formData.get("sku") as string;
    sweetAlert.fire({
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
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
            />
          </div>

          {/* 🆕 Código de barras mejorado */}
          <div>
            <label
              htmlFor="codigoBarras"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Código de Barras:
            </label>
            <input
              name="codigoBarras"
              type="text"
              id="codigoBarras"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={50}
              placeholder="(solo números)"
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none font-mono tracking-wider"
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

          {/* Dimensiones y peso en grilla */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dimensiones y peso:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label
                  htmlFor="peso"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Peso (kg):
                </label>
                <input
                  name="peso"
                  type="number"
                  step="0.01"
                  min="0"
                  id="peso"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  placeholder="0.00"
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
                  name="alto"
                  type="number"
                  step="0.01"
                  min="0"
                  id="alto"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  placeholder="0.00"
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
                  name="ancho"
                  type="number"
                  step="0.01"
                  min="0"
                  id="ancho"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  placeholder="0.00"
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
                  name="largo"
                  type="number"
                  step="0.01"
                  min="0"
                  id="largo"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
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
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
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