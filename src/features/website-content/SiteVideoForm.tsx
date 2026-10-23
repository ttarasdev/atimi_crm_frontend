'use client'

import { useEffect, useRef, useState } from 'react'
import type { SiteVideo } from '@/api/site-videos/site-videos.types'
import { FormContainer } from '@/components/form-components/form-container/FormContainer'
import { FormTextarea } from '@/components/form-components/form-textarea/FormTextarea'
import { TextInput } from '@/components/form-components/text-input/TextInput'
import { useSaveSiteVideo } from '@/shared/hooks/useWebsiteContent'
import {
    LanguageTabs,
    websiteLanguages,
    type WebsiteLanguage,
} from './LanguageTabs'
import { VideoPreview, videoEmbed } from './SiteContentPreview'
import c from './WebsiteContent.module.scss'

const empty = () => ({
    pl: { title: '', description: '' },
    en: { title: '', description: '' },
    ua: { title: '', description: '' },
    de: { title: '', description: '' },
})

export function SiteVideoForm({
    video,
    onSuccess,
    onCancel,
    onPendingChange,
}: {
    video?: SiteVideo
    onSuccess: () => void
    onCancel: () => void
    onPendingChange: (pending: boolean) => void
}) {
    const [translations, setTranslations] = useState(
        video?.translations ?? empty(),
    )

    const [language, setLanguage] = useState<WebsiteLanguage>('pl')

    const [url, setUrl] = useState(video?.url ?? '')

    const [error, setError] = useState<string>()

    const controller = useRef<AbortController | null>(null)

    const save = useSaveSiteVideo()

    useEffect(() => {
        onPendingChange(save.isPending)
    }, [save.isPending, onPendingChange])

    useEffect(() => () => controller.current?.abort(), [])

    function change(field: 'title' | 'description', value: string) {
        setTranslations((current) => ({
            ...current,
            [language]: { ...current[language], [field]: value },
        }))
    }

    async function submit() {
        if (controller.current) return

        setError(undefined)

        for (const lang of websiteLanguages) {
            const value = translations[lang]

            if (
                !value.title.trim() ||
                value.title.trim().length > 200 ||
                value.description.trim().length > 3000
            ) {
                setLanguage(lang)

                setError(
                    `Uzupełnij tytuł filmu dla języka ${lang.toUpperCase()}.`,
                )

                return
            }
        }

        if (!videoEmbed(url.trim())) {
            setError('Wklej prawidłowy link HTTPS do filmu YouTube lub Vimeo.')

            return
        }

        controller.current = new AbortController()

        try {
            await save.mutateAsync({
                id: video?.id,
                dto: {
                    url: url.trim(),
                    translations: Object.fromEntries(
                        websiteLanguages.map((lang) => [
                            lang,
                            {
                                title: translations[lang].title.trim(),
                                description:
                                    translations[lang].description.trim(),
                            },
                        ]),
                    ) as SiteVideo['translations'],
                },
                signal: controller.current.signal,
            })

            onPendingChange(false)

            onSuccess()
        } catch {
            if (!controller.current?.signal.aborted)
                setError('Nie udało się zapisać filmu. Spróbuj ponownie.')
        } finally {
            controller.current = null
        }
    }

    return (
        <FormContainer
            aria-label={video ? 'Edycja filmu' : 'Tworzenie filmu'}
            submitTitle={video ? 'Zapisz zmiany' : 'Dodaj film'}
            isPending={save.isPending}
            error={error}
            onCancel={onCancel}
            onSubmit={() => void submit()}
        >
            <TextInput
                inputTitle="Link do filmu"
                type="url"
                value={url}
                onChange={setUrl}
                maxLength={500}
                hint="YouTube lub Vimeo. Nie wklejaj kodu iframe."
                required
            />
            <LanguageTabs value={language} onChange={setLanguage} />
            <TextInput
                inputTitle={`Tytuł (${language.toUpperCase()})`}
                value={translations[language].title}
                onChange={(value) => change('title', value)}
                maxLength={200}
                required
            />
            <FormTextarea
                inputTitle={`Opis (${language.toUpperCase()})`}
                value={translations[language].description}
                onChange={(value) => change('description', value)}
                maxLength={3000}
                rows={3}
            />
            <div className={c.previewLabel}>
                Podgląd · {language.toUpperCase()}
            </div>
            <VideoPreview
                video={{ translations, url }}
                language={language}
                play
            />
        </FormContainer>
    )
}
