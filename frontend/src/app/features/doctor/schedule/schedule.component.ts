import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../../core/services/doctor.service';
import { NotificationService } from '../../../core/services/notification.service';
import { DayOfWeek, DoctorAvailability } from '../../../core/models';

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule.component.html',
  styleUrl: './schedule.component.scss',
})
export class ScheduleComponent implements OnInit {
  private doctorService = inject(DoctorService);
  private notificationService = inject(NotificationService);

  isSaving = signal(false);
  showTimeOffModal = signal(false);
  timeOffList = signal<Array<{ startDate: string; endDate: string; reason: string }>>([]);

  daysOfWeek: DayOfWeek[] = [
    DayOfWeek.MONDAY,
    DayOfWeek.TUESDAY,
    DayOfWeek.WEDNESDAY,
    DayOfWeek.THURSDAY,
    DayOfWeek.FRIDAY,
    DayOfWeek.SATURDAY,
    DayOfWeek.SUNDAY,
  ];

  schedule: Record<DayOfWeek, { isActive: boolean; startTime: string; endTime: string; slotDuration: number; breakStart?: string; breakEnd?: string }> = {
    [DayOfWeek.MONDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.TUESDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.WEDNESDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.THURSDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.FRIDAY]: { isActive: true, startTime: '09:00', endTime: '17:00', slotDuration: 30 },
    [DayOfWeek.SATURDAY]: { isActive: false, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    [DayOfWeek.SUNDAY]: { isActive: false, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
  };

  newTimeOff = { startDate: '', endDate: '', reason: '' };

  ngOnInit(): void {
    this.loadSchedule();
  }

  loadSchedule(): void {
    this.doctorService.getAvailability().subscribe({
      next: (response) => {
        // Map API response to schedule
        response.data.availability?.forEach(avail => {
          const day = avail.dayOfWeek as DayOfWeek;
          if (this.schedule[day]) {
            this.schedule[day] = {
              isActive: avail.isActive,
              startTime: avail.startTime,
              endTime: avail.endTime,
              slotDuration: avail.slotDuration,
            };
          }
        });
      },
    });
  }

  saveSchedule(): void {
    this.isSaving.set(true);

    const scheduleData = this.daysOfWeek
      .filter(day => this.schedule[day].isActive)
      .map(day => ({
        dayOfWeek: day,
        startTime: this.schedule[day].startTime,
        endTime: this.schedule[day].endTime,
        slotDuration: this.schedule[day].slotDuration,
      }));

    this.doctorService.updateSchedule(scheduleData, new Date().toISOString().split('T')[0]).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notificationService.success('Success', 'Schedule saved successfully');
      },
      error: () => {
        this.isSaving.set(false);
        this.notificationService.error('Error', 'Failed to save schedule');
      },
    });
  }

  addTimeOff(): void {
    this.newTimeOff = { startDate: '', endDate: '', reason: '' };
    this.showTimeOffModal.set(true);
  }

  confirmAddTimeOff(): void {
    if (this.newTimeOff.startDate && this.newTimeOff.endDate) {
      this.timeOffList.update(list => [...list, { ...this.newTimeOff }]);
      this.showTimeOffModal.set(false);
    }
  }

  removeTimeOff(index: number): void {
    this.timeOffList.update(list => list.filter((_, i) => i !== index));
  }

  applyTemplate(template: 'weekdays' | 'morning' | 'evening'): void {
    const templates: Record<string, { activeDays: DayOfWeek[]; startTime: string; endTime: string }> = {
      weekdays: {
        activeDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY],
        startTime: '09:00',
        endTime: '17:00',
      },
      morning: {
        activeDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY],
        startTime: '06:00',
        endTime: '12:00',
      },
      evening: {
        activeDays: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY],
        startTime: '16:00',
        endTime: '21:00',
      },
    };

    const config = templates[template];

    this.daysOfWeek.forEach(day => {
      this.schedule[day] = {
        ...this.schedule[day],
        isActive: config.activeDays.includes(day),
        startTime: config.startTime,
        endTime: config.endTime,
      };
    });

    this.notificationService.info('Template Applied', `${template} schedule applied. Don't forget to save!`);
  }
}
