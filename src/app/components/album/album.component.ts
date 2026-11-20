import { Component, OnInit } from '@angular/core';

interface Foto {
  public_id: string;
  secure_url: string;
  created_at?: string;
}

@Component({
  selector: 'app-album',
  templateUrl: './album.component.html',
  styleUrls: ['./album.component.scss']
})
export class AlbumComponent implements OnInit {

  fotos: Foto[] = [];
  fotoSeleccionada: Foto | null = null;

  cargando = true;
  error = false;
  filtro: 'todas' | 'recientes' = 'todas';

  ngOnInit(): void {
    this.obtenerFotos();
  }

  async obtenerFotos(): Promise<void> {
    this.cargando = true;
    this.error = false;

    try {
      const respuesta = await fetch('/api/fotos');

      if (!respuesta.ok) {
        throw new Error('No fue posible obtener las fotografías. ');
      }

      const datos = await respuesta.json();

      // Admite tanto { fotos: [...] } como { resources: [...] }
      const recursos = datos.fotos ?? datos.resources ?? [];

      this.fotos = recursos
        .filter((foto: any) => foto.secure_url)
        .sort((a: Foto, b: Foto) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );

    } catch (e) {
      console.error('Error al cargar el álbum:', e);
      this.error = true;
    } finally {
      this.cargando = false;
    }
  }

  get fotosMostradas(): Foto[] {
    if (this.filtro === 'recientes') {
      return this.fotos.slice(0, 12);
    }

    return this.fotos;
  }

  seleccionarFoto(foto: Foto): void {
    this.fotoSeleccionada = foto;
    document.body.style.overflow = 'hidden';
  }

  cerrarFoto(): void {
    this.fotoSeleccionada = null;
    document.body.style.overflow = '';
  }

  cambiarFiltro(filtro: 'todas' | 'recientes'): void {
    this.filtro = filtro;
  }

  compartirAlbum(): void {
    if (navigator.share) {
      navigator.share({
        title: 'Gerson & Rosmery - Nuestro álbum',
        text: '¡Comparte con nosotros los recuerdos de nuestra boda!',
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace del álbum copiado!');
    }
  }

  volverASubirFotos(): void {
    // Ajusta esta ruta según la configuración de tu aplicación.
    window.location.href = '/';
  }
}