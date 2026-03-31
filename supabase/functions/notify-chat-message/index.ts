import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, roomId, senderId, content } = await req.json();

    if (!messageId || !roomId || !senderId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if sender is an admin — only notify for admin messages
    const { data: senderRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', senderId)
      .eq('role', 'admin')
      .maybeSingle();

    if (!senderRole) {
      // Sender is not an admin, skip notifications
      return new Response(JSON.stringify({ success: true, notified: 0, reason: 'sender_not_admin' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get room info
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('name, icon')
      .eq('id', roomId)
      .single();

    // Get sender name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', senderId)
      .single();

    const senderName = senderProfile?.full_name || 'Admin';
    const roomName = room?.name || 'a chat room';
    const truncatedContent = content?.length > 100 ? content.substring(0, 100) + '...' : (content || 'New message');

    // Get all users who have notification preferences for this room
    const { data: prefs } = await supabase
      .from('chat_notification_preferences')
      .select('user_id, in_app, email, sms')
      .eq('room_id', roomId);

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter out the sender
    const recipients = prefs.filter(p => p.user_id !== senderId);
    let notified = 0;

    for (const pref of recipients) {
      // In-app notification
      if (pref.in_app) {
        await supabase.from('user_notifications').insert({
          user_id: pref.user_id,
          type: 'chat_message',
          title: `${room?.icon || '💬'} Admin update in ${roomName}`,
          message: `${senderName}: ${truncatedContent}`,
          metadata: { room_id: roomId, message_id: messageId },
        });
        notified++;
      }

      // Email notification via send-transactional-email
      if (pref.email) {
        const { data: userData } = await supabase.auth.admin.getUserById(pref.user_id);
        if (userData?.user?.email) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-transactional-email', {
              body: {
                templateName: 'chat-notification',
                recipientEmail: userData.user.email,
                idempotencyKey: `chat-notif-${messageId}-${pref.user_id}`,
                templateData: {
                  roomName: `${room?.icon || '💬'} ${roomName}`,
                  senderName,
                  messagePreview: truncatedContent,
                },
              },
            });
            if (emailError) {
              console.error(`Email notification failed:`, emailError);
            } else {
              console.log(`Email sent to ${userData.user.email}`);
              notified++;
            }
          } catch (emailErr) {
            console.error('Error sending email notification:', emailErr);
          }
        }
      }

      // SMS notification via Twilio
      if (pref.sms) {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');

        if (LOVABLE_API_KEY && TWILIO_API_KEY) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('user_id', pref.user_id)
            .single();

          if (profile?.phone) {
            try {
              const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                  'X-Connection-Api-Key': TWILIO_API_KEY,
                },
              });
              const numbersData = await numbersRes.json();
              const fromNumber = numbersData?.incoming_phone_numbers?.[0]?.phone_number;

              if (fromNumber) {
                const smsRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                    'X-Connection-Api-Key': TWILIO_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    To: profile.phone,
                    From: fromNumber,
                    Body: `${room?.icon || '💬'} Admin update in ${roomName}: ${senderName}: ${truncatedContent}`,
                  }),
                });

                if (!smsRes.ok) {
                  const errData = await smsRes.json();
                  console.error(`SMS send failed [${smsRes.status}]:`, errData);
                } else {
                  console.log(`SMS sent to ${profile.phone}`);
                  notified++;
                }
              }
            } catch (smsError) {
              console.error('Error sending SMS:', smsError);
            }
          } else {
            console.warn(`User ${pref.user_id} has SMS enabled but no phone number on profile`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, notified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in notify-chat-message:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
