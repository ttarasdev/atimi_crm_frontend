import { Check, Eye } from 'lucide-react'
import type { MailTemplate } from '@/api/mail/mail.types'
import { Button } from '@/components/ui/button/Button'
import c from './MailTemplateCard.module.scss'

export function MailTemplateCard({
    template,
    selected = false,
    disabled = false,
    compact = false,
    onChoose,
    onPreview,
    companyName = 'Twoja firma',
}: {
    template: MailTemplate
    selected?: boolean
    disabled?: boolean
    compact?: boolean
    onChoose: () => void
    onPreview?: () => void
    companyName?: string
}) {
    return (
        <div
            className={`${c.card} ${selected ? c.selected : ''} ${compact ? c.compact : ''}`}
        >
            <button
                type="button"
                className={c.choose}
                onClick={onChoose}
                disabled={disabled}
                aria-pressed={selected}
                aria-label={`Wybierz szablon ${template.name}`}
            >
                <div className={c.thumbnail} aria-hidden="true">
                    <strong>{companyName}</strong>
                    <i />
                    <i />
                    <i className={c.short} />
                    <div className={c.footer}>{companyName}</div>
                </div>
                <div className={c.info}>
                    <span className={c.name}>
                        <span className={c.language}>
                            {template.language.toUpperCase()}
                        </span>
                        <span
                            className={c.nameText}
                            lang={
                                template.language === 'ua'
                                    ? 'uk'
                                    : template.language
                            }
                        >
                            {template.name}
                        </span>
                        {selected && (
                            <Check
                                size={15}
                                className={c.check}
                                aria-hidden="true"
                            />
                        )}
                    </span>
                    <p>{template.description}</p>
                </div>
            </button>
            {onPreview && (
                <Button
                    className={c.preview}
                    type="button"
                    onClick={onPreview}
                    aria-label={`Podgląd szablonu ${template.name}`}
                >
                    <Eye size={15} aria-hidden="true" />
                    Podgląd
                </Button>
            )}
        </div>
    )
}
