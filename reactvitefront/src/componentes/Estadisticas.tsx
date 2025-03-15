// src/components/Estadisticas.tsx
import React from 'react';

export const Estadisticas: React.FC = () => {
  // Datos de ejemplo (puedes reemplazarlos con datos reales más adelante)
  const estadisticasLs = [
    {
      producto: 'Producto A',
      total_importado: 100,
      total_devuelto: 10,
      porcentaje_fallados: '10.00',
    },
    {
      producto: 'Producto B',
      total_importado: 200,
      total_devuelto: 20,
      porcentaje_fallados: '10.00',
    },
  ];

  const estadisticasTj = [
    {
      producto: 'Producto X',
      total_importado: 150,
      total_devuelto: 15,
      porcentaje_fallados: '10.00',
    },
    {
      producto: 'Producto Y',
      total_importado: 250,
      total_devuelto: 25,
      porcentaje_fallados: '10.00',
    },
  ];

  return (
    <div>
      {/* Tabla para Estadísticas LS */}
      <h1>Estadísticas de LS</h1>
      <table className="centered-table" id="tablaEstadisticasLs">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Total Importado</th>
            <th>Total Devuelto</th>
            <th>Porcentaje Fallados</th>
          </tr>
        </thead>
        <tbody>
          {estadisticasLs.length > 0 ? (
            estadisticasLs.map((estadistica, index) => (
              <tr key={index}>
                <td>{estadistica.producto}</td>
                <td>{estadistica.total_importado}</td>
                <td>{estadistica.total_devuelto}</td>
                <td>{estadistica.porcentaje_fallados}%</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No hay datos disponibles</td>
            </tr>
          )}
        </tbody>
      </table><br />
      <button id="descargarExcelLs">Descargar Excel LS</button>
          <br />
      {/* Tabla para Estadísticas TJ */}
      <h1>Estadísticas de TJ</h1>
      <table className="centered-table" id="tablaEstadisticasTj">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Total Importado</th>
            <th>Total Devuelto</th>
            <th>Porcentaje Fallados</th>
          </tr>
        </thead>
        <tbody>
          {estadisticasTj.length > 0 ? (
            estadisticasTj.map((estadistica, index) => (
              <tr key={index}>
                <td>{estadistica.producto}</td>
                <td>{estadistica.total_importado}</td>
                <td>{estadistica.total_devuelto}</td>
                <td>{estadistica.porcentaje_fallados}%</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No hay datos disponibles</td>
            </tr>
          )}
        </tbody>
      </table>
      <br />
      <button id="descargarExcelTj">Descargar Excel TJ</button>
    </div>
  );
};

 