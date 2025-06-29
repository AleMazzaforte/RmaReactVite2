// utilidades/StockManager.ts
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


export class StockManager {
  private productos: Producto[] = [];

  cargarProductos(productos: Producto[]) {
    this.productos = productos;
  }

  actualizarConteoFisico(id: number, conteoFisico: number | null) {
    const producto = this.productos.find(p => p.id === id);
    if (producto) {
      producto.conteoFisico = conteoFisico;
      producto.fechaConteo = conteoFisico !== null ? new Date().toISOString() : null;
    }
  }

  getProductos(): Producto[] {
    return this.productos;
  }

  getProductosPorBloque(idBloque: string): Producto[] {
    return this.productos.filter(p => p.idBloque === idBloque);
  }

  getDiferenciaTotal(): number {
    return this.productos.reduce((total, producto) => {
      const totalSistema = producto.cantSistemaFemex + producto.cantSistemaBlow;
      return total + (producto.conteoFisico !== null ? producto.conteoFisico - totalSistema : 0);
    }, 0);
  }
}