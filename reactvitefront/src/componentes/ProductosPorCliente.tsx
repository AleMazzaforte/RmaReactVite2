import React, { useState } from "react";
import Swal from "sweetalert2";
import { TablaListarRmas } from "./TablaListarRmas";
import { BusquedaClientes } from "./utilidades/BusquedaClientes";
import { FlechasNavigator } from "./utilidades/FlechasNavigator";
import { Contenedor } from "./utilidades/Contenedor";

let url = "https://rma-back.vercel.app";
if (window.location.hostname === "localhost") {
  url = "http://localhost:8080";
}

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
      const response = await fetch(`${url}/getRmaCliente/${clienteId}`);
      const data = await response.json();

      if (data.length > 0) {
        setRmas(data);
      } else {
        Swal.fire({
          icon: "warning",
          title: "Sin RMA",
          text: "Este cliente no tiene RMA asociado.",
          confirmButtonText: "Aceptar",
        }).then(() => {
          cambiarCliente(); // Restablecer el formulario al aceptar la alerta
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
    // Actualizar el estado local
    setRmas(
      rmas.map((rma) =>
        rma.idRma === rmaActualizada.idRma ? rmaActualizada : rma
      )
    );

    // Enviar la actualización al backend
    try {
      const response = await fetch(
        `${url}/actualizarProductoRma/${rmaActualizada.idRma}`,
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
        Swal.fire({
          title: "¡Actualización exitosa!",
          text: updatedRma.message,
          icon: "success",
          confirmButtonColor: "#3085d6",
        });
      } else {
        Swal.fire({
          title: "Atención",
          text: response.statusText,
          icon: "warning",
          confirmButtonColor: "#3085d6",
        });
        console.error(
          "Error al actualizar el RMA en el backend:",
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error al enviar la solicitud de actualización:", error);
    }
  };

  const handleEliminar = async (idRma: string | undefined) => {
    if (idRma) {
      // Mostrar confirmación antes de eliminar
      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: "¡Esta acción no se puede deshacer!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Sí, eliminar",
      });

      if (result.isConfirmed) {
        try {
          const response = await fetch(`${url}/eliminarRma/${idRma}`, {
            method: "DELETE",
          });

          const data = await response.json();

          if (response.ok) {
            Swal.fire({
              title: "¡Eliminado!",
              text: data.message,
              icon: "success",
              confirmButtonColor: "#3085d6",
            });

            // Eliminar de la lista local
            setRmas(rmas.filter((rma) => rma.idRma !== idRma));
          } else {
            Swal.fire({
              title: "Error",
              text: data.message,
              icon: "error",
              confirmButtonColor: "#d33",
            });
          }
        } catch (error) {
          console.error("Error al eliminar RMA:", error);
          Swal.fire({
            title: "Error",
            text: "Hubo un problema al eliminar el RMA.",
            icon: "error",
            confirmButtonColor: "#d33",
          });
        }
      }
    } else {
      Swal.fire({
        title: "Error",
        text: "El id no existe.",
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
                  endpoint={`${url}/buscarCliente`}
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
