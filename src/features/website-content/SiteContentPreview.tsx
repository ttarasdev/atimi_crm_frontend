'use client'

import { Quote, Star, Video } from 'lucide-react'
import { apiUrl } from '@/api/http'
import type { SiteReview } from '@/api/site-reviews/site-reviews.types'
import type { SiteVideo } from '@/api/site-videos/site-videos.types'
import type { WebsiteLanguage } from './LanguageTabs'
import c from './WebsiteContent.module.scss'

export function reviewImage(review: Pick<SiteReview, 'imageId' | 'imagePath'>) {
    return review.imageId
        ? apiUrl(`/public-assets/${review.imageId}/file`)
        : review.imagePath
          ? `https://atlantis.info.pl${review.imagePath}`
          : undefined
}

export function videoEmbed(value: string): string | undefined {
    try {
        const url = new URL(value)

        if (
            url.protocol !== 'https:' ||
            url.username ||
            url.password ||
            url.port
        )
            return undefined

        let id: string | undefined

        if (
            [
                'www.youtube.com',
                'youtube.com',
                'm.youtube.com',
                'www.youtube-nocookie.com',
                'youtube-nocookie.com',
            ].includes(url.hostname)
        )
            id =
                url.pathname === '/watch'
                    ? (url.searchParams.get('v') ?? undefined)
                    : /^\/(?:embed|shorts)\/([^/]+)\/?$/.exec(url.pathname)?.[1]
        else if (url.hostname === 'youtu.be')
            id = /^\/([^/]+)\/?$/.exec(url.pathname)?.[1]

        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id))
            return `https://www.youtube-nocookie.com/embed/${id}`

        if (
            ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(
                url.hostname,
            )
        ) {
            const match = /^\/(?:video\/)?([0-9]{1,12})\/?$/.exec(url.pathname)

            if (match) return `https://player.vimeo.com/video/${match[1]}`
        }
    } catch {
        return undefined
    }

    return undefined
}

export function ReviewPreview({
    review,
    language,
}: {
    review: Pick<
        SiteReview,
        'translations' | 'rating' | 'source' | 'imageId' | 'imagePath'
    > & { imageUrl?: string }
    language: WebsiteLanguage
}) {
    const translation = review.translations[language]

    const image = review.imageUrl ?? reviewImage(review)

    return (
        <div className={c.reviewPreview}>
            {image && (
                <div
                    className={c.photo}
                    style={{ backgroundImage: `url("${image}")` }}
                    role="img"
                    aria-label="Zdjęcie opinii"
                />
            )}
            <Quote size={24} aria-hidden="true" />
            <p>{translation.text || 'Treść opinii pojawi się tutaj…'}</p>
            <div className={c.stars} aria-label={`Ocena ${review.rating}/5`}>
                {Array.from({ length: review.rating }, (_, i) => (
                    <Star
                        key={i}
                        size={15}
                        fill="currentColor"
                        aria-hidden="true"
                    />
                ))}
            </div>
            <strong>{translation.authorName || 'Autor opinii'}</strong>
            <span>{review.source}</span>
        </div>
    )
}

export function VideoPreview({
    video,
    language,
    play = false,
}: {
    video: Pick<SiteVideo, 'translations' | 'url'>
    language: WebsiteLanguage
    play?: boolean
}) {
    const url = videoEmbed(video.url)

    const title = video.translations[language].title || 'Tytuł filmu'

    const thumbnail = url?.includes('youtube-nocookie')
        ? `https://i.ytimg.com/vi/${url.split('/').at(-1)}/hqdefault.jpg`
        : undefined

    return (
        <div className={c.videoPreview}>
            <div className={c.videoImage}>
                {play && url ? (
                    <iframe
                        src={url}
                        title={title}
                        allow="encrypted-media; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="strict-origin-when-cross-origin"
                    />
                ) : (
                    <>
                        <div
                            className={c.thumbnail}
                            style={
                                thumbnail
                                    ? { backgroundImage: `url("${thumbnail}")` }
                                    : undefined
                            }
                        />
                        <Video size={32} aria-hidden="true" />
                    </>
                )}
            </div>
            <strong>{title}</strong>
            {video.translations[language].description && (
                <p>{video.translations[language].description}</p>
            )}
        </div>
    )
}
