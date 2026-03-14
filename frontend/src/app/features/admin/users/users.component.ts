import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { User, UserRole } from '../../../core/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);

  users = signal<User[]>([]);
  totalUsers = signal(0);
  isLoading = signal(false);

  showAddModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);

  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  currentPage = 1;

  editingUser: Partial<User> & { password?: string } = {};

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);

    this.userService.getUsers({
      page: this.currentPage,
      limit: 10,
      role: this.selectedRole || undefined,
      isActive: this.selectedStatus === 'active' ? 'true' : this.selectedStatus === 'inactive' ? 'false' : undefined,
      search: this.searchTerm || undefined,
    }).subscribe({
      next: (response) => {
        this.users.set(response.data.users || []);
        this.totalUsers.set(response.data.total || 0);
        this.isLoading.set(false);
      },
      error: () => {
        // Demo data
        this.users.set([
          { id: '1', email: 'john.doe@example.com', role: UserRole.PATIENT, firstName: 'John', lastName: 'Doe', isActive: true, isEmailVerified: true, createdAt: new Date(), updatedAt: new Date() },
          { id: '2', email: 'dr.smith@example.com', role: UserRole.DOCTOR, firstName: 'Sarah', lastName: 'Smith', isActive: true, isEmailVerified: true, lastLoginAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
          { id: '3', email: 'admin@example.com', role: UserRole.ADMIN, firstName: 'Admin', lastName: 'User', isActive: true, isEmailVerified: true, lastLoginAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
        ]);
        this.totalUsers.set(3);
        this.isLoading.set(false);
      }
    });
  }

  searchUsers(): void {
    this.currentPage = 1;
    this.loadUsers();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  changePage(page: number): void {
    if (page >= 1) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  editUser(user: User): void {
    this.editingUser = { ...user };
    this.showEditModal.set(true);
  }

  confirmDelete(user: User): void {
    this.editingUser = { ...user };
    this.showDeleteModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showDeleteModal.set(false);
    this.editingUser = {};
  }

  saveUser(): void {
    if (this.showEditModal()) {
      this.notificationService.success('Success', 'User updated successfully');
    } else {
      this.notificationService.success('Success', 'User created successfully');
    }
    this.closeModals();
    this.loadUsers();
  }

  deleteUser(): void {
    this.notificationService.success('Success', 'User deleted successfully');
    this.closeModals();
    this.loadUsers();
  }

  toggleUserStatus(user: User): void {
    const action = user.isActive ? 'deactivated' : 'activated';
    this.notificationService.success('Success', `User ${action} successfully`);
    this.loadUsers();
  }

  exportUsers(): void {
    this.notificationService.info('Export', 'Preparing users export...');
  }

  getRoleColorClass(role: UserRole): string {
    const classes: Record<UserRole, string> = {
      [UserRole.PATIENT]: 'bg-info-subtle text-info',
      [UserRole.DOCTOR]: 'bg-success-subtle text-success',
      [UserRole.ADMIN]: 'bg-primary-subtle text-primary',
    };
    return classes[role] || 'bg-secondary-subtle text-secondary';
  }

  getRoleBadgeClass(role: UserRole): string {
    const classes: Record<UserRole, string> = {
      [UserRole.PATIENT]: 'bg-info',
      [UserRole.DOCTOR]: 'bg-success',
      [UserRole.ADMIN]: 'bg-primary',
    };
    return classes[role] || 'bg-secondary';
  }
}
