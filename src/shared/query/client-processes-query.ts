export const clientProcessesQueryKeys = {
    lists: (clientId: number) =>
        ['client-processes', 'list', clientId] as const,
    stages: (clientId: number, processId?: number) =>
        [
            'client-process-stages',
            'list',
            clientId,
            ...(processId === undefined ? [] : [processId]),
        ] as const,
    records: (
        clientId: number,
        processId: number,
        stageId: number,
        kind?: string,
    ) =>
        [
            'client-stage-records',
            clientId,
            processId,
            stageId,
            ...(kind ? [kind] : []),
        ] as const,
}
