export interface EmailDto {
    email: string
}

export interface LoginManagerDto extends EmailDto {
    password: string
}

export interface TokenDto {
    token: string
}

export interface ResetPasswordDto extends TokenDto {
    password: string
}

export interface LoginResponse {
    token: string
}

export interface SuccessResponse {
    success: true
}

export interface ChangeEmailDto {
    currentPassword: string
    newEmail: string
}

export interface ChangePasswordDto {
    currentPassword: string
    password: string
}

export interface ConfirmEmailChangeResponse extends SuccessResponse {
    completed: boolean
}
