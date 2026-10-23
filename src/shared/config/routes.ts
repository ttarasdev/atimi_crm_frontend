export const routes = {
    auth: '/auth',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    confirmEmail: '/auth/confirm-email',
    confirmEmailChange: '/auth/confirm-email-change',
    confirmPasswordChange: '/auth/confirm-password-change',
    main: '/main',
    profile: '/main/profile',
} as const

/** Accept only internal private destinations, including their query and hash. */
export function getSafeReturnPath(value: string | null | undefined): string {
    if (!value || /[\\\u0000-\u0020]/.test(value)) return routes.main

    try {
        const url = new URL(value, 'https://crm.invalid')

        if (
            !value.startsWith('/') ||
            url.origin !== 'https://crm.invalid' ||
            (url.pathname !== routes.main &&
                !url.pathname.startsWith(`${routes.main}/`))
        )
            return routes.main

        return `${url.pathname}${url.search}${url.hash}`
    } catch {
        return routes.main
    }
}
