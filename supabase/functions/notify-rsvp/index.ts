import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts"

const GMAIL_USER = Deno.env.get('GMAIL_USER')
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')
const NOTIFICATION_EMAILS = Deno.env.get('NOTIFICATION_EMAILS') || 'bryankarchensky@gmail.com'

interface RSVPPayload {
  type: 'INSERT' | 'UPDATE'
  table: string
  record: {
    id: string
    invitation_id: string
    guest_responses: { name: string; attending: boolean }[]
    dietary_restrictions: string
    message: string
    castle_preference: string
    submitted_at: string
  }
  old_record: any
}

serve(async (req) => {
  try {
    const payload: RSVPPayload = await req.json()
    const { record } = payload
    
    let responses = record.guest_responses
    if (typeof responses === 'string') {
      responses = JSON.parse(responses)
    }
    
    const attendingGuests = responses.filter((r: any) => r.attending).map((r: any) => r.name)
    const decliningGuests = responses.filter((r: any) => !r.attending).map((r: any) => r.name)
    
    const subject = payload.type === 'UPDATE' 
      ? `RSVP Updated: ${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'Response changed'}`
      : `New RSVP: ${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'Declined'}`
    
    const attendingList = attendingGuests.length > 0 ? attendingGuests.join(', ') : 'None'
    const decliningList = decliningGuests.length > 0 ? decliningGuests.join(', ') : 'None'
    const accommodation = record.castle_preference || 'Not specified'
    const dietary = record.dietary_restrictions || 'None'
    const message = record.message || 'No message'
    const timestamp = new Date(record.submitted_at).toLocaleString()
    const actionWord = payload.type === 'UPDATE' ? 'Updated' : 'Received'
    
    const emailBody = `<html><body style="font-family: Arial, sans-serif; padding: 20px;"><h2 style="color: #333;">Wedding RSVP ${actionWord}</h2><h3 style="color: #4ade80;">Attending:</h3><p>${attendingList}</p><h3 style="color: #f87171;">Unable to Attend:</h3><p>${decliningList}</p><h3>Accommodation Preference:</h3><p>${accommodation}</p><h3>Dietary Notes:</h3><p>${dietary}</p><h3>Message:</h3><p>${message}</p><hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;"><p style="color: #666; font-size: 12px;">Submitted: ${timestamp}</p></body></html>`
    
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
      subject: subject,
      content: `RSVP ${actionWord}: ${attendingList} attending, ${decliningList} declined.`,
      html: emailBody,
    })
    
    await client.close()

    return new Response(JSON.stringify({ success: true, message: 'Email sent' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Email error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
