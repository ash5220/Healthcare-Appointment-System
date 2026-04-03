import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {}
