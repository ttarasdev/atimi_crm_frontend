'use client'

import { useState } from 'react'
import { Popup } from '@/components/ui/popup/Popup'
import { useClientContacts } from '@/shared/hooks/useClients'
import { MailMessageComposer } from '../mail-composer/MailComposer'

export function ClientMailPopup({
    clientId,
    clientName,
    onClose,
}: {
    clientId: number
    clientName: string
    onClose: () => void
}) {
    const [pending, setPending] = useState(false)

    const contacts = useClientContacts(clientId)

    return (
        <Popup
            title={`Wiadomość do ${clientName}`}
            size="wide"
            onClose={onClose}
            closeDisabled={pending}
        >
            <MailMessageComposer
                clientId={clientId}
                contacts={
                    contacts.data?.pages.flatMap((page) => page.rows) ?? []
                }
                contactsPending={contacts.isPending}
                contactsError={contacts.isError}
                onRetryContacts={() => void contacts.refetch()}
                onMoreContacts={
                    contacts.hasNextPage
                        ? () => void contacts.fetchNextPage()
                        : undefined
                }
                onPendingChange={setPending}
            />
        </Popup>
    )
}
