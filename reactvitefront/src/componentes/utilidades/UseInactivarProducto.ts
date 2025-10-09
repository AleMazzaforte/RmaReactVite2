import { useState } from "react";
import { sweetAlert } from "./SweetAlertWrapper";
import Urls from "./Urls";

export const UseInactivarProducto = (
  onProductoInactivado: (sku: string) => void
) => {
  const [loading, setLoading] = useState(false);

  const inactivarProducto = async (sku: string) => {
    const { isConfirmed } = await sweetAlert.fire({
      title: "¿Inactivar producto?",
      text: `¿Estás seguro de que deseas inactivar el producto con SKU ${sku}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, inactivar",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    setLoading(true);
    try {
      const response = await fetch(Urls.productos.inactivar, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });

      if (!response.ok) throw new Error("Error al inactivar el producto");

      sweetAlert.success("Producto inactivado", `El SKU ${sku} ha sido inactivado.`);
      onProductoInactivado(sku); // Notifica al componente padre
    } catch (error) {
      console.error("Error al inactivar producto:", error);
      sweetAlert.error("Error", "No se pudo inactivar el producto.");
    } finally {
      setLoading(false);
    }
  };

  return { inactivarProducto, loading };
};