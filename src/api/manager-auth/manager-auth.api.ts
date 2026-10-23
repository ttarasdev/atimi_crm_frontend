import { http } from '../http'
import type { RequestOptions } from '../http.types'
import type {
    EmailDto,
    LoginManagerDto,
    TokenDto,
    ResetPasswordDto,
    LoginResponse,
    SuccessResponse,
    ChangeEmailDto,
    ChangePasswordDto,
    ConfirmEmailChangeResponse,
} from './manager-auth.types'

const BASE = '/manager-auth'

export const managerAuthApi = {
    login: (dto: LoginManagerDto, options?: RequestOptions) =>
        http.post<LoginResponse>(`${BASE}/login`, dto, {
            ...options,
            auth: false,
        }),
    forgotPassword: (dto: EmailDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/forgot-password`, dto, {
            ...options,
            auth: false,
        }),
    resendConfirmation: (dto: EmailDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/resend-confirmation`, dto, {
            ...options,
            auth: false,
        }),
    confirmEmail: (dto: TokenDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/confirm-email`, dto, {
            ...options,
            auth: false,
        }),
    resetPassword: (dto: ResetPasswordDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/reset-password`, dto, {
            ...options,
            auth: false,
        }),
    logout: (options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/logout`, undefined, options),

    changeEmail: (dto: ChangeEmailDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/change-email`, dto, options),

    changePassword: (dto: ChangePasswordDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/change-password`, dto, options),

    confirmEmailChange: (dto: TokenDto, options?: RequestOptions) =>
        http.post<ConfirmEmailChangeResponse>(
            `${BASE}/confirm-email-change`,
            dto,
            { ...options, auth: false },
        ),

    confirmPasswordChange: (dto: TokenDto, options?: RequestOptions) =>
        http.post<SuccessResponse>(`${BASE}/confirm-password-change`, dto, {
            ...options,
            auth: false,
        }),
}
