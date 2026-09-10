// mlTypes.ts — Tipos compartidos para MercadoLibre

export interface OrderItem {
    sku: string;
    quantity: number;
    description: string;
    codigoBarras: string | null;
    codigosBarrasComponentes?: string[];
}

export interface Order {
    numeroOperacion: string;
    buyer_nickname: string;
    seller_nickname: string;
    date_created: string;
    etiqueta_impresa: boolean;
    tipo_envio: string;
    items: OrderItem[];
    buyer_full_name?: string;
    shipping_status?: string;
}

export interface ItemVerificacion {
    sku: string;
    codigoBarras: string | null;
    quantity: number;
    esComponenteKit: boolean;
    skuKitOriginal?: string;
    descripcion?: string;
}

export interface KitInfo {
    id: number;
    componentes: Array<{
        idSku: number;
        sku: string;
        cantidad: number;
        codigoBarras: string | null;
        descripcion?: string | null;
    }>;
}

export interface ApiResponse {
    success: boolean;
    message: string;
    data?: Order[];
    kits?: Record<string, KitInfo>;
}
