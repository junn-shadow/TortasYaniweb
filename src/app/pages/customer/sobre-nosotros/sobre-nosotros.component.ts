import { Component } from '@angular/core';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './sobre-nosotros.component.html',
  styleUrl: './sobre-nosotros.component.scss',
})
export class SobreNosotrosComponent {}
