import { useState, useRef, useEffect } from "react";
import Loader from "./utilidades/Loader";
import { BusquedaTransportes } from "./utilidades/BusquedaTransportes";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls";
import {sweetAlert} from "./utilidades/SweetAlertWrapper";

export const ActualizarTransporte: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [transporteSeleccionado, setTransporteSeleccionado] =
    useState<any>(null);
  const [formValues, setFormValues] = useState({
    nombre: "",
    direccionLocal: "",
    telefono: "",
  });



  const urlActualizarTransporte = Urls.transportes.actualizar;
  const urlEliminarTransporte = Urls.transportes.eliminar;
  const urlBuscarTransporte = Urls.transportes.buscar;

  useEffect(() => {
    if (transporteSeleccionado) {
      setFormValues({
        nombre: transporteSeleccionado.nombre || "",
        direccionLocal: transporteSeleccionado.direccionLocal || "",
        telefono: transporteSeleccionado.telefono || "",
      });
    } else {
      setFormValues({ nombre: "", direccionLocal: "", telefono: "" });
    }
  }, [transporteSeleccionado]);

  const actualizarTransporte = async () => {
    if (formRef.current && transporteSeleccionado) {
      const formData = new FormData(formRef.current);
      const data = {
        id: transporteSeleccionado.idTransporte,
        nombre:
          (formData.get("nombre") as string) || transporteSeleccionado.nombre,
        direccionLocal:
          (formData.get("direccionLocal") as string) ||
          transporteSeleccionado.direccionLocal,
        telefono:
          parseInt(formData.get("telefono") as string) ||
          transporteSeleccionado.telefono,
      };

      try {
        setLoading(true);
        const response = await fetch(urlActualizarTransporte, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
          // Si la respuesta es exitosa
          sweetAlert.success( 
            "¡Transporte actualizado exitosamente!",
            `El transporte "${data.nombre}" se ha actualizado correctamente`
          ).then(() => limpiarFormulario());
        } else {
          // Si hay un error en la respuesta
          console.error("Error al actualizar el transporte:", result);
          sweetAlert.error(
            "Error al actualizar el transporte",
            result.error || "Hubo un problema al actualizar el transporte"
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

  const eliminarTransporte = async () => {
    if (transporteSeleccionado) {
      try {
        setLoading(true);
        const response = await fetch(urlEliminarTransporte, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: transporteSeleccionado.idTransporte }),
        });

        const result = await response.json();

        if (response.ok) {
          // Si la respuesta es exitosa
          sweetAlert.success(
            "¡Transporte eliminado exitosamente!",
            "El transporte se ha eliminado correctamente",
          ).then(() => limpiarFormulario());
        } else {
          // Si hay un error en la respuesta
          console.error("Error al eliminar el transporte:", result);
          sweetAlert.error(
            "Error al eliminar el transporte",
            result.error || "Hubo un problema al eliminar el transporte"
          );
        }
      } catch (error) {
        console.error("Error al eliminar el transporte:", error);
        sweetAlert.error(
          "Error al eliminar el transporte",
          "Hubo un problema al eliminar el transporte. Por favor, inténtelo de nuevo más tarde."
        );
      } finally {
        setLoading(false);
      }
    }
  };

  const limpiarFormulario = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
    setTransporteSeleccionado(null);
    setFormValues({ nombre: "", direccionLocal: "", telefono: "" });
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (transporteSeleccionado) {
      // Confirmación antes de actualizar
      sweetAlert.fire({
        title: `¿Quiere actualizar el transporte "${transporteSeleccionado.nombre}"?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, actualizar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          actualizarTransporte();
        }
      });
    }
  };

  const handleEliminarTransporte = () => {
    if (transporteSeleccionado) {
      // Confirmación antes de eliminar
      sweetAlert.fire({
        title: `¿Quiere eliminar el transporte "${transporteSeleccionado.nombre}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          eliminarTransporte();
        }
      });
    }
  };

  return (
    <div>
      <Contenedor>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">
          Actualizar Transporte
        </h2>
        <form
          id="formTransportes"
          className="space-y-6"
          onSubmit={handleFormSubmit}
          ref={formRef}
        >{loading && <Loader />}
          <div>
            <label
              htmlFor="nombre"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Transporte:
            </label>
            <BusquedaTransportes
              endpoint={urlBuscarTransporte}
              onTransporteSeleccionado={setTransporteSeleccionado}
              campos={["nombre"]}
            />
          </div>

          <div>
            <label
              htmlFor="direccionLocal"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dirección Local:
            </label>
            <input
              type="text"
              id="direccionLocal"
              name="direccionLocal"
              value={formValues.direccionLocal}
              onChange={(e) =>
                setFormValues({ ...formValues, direccionLocal: e.target.value })
              }
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label
              htmlFor="telefono"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Teléfono:
            </label>
            <input
              type="number"
              id="telefono"
              name="telefono"
              value={formValues.telefono}
              onChange={(e) =>
                setFormValues({ ...formValues, telefono: e.target.value })
              }
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex flex-col space-y-4">
            <button
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black hover:bg-blue-700"
            >
              {loading ? "Cargando..." : "Actualizar transporte"}
            </button>
            <button
              type="button"
              onClick={handleEliminarTransporte}
              className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg focus:outline-black focus:ring focus:ring-black hover:bg-red-700"
            >
              {loading ? "Cargando..." : "Eliminar transporte"}
            </button>
          </div>
        </form>

      </Contenedor>

    </div>
  );
};
