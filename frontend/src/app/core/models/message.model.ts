import { UserRole } from './constants';

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    readAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    sender?: MessageUser;
    receiver?: MessageUser;
}

export interface MessageUser {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}

export interface Conversation {
    userId: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
}

export interface SendMessageData {
    receiverId: string;
    content: string;
}

export interface ConversationResponse {
    success: boolean;
    data: {
        messages: Message[];
        total: number;
    };
}

export interface ConversationListResponse {
    success: boolean;
    data: {
        conversations: Conversation[];
    };
}

export interface SendMessageResponse {
    success: boolean;
    data: {
        message: Message;
    };
}

export interface UsersListResponse {
    success: boolean;
    data: {
        users: MessagingUser[];
    };
}

export interface MessagingUser {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    email: string;
}

export interface UnreadCountResponse {
    success: boolean;
    data: {
        unreadCount: number;
    };
}
