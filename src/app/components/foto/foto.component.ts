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


  // ==========================================
  // ACTIVAR CÁMARA
  // ==========================================

  async startCamera(): Promise<void> {

    this.clearMessages();

    this.cameraReady = false;

    try {

      // Si ya existe una cámara activa,
      // primero la detenemos.
      this.stopCamera();

      this.stream =
        await navigator.mediaDevices.getUserMedia({

          video: {
            facingMode: 'environment'
          },

          audio: false

        });


      this.cameraActive = true;


      // Esperamos a que Angular renderice
      // nuevamente el elemento <video>.
      setTimeout(() => {

        if (!this.video) {
          return;
        }

        const videoElement =
          this.video.nativeElement;

        videoElement.srcObject =
          this.stream;


        // Esperamos a que el navegador
        // tenga realmente disponible el video.
        videoElement.onloadedmetadata =
          async () => {

            try {

              await videoElement.play();

              console.log(
                'Cámara lista:',
                videoElement.videoWidth,
                videoElement.videoHeight
              );

              this.cameraReady = true;

            } catch (error) {

              console.error(
                'Error al iniciar reproducción:',
                error
              );

              this.errorMessage =
                'No fue posible iniciar la cámara.';

            }

          };

      });

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
  // TOMAR FOTO
  // ==========================================

  async capturePhoto(): Promise<void> {

    this.clearMessages();


    // ==========================================
    // VALIDAR CÁMARA
    // ==========================================

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


    // ==========================================
    // VALIDAR DIMENSIONES DEL VIDEO
    // ==========================================

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {

      this.errorMessage =
        'La cámara todavía no tiene una imagen disponible.';

      return;

    }


    // ==========================================
    // CONFIGURAR CANVAS
    // ==========================================

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;


    const context =
      canvas.getContext('2d');


    if (!context) {

      this.errorMessage =
        'No fue posible procesar la fotografía.';

      return;

    }


    // ==========================================
    // CAPTURAR FRAME
    // ==========================================

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );


    // ==========================================
    // CONVERTIR CANVAS A BLOB
    // ==========================================

    const blob =
      await new Promise<Blob | null>((resolve) => {

        canvas.toBlob(
          (result) => {

            resolve(result);

          },
          'image/jpeg',
          0.90
        );

      });


    // ==========================================
    // VALIDAR BLOB
    // ==========================================

    if (!blob) {

      this.errorMessage =
        'No fue posible generar la fotografía.';

      return;

    }


    // ==========================================
    // CREAR FILE
    // ==========================================

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


    // ==========================================
    // GUARDAR ARCHIVO
    // ==========================================

    this.selectedFile =
      file;


    // ==========================================
    // MOSTRAR VISTA PREVIA
    // ==========================================

    this.imagePreview =
      URL.createObjectURL(blob);


    // ==========================================
    // DETENER CÁMARA
    // ==========================================

    this.stopCamera();


    // ==========================================
    // SUBIR A CLOUDINARY
    // ESPERAMOS A QUE TERMINE
    // ==========================================

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


    // ==========================================
    // VALIDAR IMAGEN
    // ==========================================

    if (!file.type.startsWith('image/')) {

      this.errorMessage =
        'El archivo seleccionado no es una imagen.';

      return;

    }


    // ==========================================
    // GUARDAR ARCHIVO
    // ==========================================

    this.selectedFile =
      file;


    // ==========================================
    // VISTA PREVIA
    // ==========================================

    this.imagePreview =
      URL.createObjectURL(file);


    // ==========================================
    // SUBIR A CLOUDINARY
    // ==========================================

    await this.uploadToCloudinary(file);

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


    // ==========================================
    // FORM DATA
    // ==========================================

    const formData =
      new FormData();


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

      console.log(
        'Iniciando subida a Cloudinary...'
      );


      // ==========================================
      // ESPERAR RESPUESTA
      // ==========================================

      const response =
        await fetch(
          url,
          {
            method: 'POST',
            body: formData
          }
        );


      // ==========================================
      // VALIDAR RESPUESTA
      // ==========================================

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


      // ==========================================
      // OBTENER RESULTADO
      // ==========================================

      const result =
        await response.json();


      console.log(
        'Respuesta Cloudinary:',
        result
      );


      // ==========================================
      // GUARDAR URL
      // ==========================================

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
        .forEach(
          track => track.stop()
        );

      this.stream = null;

    }


    // Limpiar srcObject
    if (this.video) {

      this.video.nativeElement.srcObject =
        null;

    }


    this.cameraActive = false;

    this.cameraReady = false;

  }


  // ==========================================
  // REINICIAR
  // ==========================================

  reset(): void {

    this.stopCamera();


    // Liberar URL anterior
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