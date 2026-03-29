import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
  Heading,
} from '@react-email/components';
import * as React from 'react';

interface StatusUpdateEmailProps {
  candidateName: string;
  jobTitle: string;
  status: string;
  applicationsUrl?: string;
}

const statusMessages: Record<string, string> = {
  shortlisted: "Great news! You've been shortlisted.",
  interview: "You've been invited to interview.",
  offered: "Congratulations! You've received an offer.",
  rejected:
    "Unfortunately, they've decided to move forward with other candidates.",
};

export default function StatusUpdateEmail({
  candidateName,
  jobTitle,
  status,
  applicationsUrl = 'https://hirematch-ten.vercel.app/dashboard/candidate/applications',
}: StatusUpdateEmailProps) {
  const displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
  const message = statusMessages[status] || `Your status has been updated to: ${displayStatus}`;

  return (
    <Html>
      <Head />
      <Preview>Application update: {jobTitle}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={logoSection}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: '0 auto' }}>
              <tr>
                <td style={logoIcon}>H</td>
                <td style={logoText}>HireMatch</td>
              </tr>
            </table>
          </Section>
          <Section style={card}>
            <Heading style={heading}>Application Update</Heading>
            <Text style={text}>Hi {candidateName},</Text>
            <Text style={text}>
              Your application for{' '}
              <strong style={{ color: '#ffffff' }}>{jobTitle}</strong> has been
              updated.
            </Text>
            <Section style={statusBadge}>
              <Text style={statusText}>Status: {displayStatus}</Text>
            </Section>
            <Text style={text}>{message}</Text>
            <Section style={buttonContainer}>
              <Button style={button} href={applicationsUrl}>
                View Applications
              </Button>
            </Section>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            &copy; {new Date().getFullYear()} HireMatch. All rights reserved.
          </Text>
          <Text style={footerSmall}>
            You received this email because you have an active application on
            HireMatch. You can manage your notification preferences in your
            dashboard settings.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: '#0F172A',
  margin: 0,
  padding: 0,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const container: React.CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '40px 24px',
};

const logoSection: React.CSSProperties = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logoIcon: React.CSSProperties = {
  width: '40px',
  height: '40px',
  background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
  borderRadius: '10px',
  color: '#ffffff',
  fontWeight: 'bold',
  fontSize: '18px',
  textAlign: 'center' as const,
  verticalAlign: 'middle',
};

const logoText: React.CSSProperties = {
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#ffffff',
  paddingLeft: '10px',
  verticalAlign: 'middle',
};

const card: React.CSSProperties = {
  backgroundColor: '#0F172A',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '12px',
  padding: '32px',
};

const heading: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const text: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.7)',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const statusBadge: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '20px 0',
  padding: '16px',
  backgroundColor: 'rgba(99, 102, 241, 0.1)',
  border: '1px solid rgba(99, 102, 241, 0.2)',
  borderRadius: '8px',
};

const statusText: React.CSSProperties = {
  color: '#818cf8',
  fontSize: '16px',
  fontWeight: 600,
  margin: 0,
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const button: React.CSSProperties = {
  display: 'inline-block',
  padding: '12px 32px',
  background: 'linear-gradient(90deg, #2563eb, #4f46e5)',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 600,
  borderRadius: '8px',
  fontSize: '15px',
};

const hr: React.CSSProperties = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '24px 0',
};

const footer: React.CSSProperties = {
  textAlign: 'center' as const,
  color: 'rgba(255, 255, 255, 0.3)',
  fontSize: '12px',
  margin: '0 0 8px',
};

const footerSmall: React.CSSProperties = {
  textAlign: 'center' as const,
  color: 'rgba(255, 255, 255, 0.2)',
  fontSize: '11px',
  margin: '0',
};
