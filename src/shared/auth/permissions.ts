export function hasAnyRole(
    roles: readonly string[],
    allowed: readonly string[],
): boolean {
    return allowed.some((role) => roles.includes(role))
}

export function hasAllRoles(
    roles: readonly string[],
    required: readonly string[],
): boolean {
    return required.every((role) => roles.includes(role))
}
