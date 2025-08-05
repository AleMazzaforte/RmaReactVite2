// Importaciones necesarias desde React y otros componentes del proyecto
import React, { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { FlechasNavigator } from './FlechasNavigator'; // Componente para navegar los resultados con flechas
import Loader from './Loader'; // Componente de carga/spinner
import { Debounce } from './Debounce'; // Función utilitaria para hacer debounce
import Swal from 'sweetalert2'; // Librería para mostrar alertas bonitas


let urlListartransporte = "https://rma-back.vercel.app/buscarTransporte";

if (window.location.hostname === "localhost") {
  urlListartransporte = "http://localhost:8080/buscarTransporte";
}



// Definición de la estructura del objeto Transporte
interface Transporte {
  idTransporte: string;
  nombre: string;
}

// Definición de la estructura del objeto Cliente
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

// Props que recibe el componente BusquedaClientes
interface BusquedaClientesProps {
  endpoint: string; // Ruta del servidor para buscar clientes
  onClienteSeleccionado: (cliente: Cliente) => void; // Callback cuando se selecciona un cliente
  campos: string[]; // Campos a mostrar en los resultados
  value?: string; // Valor inicial opcional del input
  inputRef?: React.RefObject<HTMLInputElement>; // Referencia externa opcional al input
}



// Componente funcional BusquedaClientes
export const BusquedaClientes: React.FC<BusquedaClientesProps> = ({
  endpoint,
  onClienteSeleccionado,
  campos,
  value = '',
  inputRef,
}) => {
  // Estado del valor del input
  const [query, setQuery] = useState<string>(value);

  // Estado para almacenar los resultados obtenidos de la búsqueda
  const [resultados, setResultados] = useState<any[]>([]);

  // Estado para guardar los transportes
  const [transportes, setTransportes] = useState<Transporte[]>([]);

  // Estado que indica si está cargando la búsqueda
  const [loading, setLoading] = useState<boolean>(false);

  // Si no se pasa una referencia al input, se crea una local
  const localInputRef = inputRef || useRef<HTMLInputElement>(null);

  const [mensaje, setMensaje] = useState<string>('');

  //Limpia el mensaje de no hay coincidencia
  useEffect(() => {
  const handleClickFuera = () => {
    setMensaje('');
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setMensaje('');
    }
  };

  document.addEventListener('mousedown', handleClickFuera);
  document.addEventListener('keyup', handleKeyUp);
  // Limpieza del evento al desmontar el componente
  return () => {
    document.removeEventListener('mousedown', handleClickFuera);
    document.removeEventListener('keyup', handleKeyUp);
  };
}, []);



  // Sincroniza el estado interno del input con la prop externa `value`
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Al montar el componente, se buscan los transportes disponibles
  useEffect(() => {
    const fetchTransportes = async () => {
      try {
        const res = await fetch(`${urlListartransporte}`);
        const data = await res.json();
        setTransportes(data); // Guardamos los transportes
      } catch (err) {
        console.error('Error cargando transportes', err);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Error cargando transportes"
        });
      }
    };

    fetchTransportes();
  }, []);

  // Función asincrónica para buscar clientes desde el servidor
  const buscarClientes = React.useCallback(async (value: string) => {
    setMensaje("");
    try {
      setLoading(true);
      const response = await fetch(`${endpoint}?query=${value}`); // Realiza la petición al servidor

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json(); // Parseo de la respuesta

      // Filtra los resultados para que coincidan con el nombre buscado (insensible a mayúsculas)
      if (Array.isArray(data)) {
  let resultadosFiltrados = data.filter((cliente: Cliente) =>
    cliente?.nombre?.toLowerCase().includes(value.toLowerCase())
  );

  if (resultadosFiltrados.length === 0) {
    setMensaje('No hay coincidencia');
  } else {
    setMensaje('');
  }

  setResultados(resultadosFiltrados);
} else {
  setResultados([]);
  setMensaje('No hay coincidencia');
}

    } catch (error) {
      console.error('Error buscando clientes:', error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error buscando clientes"
      });
      setResultados([]); // Limpia resultados si ocurre error
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // Aplica debounce para evitar hacer peticiones con cada tecla presionada
  const debouncedBuscarClientes = useMemo(() =>
    Debounce((value: string) => buscarClientes(value), 800), // Espera 800ms antes de hacer la búsqueda
    [buscarClientes]
  );

  // Maneja el evento de cambio del input (cuando el usuario escribe)
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value); // Actualiza el estado del input

    // Si hay texto, inicia búsqueda con debounce; si no, limpia resultados
    if (value.trim()) {
      debouncedBuscarClientes(value);
    } else {
      setResultados([]);
    }
  };



  // Maneja la selección de un cliente en los resultados
  const handleClienteSeleccionado = (cliente: Cliente) => {
    // Buscar el nombre del transporte a partir del ID
    const transporteEncontrado = transportes.find(
      (t) => t.idTransporte == cliente.transporte
    );


    // Si se encuentra el nombre, reemplazamos el ID por el nombre
    const clienteConNombreTransporte = {
      ...cliente,
      transporte: transporteEncontrado ? transporteEncontrado.nombre : cliente.transporte,
    };

    if (cliente) {

      onClienteSeleccionado(clienteConNombreTransporte); // Ejecuta el callback con el cliente seleccionado
      setResultados([]); // Limpia los resultados mostrados
      setQuery(cliente.nombre); // Coloca el nombre del cliente en el input

      // Mueve el foco al siguiente elemento del input si existe
      if (localInputRef.current?.nextElementSibling) {
        (localInputRef.current.nextElementSibling as HTMLElement).focus();
      }
    }
  };

  // Render del componente
  return (
    <div>
      {/* Campo de búsqueda */}
      <input
        autoComplete='off'
        type="text"
        ref={localInputRef}
        value={query}
        onChange={handleInputChange}
        placeholder="Buscar cliente"
        className="block w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:ring focus:ring-blue-300 focus:outline-none"
      />
      {mensaje && <div  className="mt-2 bg-white px-4 py-2  border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">{mensaje}</div>}
      {/* Muestra loader mientras carga o los resultados si ya están listos */}
      {loading ? <Loader /> : (
        <FlechasNavigator
          resultados={resultados}
          onSeleccionado={handleClienteSeleccionado}
          campos={campos}
        />
      )}
    </div>
  );
};
