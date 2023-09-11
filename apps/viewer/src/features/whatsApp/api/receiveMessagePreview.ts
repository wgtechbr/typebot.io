import { publicProcedure } from '@/helpers/server/trpc'
import { whatsAppWebhookRequestBodySchema } from '@typebot.io/schemas/features/whatsapp'
import { z } from 'zod'
import { resumeWhatsAppFlow } from '../helpers/resumeWhatsAppFlow'
import { isNotDefined } from '@typebot.io/lib'
import { TRPCError } from '@trpc/server'
import { env } from '@typebot.io/env'

export const receiveMessagePreview = publicProcedure
  .meta({
    openapi: {
      method: 'POST',
      path: '/whatsapp/preview/webhook',
      summary: 'WhatsApp',
    },
  })
  .input(whatsAppWebhookRequestBodySchema)
  .output(
    z.object({
      message: z.string(),
    })
  )
  .mutation(async ({ input: { entry } }) => {
    if (!env.WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID)
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID is not defined',
      })

    const receivedMessage = entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (isNotDefined(receivedMessage)) return { message: 'No message found' }

    let contactName = ''
    let contactWaId = ''

    // Check if contacts array is defined and contains elements
    if (
      entry?.[0]?.changes?.[0]?.value?.contacts &&
      entry[0].changes[0].value.contacts.length > 0
    ) {
      for (const contact of entry[0].changes[0].value.contacts) {
        if (contact?.wa_id) {
          contactWaId = contact.wa_id;
          break;
        }
      }
      contactName = entry[0].changes[0].value.contacts[0]?.profile?.name ?? ''
    }

    return resumeWhatsAppFlow({
      receivedMessage,
      sessionId: `wa-${receivedMessage.from}-preview`,
      phoneNumberId: env.WHATSAPP_PREVIEW_FROM_PHONE_NUMBER_ID,
      contact: {
        name: contactName,
        phoneNumber: contactWaId, // Use wa_id instead of display_phone_number
      },
    })
  })
