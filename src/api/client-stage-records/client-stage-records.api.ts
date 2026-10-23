import { http } from '@/api/http'
import type { RequestOptions } from '@/api/http.types'
import type { DeleteScope } from '@/api/calendars/calendars.types'
import type {
    ClientRecordQuery,
    ClientRecordsList,
} from '@/api/client-records/client-records.types'
import type {
    ClientStageScope,
    ClientStageRecords,
    ClientStageRecordDtos,
} from './client-stage-records.types'

function path(scope: ClientStageScope, kind: string, id?: number) {
    if (
        [
            scope.clientId,
            scope.processId,
            scope.stageId,
            ...(id === undefined ? [] : [id]),
        ].some(
            (value) =>
                !Number.isSafeInteger(value) || value < 1 || value > 2147483647,
        )
    )
        throw new RangeError(
            'Positive client, process, stage and record IDs are required',
        )

    return `/clients/${scope.clientId}/processes/${scope.processId}/stages/${scope.stageId}/${kind}${id === undefined ? '' : `/${id}`}`
}

function resource<K extends keyof ClientStageRecords>(kind: K) {
    return {
        list: (
            scope: ClientStageScope,
            query: ClientRecordQuery = {},
            options?: RequestOptions,
        ) =>
            http.get<ClientRecordsList<ClientStageRecords[K]>>(
                path(scope, kind),
                { ...options, query: { ...query } },
            ),
        create: (
            scope: ClientStageScope,
            dto: ClientStageRecordDtos[K],
            options?: RequestOptions,
        ) => http.post<ClientStageRecords[K]>(path(scope, kind), dto, options),
        update: (
            scope: ClientStageScope,
            id: number,
            dto: Partial<ClientStageRecordDtos[K]>,
            options?: RequestOptions,
        ) =>
            http.patch<ClientStageRecords[K]>(
                path(scope, kind, id),
                dto,
                options,
            ),
        delete: (
            scope: ClientStageScope,
            id: number,
            deleteScope: DeleteScope = 'local',
            options?: RequestOptions,
        ) =>
            http.delete<{ success: true }>(path(scope, kind, id), {
                ...options,
                query: { deleteScope },
            }),
    }
}

export const clientStageRecordsApi = {
    tasks: resource('tasks'),
    reminders: resource('reminders'),
    deadlines: resource('deadlines'),
    notes: resource('notes'),
    documents: resource('documents'),
    reorderTask: (
        scope: ClientStageScope,
        id: number,
        direction: 'up' | 'down',
        options?: RequestOptions,
    ) =>
        http.patch<ClientStageRecords['tasks'][]>(
            `${path(scope, 'tasks', id)}/order`,
            { direction },
            options,
        ),
}
