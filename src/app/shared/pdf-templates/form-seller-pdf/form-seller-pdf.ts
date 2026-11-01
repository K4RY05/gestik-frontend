import {
  Component, ElementRef, EventEmitter, Input, OnChanges,
  Output, SimpleChanges, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-seller-pdf',
  standalone: true,
  imports: [CommonModule],
  styleUrl: './form-seller-pdf.css',
  templateUrl: './form-seller-pdf.html',
})
export class FormSellerPdf implements OnChanges {
  /** Resultado de registroForm.getRawValue() + totales */
  @Input() datos: any = null;
  @Input() empleados: { id: number; nombre: string }[] = [];
  /** Si es true, descarga el PDF apenas se abre la vista previa */
  @Input() autoDescargar = true;
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
    poliza: 'https://www.instalacion.makaymajo.com.mx/poliza.pdf',
  };

  private readonly tamanos: Record<string, string> = {
    '32-43': '32" - 43"',
    '49-55': '49" - 55"',
    '65-75': '65" - 75"',
    '85+': '85"+',
  };

  private readonly pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

  // ---------- Descarga automática al abrir ----------
  ngOnChanges(c: SimpleChanges): void {
    if (c['datos'] && this.datos && this.autoDescargar) {
      // espera a que Angular pinte la hoja
      setTimeout(() => this.descargar(), 400);
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

  tamano(v: string): string {
    return this.tamanos[v] ?? v;
  }

  hora(v: string): string {
    if (!v) return '';
    const [h, m] = v.split(':').map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  // ---------- Filas con importe ----------
  get servicios(): any[] {
    return (this.datos?.datosServicio ?? []).filter((f: any) => Number(f.total) > 0);
  }
  get materiales(): any[] {
    return (this.datos?.materiales ?? []).filter((f: any) => Number(f.total) > 0);
  }
  get soportes(): any[] {
    return (this.datos?.soportes ?? []).filter((f: any) => Number(f.total) > 0);
  }

  // ---------- Subtotales por sección ----------
  private suma(filas: any[]): number {
    return filas.reduce((s, f) => s + (Number(f.total) || 0), 0);
  }

  get totServicio() {
    const base = this.suma(this.servicios);
    const pct = Number(this.datos?.ivaServicio) || 0;
    return { pct, iva: base * pct / 100, total: base + base * pct / 100 };
  }
  get totMaterial() {
    const base = this.suma(this.materiales);
    const pct = Number(this.datos?.ivaMaterial) || 0;
    return { pct, iva: base * pct / 100, total: base + base * pct / 100 };
  }
  get totSoportes(): number {
    return this.suma(this.soportes);
  }

  // ---------- Nombres ----------
  private nombreDe(id: unknown): string {
    return this.empleados.find(e => String(e.id) === String(id))?.nombre ?? '';
  }

  get instaladoresTxt(): string {
    return (this.datos?.instaladores ?? [])
      .map((id: unknown) => this.nombreDe(id))
      .filter((x: string) => !!x && x !== 'Sin Asignar')
      .join(', ');
  }

  // ---------- Nombre del archivo: Folio_colonia_telefono ----------
  private limpio(v: unknown): string {
    return String(v ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  get nombreArchivo(): string {
    const d = this.datos ?? {};
    return [d.folio, d.colonia, d.telefono].map(x => this.limpio(x) || 'SN').join('_');
  }

  // ---------- Descargar PDF (siempre una sola hoja A4) ----------
  async descargar(): Promise<void> {
    if (this.descargando || !this.hoja) return;
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

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();   // 210
      const pageH = pdf.internal.pageSize.getHeight();  // 297

      // Ajuste proporcional para que todo quepa en una sola hoja
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const imgW = canvas.width * ratio;
      const imgH = canvas.height * ratio;
      const x = (pageW - imgW) / 2;

      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', x, 0, imgW, imgH);
      pdf.save(`${this.nombreArchivo}.pdf`);
    } finally {
      el.classList.remove('exportando');
      this.descargando = false;
    }
  }
}