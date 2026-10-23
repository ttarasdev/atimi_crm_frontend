import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { Calendar } from '@/api/calendars/calendars.types'
import type {
    ClientContact,
    ClientPreference,
    ClientNote,
    ClientDocument,
    ClientSource,
    ClientRecordQuery,
    ClientRecordsList,
    CreateClientContactDto,
    CreateClientPreferenceDto,
    CreateClientNoteDto,
    CreateClientDocumentDto,
} from './client-records.types'

function recordsPath(clientId: number, kind: string, id?: number) {
    if (
        [clientId, ...(id === undefined ? [] : [id])].some(
            (value) =>
                !Number.isSafeInteger(value) || value < 1 || value > 2147483647,
        )
    )
        throw new RangeError('Positive client and record IDs are required')

    return `/clients/${clientId}/${kind}${id === undefined ? '' : `/${id}`}`
}

function resource<T, D>(
    kind: 'contacts' | 'preferences' | 'notes' | 'documents',
) {
    return {
        list: (
            clientId: number,
            query: ClientRecordQuery = {},
            options?: RequestOptions,
        ) =>
            http.get<ClientRecordsList<T>>(recordsPath(clientId, kind), {
                ...options,
                query: { ...query },
            }),
        create: (clientId: number, dto: D, options?: RequestOptions) =>
            http.post<T>(recordsPath(clientId, kind), dto, options),
        update: (
            clientId: number,
            id: number,
            dto: Partial<D>,
            options?: RequestOptions,
        ) => http.patch<T>(recordsPath(clientId, kind, id), dto, options),
        delete: (clientId: number, id: number, options?: RequestOptions) =>
            http.delete<{ success: true }>(
                recordsPath(clientId, kind, id),
                options,
            ),
    }
}

export const clientRecordsApi = {
    contacts: resource<ClientContact, CreateClientContactDto>('contacts'),
    preferences: resource<ClientPreference, CreateClientPreferenceDto>(
        'preferences',
    ),
    notes: resource<ClientNote, CreateClientNoteDto>('notes'),
    documents: resource<ClientDocument, CreateClientDocumentDto>('documents'),
    sources: (
        query: ClientRecordQuery & { isActive?: boolean } = {},
        options?: RequestOptions,
    ) =>
        http.get<ClientRecordsList<ClientSource>>('/client-sources', {
            ...options,
            query: { ...query },
        }),
    managerCalendar: (managerId: number, options?: RequestOptions) =>
        http.get<Calendar>(`/calendars/manager/${managerId}`, options),
}
