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
    responses: { name: string; attending: boolean }[]
    dietary_notes: string
    message: string
    accommodation_preference: string
    created_at: string
  }
  old_record: any
}

serve(async (req) => {
  try {
    const payload: RSVPPayload = await req.json()
    const { record } = payload
    
    const attendingGuests = record.responses.filter(r => r.attending).map(r => r.name)
    const decliningGuests = record.responses.filter(r => !r.attending).map(r => r.name)
    
    const subject = payload.type === 'UPDATE' 
      ? `RSVP Updated: ${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'Response changed'}`
      : `New RSVP: ${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'Declined'}`
    
    const emailBody = `
      <h2>Wedding RSVP ${payload.type === 'UPDATE' ? 'Updated' : 'Received'}</h2>
      
      <h3>Attending:</h3>
      <p>${attendingGuests.length > 0 ? attendingGuests.join(', ') : 'None'}</p>
      
      <h3>Unable to Attend:</h3>
      <p>${decliningGuests.length > 0 ? decliningGuests.join(', ') : 'None'}</p>
      
      <h3>Accommodation Preference:</h3>
      <p>${record.accommodation_preference || 'Not specified'}</p>
      
      <h3>Dietary Notes:</h3>
      <p>${record.dietary_notes || 'None'}</p>
      
      <h3>Message:</h3>
      <p>${record.message || 'No message'}</p>
      
      <hr>
      <p style="color: #666; font-size: 12px;">
        Submitted: ${new Date(record.created_at).toLocaleString()}
      </p>
    `
    
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
      content: "Please view this email in HTML format.",
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

