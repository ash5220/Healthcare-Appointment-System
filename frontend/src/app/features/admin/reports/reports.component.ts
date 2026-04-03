import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReportsComponent {}
