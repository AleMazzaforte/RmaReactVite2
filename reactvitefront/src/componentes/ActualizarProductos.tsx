import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import Loader from './utilidades/Loader';  // Importar el componente Loader
import { ListarMarcas } from './utilidades/ListarMarcas';  // Importar el componente ListarMarcas
import { ListarProductos } from './utilidades/ListarProductos';  // Importar el componente ListarProductos

export const ActualizarProductos: React.FC = () => {
  const [loading, setLoading] = useState(false);  // Estado para el loader
  const formRef = useRef<HTMLFormElement>(null);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState<any>(null);  // Estado para la marca seleccionada
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);  // Estado para el producto seleccionado

  let urlProductos = 'https://rmareactvite2.onrender.com/listarProductos';
  let urlListarMarcas = 'https://rmareactvite2.onrender.com/listarMarcas';
  let urlActualizarProducto = 'https://rmareactvite2.onrender.com/actualizarProducto';
  let urlEliminarProducto = 'https://rmareactvite2.onrender.com/eliminarProducto';

  if (window.location.hostname === 'localhost') {
    urlProductos = 'http://localhost:8080/listarProductos';
    urlListarMarcas = 'http://localhost:8080/listarMarcas';
    urlActualizarProducto = 'http://localhost:8080/actualizarProducto';
    urlEliminarProducto = 'http://localhost:8080/eliminarProducto';
  }

  const handleProductoSeleccionado = (producto: any) => {
    if (formRef.current) {
      const skuInput = formRef.current.querySelector('input[name="sku"]') as HTMLInputElement;
      const descripcionInput = formRef.current.querySelector('input[name="descripcion"]') as HTMLInputElement;
      const rubroInput = formRef.current.querySelector('input[name="rubro"]') as HTMLInputElement;

      if (skuInput) skuInput.value = producto.sku;
      if (descripcionInput) descripcionInput.value = producto.descripcion;
      if (rubroInput) rubroInput.value = producto.rubro;

      setMarcaSeleccionada(producto.marca);
      setProductoSeleccionado(producto);  // Almacenar el producto completo en el estado
    }
  };

  const actualizarProducto = async () => {
    if (formRef.current && productoSeleccionado) {
      const formData = new FormData(formRef.current);
      const data = {
        sku: productoSeleccionado.sku,
        marca: marcaSeleccionada ? marcaSeleccionada.nombre : productoSeleccionado.marca,
        descripcion: formData.get("descripcion") as string || productoSeleccionado.descripcion,
        rubro: formData.get("rubro") as string || productoSeleccionado.rubro,
      };
  
      try {
        setLoading(true);
        const response = await fetch(`${urlActualizarProducto}/${data.sku}`, {
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
            title: "Producto actualizado",
            text: `El producto con SKU "${data.sku}" se ha actualizado correctamente`,
          }).then(() => {
            if (formRef.current) {
              formRef.current.reset();
              setProductoSeleccionado(null); // Reiniciar el producto seleccionado
            }
          });
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: result.error || "Hubo un problema al actualizar el producto",
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

  const eliminarProducto = async () => {
    if (productoSeleccionado) {
      try {
        setLoading(true);
        const response = await fetch(`${urlEliminarProducto}/${productoSeleccionado.sku}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const result = await response.json();
  
        if (response.ok) {
          Swal.fire({
            icon: "success",
            title: "Producto eliminado",
            text: `El producto con SKU "${productoSeleccionado.sku}" se ha eliminado correctamente`,
          });
          if (formRef.current) {
            formRef.current.reset();
            setProductoSeleccionado(null);  // Reiniciar el producto seleccionado
          }
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: result.error || "Hubo un problema al eliminar el producto",
          });
        }
      } catch (error) {
        console.error("Error al eliminar el producto:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Hubo un problema al eliminar el producto",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    Swal.fire({
      title: `¿Quiere actualizar el producto con SKU "${productoSeleccionado?.sku}"?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, actualizar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        actualizarProducto();
      }
    });
  };

  const handleEliminarProducto = () => {
    Swal.fire({
      title: `¿Quiere eliminar el producto con SKU "${productoSeleccionado?.sku}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        eliminarProducto();
      }
    });
  };

  // Función para manejar el keydown y evitar el envío del formulario al presionar Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-lg shadow-lg shadow-gray-500 p-8 mx-auto mb-6"
        style={{ maxWidth: '600px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
        <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-500 font-bold">LOGO</span>
            </div>
        </div>
        <h2 className="text-2xl font-semibold text-gray-700 text-center mb-8">Actualizar Productos</h2>
        <form id="formProductos" className="space-y-6" onSubmit={handleFormSubmit} ref={formRef} onKeyDown={handleKeyDown}>
            <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
                    SKU:
                </label>
                <ListarProductos 
                    endpoint={urlProductos}  
                    onProductoSeleccionado={handleProductoSeleccionado} 
                    campos={["sku"]} 
                />
            </div>

            <div>
                <label htmlFor="marca" className="block text-sm font-medium text-gray-700 mb-1">Marca:</label>
                <ListarMarcas 
                    endpoint={urlListarMarcas}  
                    onMarcaSeleccionada={setMarcaSeleccionada} 
                    campos={["nombre"]} 
                />
            </div>

            <div>
                <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">Descripción:</label>
                <input type="text" id="descripcion" name="descripcion" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
            </div>

            <div>
                <label htmlFor="rubro" className="block text-sm font-medium text-gray-700 mb-1">Rubro:</label>
                <input type="text" id="rubro" name="rubro" required className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none" />
            </div>

            <div className="flex flex-col space-y-4">
                <button type="submit" id="botonActualizar" className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring focus:ring-blue-300">
                    {loading ? 'Cargando...' : 'Actualizar producto'}
                </button>
                <button type="button" id="botonEliminar" onClick={handleEliminarProducto} className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 focus:outline-none focus:ring focus:ring-red-300">
                    {loading ? 'Cargando...' : 'Eliminar producto'}
                </button>
            </div>
        </form>
        {loading && <Loader />}  {/* Mostrar el loader si loading es true */}
    </div>
);
}