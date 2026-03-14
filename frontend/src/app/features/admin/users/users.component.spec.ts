import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UsersComponent } from './users.component';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserRole } from '../../../core/models';
import { of } from 'rxjs';

describe('UsersComponent', () => {
    let component: UsersComponent;
    let fixture: ComponentFixture<UsersComponent>;
    let mockUserService: jasmine.SpyObj<UserService>;
    let mockNotificationService: jasmine.SpyObj<NotificationService>;

    const mockUsers = [
        { id: '1', email: 'u1@test.com', role: UserRole.PATIENT, firstName: 'U1', lastName: 'L1' } as any
    ];

    beforeEach(async () => {
        mockUserService = jasmine.createSpyObj('UserService', ['getUsers']);
        mockUserService.getUsers.and.returnValue(of({
            data: { users: mockUsers, total: 1 }
        }));

        mockNotificationService = jasmine.createSpyObj('NotificationService', ['success', 'error', 'info', 'warning']);

        await TestBed.configureTestingModule({
            imports: [UsersComponent],
            providers: [
                { provide: UserService, useValue: mockUserService },
                { provide: NotificationService, useValue: mockNotificationService }
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(UsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should load users on init', () => {
        expect(mockUserService.getUsers).toHaveBeenCalled();
        expect(component.users().length).toBe(1);
    });

    describe('Filtering and Pagination', () => {
        it('should reload users when searching', () => {
            component.searchTerm = 'test';
            component.searchUsers();

            expect(component.currentPage).toBe(1); // Should reset to page 1
            expect(mockUserService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
                search: 'test'
            }));
        });

        it('should reload users when changing page', () => {
            component.changePage(2);
            expect(component.currentPage).toBe(2);
            expect(mockUserService.getUsers).toHaveBeenCalledWith(jasmine.objectContaining({
                page: 2
            }));
        });

        it('should reset filters', () => {
            component.searchTerm = 'something';
            component.selectedRole = 'admin';
            component.resetFilters();

            expect(component.searchTerm).toBe('');
            expect(component.selectedRole).toBe('');
            expect(component.currentPage).toBe(1);
            expect(mockUserService.getUsers).toHaveBeenCalled();
        });
    });

    describe('User Actions', () => {
        it('should open edit modal with user data', () => {
            const user = mockUsers[0];
            component.editUser(user);

            expect(component.showEditModal()).toBeTrue();
            expect(component.editingUser.id).toBe(user.id);
        });

        it('should delete user and reload', () => {
            // Simulating delete action flow (method calls notification and closing)
            component.deleteUser();

            expect(mockNotificationService.success).toHaveBeenCalled();
            expect(component.showDeleteModal()).toBeFalse();
            expect(mockUserService.getUsers).toHaveBeenCalled(); // Should reload
        });
    });
});


