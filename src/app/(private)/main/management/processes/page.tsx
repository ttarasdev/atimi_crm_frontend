import type { Metadata } from 'next'
import { ProcessTemplatesPage } from '@/features/process-templates/ProcessTemplatesPage'

export const metadata: Metadata = { title: 'Szablony spraw' }

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ templateId?: string | string[] }>
}) {
    const { templateId } = await searchParams

    const id =
        typeof templateId === 'string' &&
        /^[1-9]\d*$/.test(templateId) &&
        Number(templateId) <= 2147483647
            ? Number(templateId)
            : undefined

    return <ProcessTemplatesPage key={id ?? 'list'} initialTemplateId={id} />
}
