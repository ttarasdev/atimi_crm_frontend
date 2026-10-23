import type {
    ClientStatus,
    ClientPriority,
    ClientPaymentStatus,
} from '@/api/clients/clients.types'
import type { ClientProcessStatus } from '@/api/client-processes/client-processes.types'
import type { ClientProcessStageStatus } from '@/api/client-process-stages/client-process-stages.types'
import { ApiError } from '@/api/api-error'

export const clientStatuses: Record<
    ClientStatus,
    { title: string; color: string }
> = {
    new: { title: 'Nowy', color: '#4676B4' },
    active: { title: 'Aktywny', color: '#3C9181' },
    paused: { title: 'Wstrzymany', color: '#B18B4E' },
    completed: { title: 'Zakończony', color: '#6B7FA6' },
    lost: { title: 'Utracony', color: '#B46F7C' },
}

export const clientPaymentStatuses: Record<
    ClientPaymentStatus,
    { title: string; color: string }
> = {
    unpaid: { title: 'Nieopłacone', color: '#dc2626' },
    partial: { title: 'Częściowo opłacone', color: '#946200' },
    paid: { title: 'Opłacone', color: '#16803d' },
}

export function paymentAmountLabel(amount: string, currency: string) {
    const [whole, fraction = ''] = amount.split('.')

    return `${new Intl.NumberFormat('pl-PL').format(BigInt(whole))},${fraction.padEnd(2, '0')} ${currency === 'PLN' ? 'zł' : currency}`
}

export const clientPriorities: Record<ClientPriority, string> = {
    normal: 'Standard',
    high: 'Wysoki',
    vip: 'VIP',
}

export const processStatuses: Record<ClientProcessStatus, string> = {
    active: 'W toku',
    completed: 'Zakończona',
    archived: 'Archiwalna',
}

export const stageStatuses: Record<ClientProcessStageStatus, string> = {
    planned: 'Zaplanowany',
    active: 'W toku',
    done: 'Zakończony',
}

export function clientActionError(error: unknown) {
    if (error instanceof ApiError) {
        const message = error.messages.join(' ')

        if (message.includes('Complete all tasks'))
            return 'Najpierw wykonaj wszystkie otwarte zadania tego etapu.'

        if (message.includes('Complete all stages'))
            return 'Najpierw zakończ wszystkie etapy tej sprawy.'

        if (message.includes('Remove stage contents'))
            return 'Etap zawiera wpisy. Usuń lub odłącz jego zawartość przed usunięciem etapu.'

        if (message.includes('Contact already exists'))
            return 'Ten kontakt jest już przypisany do klienta.'

        if (message.includes('Document already attached'))
            return 'Ten dokument jest już przypisany.'

        if (message.includes('Restore the client'))
            return 'Przywróć klienta z archiwum przed edycją.'

        if (message.includes('Reactivate the process'))
            return 'Otwórz sprawę ponownie przed edycją.'

        if (message.includes('Reopen the stage'))
            return 'Otwórz etap ponownie przed edycją.'

        if (message.includes('Invalid email'))
            return 'Wpisz poprawny adres e-mail.'

        if (message.includes('Invalid phone'))
            return 'Wpisz poprawny numer telefonu z kodem kraju.'

        if (message.includes('Invalid Telegram'))
            return 'Wpisz poprawną nazwę użytkownika Telegram.'
    }

    if (error instanceof ApiError && error.status === 409)
        return 'Operacja nie jest możliwa w obecnym stanie danych. Sprawdź otwarte zadania i powiązane wpisy.'

    if (error instanceof ApiError && error.status === 403)
        return 'Nie masz uprawnień do zmiany tych danych.'

    if (error instanceof ApiError && error.status === 400)
        return 'Sprawdź dane formularza i spróbuj ponownie.'

    return 'Nie udało się zapisać zmiany. Spróbuj ponownie.'
}
