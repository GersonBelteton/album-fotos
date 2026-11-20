
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

  // ==========================================
  // ELEMENTOS HTML
  // ==========================================

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

  cameraReady = false;

  uploading = false;

  message = '';

  errorMessage = '';

  // environment = cámara trasera
  // user = cámara frontal
  cameraFacingMode: 'user' | 'environment' = 'environment';


  // ==========================================
  // ACTIVAR CÁMARA
  // ==========================================

  async startCamera(): Promise<void> {

    if (this.uploading) {
      return;
    }

    this.clearMessages();

    this.cameraReady = false;

    try {

      // Detener cualquier transmisión anterior.
      this.stopCamera();

      // Solicitar la cámara seleccionada.
      this.stream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: {
              ideal: this.cameraFacingMode
            }
          },

          audio: false

        });

      this.cameraActive = true;

      // Esperar a que Angular renderice el video.
      setTimeout(() => {

        if (!this.video || !this.stream) {
          this.errorMessage =
            'No fue posible preparar la cámara.';

          this.stopCamera();
          return;
        }

        const videoElement =
          this.video.nativeElement;

        // Registrar el evento antes de asignar el stream.
        videoElement.onloadedmetadata = async () => {

          try {

            await videoElement.play();

            console.log(
              'Cámara lista:',
              videoElement.videoWidth,
              videoElement.videoHeight,
              'Modo:',
              this.cameraFacingMode
            );

            this.cameraReady = true;

          } catch (error) {

            console.error(
              'Error al iniciar reproducción:',
              error
            );

            this.errorMessage =
              'No fue posible iniciar la cámara.';

            this.stopCamera();

          }

        };

        videoElement.srcObject = this.stream;

      }, 0);

    } catch (error) {

      console.error(
        'Error al acceder a la cámara:',
        error
      );

      this.cameraActive = false;
      this.cameraReady = false;

      this.errorMessage =
        'No fue posible acceder a la cámara. Verifica los permisos del navegador.';

    }

  }


  // ==========================================
  // CAMBIAR ENTRE CÁMARA FRONTAL Y TRASERA
  // ==========================================

  async cambiarCamara(): Promise<void> {

    if (this.uploading || !this.cameraActive) {
      return;
    }

    // Alternar la cámara seleccionada.
    this.cameraFacingMode =
      this.cameraFacingMode === 'environment'
        ? 'user'
        : 'environment';

    // Reiniciar la cámara con el nuevo modo.
    await this.startCamera();

  }


  // ==========================================
  // TOMAR FOTO
  // ==========================================

  async capturePhoto(): Promise<void> {

    this.clearMessages();

    // Validar cámara.
    if (!this.cameraReady) {

      this.errorMessage =
        'La cámara todavía no está lista.';

      return;

    }

    if (!this.video || !this.canvas) {

      this.errorMessage =
        'No fue posible acceder a la cámara.';

      return;

    }

    const video =
      this.video.nativeElement;

    const canvas =
      this.canvas.nativeElement;

    // Validar dimensiones.
    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {

      this.errorMessage =
        'La cámara todavía no tiene una imagen disponible.';

      return;

    }

    // Configurar canvas.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context =
      canvas.getContext('2d');

    if (!context) {

      this.errorMessage =
        'No fue posible procesar la fotografía.';

      return;

    }

    // Capturar frame.
    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Convertir canvas a Blob.
    const blob =
      await new Promise<Blob | null>((resolve) => {

        canvas.toBlob(
          (result) => resolve(result),
          'image/jpeg',
          0.90
        );

      });

    if (!blob) {

      this.errorMessage =
        'No fue posible generar la fotografía.';

      return;

    }

    // Crear archivo.
    const file =
      new File(
        [blob],
        `foto-${Date.now()}.jpg`,
        {
          type: 'image/jpeg'
        }
      );

    console.log(
      'Fotografía creada:',
      file
    );

    this.selectedFile = file;

    // Mostrar vista previa.
    this.imagePreview =
      URL.createObjectURL(blob);

    // Detener cámara.
    this.stopCamera();

    // Subir fotografía.
    await this.uploadToCloudinary(file);

  }


  // ==========================================
  // SELECCIONAR IMAGEN DE GALERÍA
  // ==========================================

  async onFileSelected(
    event: Event
  ): Promise<void> {

    this.clearMessages();

    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      return;
    }

    const file =
      input.files[0];

    if (!file.type.startsWith('image/')) {

      this.errorMessage =
        'El archivo seleccionado no es una imagen.';

      input.value = '';
      return;

    }

    // Guardar archivo.
    this.selectedFile = file;

    // Vista previa.
    this.imagePreview =
      URL.createObjectURL(file);

    // Subir a Cloudinary.
    await this.uploadToCloudinary(file);

    // Permitir seleccionar nuevamente el mismo archivo.
    input.value = '';

  }


  // ==========================================
  // SUBIR A CLOUDINARY
  // ==========================================

  async uploadToCloudinary(
    file: File
  ): Promise<void> {

    this.clearMessages();

    this.uploading = true;

    this.uploadedImageUrl = null;

    const url =
      `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    const formData =
      new FormData();

    formData.append('file', file);

    formData.append(
      'upload_preset',
      this.uploadPreset
    );

    formData.append(
      'folder',
      this.folder
    );

    try {

      console.log(
        'Iniciando subida a Cloudinary...'
      );

      const response =
        await fetch(
          url,
          {
            method: 'POST',
            body: formData
          }
        );

      if (!response.ok) {

        const error =
          await response.text();

        console.error(
          'Error Cloudinary:',
          error
        );

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

      console.error(
        'Error al subir fotografía:',
        error
      );

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

    if (this.video) {

      const videoElement =
        this.video.nativeElement;

      videoElement.pause();

      videoElement.onloadedmetadata = null;

      videoElement.srcObject = null;

    }

    this.cameraActive = false;

    this.cameraReady = false;

  }


  // ==========================================
  // REINICIAR
  // ==========================================

  reset(): void {

    this.stopCamera();

    // Liberar URL anterior.
    if (this.imagePreview) {

      URL.revokeObjectURL(
        this.imagePreview
      );

    }

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
