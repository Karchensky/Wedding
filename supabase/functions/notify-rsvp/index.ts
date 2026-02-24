import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const GMAIL_USER = Deno.env.get('GMAIL_USER')
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')
const NOTIFICATION_EMAILS = Deno.env.get('NOTIFICATION_EMAILS') || 'bryankarchensky@gmail.com'

type TableName = 'formal_rsvp' | 'informal_rsvp'

interface BasePayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
}

// Formal RSVP: guest_responses have attending (boolean); has dietary_restrictions, castle_preference
// Informal RSVP: guest_responses have response ('yes'|'no'|'not_sure'); has email, physical_address

function getTable(payload: BasePayload): TableName | null {
  const t = payload.table?.toLowerCase() ?? ''
  if (t === 'formal_rsvp' || t.endsWith('.formal_rsvp')) return 'formal_rsvp'
  if (t === 'informal_rsvp' || t.endsWith('.informal_rsvp')) return 'informal_rsvp'
  return null
}

function buildFormalEmail(payload: BasePayload): { subject: string; html: string; content: string } {
  const { record } = payload
  let responses = record.guest_responses
  if (typeof responses === 'string') {
    try {
      responses = JSON.parse(responses as string)
    } catch {
      responses = []
    }
  }
  const list = Array.isArray(responses) ? responses : []
  const attendingGuests = list.filter((r: any) => r.attending === true).map((r: any) => r.name || r.guest_name)
  const decliningGuests = list.filter((r: any) => r.attending === false).map((r: any) => r.name || r.guest_name)
  const actionWord = payload.type === 'UPDATE' ? 'Updated' : 'Received'
  const subject = payload.type === 'UPDATE'
    ? `Formal RSVP Updated: ${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'Response changed'}`
    : `New Formal RSVP: ${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'Declined'}`

  const attendingList = attendingGuests.length > 0 ? attendingGuests.join(', ') : 'None'
  const decliningList = decliningGuests.length > 0 ? decliningGuests.join(', ') : 'None'
  const accommodation = (record.castle_preference as string) || 'Not specified'
  const dietary = (record.dietary_restrictions as string) || 'None'
  const message = (record.message as string) || 'No message'
  const timestamp = new Date((record.submitted_at as string) || '').toLocaleString()

  const html = `<html><body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #333;">Wedding Formal RSVP ${actionWord}</h2>
    <h3 style="color: #4ade80;">Attending:</h3><p>${attendingList}</p>
    <h3 style="color: #f87171;">Unable to Attend:</h3><p>${decliningList}</p>
    <h3>Accommodation Preference:</h3><p>${accommodation}</p>
    <h3>Dietary Notes:</h3><p>${dietary}</p>
    <h3>Message:</h3><p>${message}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">Submitted: ${timestamp}</p>
  </body></html>`
  const content = `Formal RSVP ${actionWord}: ${attendingList} attending, ${decliningList} declined.`
  return { subject, html, content }
}

function buildInformalEmail(payload: BasePayload): { subject: string; html: string; content: string } {
  const { record } = payload
  let responses = record.guest_responses
  if (typeof responses === 'string') {
    try {
      responses = JSON.parse(responses as string)
    } catch {
      responses = []
    }
  }
  const list = Array.isArray(responses) ? responses : []
  const yesGuests = list.filter((r: any) => r.response === 'yes').map((r: any) => r.name || r.guest_name)
  const noGuests = list.filter((r: any) => r.response === 'no').map((r: any) => r.name || r.guest_name)
  const notSureGuests = list.filter((r: any) => r.response === 'not_sure').map((r: any) => r.name || r.guest_name)
  const actionWord = payload.type === 'UPDATE' ? 'Updated' : 'Received'
  const subject = payload.type === 'UPDATE'
    ? `Informal RSVP Updated: ${yesGuests.length > 0 ? yesGuests.join(', ') : 'Response changed'}`
    : `New Informal RSVP: ${yesGuests.length > 0 ? yesGuests.join(', ') : notSureGuests.length > 0 ? 'Not sure yet' : 'Declined'}`

  const yesList = yesGuests.length > 0 ? yesGuests.join(', ') : 'None'
  const noList = noGuests.length > 0 ? noGuests.join(', ') : 'None'
  const notSureList = notSureGuests.length > 0 ? notSureGuests.join(', ') : 'None'
  const message = (record.message as string) || 'No message'
  const email = (record.email as string) || '—'
  const physicalAddress = (record.physical_address as string) || '—'
  const timestamp = new Date((record.submitted_at as string) || '').toLocaleString()

  const html = `<html><body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #333;">Wedding Informal RSVP ${actionWord}</h2>
    <h3 style="color: #4ade80;">Planning to attend:</h3><p>${yesList}</p>
    <h3 style="color: #fbbf24;">Not sure yet:</h3><p>${notSureList}</p>
    <h3 style="color: #f87171;">Won't make it:</h3><p>${noList}</p>
    <h3>Email:</h3><p>${email}</p>
    <h3>Mailing address:</h3><p>${physicalAddress}</p>
    <h3>Message:</h3><p>${message}</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
    <p style="color: #666; font-size: 12px;">Submitted: ${timestamp}</p>
  </body></html>`
  const content = `Informal RSVP ${actionWord}: ${yesList} yes, ${notSureList} not sure, ${noList} no.`
  return { subject, html, content }
}

serve(async (req) => {
  try {
    const payload: BasePayload = await req.json()
    const table = getTable(payload)
    if (!table) {
      return new Response(
        JSON.stringify({ error: `Unknown table: ${payload.table}. Configure webhooks on formal_rsvp and/or informal_rsvp.` }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { subject, html, content } = table === 'formal_rsvp' ? buildFormalEmail(payload) : buildInformalEmail(payload)

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER!,
          password: GMAIL_APP_PASSWORD!,
        },
      },
    })

    await client.send({
      from: GMAIL_USER!,
      to: NOTIFICATION_EMAILS.split(',').map(e => e.trim()),
      subject,
      content,
      html,
    })

    await client.close()

    return new Response(JSON.stringify({ success: true, message: 'Email sent' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Email error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
