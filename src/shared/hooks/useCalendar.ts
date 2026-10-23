'use client'

import {
    useInfiniteQuery,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { calendarsApi } from '@/api/calendars/calendars.api'
import type {
    CalendarEntriesQuery,
    CalendarMutationQuery,
    CreateCalendarDeadlineDto,
    CreateCalendarEventDto,
    CreateCalendarReminderDto,
    UpdateCalendarDeadlineDto,
    UpdateCalendarDto,
    UpdateCalendarEventDto,
    UpdateCalendarReminderDto,
} from '@/api/calendars/calendars.types'
import type { ClientsQuery } from '@/api/clients/clients.types'
import {
    calendarDeadlineQueryOptions,
    calendarEntriesQueryOptions,
    calendarEventQueryOptions,
    calendarQueryKeys,
    calendarReminderQueryOptions,
    infiniteCalendarClientProcessesQueryOptions,
    infiniteCalendarClientStagesQueryOptions,
    infiniteCalendarClientsQueryOptions,
    infiniteCalendarEntriesQueryOptions,
    myCalendarQueryOptions,
} from '@/shared/query/calendar-query'

async function invalidateCalendar(
    queryClient: QueryClient,
    calendarId: number,
) {
    await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['crm-overview'] }),
        queryClient.invalidateQueries({
            queryKey: calendarQueryKeys.entries(calendarId),
        }),
        queryClient.invalidateQueries({
            queryKey: calendarQueryKeys.details(calendarId),
        }),
    ])
}

export function useMyCalendar() {
    return useQuery(myCalendarQueryOptions())
}

export function useCalendar(managerId?: number) {
    return useQuery({
        queryKey:
            managerId === undefined
                ? calendarQueryKeys.mine
                : calendarQueryKeys.manager(managerId),
        queryFn: ({ signal }) =>
            managerId === undefined
                ? calendarsApi.mine({ signal })
                : calendarsApi.forManager(managerId, { signal }),
    })
}

export function useCalendarEntries(
    calendarId: number | null,
    query: CalendarEntriesQuery,
) {
    return useQuery(calendarEntriesQueryOptions(calendarId, query))
}

export function useInfiniteCalendarEntries(
    calendarId: number | null,
    query: Omit<CalendarEntriesQuery, 'page' | 'limit' | 'offset'>,
) {
    return useInfiniteQuery(
        infiniteCalendarEntriesQueryOptions(calendarId, query),
    )
}

export function useCalendarEvent(calendarId: number | null, id: number | null) {
    return useQuery(calendarEventQueryOptions(calendarId, id))
}

export function useCalendarReminder(
    calendarId: number | null,
    id: number | null,
) {
    return useQuery(calendarReminderQueryOptions(calendarId, id))
}

export function useCalendarDeadline(
    calendarId: number | null,
    id: number | null,
) {
    return useQuery(calendarDeadlineQueryOptions(calendarId, id))
}

export function useUpdateCalendar() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            dto,
            signal,
        }: {
            calendarId: number
            dto: UpdateCalendarDto
            signal?: AbortSignal
        }) => calendarsApi.update(calendarId, dto, { signal }),

        onSuccess: async (_, variables) => {
            await Promise.all([
                invalidateCalendar(queryClient, variables.calendarId),
                queryClient.invalidateQueries({
                    queryKey: calendarQueryKeys.mine,
                }),
            ])
        },
    })
}

export function useCreateCalendarEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            dto,
            signal,
        }: {
            calendarId: number
            dto: CreateCalendarEventDto
            signal?: AbortSignal
        }) => calendarsApi.createEvent(calendarId, dto, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useUpdateCalendarEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            id,
            dto,
            query,
            signal,
        }: {
            calendarId: number
            id: number
            dto: UpdateCalendarEventDto
            query?: CalendarMutationQuery
            signal?: AbortSignal
        }) => calendarsApi.updateEvent(calendarId, id, dto, query, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useDeleteCalendarEvent() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            id,
            query,
            signal,
        }: {
            calendarId: number
            id: number
            query?: CalendarMutationQuery
            signal?: AbortSignal
        }) => calendarsApi.deleteEvent(calendarId, id, query, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useCreateCalendarReminder() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            dto,
            signal,
        }: {
            calendarId: number
            dto: CreateCalendarReminderDto
            signal?: AbortSignal
        }) => calendarsApi.createReminder(calendarId, dto, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useUpdateCalendarReminder() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            id,
            dto,
            signal,
        }: {
            calendarId: number
            id: number
            dto: UpdateCalendarReminderDto
            signal?: AbortSignal
        }) => calendarsApi.updateReminder(calendarId, id, dto, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useDeleteCalendarReminder() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            id,
            query,
            signal,
        }: {
            calendarId: number
            id: number
            query?: CalendarMutationQuery
            signal?: AbortSignal
        }) => calendarsApi.deleteReminder(calendarId, id, query, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useCreateCalendarDeadline() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            dto,
            signal,
        }: {
            calendarId: number
            dto: CreateCalendarDeadlineDto
            signal?: AbortSignal
        }) => calendarsApi.createDeadline(calendarId, dto, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useUpdateCalendarDeadline() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            id,
            dto,
            signal,
        }: {
            calendarId: number
            id: number
            dto: UpdateCalendarDeadlineDto
            signal?: AbortSignal
        }) => calendarsApi.updateDeadline(calendarId, id, dto, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useDeleteCalendarDeadline() {
    const queryClient = useQueryClient()

    return useMutation({
        retry: false,

        mutationFn: ({
            calendarId,
            id,
            query,
            signal,
        }: {
            calendarId: number
            id: number
            query?: CalendarMutationQuery
            signal?: AbortSignal
        }) => calendarsApi.deleteDeadline(calendarId, id, query, { signal }),

        onSuccess: (_, variables) =>
            invalidateCalendar(queryClient, variables.calendarId),
    })
}

export function useInfiniteCalendarClients(
    query: Pick<ClientsQuery, 'search' | 'managerId'> = {},
) {
    return useInfiniteQuery(infiniteCalendarClientsQueryOptions(query))
}

export function useInfiniteCalendarClientProcesses(clientId: number | null) {
    return useInfiniteQuery(
        infiniteCalendarClientProcessesQueryOptions(clientId),
    )
}

export function useInfiniteCalendarClientStages(
    clientId: number | null,
    processId: number | null,
) {
    return useInfiniteQuery(
        infiniteCalendarClientStagesQueryOptions(clientId, processId),
    )
}
