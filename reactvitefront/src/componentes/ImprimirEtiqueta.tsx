import React, { useState, useRef } from 'react';
import Swal from 'sweetalert2';
import { BusquedaClientes } from './utilidades/BusquedaClientes';
import Loader from './utilidades/Loader';
import { jsPDF } from 'jspdf';

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

export const ImprimirEtiqueta = () => {
  const [loading, setLoading] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [cantidadBultos, setCantidadBultos] = useState<number | null>(null);
  const [mostrarInput, setMostrarInput] = useState(false);
  const [paginaHorizontal, setPaginaHorizontal] = useState(false); // Estado para manejar el tamaño de página
  const formRef = useRef<HTMLFormElement>(null);

  let urlListarClientes = 'https://rmareactvite2.onrender.com/listarCliente';
  let urlBuscarRMA = 'https://rmareactvite2.onrender.com/buscarRMA';

  if (window.location.hostname === 'localhost') {
    urlListarClientes = 'http://localhost:8080/listarCliente';
    urlBuscarRMA = 'http://localhost:8080/buscarRMA';
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clienteSeleccionado) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Por favor, seleccione un cliente antes de generar la etiqueta.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${urlBuscarRMA}?idCliente=${clienteSeleccionado.id}`);
      const data = await response.json();
      
      if (response.ok) {
        const rmaPendiente = data.some((rma: any) => !rma.nEgreso || rma.nEgreso === null);

        if (rmaPendiente) {
          Swal.fire({
            icon: 'warning',
            title: 'RMA Pendiente',
            text: `El cliente "${clienteSeleccionado.nombre}" tiene RMA pendiente de entrega.`,
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Generar etiqueta',
            text: `No hay RMA pendiente para el cliente "${clienteSeleccionado.nombre}".`,
          });
        }
        setMostrarInput(true);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error || 'Hubo un problema al buscar en la tabla RMA.',
        });
      }
    } catch (error) {
      console.error('Error al buscar en la tabla RMA:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Hubo un problema al buscar en la tabla RMA.',
      });
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = () => {
    if (!clienteSeleccionado || cantidadBultos === null || cantidadBultos <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ingrese una cantidad de bultos válida.',
      });
      return;
    }
  
    // Crear documento PDF con orientación y tamaño ajustados según la variable `paginaHorizontal`
    const doc = new jsPDF(paginaHorizontal ? 'landscape' : 'p', 'mm', paginaHorizontal ? [210, 150] : [190, 100]);
  
    // Margen superior de 6 cm (aproximadamente 60 mm)
    const marginTop = 40;
  
    // Tamaño de la fuente ajustado según la orientación
    const fontSize = paginaHorizontal ? 12 : 16;
  
   
  
    // Agregar más páginas si la cantidad de bultos es mayor a 1
    for (let i = 1; i < (cantidadBultos + 1); i++) {
       // Establecer fuente y tamaño para el nombre del cliente (centrado)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    doc.text(`${clienteSeleccionado.nombre}`, doc.internal.pageSize.getWidth() / 2, marginTop, { align: "center" });
  
    // Establecer fuente normal para el resto de los datos
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const lineHeight = 1;
  
    // Agregar los datos del cliente
    doc.text(`Domicilio: ${clienteSeleccionado.domicilio}`, 20, marginTop + 10 + lineHeight);
    doc.text(`Ciudad: ${clienteSeleccionado.ciudad}, ${clienteSeleccionado.provincia}`, 20, marginTop + 20 + lineHeight);
    doc.text(`Teléfono: ${clienteSeleccionado.telefono}`, 20, marginTop + 30 + lineHeight);
    doc.text(`Transporte: ${clienteSeleccionado.transporte}`, 20, marginTop + 40 + lineHeight);
    doc.text(`Seguro: ${clienteSeleccionado.seguro}`, 20, marginTop + 50 + lineHeight);
    doc.text(`Entrega a ${clienteSeleccionado.condicionDeEntrega}`, 20, marginTop + 60 + lineHeight);
    doc.text(`Pago en ${clienteSeleccionado.condicionDePago}`, 20, marginTop + 70 + lineHeight);
  
    // Datos del remitente
    doc.text(`Rte: Femex S.A.`, 20, marginTop + 80 + lineHeight);
    doc.text(`CUIT: 30-71130830-6`, 20, marginTop + 90 + lineHeight);
    doc.text(`Domicilio: Duarte Quirós 4105`, 20, marginTop + 100 + lineHeight);
    doc.text(`Provincia: Córdoba`, 20, marginTop + 110 + lineHeight);
    doc.text(`Ciudad: Córdoba`, 20, marginTop + 120 + lineHeight);
    doc.text(`Teléfono: 351 8509718`, 20, marginTop + 130 + lineHeight);
  
    // Calculamos la posición X para centrar el texto en el pie de página
    const pageWidth = doc.internal.pageSize.getWidth(); // Ancho de la página
    const text = `Bulto ${i} de ${cantidadBultos}`;
    const textWidth = doc.getTextWidth(text); // Obtiene el ancho del texto
    const xPosition = ((pageWidth - textWidth) / 2) -1; // Calcula la posición X para centrar el texto
  
    // Agregar el texto del pie de página
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(text, xPosition, marginTop + 140); // Coloca el texto centrado en el pie de página
      if (i < cantidadBultos) doc.addPage(); // Añadir una nueva página
    }
  
    // Mostrar el PDF en una nueva ventana
    doc.output('dataurlnewwindow');
  };
     

  return (
    <div className='w-full max-w-xl bg-white rounded-lg shadow-lg p-8 mx-auto mb-6'>
      <h2 className='text-2xl font-semibold text-gray-700 mb-8 text-center'>
        Imprimir etiqueta
      </h2>
      <form id='formEtiqueta' className='space-y-6' onSubmit={handleSubmit} ref={formRef}>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            Cliente
          </label>
          <BusquedaClientes endpoint={urlListarClientes} onClienteSeleccionado={setClienteSeleccionado} campos={['nombre']} />
        </div>
        <button type='submit' className='w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg'>
          {loading ? 'Cargando...' : 'Verificar RMA'}
        </button>
      </form>
      {loading && <Loader />}
      {mostrarInput && (
        <div>
        <div className='mt-4 flex space-x-4'>
          <div className='flex-1'>
            {/*<label className='block text-sm font-medium text-gray-700 mb-1'>Cantidad de Bultos</label>*/}
            <input
              placeholder='Cantidad de bultos'
              type='number'
              className='w-full px-4 py-2 border border-gray-300 rounded-lg'
              value={cantidadBultos || ''}
              onChange={(e) => setCantidadBultos(Number(e.target.value))}
            />
          </div>


          <div>
            
          <button
            type="button"
            onClick={() => setPaginaHorizontal(!paginaHorizontal)}
            className="w-full py-2 px-4 bg-gray-600 text-white font-semibold rounded-lg"
            >
            En construcción
          </button>

          </div>
          

        </div>
          <button
            onClick={generarPDF}
            className='mt-2 w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg'>
            Generar etiquetas 
          </button>
        </div>
      )}
    </div>
  );
};

