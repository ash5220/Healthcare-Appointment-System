export interface SystemStats {
    totalUsers: number;
    totalDoctors: number;
    totalPatients: number;
    totalAppointments: number;
}

export interface AppointmentBreakdown {
    scheduled: number;
    confirmed: number;
    completed: number;
    cancelled: number;
}

export interface UserStats {
    activeUsers: number;
    newThisWeek: number;
    pendingVerification: number;
    inactive: number;
}

export interface QuickAction {
    route: string;
    label: string;
    icon: string;
}
