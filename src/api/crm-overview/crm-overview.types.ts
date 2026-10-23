export interface OverviewQuery {
    months?: number
    managerId?: number
}

export interface CrmOverview {
    date: string
    timeZone: string
    counts: {
        clients: number
        activeProcesses: number
        openTasks: number
        eventsToday: number
        documents: number
        notes: number
    }
    clients: {
        id: number
        name: string
        surname: string | null
        status: string
        priority: string
        updatedAt: string
    }[]
    events: {
        id: number
        title: string
        date: string
        startAt: string | null
        endAt: string | null
        isDone: boolean
        color: string
        iconId: number
    }[]
    tasks: {
        id: number
        title: string
        clientId: number
        clientName: string
        processTitle: string
        stageTitle: string
        color: string
    }[]
    deadlines: {
        id: number
        title: string
        dueAt: string
        clientId: number | null
    }[]
    reminders: { id: number; title: string; remindAt: string }[]
}

export interface CrmStatistics {
    paymentStats: {
        statuses: { key: 'unpaid' | 'partial' | 'paid'; total: number }[]
        currencies: {
            currency: string
            total: number
            knownAmountCount: number
            unknownAmountCount: number
            totalAmount: string
            fullyPaidAmount: string
            unpaidAmount: string
            partialAmount: string
        }[]
        unknownAmountCount: number
    }
    period: { from: string; to: string; months: number }
    clients: { key: string; total: number }[]
    processes: { key: string; total: number }[]
    monthly: { month: string; clients: number; completedProcesses: number }[]
    managers: {
        id: number
        name: string
        surname: string
        status: string
        total: number
        active: number
        completed: number
    }[]
    sources: { name: string; total: number }[]
    archivedClients: number
    tasks: { open: number; done: number }
}

export type CrmTaskStatus = 'open' | 'done' | 'all'

export interface CrmTasksQuery {
    page?: number
    limit?: number
    offset?: number
    search?: string
    status?: CrmTaskStatus
    managerId?: number
}

export interface CrmTask {
    id: number
    title: string
    isDone: boolean
    dueAt: string | null
    clientId: number
    clientName: string
    processId: number
    processTitle: string
    stageId: number
    stageTitle: string
    managerId: number
    managerName: string
    priority: 'normal' | 'high' | 'vip'
    taskTypeTitle: string
    color: string
}

export interface CrmTasksPage {
    rows: CrmTask[]
    total: number
    page: number
    limit: number
    offset: number
}
