import { Injectable } from '@angular/core';

/** Genera el PDF con la impresión nativa del navegador (sin librerías). */
@Injectable({ providedIn: 'root' })
export class PdfService {

  /** Texto limpio para nombre de archivo: sin acentos, espacios ni símbolos. */
  private limpiar(t: unknown, vacio: string): string {
    const s = String(t ?? '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || vacio;
  }

  /** El folio "(New)" aún no es un folio real. */
  esFolioReal(folio: unknown): boolean {
    const f = String(folio ?? '').trim();
    return !!f && !/new/i.test(f);
  }

  /** Folio_colonia_telefono.pdf */
  nombreArchivo(folio: unknown, colonia: unknown, telefono: unknown): string {
    const f = this.esFolioReal(folio) ? folio : '';
    return `${this.limpiar(f, 'SinFolio')}_${this.limpiar(colonia, 'SinColonia')}_${this.limpiar(telefono, 'SinTelefono')}.pdf`;
  }

  /**
   * Imprime solo la hoja (en un iframe oculto) con el nombre del archivo como título,
   * para que el diálogo "Guardar como PDF" lo proponga.
   */
  async descargar(el: HTMLElement, nombre: string): Promise<void> {
    const titulo = nombre.replace(/\.pdf$/i, '');   // ya viene sin caracteres raros
    document.getElementById('pdf-frame')?.remove();

    // Copia los estilos de la app (los del componente incluidos) al iframe
    const estilos = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(n => n.outerHTML).join('\n');

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>${titulo}</title>
${estilos}
<style>
  @page { size: letter; margin: .45in .45in .55in; }
  html, body { margin: 0; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hoja { width: 100% !important; }
</style></head><body>${el.outerHTML}</body></html>`;

    const tituloOriginal = document.title;
    const iframe = document.createElement('iframe');
    iframe.id = 'pdf-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';

    await new Promise<void>(resolve => {
      iframe.onload = () => {
        const w = iframe.contentWindow!;
        const limpiarTodo = () => { document.title = tituloOriginal; iframe.remove(); };
        w.onafterprint = limpiarTodo;
        setTimeout(limpiarTodo, 120000);   // por si el navegador no avisa
        document.title = titulo;           // Chrome toma el título de la página como nombre
        w.focus();
        w.print();
        resolve();
      };
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
    });
  }
}