
////////////////////////////

import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-foto',
  templateUrl: './foto.component.html',
  styleUrls: ['./foto.component.scss']
})
export class FotoComponent implements OnDestroy {

  @ViewChild('video')
  video!: ElementRef<HTMLVideoElement>;

  @ViewChild('canvas')
  canvas!: ElementRef<HTMLCanvasElement>;

  // ==========================================
  // CONFIGURACIÓN CLOUDINARY
  // ==========================================

  cloudName = 'dst1u4bij';

  uploadPreset = 'album-fotos';

  folder = 'mi-aplicacion/fotos';

  // ==========================================
  // ESTADO
  // ==========================================

  stream: MediaStream | null = null;

  imagePreview: string | null = null;

  uploadedImageUrl: string | null = null;

  selectedFile: File | null = null;

  cameraActive = false;

  uploading = false;

  message = '';

  errorMessage = '';

  // ==========================================
  // ACTIVAR CÁMARA
  // ==========================================

  async startCamera(): Promise<void> {

    this.clearMessages();

    try {

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        },
        audio: false
      });

      this.cameraActive = true;

      setTimeout(() => {

        if (this.video) {

          this.video.nativeElement.srcObject = this.stream;

        }

      });

    } catch (error) {

      console.error(error);

      this.errorMessage =
        'No fue posible acceder a la cámara. Verifica los permisos del navegador.';

    }

  }

  // ==========================================
  // TOMAR FOTO
  // ==========================================

  capturePhoto(): void {

    if (!this.video || !this.canvas) {
      return;
    }

    const video = this.video.nativeElement;
    const canvas = this.canvas.nativeElement;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {

        if (!blob) {
          return;
        }

        const file = new File(
          [blob],
          `foto-${Date.now()}.jpg`,
          {
            type: 'image/jpeg'
          }
        );

        this.selectedFile = file;

        this.imagePreview =
          URL.createObjectURL(blob);

        this.stopCamera();

        // Subida automática
        this.uploadToCloudinary(file);

      },
      'image/jpeg',
      0.90
    );

  }

  // ==========================================
  // SELECCIONAR IMAGEN
  // ==========================================

  onFileSelected(event: Event): void {

    this.clearMessages();

    const input =
      event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {

      this.errorMessage =
        'El archivo seleccionado no es una imagen.';

      return;

    }

    this.selectedFile = file;

    this.imagePreview =
      URL.createObjectURL(file);

    // Subida automática
    this.uploadToCloudinary(file);

  }

  // ==========================================
  // SUBIR A CLOUDINARY
  // ==========================================

  async uploadToCloudinary(file: File): Promise<void> {

    this.clearMessages();

    this.uploading = true;

    this.uploadedImageUrl = null;

    const url =
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    const formData = new FormData();

    formData.append(
      'file',
      file
    );

    formData.append(
      'upload_preset',
      this.uploadPreset
    );

    formData.append(
      'folder',
      this.folder
    );

    try {

      const response = await fetch(
        url,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response.ok) {

        const error =
          await response.text();

        console.error(error);

        throw new Error(
          'Error al subir la imagen.'
        );

      }

      const result =
        await response.json();

      console.log(
        'Respuesta Cloudinary:',
        result
      );

      this.uploadedImageUrl =
        result.secure_url;

      this.message =
        'La fotografía fue subida correctamente.';

    } catch (error) {

      console.error(error);

      this.errorMessage =
        'No fue posible subir la fotografía a Cloudinary.';

    } finally {

      this.uploading = false;

    }

  }

  // ==========================================
  // DETENER CÁMARA
  // ==========================================

  stopCamera(): void {

    if (this.stream) {

      this.stream
        .getTracks()
        .forEach(track => track.stop());

      this.stream = null;

    }

    this.cameraActive = false;

  }

  // ==========================================
  // REINICIAR
  // ==========================================

  reset(): void {

    this.stopCamera();

    this.imagePreview = null;

    this.uploadedImageUrl = null;

    this.selectedFile = null;

    this.clearMessages();

  }

  // ==========================================
  // LIMPIAR MENSAJES
  // ==========================================

  private clearMessages(): void {

    this.message = '';

    this.errorMessage = '';

  }

  // ==========================================
  // DESTRUIR COMPONENTE
  // ==========================================

  ngOnDestroy(): void {

    this.stopCamera();

    if (this.imagePreview) {

      URL.revokeObjectURL(
        this.imagePreview
      );

    }

  }

}