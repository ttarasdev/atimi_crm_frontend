'use client'

import c from './WebsiteContent.module.scss'

export const websiteLanguages = ['pl', 'en', 'ua', 'de'] as const

export type WebsiteLanguage = (typeof websiteLanguages)[number]

const labels = { pl: 'Polski', en: 'English', ua: 'Українська', de: 'Deutsch' }

export function LanguageTabs({
    value,
    onChange,
}: {
    value: WebsiteLanguage
    onChange: (value: WebsiteLanguage) => void
}) {
    return (
        <div className={c.tabs} role="group" aria-label="Język treści">
            {websiteLanguages.map((language) => (
                <button
                    type="button"
                    key={language}
                    onClick={() => onChange(language)}
                    aria-pressed={value === language}
                    className={value === language ? c.selected : ''}
                >
                    {labels[language]}
                </button>
            ))}
        </div>
    )
}
