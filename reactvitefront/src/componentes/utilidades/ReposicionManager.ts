// utilidades/ReposicionManager.ts
import { sweetAlert } from "./SweetAlertWrapper";
import Urls from "./Urls";

// Tipos
export interface ProductoReposicion {
  sku: string;
  cantidad: number;
}

// 1. Guardar toda la lista de reposición (usado en el botón "Guardar Reposición")
export const guardarReposicionCompleta = async (
  productosReposicion: ProductoReposicion[],
  setProductosReposicion: React.Dispatch<
    React.SetStateAction<ProductoReposicion[]>
  >,
  setLoading: (loading: boolean) => void,
  cargarReposiciones: () => Promise<void>
) => {
  if (productosReposicion.length === 0) {
    sweetAlert.warning("Reposición vacía", "No hay productos para guardar");
    return;
  }

  setLoading(true);
  try {
    const response = await fetch(Urls.reposicion.guardar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productos: productosReposicion,
        fecha: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error("Error al guardar la reposición");

    const result = await response.json();
    sweetAlert.success(
      "Reposición guardada",
      `Se guardaron ${productosReposicion.length} productos correctamente`
    );

    setProductosReposicion([]);
    await cargarReposiciones();
  } catch (error) {
    console.error("Error al guardar reposición:", error);
    sweetAlert.error("Error", "No se pudo guardar la reposición");
  } finally {
    setLoading(false);
  }
};

// 2. Actualizar un solo producto de reposición (usado desde la calculadora)
export const actualizarProductoReposicion = async (
  sku: string,
  nuevaCantidad: number,
  setProductosReposicion: React.Dispatch<
    React.SetStateAction<ProductoReposicion[]>
  >,
  setLoading: (loading: boolean) => void
) => {
  setLoading(true);
  try {
    const response = await fetch(Urls.reposicion.guardar, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productos: [{ sku, cantidad: nuevaCantidad }],
        fecha: new Date().toISOString(),
      }),
    });

    if (!response.ok) throw new Error("Error al actualizar la reposición");

    setProductosReposicion((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, cantidad: nuevaCantidad } : p))
    );

    sweetAlert.success(
      "Reposición actualizada",
      `SKU ${sku} actualizado correctamente`
    );

    return true; // ✅ ¡Agrega esto al final del try!
  } catch (error) {
    console.error("Error al actualizar producto en reposición:", error);
    sweetAlert.error("Error", "No se pudo actualizar el producto");
    throw error; // Esto hará que la promesa sea rechazada
  } finally {
    setLoading(false);
  }
};
