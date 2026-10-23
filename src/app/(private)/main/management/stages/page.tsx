import type { Metadata } from 'next'
import { StageConstructor } from '@/features/stages/stage-constructor/StageConstructor'

export const metadata: Metadata = { title: 'Konstruktor etapów' }

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

    return <StageConstructor key={id ?? 'list'} initialTemplateId={id} />
}
