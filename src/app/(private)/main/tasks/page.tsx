import type { Metadata } from 'next'
import { TasksPage } from '@/features/tasks/TasksPage'

export const metadata: Metadata = { title: 'Zadania' }

export default function Page() {
    return <TasksPage />
}
