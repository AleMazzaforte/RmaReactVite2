// FiltrosInventario.tsx
import React from "react";

interface FiltrosInventarioProps {
  filtro: string;
  setFiltro: (value: string) => void;
  skuABuscar: string;
  setSkuABuscar: (value: string) => void;
  handleBuscarSku: () => void;
  bloqueSeleccionado: string;
  setBloqueSeleccionado: (value: string) => void;
  bloques: string[];
}

export const FiltrosInventario: React.FC<FiltrosInventarioProps> = ({
  filtro,
  setFiltro,
  skuABuscar,
  setSkuABuscar,
  handleBuscarSku,
  bloqueSeleccionado,
  setBloqueSeleccionado,
  bloques,
}) => {
  return (
    <>
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Filtrar SKU
        </label>
        <input
          type="text"
          placeholder="Ej: EP504 N PI 130ML"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Buscar SKU
        </label>
        <div className="flex">
          <input
            type="text"
            placeholder="Ej: EP504 N PI 130ML"
            value={skuABuscar}
            onChange={(e) => setSkuABuscar(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscarSku()}
            className="flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={handleBuscarSku}
            className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bloque
        </label>
        <select
          value={bloqueSeleccionado}
          onChange={(e) => setBloqueSeleccionado(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todos los bloques</option>
          {bloques.map((bloque) => (
            <option key={bloque} value={bloque}>
              {bloque}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};