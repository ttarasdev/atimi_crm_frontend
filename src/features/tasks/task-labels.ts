import type {
    TaskPriority,
    TaskStatus,
    TaskView,
} from '@/api/tasks/tasks.types'

export const taskStatuses: Record<TaskStatus, string> = {
    todo: 'Do zrobienia',
    in_progress: 'W trakcie',
    done: 'Wykonane',
}

export const taskPriorities: Record<TaskPriority, string> = {
    normal: 'Normalny',
    high: 'Wysoki',
    urgent: 'Pilny',
}

export const taskViews: { value: TaskView; title: string; empty: string }[] = [
    { value: 'today', title: 'Dzisiaj', empty: 'Brak zadań na dzisiaj.' },
    { value: 'overdue', title: 'Zaległe', empty: 'Nie ma zaległych zadań.' },
    {
        value: 'upcoming',
        title: 'Nadchodzące',
        empty: 'Nie ma nadchodzących zadań.',
    },
    {
        value: 'no_due',
        title: 'Bez terminu',
        empty: 'Nie ma zadań bez terminu.',
    },
    {
        value: 'completed',
        title: 'Wykonane',
        empty: 'Nie ma jeszcze wykonanych zadań.',
    },
    {
        value: 'all',
        title: 'Wszystkie',
        empty: 'Nie ma zadań pasujących do filtrów.',
    },
]
