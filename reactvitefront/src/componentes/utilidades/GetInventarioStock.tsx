// useInventarioLoader.ts
import { useState, useEffect } from "react";
import { StockManager } from "./StockManager"; // Asegúrate de tener esta importación

interface Producto {
  id: number;
  sku: string;
  idBloque: string;
  cantSistemaFemex: number;
  cantSistemaBlow: number;
  conteoFisico: number | null;
  fechaConteo: string | null;
  observacion: string | null;
}

interface InventarioLoaderResult {
  productos: Producto[];
  bloques: string[];
  loading: boolean;
  error: Error | null;
  setProductos: React.Dispatch<React.SetStateAction<Producto[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const GetInventarioStock = (urlPrepararInventario: string): InventarioLoaderResult => {
  const [stockManager] = useState(() => new StockManager());
  const [productos, setProductos] = useState<Producto[]>([]);
  const [bloques, setBloques] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch(urlPrepararInventario);
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data: Producto[] = await response.json();
        const productosConConteoInicial = data.map(p => ({
          ...p,
          conteoFisico: p.conteoFisico ?? 0
        }));
        
        setProductos(productosConConteoInicial);
        stockManager.cargarProductos(productosConConteoInicial);
        
        // Obtener bloques únicos incluyendo "No asignado"
        const bloquesUnicos = [
          ...new Set(data.map(p => p.idBloque || "No asignado"))
        ].sort();
        
        setBloques(bloquesUnicos);
        setError(null);
      } catch (err) {
        console.error("Error al cargar productos:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();

    // Cleanup opcional si es necesario
    return () => {
      // Código de limpieza si StockManager necesita ser limpiado
    };
  }, [urlPrepararInventario]);

  return { productos, setProductos, bloques, loading, setLoading, error };
};