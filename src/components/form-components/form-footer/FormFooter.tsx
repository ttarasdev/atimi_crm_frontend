import { Button } from '@/components/ui/button/Button'
import c from './FormFooter.module.scss'

export function FormFooter({
    title = 'Zapisz',
    pendingTitle = 'Zapisywanie…',
    isPending = false,
    submitDisabled = false,
    onCancel,
}: {
    title?: string
    pendingTitle?: string
    isPending?: boolean
    submitDisabled?: boolean
    onCancel?: () => void
}) {
    return (
        <div className={c.buttons}>
            {onCancel && (
                <Button
                    type="button"
                    className={c.cancel}
                    disabled={isPending}
                    onClick={onCancel}
                >
                    Anuluj
                </Button>
            )}
            <Button
                type="submit"
                className={c.submit}
                pending={isPending}
                disabled={submitDisabled}
            >
                {isPending ? pendingTitle : title}
            </Button>
        </div>
    )
}
