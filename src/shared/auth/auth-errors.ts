import { ApiError, ApiResponseError } from '@/api/api-error'

export function authErrorMessage(
    error: Error,
    operation: 'login' | 'token' | 'request' | 'logout' = 'request',
): string {
    if (error instanceof ApiError) {
        if (error.status === 429)
            return 'Za dużo prób. Poczekaj chwilę i spróbuj ponownie.'

        if (error.status === 401 && operation === 'login')
            return 'Nieprawidłowy e-mail lub hasło. Sprawdź też, czy konto zostało aktywowane.'

        if (error.status === 400 && operation === 'token')
            return 'Link jest nieprawidłowy, wykorzystany lub wygasł. Poproś o nowy link.'

        if (error.status === 403)
            return 'To konto nie ma dostępu do CRM. Skontaktuj się z administratorem.'

        if (error.status === 400)
            return 'Sprawdź poprawność wprowadzonych danych.'
    }

    if (error instanceof ApiResponseError)
        return 'Serwer zwrócił nieprawidłową odpowiedź. Spróbuj ponownie.'

    if (operation === 'logout')
        return 'Nie udało się zakończyć sesji na serwerze. Sprawdź połączenie i spróbuj ponownie.'

    return 'Nie udało się połączyć z serwerem. Spróbuj ponownie za chwilę.'
}

export function isValidAuthToken(token: string | null): token is string {
    return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
}
