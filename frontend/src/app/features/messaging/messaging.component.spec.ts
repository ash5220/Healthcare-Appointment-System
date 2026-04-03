import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { EMPTY } from 'rxjs';

import { MessagingComponent } from './messaging.component';
import { MessageService } from '../../core/services/message.service';
import { AuthService } from '../../core/services/auth.service';
import { Conversation, Message, MessagingUser } from '../../core/models';
import { UserRole } from '../../core/models';

const makeConversation = (userId: string, overrides: Partial<Conversation> = {}): Conversation => ({
  userId,
  firstName: 'Alice',
  lastName: 'Smith',
  role: UserRole.PATIENT,
  lastMessage: 'Hello',
  lastMessageAt: new Date(),
  unreadCount: 2,
  ...overrides,
});

const makeMessage = (id: string, senderId: string): Message => ({
  id,
  senderId,
  receiverId: 'other',
  content: 'Hi there',
  isRead: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeUser = (id: string): MessagingUser => ({
  id,
  firstName: 'Bob',
  lastName: 'Jones',
  role: UserRole.DOCTOR,
  email: 'bob@example.com',
  isEmailVerified: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('MessagingComponent', () => {
  let component: MessagingComponent;
  let fixture: ComponentFixture<MessagingComponent>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let currentUserSignal: WritableSignal<{ id: string; firstName: string; lastName: string } | null>;
  let conversationsSignal: WritableSignal<Conversation[]>;
  let activeConversationSignal: WritableSignal<Message[]>;
  let activePartnerSignal: WritableSignal<string | null>;
  let usersSignal: WritableSignal<MessagingUser[]>;
  let isLoadingSignal: WritableSignal<boolean>;
  let unreadCountSignal: WritableSignal<number>;

  beforeEach(async () => {
    currentUserSignal = signal(null);
    conversationsSignal = signal([]);
    activeConversationSignal = signal([]);
    activePartnerSignal = signal(null);
    usersSignal = signal([]);
    isLoadingSignal = signal(false);
    unreadCountSignal = signal(0);

    mockMessageService = jasmine.createSpyObj(
      'MessageService',
      ['getConversations', 'getConversation', 'getUsers', 'sendMessage', 'clearActiveConversation', 'getUnreadCount'],
      {
        conversations: conversationsSignal,
        activeConversation: activeConversationSignal,
        activePartner: activePartnerSignal,
        users: usersSignal,
        isLoading: isLoadingSignal,
        unreadCount: unreadCountSignal,
      },
    );

    mockMessageService.getConversations.and.returnValue(of({
      success: true,
      data: { conversations: [] },
    }));
    mockMessageService.getUsers.and.returnValue(of({
      success: true,
      data: { users: [] },
    }));
    mockMessageService.getConversation.and.returnValue(of({
      success: true,
      data: { messages: [], total: 0 },
    }));
    mockMessageService.sendMessage.and.returnValue(of({
      success: true,
      data: { message: makeMessage('m1', 'u1') },
    }));
    mockMessageService.clearActiveConversation.and.stub();

    mockAuthService = jasmine.createSpyObj('AuthService', ['currentUser'], {
      currentUser: currentUserSignal,
    });

    await TestBed.configureTestingModule({
      imports: [MessagingComponent],
      providers: [
        provideRouter([]),
        { provide: MessageService, useValue: mockMessageService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: EMPTY },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Happy path — initialisation
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — init — happy path', () => {
    it('MessagingComponent — on init — loads conversations', () => {
      expect(mockMessageService.getConversations).toHaveBeenCalled();
    });

    it('MessagingComponent — on init — loads users', () => {
      expect(mockMessageService.getUsers).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Computed — filteredConversations
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — filteredConversations — happy path', () => {
    beforeEach(() => {
      conversationsSignal.set([
        makeConversation('u1', { firstName: 'Alice', lastName: 'Smith' }),
        makeConversation('u2', { firstName: 'Bob', lastName: 'Jones' }),
      ]);
    });

    it('MessagingComponent — empty search query — returns all conversations', () => {
      component['searchQuery'].set('');
      expect(component['filteredConversations']().length).toBe(2);
    });

    it('MessagingComponent — query matching first name — filters correctly', () => {
      component['searchQuery'].set('alice');
      expect(component['filteredConversations']().length).toBe(1);
      expect(component['filteredConversations']()[0].userId).toBe('u1');
    });

    it('MessagingComponent — query matching last message — filters by message content', () => {
      conversationsSignal.set([
        makeConversation('u1', { lastMessage: 'appointment confirmed' }),
        makeConversation('u2', { lastMessage: 'hello' }),
      ]);
      component['searchQuery'].set('confirmed');
      expect(component['filteredConversations']().length).toBe(1);
    });

    it('MessagingComponent — query matching nothing — returns empty', () => {
      component['searchQuery'].set('zzznomatch');
      expect(component['filteredConversations']().length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Computed — filteredUsers
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — filteredUsers — happy path', () => {
    beforeEach(() => {
      usersSignal.set([makeUser('u1'), { ...makeUser('u2'), firstName: 'Carol', lastName: 'White' }]);
    });

    it('MessagingComponent — empty query — returns all users', () => {
      component['searchQuery'].set('');
      expect(component['filteredUsers']().length).toBe(2);
    });

    it('MessagingComponent — query matching first name — filters correctly', () => {
      component['searchQuery'].set('carol');
      expect(component['filteredUsers']().length).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // sendMessage — happy path
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — sendMessage — happy path', () => {
    beforeEach(() => {
      activePartnerSignal.set('partner-id');
    });

    it('MessagingComponent — valid message and active partner — calls sendMessage on service', fakeAsync(() => {
      component['messageText'].set('Hello!');
      component['sendMessage']();
      tick();
      expect(mockMessageService.sendMessage).toHaveBeenCalledWith({
        receiverId: 'partner-id',
        content: 'Hello!',
      });
    }));

    it('MessagingComponent — send succeeds — clears messageText', fakeAsync(() => {
      component['messageText'].set('Hello!');
      component['sendMessage']();
      tick();
      expect(component['messageText']()).toBe('');
    }));

    it('MessagingComponent — send succeeds — sets isSending back to false', fakeAsync(() => {
      component['messageText'].set('Hello!');
      component['sendMessage']();
      tick();
      expect(component['isSending']()).toBeFalse();
    }));
  });

  // ---------------------------------------------------------------------------
  // sendMessage — error cases
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — sendMessage — error cases', () => {
    it('MessagingComponent — service throws — sets isSending to false', fakeAsync(() => {
      activePartnerSignal.set('partner-id');
      mockMessageService.sendMessage.and.returnValue(throwError(() => new Error('Network error')));
      component['messageText'].set('Hello!');

      component['sendMessage']();
      tick();

      expect(component['isSending']()).toBeFalse();
    }));
  });

  // ---------------------------------------------------------------------------
  // sendMessage — edge cases
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — sendMessage — edge cases', () => {
    it('MessagingComponent — empty message — does not call service', () => {
      activePartnerSignal.set('partner-id');
      component['messageText'].set('  ');
      component['sendMessage']();
      expect(mockMessageService.sendMessage).not.toHaveBeenCalled();
    });

    it('MessagingComponent — no active partner — does not call service', () => {
      activePartnerSignal.set(null);
      component['messageText'].set('Hello!');
      component['sendMessage']();
      expect(mockMessageService.sendMessage).not.toHaveBeenCalled();
    });

    it('MessagingComponent — already sending — does not call service again', () => {
      activePartnerSignal.set('partner-id');
      component['isSending'].set(true);
      component['messageText'].set('Hello!');
      component['sendMessage']();
      expect(mockMessageService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // handleKeydown
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — handleKeydown — edge cases', () => {
    it('MessagingComponent — Enter key without shift — calls sendMessage', () => {
      const sendSpy = spyOn<MessagingComponent>(component as MessagingComponent, 'sendMessage' as never);
      const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      spyOn(event, 'preventDefault');
      component['handleKeydown'](event);
      expect(sendSpy).toHaveBeenCalled();
    });

    it('MessagingComponent — Enter + Shift — does not call sendMessage', () => {
      const sendSpy = spyOn<MessagingComponent>(component as MessagingComponent, 'sendMessage' as never);
      component['handleKeydown'](new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
      expect(sendSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // isOwnMessage
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — isOwnMessage', () => {
    it('MessagingComponent — message from current user — returns true', () => {
      currentUserSignal.set({ id: 'u1', firstName: 'Me', lastName: 'User' });
      fixture.detectChanges();
      expect(component['isOwnMessage'](makeMessage('m1', 'u1'))).toBeTrue();
    });

    it('MessagingComponent — message from another user — returns false', () => {
      currentUserSignal.set({ id: 'u1', firstName: 'Me', lastName: 'User' });
      expect(component['isOwnMessage'](makeMessage('m1', 'other'))).toBeFalse();
    });
  });

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------
  describe('MessagingComponent — ngOnDestroy', () => {
    it('MessagingComponent — destroy — clears active conversation', () => {
      component.ngOnDestroy();
      expect(mockMessageService.clearActiveConversation).toHaveBeenCalled();
    });
  });
});
