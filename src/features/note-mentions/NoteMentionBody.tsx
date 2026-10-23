import type { NoteMention } from '@/api/note-mentions/note-mentions.types'
import c from './NoteMentions.module.scss'

export function containsMention(body: string, label: string) {
    return new RegExp(
        `(^|[^\\p{L}\\p{N}_@])@${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}_])`,
        'u',
    ).test(body)
}

export function NoteMentionBody({
    body,
    mentions = [],
}: {
    body: string
    mentions?: NoteMention[] | null
}) {
    if (!mentions?.length) return <>{body}</>

    const labels = mentions
        .map((mention) => mention.label)
        .sort((a, b) => b.length - a.length)
        .map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

    const regex = new RegExp(
        `(^|[^\\p{L}\\p{N}_@])(@(?:${labels.join('|')}))(?=$|[^\\p{L}\\p{N}_])`,
        'gu',
    )

    const parts = []

    let cursor = 0

    for (const match of body.matchAll(regex)) {
        const start = match.index + match[1].length

        parts.push(body.slice(cursor, start))

        parts.push(
            <span className={c.mention} key={start}>
                {match[2]}
            </span>,
        )

        cursor = start + match[2].length
    }

    parts.push(body.slice(cursor))

    return <>{parts}</>
}
