// components/SweetAlertWrapper.tsx
import Swal, { SweetAlertOptions, SweetAlertResult } from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const ReactSwal = withReactContent(Swal);

//  1. Definimos tipos completos para la instancia
type ReactSwalInstance = typeof ReactSwal & {
  fire: (options: SweetAlertOptions) => Promise<SweetAlertResult>;
  close: () => void;
  getPopup: () => HTMLElement | null;
  getTitle: () => HTMLElement | null;
  getContent: () => HTMLElement | null;
  getConfirmButton: () => HTMLElement | null;
  getCancelButton: () => HTMLElement | null;
};

class SweetAlertWrapper {
  private static instance: SweetAlertWrapper;
  private swal: ReactSwalInstance;

  private constructor() {
    const defaultOptions = {
      showClass: {
        popup: 'swal2-show',
        backdrop: 'swal2-backdrop-show'
      },
      hideClass: {
        popup: 'swal2-hide',
        backdrop: 'swal2-backdrop-hide'
      }
    };

    // Solo aplica animaciones si no hay errores
    try {
      this.swal = ReactSwal.mixin({
        ...defaultOptions,
        showClass: {
          popup: 'animate-fadeIn',
          backdrop: 'animate-fadeIn'
        },
        hideClass: {
          popup: 'animate-fadeOut',
          backdrop: 'animate-fadeOut'
        }
      }) as ReactSwalInstance;
    } catch (error) {
      console.warn('Error al cargar animaciones, usando configuración básica');
      this.swal = ReactSwal.mixin(defaultOptions) as ReactSwalInstance;
    }
  }

  public static getInstance(): SweetAlertWrapper {
    if (!SweetAlertWrapper.instance) {
      SweetAlertWrapper.instance = new SweetAlertWrapper();
    }
    return SweetAlertWrapper.instance;
  }

  public fire(options: SweetAlertOptions): Promise<SweetAlertResult> {
    return this.swal.fire({
      customClass: {
        popup: 'animate-swal-shake !border !border-blue-500',
        title: 'text-lg font-bold',
        confirmButton: 'bg-blue-500 text-white hover:bg-blue-700',
        cancelButton: 'bg-gray-300 text-black hover:bg-gray-400',
        ...options?.customClass
      },
      buttonsStyling: true,
      ...options
    });
  }

  public close(): void {
    this.swal.close();
  }

  // Métodos predefinidos con animaciones específicas
  public success(title: string, text?: string, options?: SweetAlertOptions) {
    return this.fire({
      icon: 'success',
      title,
      text,
      customClass: {
        popup: 'animate-swal-shake !border !border-blue-500',
        ...options?.customClass
      },
      ...options
    });
  }

  public error(title: string, text?: string, options?: SweetAlertOptions) {
    return this.fire({
      icon: 'error',
      title,
      text,
      customClass: {
        popup: 'animate-swal-shake !border !border-red-500',
        ...options?.customClass
      },
      ...options
    });
  }

  public warning(title: string, text?: string, options?: SweetAlertOptions) {
    return this.fire({
      icon: 'warning',
      title,
      text,
      customClass: {
        popup: 'animate-swal-shake !border !border-red-500',
        ...options?.customClass
      },
      ...options
    });
  }

  // Dentro de la clase SweetAlertWrapper
  public confirm(
    message: string,
    onConfirm: () => void,
    title: string = "¿Estás seguro?",
    confirmButtonText: string = "Sí, registrar",
    cancelButtonText: string = "Cancelar"
  ) {
    return this.fire({
      title,
      text: message,
      icon: "question",
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText,
      reverseButtons: true,
      customClass: {
        popup: "animate-swal-shake !border !border-blue-500",
        confirmButton: "bg-green-500 text-white hover:bg-green-700",
        cancelButton: "bg-gray-300 text-black hover:bg-gray-400",
      }
    }).then((result) => {
      if (result.isConfirmed) {
        onConfirm();
      }
    });
  }

  public info(title: string, text?: string, options?: SweetAlertOptions) {


    return this.fire({

      icon: 'info',
      title,
      text,
      customClass: {
        popup: 'animate-swal-shake !border !border-blue-500',
        ...options?.customClass
      },
      ...options
    });
  }
}

// 3. Exportamos una instancia única (Singleton)
export const sweetAlert = SweetAlertWrapper.getInstance();