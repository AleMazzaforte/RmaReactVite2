import React, { useState } from "react";
import {sweetAlert} from "./utilidades/SweetAlertWrapper"; // Importar sweetAlert
import { TablaListarRmas } from "./TablaListarRmas";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import { FlechasNavigator } from "./utilidades/FlechasNavigator";
import { Contenedor } from "./utilidades/Contenedor";
import Urls from "./utilidades/Urls"; // ✅ IMPORTANTE

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

export const ProductosPorCliente = (): JSX.Element => {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rmas, setRmas] = useState<Rma[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState<boolean>(true);

  const handleClienteSeleccionado = (cliente: Cliente) => {
    setCliente(cliente);
    setMostrarFormulario(false);
    buscarRmas(cliente.id);
  };

  const buscarRmas = async (clienteId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${Urls.rma.getPorCliente}/${clienteId}`);
      const data = await response.json();

      if (data.length > 0) {
        setRmas(data);
      } else {
        // Si no hay RMA asociados al cliente, mostrar alerta
        sweetAlert.fire({
          title: "Sin RMA",
          text: "Este cliente no tiene RMA asociado.",
          icon: "warning",
          confirmButtonText: "Aceptar",
        }).then(() => {
          cambiarCliente();
        });
      }
    } catch (error) {
      console.error("Error al buscar RMA:", error);
      setRmas([]);
    } finally {
      setIsLoading(false);
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
          text:updatedRma.message,
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
    }
  };

  return (
    <>
      {mostrarFormulario ? (
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
              <FlechasNavigator
                resultados={[]}
                onSeleccionado={handleClienteSeleccionado}
                campos={["nombre"]}
              />
            </form>
          </Contenedor>
        </div>
      ) : null}

      {!mostrarFormulario && cliente && (
        <div>
          <h2 className="text-xl font-semibold text-gray-700 text-center mb-4">
            Cliente: {cliente?.nombre}
          </h2>

          {!isLoading && (
            <TablaListarRmas
              rmas={rmas}
              handleActualizar={handleActualizar}
              handleEliminar={handleEliminar}
            />
          )}
          <button
            onClick={cambiarCliente}
            className="mb-4 ml-20 bg-gradient-to-b from-blue-500 to-green-500 text-white px-4 py-2 rounded"
          >
            Cambiar Cliente
          </button>
        </div>
      )}
    </>
  );
};
