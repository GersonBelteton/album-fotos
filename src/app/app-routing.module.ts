import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {AlbumComponent} from './components/album/album.component'
import {FotoComponent} from './components/foto/foto.component'

const routes: Routes = [

  {
    path: '',
    component: FotoComponent
  },
  {
    path: 'album-fotos',
    component: AlbumComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
