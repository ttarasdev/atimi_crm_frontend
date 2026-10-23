'use client'

import { useState } from 'react'
import { FormClientInput } from '@/components/form-components/form-client-input/FormClientInput'
import { FormSelect } from '@/components/form-components/form-select/FormSelect'
import { Button } from '@/components/ui/button/Button'
import {
    useInfiniteCalendarClientProcesses,
    useInfiniteCalendarClientStages,
} from '@/shared/hooks/useCalendar'
import type { Task } from '@/api/tasks/tasks.types'
import c from './TaskForm.module.scss'

export function TaskClientInput({
    clientId,
    stageId,
    onClientChange,
    onStageChange,
    managerId,
    task,
}: {
    clientId: number | null
    stageId: number | null
    onClientChange: (id: number | null) => void
    onStageChange: (id: number | null) => void
    managerId?: number
    task?: Task
}) {
    const [processId, setProcessId] = useState<number | null>(
        task?.processId ?? null,
    )

    const processes = useInfiniteCalendarClientProcesses(clientId)

    const stages = useInfiniteCalendarClientStages(clientId, processId)

    const processRows = processes.data?.pages.flatMap((page) => page.rows) ?? []

    const stageRows =
        stages.data?.pages
            .flatMap((page) => page.rows)
            .filter((stage) => stage.status !== 'done') ?? []

    return (
        <div className={c.linkFields}>
            <FormClientInput
                value={clientId}
                managerId={managerId}
                writableOnly
                onChange={(id) => {
                    onClientChange(id)

                    setProcessId(null)

                    onStageChange(null)
                }}
            />
            {clientId && (
                <FormSelect
                    selectTitle="Sprawa klienta (opcjonalnie)"
                    value={processId}
                    onChange={(id) => {
                        setProcessId(id)

                        onStageChange(null)
                    }}
                    disabled={processes.isPending}
                    options={[
                        {
                            title: processes.isPending
                                ? 'Wczytywanie spraw…'
                                : 'Tylko klient',
                            value: null,
                        },
                        ...(task?.processId &&
                        task.processTitle &&
                        task.clientId === clientId &&
                        !processRows.some(
                            (process) => process.id === task.processId,
                        )
                            ? [
                                  {
                                      title: task.processTitle,
                                      value: task.processId,
                                  },
                              ]
                            : []),
                        ...processRows.map((process) => ({
                            title: process.title,
                            value: process.id,
                        })),
                    ]}
                />
            )}
            {processes.hasNextPage && (
                <Button
                    type="button"
                    pending={processes.isFetchingNextPage}
                    onClick={() => void processes.fetchNextPage()}
                >
                    Pokaż więcej spraw
                </Button>
            )}
            {processId && (
                <FormSelect
                    selectTitle="Etap klienta (opcjonalnie)"
                    value={stageId}
                    onChange={onStageChange}
                    disabled={stages.isPending}
                    options={[
                        {
                            title: stages.isPending
                                ? 'Wczytywanie etapów…'
                                : 'Bez etapu',
                            value: null,
                        },
                        ...(task?.clientStageId &&
                        task.clientStageTitle &&
                        task.processId === processId &&
                        !stageRows.some(
                            (stage) => stage.id === task.clientStageId,
                        )
                            ? [
                                  {
                                      title: task.clientStageTitle,
                                      value: task.clientStageId,
                                  },
                              ]
                            : []),
                        ...stageRows.map((stage) => ({
                            title: stage.title,
                            value: stage.id,
                        })),
                    ]}
                />
            )}
            {stages.hasNextPage && (
                <Button
                    type="button"
                    pending={stages.isFetchingNextPage}
                    onClick={() => void stages.fetchNextPage()}
                >
                    Pokaż więcej etapów
                </Button>
            )}
            {[processes, stages]
                .filter((query) => query.isError)
                .map((query, index) => (
                    <div key={index} role="alert" className={c.error}>
                        Nie udało się wczytać powiązania.
                        <Button
                            type="button"
                            onClick={() => void query.refetch()}
                        >
                            Spróbuj ponownie
                        </Button>
                    </div>
                ))}
            <p className={c.hint}>
                Zadanie może pozostać bez klienta. Wybranie etapu dodaje je
                również do tej sprawy.
            </p>
        </div>
    )
}
