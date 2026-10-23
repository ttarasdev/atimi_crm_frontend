import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type {
    Calendar,
    CalendarDeadline,
    CalendarEntriesListResponse,
    CalendarEntriesQuery,
    CalendarEvent,
    CalendarEventMutationResponse,
    CalendarMutationQuery,
    CalendarReminder,
    CreateCalendarDeadlineDto,
    CreateCalendarEventDto,
    CreateCalendarReminderDto,
    DeleteCalendarEntryResponse,
    UpdateCalendarDeadlineDto,
    UpdateCalendarDto,
    UpdateCalendarEventDto,
    UpdateCalendarReminderDto,
} from './calendars.types'

const BASE = '/calendars'

function calendarPath(id: number): string {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        throw new RangeError('A positive calendar ID is required')
    }

    return `${BASE}/${id}`
}

function entryPath(
    calendarId: number,
    resource: 'events' | 'reminders' | 'deadlines',
    id: number,
): string {
    if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
        throw new RangeError('A positive calendar entry ID is required')
    }

    return `${calendarPath(calendarId)}/${resource}/${id}`
}

export const calendarsApi = {
    forManager: (managerId: number, options?: RequestOptions) =>
        http.get<Calendar>(`${BASE}/manager/${managerId}`, options),
    mine: (options?: RequestOptions) =>
        http.get<Calendar>(`${BASE}/me`, options),

    update: (
        calendarId: number,
        dto: UpdateCalendarDto,
        options?: RequestOptions,
    ) => http.patch<Calendar>(calendarPath(calendarId), dto, options),

    entries: (
        calendarId: number,
        query: CalendarEntriesQuery,
        options?: RequestOptions,
    ) =>
        http.get<CalendarEntriesListResponse>(
            `${calendarPath(calendarId)}/entries`,
            { ...options, query: { ...query } },
        ),

    getEvent: (calendarId: number, id: number, options?: RequestOptions) =>
        http.get<CalendarEvent>(entryPath(calendarId, 'events', id), options),

    createEvent: (
        calendarId: number,
        dto: CreateCalendarEventDto,
        options?: RequestOptions,
    ) =>
        http.post<CalendarEventMutationResponse>(
            `${calendarPath(calendarId)}/events`,
            dto,
            options,
        ),

    updateEvent: (
        calendarId: number,
        id: number,
        dto: UpdateCalendarEventDto,
        query: CalendarMutationQuery = {},
        options?: RequestOptions,
    ) =>
        http.patch<CalendarEventMutationResponse>(
            entryPath(calendarId, 'events', id),
            dto,
            { ...options, query: { ...query } },
        ),

    deleteEvent: (
        calendarId: number,
        id: number,
        query: CalendarMutationQuery = {},
        options?: RequestOptions,
    ) =>
        http.delete<DeleteCalendarEntryResponse>(
            entryPath(calendarId, 'events', id),
            { ...options, query: { ...query } },
        ),

    getReminder: (calendarId: number, id: number, options?: RequestOptions) =>
        http.get<CalendarReminder>(
            entryPath(calendarId, 'reminders', id),
            options,
        ),

    createReminder: (
        calendarId: number,
        dto: CreateCalendarReminderDto,
        options?: RequestOptions,
    ) =>
        http.post<CalendarReminder>(
            `${calendarPath(calendarId)}/reminders`,
            dto,
            options,
        ),

    updateReminder: (
        calendarId: number,
        id: number,
        dto: UpdateCalendarReminderDto,
        options?: RequestOptions,
    ) =>
        http.patch<CalendarReminder>(
            entryPath(calendarId, 'reminders', id),
            dto,
            options,
        ),

    deleteReminder: (
        calendarId: number,
        id: number,
        query: CalendarMutationQuery = {},
        options?: RequestOptions,
    ) =>
        http.delete<DeleteCalendarEntryResponse>(
            entryPath(calendarId, 'reminders', id),
            { ...options, query: { ...query } },
        ),

    getDeadline: (calendarId: number, id: number, options?: RequestOptions) =>
        http.get<CalendarDeadline>(
            entryPath(calendarId, 'deadlines', id),
            options,
        ),

    createDeadline: (
        calendarId: number,
        dto: CreateCalendarDeadlineDto,
        options?: RequestOptions,
    ) =>
        http.post<CalendarDeadline>(
            `${calendarPath(calendarId)}/deadlines`,
            dto,
            options,
        ),

    updateDeadline: (
        calendarId: number,
        id: number,
        dto: UpdateCalendarDeadlineDto,
        options?: RequestOptions,
    ) =>
        http.patch<CalendarDeadline>(
            entryPath(calendarId, 'deadlines', id),
            dto,
            options,
        ),

    deleteDeadline: (
        calendarId: number,
        id: number,
        query: CalendarMutationQuery = {},
        options?: RequestOptions,
    ) =>
        http.delete<DeleteCalendarEntryResponse>(
            entryPath(calendarId, 'deadlines', id),
            { ...options, query: { ...query } },
        ),
}
