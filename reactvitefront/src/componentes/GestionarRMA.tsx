import React, { useState } from "react";
import { sweetAlert } from "./utilidades/SweetAlertWrapper";
import { TablaListarRmas } from "./TablaListarRmas";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import { Contenedor } from "./utilidades/Contenedor";
import Loader from "./utilidades/Loader";
import Urls from "./utilidades/Urls";
import Axios from "axios";

interface Cliente {
  id: string;
  nombre: string;
  cuit: string;
  provincia: string;
  ciudad: string;
  domicilio: string;
  telefono: string;
  transporte: string;
  seguro: string;
  condicionDeEntrega: string;
  condicionDePago: string;
}

interface Rma {
  idRma: string;
  modelo: string;
  cantidad: number;
  marca: string;
  solicita: string;
  opLote: string;
  vencimiento: string;
  seEntrega: string;
  seRecibe: string;
  observaciones: string;
  nIngreso: string;
  nEgreso: string;
}

interface RmaAgrupado {
  cliente: string;
  rmas: Rma[];
}

export const GestionarRMA = (): JSX.Element => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [rmas, setRmas] = useState<Rma[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [rmasNoEntregados, setRmasNoEntregados] = useState<RmaAgrupado[]>([]);

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setLoading(true);
    setCliente(cliente);
    setMostrarFormulario(false);
    buscarRmas(cliente.id);
  };

  const buscarRmas = async (clienteId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${Urls.rma.getPorCliente}/${clienteId}`);
      const data = await response.json();

      if (data.length > 0) {
        setRmas(data);
      } else {
        // Si no hay RMA asociados al cliente, mostrar alerta
        sweetAlert
          .fire({
            title: "Sin RMA",
            text: "Este cliente no tiene RMA asociado.",
            icon: "warning",
            confirmButtonText: "Aceptar",
          })
          .then(() => {
            cambiarCliente();
          });
      }
    } catch (error) {
      console.error("Error al buscar RMA:", error);
      setRmas([]);
    } finally {
      setLoading(false);
    }
  };

  const cambiarCliente = () => {
    setMostrarFormulario(true);
    setCliente(null);
    setRmas([]);
  };

  const handleActualizar = async (rmaActualizada: Rma) => {

    setRmas(
      rmas.map((rma) =>
        rma.idRma === rmaActualizada.idRma ? rmaActualizada : rma
      )
    );

    try {
      setLoading(true);
      const response = await fetch(
        `${Urls.rma.actualizarProducto}/${rmaActualizada.idRma}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rmaActualizada),
        }
      );

      if (response.ok) {
        const updatedRma = await response.json();
        // Mostrar alerta de éxito
        sweetAlert.fire({
          title: "Éxito",
          text: updatedRma.message,
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
      } else {
        // Si hay un error en la respuesta
        sweetAlert.fire({
          title: "Error",
          text: response.statusText || "Hubo un problema al actualizar el RMA",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error al actualizar el RMA:", error);
    }finally {
      setLoading(false);
    }

  };

  const handleEliminar = async (idRma: string | undefined) => {
    if (!idRma) {
      return sweetAlert.fire({
        title: "Error",
        text: "El ID del RMA no es válido.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }

    const result = await sweetAlert.fire({
      title: "Estas seguro?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      const response = await fetch(`${Urls.rma.eliminar}/${idRma}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // Si la respuesta es exitosa
        sweetAlert.fire({
          title: "Éxito",
          text: data.message,
          icon: "success",
          confirmButtonColor: "#3085d6",
        });

        setRmas(rmas.filter((rma) => rma.idRma !== idRma));
      } else {
        // Si hay un error en la respuesta
        console.error("Error al eliminar RMA:", data);
        sweetAlert.fire({
          title: "Error",
          text: data.message || "Hubo un problema al eliminar el RMA.",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error al eliminar RMA:", error);
      // Mostrar alerta de error en la conexión
      sweetAlert.fire({
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }finally {
      setLoading(false);
    }
  };

  const handleCargarRmaNoEntregado = async () => {
    setLoading(true);
    try {
      const response = await Axios.get<RmaAgrupado[]>(
        Urls.rma.cargarRmaNoEntregado
      );
      if (response.status === 200) {
        setRmasNoEntregados(response.data);
        if (response.data.length === 0) {
          sweetAlert.fire({
            title: "Sin RMA pendientes",
            text: "No hay RMA no entregados.",
            icon: "info",
            confirmButtonColor: "#3085d6",
          });
        }
      } else {
        sweetAlert.fire({
          title: "Error",
          text: "Hubo un problema al cargar el RMA pendiente.",
          icon: "error",
          confirmButtonColor: "#d33",
        });
      }
    } catch (error) {
      console.error("Error al cargar RMA pediente:", error);
      sweetAlert.fire({
        title: "Error de conexión",
        text: "Por favor, inténtelo de nuevo más tarde",
        icon: "error",
        confirmButtonColor: "#d33",
      });
      setRmasNoEntregados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarGlobal = async (rmaActualizada: Rma) => {
    // 1. Actualizar en el backend (igual que antes)
    try {
      const response = await fetch(
        `${Urls.rma.actualizarProducto}/${rmaActualizada.idRma}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rmaActualizada),
        }
      );

      if (!response.ok) throw new Error("Error al actualizar");

      // 2. Actualizar el estado local de rmasNoEntregados
      setRmasNoEntregados((prev) =>
        prev.map((grupo) => ({
          ...grupo,
          rmas: grupo.rmas.map((rma) =>
            rma.idRma === rmaActualizada.idRma ? rmaActualizada : rma
          ),
        }))
      );
      // 3. Mostrar alerta de éxito

      sweetAlert.fire({
        title: "Éxito",
        text: "RMA actualizado correctamente.",
        icon: "success",
        confirmButtonColor: "#3085d6",
      });
    } catch (error) {
      console.error("Error al actualizar RMA global:", error);
      sweetAlert.fire({
        title: "Error",
        text: "No se pudo actualizar el RMA.",
        icon: "error",
        confirmButtonColor: "#d33",
      });
    }
  };

  return (
    <>
      {loading && <Loader />}
      {/* Mostrar los contenedores de búsqueda SOLO si no se está viendo ninguna tabla */}
      {mostrarFormulario && rmasNoEntregados.length === 0 && (
        <div>
          <Contenedor>
            <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
              Gestión de productos por cliente
            </h1>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label
                  htmlFor="clienteSearch"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Cliente:
                </label>
                <BusquedaClientes
                  endpoint={Urls.clientes.buscar}
                  onClienteSeleccionado={handleClienteSeleccionado}
                  campos={["nombre"]}
                />
              </div>
            </form>
          </Contenedor>

          <Contenedor>
            <h1 className="text-2xl font-semibold text-gray-700 text-center mb-8">
              Gestión total de productos
            </h1>
            <button
              type="button"
              onClick={handleCargarRmaNoEntregado}
              id="botonCargar"
              className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-black focus:ring focus:ring-black"
            >
              {loading ? "Cargando..." : "Cargar productos"}
            </button>
          </Contenedor>
        </div>
      )}

      {/* Tabla de RMA no entregados (vista global) */}
      {rmasNoEntregados.length > 0 && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              RMA pendientes de entrega (de todos los clientes)
            </h2>
            <button
              onClick={() => {
                setRmasNoEntregados([]);
                setMostrarFormulario(true);
              }}
              className="bg-gradient-to-b from-blue-500 to-green-500 text-white px-4 py-2 rounded focus:outline-black focus:ring focus:ring-black"
            >
              Volver
            </button>
          </div>
          <div className="space-y-6">
            {rmasNoEntregados.map((grupo, idx) => (
              <div key={idx} className="border border-gray-300 rounded-lg p-4">
                <h3 className="text-lg font-bold text-blue-700 mb-2">
                  Cliente: {grupo.cliente}
                </h3>
                <TablaListarRmas
                  rmas={grupo.rmas}
                  handleActualizar={handleActualizarGlobal}
                  handleEliminar={handleEliminar}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla por cliente */}
      {!mostrarFormulario && cliente && rmas.length > 0 && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-700">
              Cliente: {cliente?.nombre}
            </h2>
            <button
              onClick={cambiarCliente}
              className="bg-gradient-to-b from-blue-500 to-green-500 text-white px-4 py-2 rounded focus:outline-black focus:ring focus:ring-black"
            >
              Cambiar Cliente
            </button>
          </div>
          {!loading && (
            <TablaListarRmas
              rmas={rmas}
              handleActualizar={handleActualizar}
              handleEliminar={handleEliminar}
            />
          )}
        </div>
      )}
    </>
  );
};
