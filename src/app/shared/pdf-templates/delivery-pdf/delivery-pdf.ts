import {
  Component, ElementRef, EventEmitter, Input, OnChanges,
  Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SucursalPdf {
  nombre: string;
  direccion?: string;
  telefono?: string;
}

@Component({
  selector: 'app-delivery-pdf',
  imports: [CommonModule],
  styleUrl: './delivery-pdf.css',
  templateUrl: './delivery-pdf.html',
})
export class DeliveryPdf implements OnChanges {
  /** Resultado de registroForm.getRawValue() + totales */
  @Input() datos: any = null;
  @Input() empleados: { id: number; nombre: string }[] = [];
  /** Mismo catálogo que usa el formulario (nombre, direccion, telefono) */
  @Input() sucursales: SucursalPdf[] = [];

  /** true → descarga el PDF apenas se abre la vista previa */
  @Input() autoDescargar = false;

  /** true → solo visualizador, sin botón de descarga ni descarga automática */
  @Input() soloVista = false;

  /** Los precios ya incluyen IVA: solo se desglosa */
  @Input() tasaIva = 16;

  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('hoja') hoja!: ElementRef<HTMLElement>;

  descargando = false;

  readonly contacto = {
    telefono: '(55) 5980 3333',
    telHref: 'tel:+525559803333',
    email: 'contacto@makaymajo.com.mx',
    mailHref: 'mailto:contacto@makaymajo.com.mx',
    web: 'www.instalacion.makaymajo.com.mx',
    webHref: 'https://www.instalacion.makaymajo.com.mx',
  };

  private readonly pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // ---------- Descarga automática al abrir ----------
  ngOnChanges(c: SimpleChanges): void {
    if (c['datos'] && this.datos && this.autoDescargar && !this.soloVista) {
      setTimeout(() => this.descargar(), 400); // espera a que Angular pinte la hoja
    }
  }

  // ---------- Formato ----------
  mx(v: unknown): string {
    return this.pesos.format(Number(v) || 0);
  }

  /** Muestra un guion cuando el importe es cero */
  mxGuion(v: unknown): string {
    return Number(v) ? this.mx(v) : '—';
  }

  importe(f: any): number {
    return (Number(f?.cantidad) || 0) * (Number(f?.precio) || 0);
  }

  // ---------- Tipo de entrega ----------
  private get tipoNorm(): string {
    return String(this.datos?.tipoEntrega ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  get esSucursal(): boolean {
    return this.tipoNorm.includes('sucursal');
  }

  get requiereDomicilio(): boolean {
    return this.tipoNorm.includes('domicilio') || this.tipoNorm.includes('envio');
  }

  get tituloDireccion(): string {
    return this.tipoNorm.includes('envio') ? 'DIRECCIÓN DE ENVÍO' : 'DIRECCIÓN DE ENTREGA';
  }

  get tipoTxt(): string {
    if (this.esSucursal) return 'Recoge en sucursal';
    if (this.tipoNorm.includes('envio')) return 'Envío';
    if (this.tipoNorm.includes('domicilio')) return 'Entrega a domicilio';
    return this.datos?.tipoEntrega ?? '';
  }

  // ---------- Filas con producto ----------
  get productos(): any[] {
    return (this.datos?.productos ?? []).filter(
      (f: any) => String(f.descripcion ?? '').trim() && Number(f.cantidad) > 0,
    );
  }

  // ---------- Sucursales ----------
  sucursal(nombre: string): SucursalPdf | null {
    if (!nombre) return null;
    return this.sucursales.find(s => s.nombre === nombre) ?? { nombre };
  }

  get sucSalida(): SucursalPdf | null {
    return this.sucursal(this.datos?.sucursalSalida);
  }

  get sucEntrega(): SucursalPdf | null {
    return this.sucursal(this.datos?.sucursalEntrega);
  }

  // ---------- Vendedor ----------
  get vendedorTxt(): string {
    return this.empleados.find(e => String(e.id) === String(this.datos?.vendedor))?.nombre ?? '';
  }

  // ---------- Nombre del archivo: Folio_colonia(o sucursal)_telefono ----------
  private limpio(v: unknown): string {
    return String(v ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  get nombreArchivo(): string {
    const d = this.datos ?? {};
    const lugar = this.requiereDomicilio ? d.colonia : d.sucursalEntrega;
    return [d.folio, lugar, d.telefono].map(x => this.limpio(x) || 'SN').join('_');
  }

  // ---------- Paginación ----------
  /**
   * Mide dónde se puede cortar la hoja sin partir una fila ni separar un título de su contenido.
   * El bloque de cierre (totales, firmas y contacto) no se parte: solo se puede cortar antes de él.
   */
  private medir(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const arriba = (e: Element) => e.getBoundingClientRect().top - rect.top;
    const abajo = (e: Element) => e.getBoundingClientRect().bottom - rect.top;

    const cortes: number[] = [];
    el.querySelectorAll('.barra, .cierre').forEach(e => cortes.push(arriba(e)));
    const cierre = el.querySelector('.cierre');

    const tablas: { theadTop: number; theadBottom: number; fin: number }[] = [];
    el.querySelectorAll('table').forEach(t => {
      const th = t.querySelector('thead');
      // La primera fila no es punto de corte: dejaría el encabezado de la tabla solo al final de la hoja
      Array.from(t.querySelectorAll('tbody tr')).slice(1).forEach(r => cortes.push(arriba(r)));
      if (th) tablas.push({ theadTop: arriba(th), theadBottom: abajo(th), fin: abajo(t) });
    });

    return {
      ancho: rect.width,
      alto: rect.height,
      cierreTop: cierre ? arriba(cierre) : rect.height,
      cortes: cortes.sort((a, b) => a - b),
      tablas,
    };
  }

  // ---------- Descargar PDF (A4; si no cabe en una hoja, continúa en las siguientes) ----------
  async descargar(): Promise<void> {
    if (this.soloVista || this.descargando || !this.hoja) return;
    this.descargando = true;

    const el = this.hoja.nativeElement;
    el.classList.add('exportando');

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
      });

      const m = this.medir(el);
      const k = canvas.width / m.ancho;          // píxeles del canvas por píxel de pantalla
      const mmPorPx = 210 / m.ancho;             // milímetros por píxel de pantalla
      const altoA4 = 297 / mmPorPx;              // alto de una hoja A4 en píxeles de pantalla
      const margenSup = 12 / mmPorPx;            // espacio para el rótulo en hojas 2, 3...
      const margenInf = 10 / mmPorPx;

      // --- Reparte el contenido en hojas ---
      type Hoja = { desde: number; hasta: number; cab: { theadTop: number; theadBottom: number } | null };
      const hojas: Hoja[] = [];
      let inicio: number = 0;
      let cab: Hoja['cab'] = null;

      while (true) {
        const extra: number = cab ? cab.theadBottom - cab.theadTop : 0;
        const util: number = altoA4 - (hojas.length ? margenSup : 0) - margenInf - extra;

        // Una hoja completa (ya con el cierre al fondo) cabe en una A4 sin márgenes de paginación
        const cabeEntera = !hojas.length && m.alto <= altoA4 + 1;
        if (cabeEntera || m.alto - inicio <= util) {
          hojas.push({ desde: inicio, hasta: m.alto, cab });
          break;
        }

        const limite: number = inicio + util;
        const posibles: number[] = m.cortes.filter((c: number) => c > inicio + 40 && c <= limite);
        const corte: number = posibles.length ? posibles[posibles.length - 1] : limite;

        hojas.push({ desde: inicio, hasta: corte, cab });
        // Si el corte cae dentro de una tabla, la hoja siguiente repite su encabezado
        cab = m.tablas.find(t => corte > t.theadBottom && corte < t.fin) ?? null;
        inicio = corte;
      }

      // --- Dibuja cada hoja ---
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const total = hojas.length;

      /** Recorta del canvas la franja [desde, hasta] (px de pantalla), con el encabezado de tabla opcional arriba. */
      const franja = (desde: number, hasta: number, c: Hoja['cab']) => {
        const ch = c ? Math.round((c.theadBottom - c.theadTop) * k) : 0;
        const sy = Math.round(desde * k);
        const sh = Math.max(1, Math.round((hasta - desde) * k));
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = sh + ch;
        const ctx = tmp.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, tmp.width, tmp.height);
        if (c) ctx.drawImage(canvas, 0, Math.round(c.theadTop * k), canvas.width, ch, 0, 0, canvas.width, ch);
        ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, ch, canvas.width, sh);
        return { url: tmp.toDataURL('image/jpeg', 0.98), mm: (tmp.height / k) * mmPorPx };
      };

      hojas.forEach((h, idx) => {
        if (idx > 0) pdf.addPage('a4', 'portrait');
        const y = idx === 0 ? 0 : 12;
        const ultima = idx === total - 1;

        if (ultima && total > 1 && m.cierreTop > h.desde + 1 && m.cierreTop < h.hasta) {
          // Última hoja de un documento largo: el cierre va al fondo y el espacio sobrante queda debajo de los productos
          const cuerpo = franja(h.desde, m.cierreTop, h.cab);
          const pie = franja(m.cierreTop, h.hasta, null);
          pdf.addImage(cuerpo.url, 'JPEG', 0, y, 210, cuerpo.mm);
          pdf.addImage(pie.url, 'JPEG', 0, 287 - pie.mm, 210, pie.mm);
        } else {
          const f = franja(h.desde, h.hasta, h.cab);
          pdf.addImage(f.url, 'JPEG', 0, y, 210, f.mm);
        }

        if (total > 1) {
          pdf.setFontSize(8);
          pdf.setTextColor(91, 104, 120);
          if (idx > 0) {
            pdf.text(`Formato de entrega · Folio ${this.datos?.folio ?? ''}`, 14, 8);
            pdf.text(`${this.datos?.nombre ?? ''}`, 196, 8, { align: 'right' });
          }
          pdf.text(`Hoja ${idx + 1} de ${total}`, 196, 292, { align: 'right' });
        }
      });

      pdf.save(`${this.nombreArchivo}.pdf`);
    } finally {
      el.classList.remove('exportando');
      this.descargando = false;
    }
  }
}