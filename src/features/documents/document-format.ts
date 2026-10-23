const formats: Record<string, { label: string; extensions: string[] }> = {
    'application/pdf': { label: 'PDF', extensions: ['pdf'] },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        label: 'DOCX',
        extensions: ['docx'],
    },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        label: 'XLSX',
        extensions: ['xlsx'],
    },
    'image/png': { label: 'PNG', extensions: ['png'] },
    'image/jpeg': { label: 'JPG', extensions: ['jpg', 'jpeg'] },
    'image/webp': { label: 'WEBP', extensions: ['webp'] },
}

function getFormat(mimeType: string) {
    return formats[mimeType.split(';')[0].trim().toLowerCase()]
}

export function getDocumentFormat(mimeType: string) {
    return getFormat(mimeType)?.label ?? 'PLIK'
}

export function getDocumentDownloadName(name: string, mimeType: string) {
    const leaf = name.replaceAll('\\', '/').split('/').pop() ?? ''

    const label =
        Array.from(leaf)
            .filter((character) => {
                const code = character.charCodeAt(0)

                return code >= 32 && (code < 127 || code > 159)
            })
            .join('')
            .trim() || 'file'

    const format = getFormat(mimeType)

    if (!format) return label

    const extension = label.split('.').pop()?.toLowerCase()

    if (extension && format.extensions.includes(extension)) return label

    const hasFileExtension = Object.values(formats).some((item) =>
        item.extensions.includes(extension ?? ''),
    )

    const base = hasFileExtension
        ? label.slice(0, label.lastIndexOf('.'))
        : label

    return `${base}.${format.extensions[0]}`
}
