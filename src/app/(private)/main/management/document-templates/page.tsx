import type { Metadata } from 'next'
import { DocumentTemplatesPage } from '@/features/document-templates/DocumentTemplatesPage'

export const metadata: Metadata = { title: 'Szablony dokumentów' }

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

    return <DocumentTemplatesPage key={id ?? 'list'} initialTemplateId={id} />
}
