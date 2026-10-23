import {
    infiniteQueryOptions,
    queryOptions,
    skipToken,
} from '@tanstack/react-query'
import { calendarsApi } from '@/api/calendars/calendars.api'
import type {
    CalendarEntriesQuery,
    CalendarEntryKind,
} from '@/api/calendars/calendars.types'
import { clientsApi } from '@/api/clients/clients.api'
import type { ClientsQuery } from '@/api/clients/clients.types'
import { clientProcessesApi } from '@/api/client-processes/client-processes.api'
import { clientProcessStagesApi } from '@/api/client-process-stages/client-process-stages.api'

type CalendarRangeQuery = Omit<
    CalendarEntriesQuery,
    'page' | 'limit' | 'offset'
>

type CalendarClientsQuery = Pick<ClientsQuery, 'search' | 'managerId'>

export const calendarQueryKeys = {
    all: ['calendars'] as const,
    mine: ['calendars', 'me'] as const,
    manager: (id: number) => ['calendars', 'manager', id] as const,

    entries: (calendarId: number | null) =>
        ['calendars', 'entries', calendarId] as const,

    list: (calendarId: number | null, query: CalendarEntriesQuery) =>
        ['calendars', 'entries', calendarId, 'list', query] as const,

    infinite: (calendarId: number | null, query: CalendarRangeQuery) =>
        ['calendars', 'entries', calendarId, 'infinite', query] as const,

    details: (calendarId: number | null) =>
        ['calendars', 'detail', calendarId] as const,

    detail: (
        calendarId: number | null,
        kind: CalendarEntryKind,
        id: number | null,
    ) => ['calendars', 'detail', calendarId, kind, id] as const,
}

export const calendarClientQueryKeys = {
    clients: (query: CalendarClientsQuery) =>
        ['clients', 'list', 'infinite', { ...query, archived: false }] as const,

    processes: (clientId: number | null) =>
        ['client-processes', 'list', clientId, 'infinite', 'active'] as const,

    stages: (clientId: number | null, processId: number | null) =>
        [
            'client-process-stages',
            'list',
            clientId,
            processId,
            'infinite',
        ] as const,
}

export function myCalendarQueryOptions() {
    return queryOptions({
        queryKey: calendarQueryKeys.mine,
        queryFn: ({ signal }) => calendarsApi.mine({ signal }),
    })
}

export function managerCalendarQueryOptions(id: number) {
    return queryOptions({
        queryKey: calendarQueryKeys.manager(id),
        queryFn: ({ signal }) => calendarsApi.forManager(id, { signal }),
    })
}

export function calendarEntriesQueryOptions(
    calendarId: number | null,
    query: CalendarEntriesQuery,
) {
    return queryOptions({
        queryKey: calendarQueryKeys.list(calendarId, query),

        queryFn:
            calendarId === null
                ? skipToken
                : ({ signal }) =>
                      calendarsApi.entries(calendarId, query, { signal }),
    })
}

export function infiniteCalendarEntriesQueryOptions(
    calendarId: number | null,
    query: CalendarRangeQuery,
) {
    return infiniteQueryOptions({
        queryKey: calendarQueryKeys.infinite(calendarId, query),
        initialPageParam: 1,

        queryFn:
            calendarId === null
                ? skipToken
                : ({ signal, pageParam }) =>
                      calendarsApi.entries(
                          calendarId,
                          { ...query, page: pageParam, limit: 100 },
                          { signal },
                      ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function calendarEventQueryOptions(
    calendarId: number | null,
    id: number | null,
) {
    return queryOptions({
        queryKey: calendarQueryKeys.detail(calendarId, 'event', id),

        queryFn:
            calendarId === null || id === null
                ? skipToken
                : ({ signal }) =>
                      calendarsApi.getEvent(calendarId, id, { signal }),
    })
}

export function calendarReminderQueryOptions(
    calendarId: number | null,
    id: number | null,
) {
    return queryOptions({
        queryKey: calendarQueryKeys.detail(calendarId, 'reminder', id),

        queryFn:
            calendarId === null || id === null
                ? skipToken
                : ({ signal }) =>
                      calendarsApi.getReminder(calendarId, id, { signal }),
    })
}

export function calendarDeadlineQueryOptions(
    calendarId: number | null,
    id: number | null,
) {
    return queryOptions({
        queryKey: calendarQueryKeys.detail(calendarId, 'deadline', id),

        queryFn:
            calendarId === null || id === null
                ? skipToken
                : ({ signal }) =>
                      calendarsApi.getDeadline(calendarId, id, { signal }),
    })
}

export function infiniteCalendarClientsQueryOptions(
    query: CalendarClientsQuery = {},
) {
    return infiniteQueryOptions({
        queryKey: calendarClientQueryKeys.clients(query),
        initialPageParam: 1,

        queryFn: ({ signal, pageParam }) =>
            clientsApi.list(
                { ...query, archived: false, page: pageParam, limit: 100 },
                { signal },
            ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function infiniteCalendarClientProcessesQueryOptions(
    clientId: number | null,
) {
    return infiniteQueryOptions({
        queryKey: calendarClientQueryKeys.processes(clientId),
        initialPageParam: 1,

        queryFn:
            clientId === null
                ? skipToken
                : ({ signal, pageParam }) =>
                      clientProcessesApi.list(
                          clientId,
                          { status: 'active', page: pageParam, limit: 100 },
                          { signal },
                      ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}

export function infiniteCalendarClientStagesQueryOptions(
    clientId: number | null,
    processId: number | null,
) {
    return infiniteQueryOptions({
        queryKey: calendarClientQueryKeys.stages(clientId, processId),
        initialPageParam: 1,

        queryFn:
            clientId === null || processId === null
                ? skipToken
                : ({ signal, pageParam }) =>
                      clientProcessStagesApi.list(
                          clientId,
                          processId,
                          { page: pageParam, limit: 100 },
                          { signal },
                      ),

        getNextPageParam: (last) =>
            last.rows.length > 0 && last.offset + last.rows.length < last.total
                ? last.page + 1
                : undefined,
    })
}
