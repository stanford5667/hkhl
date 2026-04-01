import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "Asset Labs AI"

interface ChatNotificationProps {
  roomName?: string
  roomIcon?: string
  senderName?: string
  messagePreview?: string
  roomUrl?: string
}

const ChatNotificationEmail = ({
  roomName = 'a chat room',
  roomIcon = '💬',
  senderName = 'Admin',
  messagePreview = 'New message',
  roomUrl,
}: ChatNotificationProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{roomIcon} {senderName} posted in {roomName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={badge}>{roomIcon} {roomName}</Text>
        <Heading style={h1}>New Admin Update</Heading>
        <Text style={senderLabel}>From <strong>{senderName}</strong>:</Text>
        <Section style={messageBox}>
          <Text style={messageText}>{messagePreview}</Text>
        </Section>
        {roomUrl && (
          <Button style={button} href={roomUrl}>
            View in Chat
          </Button>
        )}
        <Hr style={hr} />
        <Text style={footer}>
          You're receiving this because you enabled notifications for {roomName} on {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ChatNotificationEmail,
  subject: (data: Record<string, any>) =>
    `${data.roomIcon || '💬'} ${data.senderName || 'Admin'} posted in ${data.roomName || 'a chat room'}`,
  displayName: 'Chat room notification',
  previewData: {
    roomName: 'Market Discussion',
    roomIcon: '📊',
    senderName: 'John',
    messagePreview: 'Just published a new analysis on the Q2 earnings season. Check it out and let me know your thoughts!',
    roomUrl: 'https://assetlabs.ai/community/chat/example',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const badge = {
  fontSize: '13px',
  color: 'hsl(215, 16%, 47%)',
  margin: '0 0 8px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: '700' as const,
  color: 'hsl(222, 47%, 11%)',
  margin: '0 0 16px',
}
const senderLabel = {
  fontSize: '14px',
  color: 'hsl(222, 47%, 11%)',
  margin: '0 0 12px',
}
const messageBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '16px',
  borderLeft: '3px solid hsl(220, 90%, 56%)',
  margin: '0 0 24px',
}
const messageText = {
  fontSize: '14px',
  color: 'hsl(222, 47%, 11%)',
  lineHeight: '1.6',
  margin: '0',
}
const button = {
  backgroundColor: 'hsl(220, 90%, 56%)',
  color: '#ffffff',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 24px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '0 0 24px',
}
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', lineHeight: '1.5', margin: '0' }
