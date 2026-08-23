import { Component } from '@angular/core';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-ubicanos',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './ubicanos.component.html',
  styleUrl: './ubicanos.component.scss',
})
export class UbicanosComponent {}
