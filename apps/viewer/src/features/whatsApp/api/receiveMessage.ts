import { publicProcedure } from '@/helpers/server/trpc'
import { whatsAppWebhookRequestBodySchema } from '@typebot.io/schemas/features/whatsapp'
import { resumeWhatsAppFlow } from '../helpers/resumeWhatsAppFlow'
import { z } from 'zod'
import { isNotDefined } from '@typebot.io/lib'

export const receiveMessage = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/workspaces/{workspaceId}/whatsapp/phoneNumbers/{phoneNumberId}/webhook',
      summary: 'Receive WhatsApp Message',
    },
  })
  .input(
    z
      .object({ workspaceId: z.string(), phoneNumberId: z.string() })
      .merge(whatsAppWebhookRequestBodySchema)
  )
  .output(
    z.object({
      message: z.string(),
    })
  )
  .mutation(async ({ input: { entry, workspaceId, phoneNumberId } }) => {
    const receivedMessage = entry.at(0)?.changes.at(0)?.value.messages?.at(0)
    if (isNotDefined(receivedMessage)) return { message: 'No message found' }

    let contactName = ''
    let contactWaId = ''

    // Check if the contacts array is defined and contains elements
    if (
      entry.at(0)?.changes.at(0)?.value?.contacts &&
      entry.at(0)?.changes.at(0)?.value.contacts.length > 0
    ) {
      contactName = entry.at(0)?.changes.at(0)?.value.contacts[0]?.profile?.name ?? ''
      contactWaId = entry.at(0)?.changes.at(0)?.value.contacts[0]?.wa_id ?? ''
    }

    return resumeWhatsAppFlow({
      receivedMessage,
      sessionId: `wa-${phoneNumberId}-${receivedMessage.from}`,
      phoneNumberId,
      workspaceId,
      contact: {
        name: contactName,
        phoneNumber: contactWaId, // Use wa_id instead of display_phone_number
      },
    })
  })
