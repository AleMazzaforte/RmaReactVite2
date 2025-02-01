import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader

export const CargarClientes: React.FC = () => {
  const [loading, setLoading] = useState(false);  // Estado para el loader
  const formRef = useRef<HTMLFormElement>(null);

  let urlClientes = 'https://rmareactvite2.onrender.com/cargarCliente';
  if (window.location.hostname === 'localhost') {
    urlClientes = 'http://localhost:8080/cargarCliente';
  }

  const enviarFormulario = async (nombre: string, cuit: string) => {
    if (formRef.current) {
      const formData = new FormData(formRef.current);
      const data = {
        cliente: formData.get("cliente"),
        cuit: formData.get("cuit"),
        provincia: formData.get("provincia"),
        ciudad: formData.get("ciudad"),
        domicilio: formData.get("domicilio"),
        telefono: formData.get("telefono"),
        transporte: formData.get("transporte"),
        seguro: formData.get("seguro"),
        condEntrega: formData.get("condEntrega"),
        condPago: formData.get("condPago"),
      };
  
      try {
        setLoading(true);
        const response = await fetch(urlClientes, {
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
            title: "Cliente agregado",
            text: `El cliente ${nombre} se ha agregado correctamente`,
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
            }
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: result.error || "Hubo un problema al agregar el cliente",
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
    const nombre = formData.get("cliente") as string;
    const cuit = formData.get("cuit") as string;
  
    Swal.fire({
      title: `¿Quiere guardar a ${nombre} como cliente?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        enviarFormulario(nombre, cuit);
      }
    });
  };
  
  return (
    <div
      className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
      style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}
    >
      <div className="flex justify-center mb-6">
        <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
          <span className="text-gray-500 font-bold">LOGO</span>
        </div>
      </div>
      <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Cargar clientes</h2>
      <form id="formRma" className="space-y-6" onSubmit={handleFormSubmit} ref={formRef}>
        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente:
          </label>
          <input name="cliente" type="text" id="clienteSearch" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        
        <div>
          <label htmlFor="cuit" className="block text-sm font-medium text-gray-700 mb-1">CUIT:</label>
          <input type="number" name="cuit" id="cuit" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        
        <div>
          <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">Provincia:</label>
          <input type="text" id="provincia" name="provincia" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">Ciudad:</label>
          <input type="text" id="ciudad" name="ciudad" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="domicilio" className="block text-sm font-medium text-gray-700 mb-1">Domicilio:</label>
          <input type="text" id="domicilio" name="domicilio" autoComplete="off" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">Teléfono:</label>
          <input type="number" id="telefono" name="telefono" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>
        
        <div>
          <label htmlFor="transporte" className="block text-sm font-medium text-gray-700 mb-1">Transporte:</label>
          <input type="text" id="transporte" name="transporte" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="seguro" className="block text-sm font-medium text-gray-700 mb-1">Seguro:</label>
          <input type="text" id="seguro" name="seguro" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="condEntrega" className="block text-sm font-medium text-gray-700 mb-1">Condición de entrega:</label>
          <input type="text" id="condEntrega" name="condEntrega" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <label htmlFor="condPago" className="block text-sm font-medium text-gray-700 mb-1">Condición de pago:</label>
          <input id="condPago" name="condPago" className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
        </div>

        <div>
          <button
            type="submit"
            id="botonCargar"
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300"
          >
            {loading ? 'Cargando...' : 'Cargar cliente'}  {/* Mostrar texto alternativo si loading es true */}
          </button>
        </div>
      </form>
      {loading && <Loader />}  {/* Mostrar el loader si loading es true */}
    </div>
  );
};
