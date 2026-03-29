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

interface ApplicationNotificationEmailProps {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  viewUrl?: string;
}

export default function ApplicationNotificationEmail({
  candidateName,
  jobTitle,
  companyName,
  viewUrl = 'https://hirematch-ten.vercel.app/dashboard/recruiter/applications',
}: ApplicationNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        New application: {candidateName} applied for {jobTitle}
      </Preview>
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
            <Heading style={heading}>New Application Received</Heading>
            <Text style={text}>
              <strong style={{ color: '#ffffff' }}>{candidateName}</strong> just
              applied for{' '}
              <strong style={{ color: '#ffffff' }}>{jobTitle}</strong>
              {companyName ? (
                <>
                  {' '}
                  at <strong style={{ color: '#ffffff' }}>{companyName}</strong>
                </>
              ) : null}
              .
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={viewUrl}>
                View Application
              </Button>
            </Section>
            <Text style={text}>
              Review their profile and respond to keep top candidates engaged.
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            &copy; {new Date().getFullYear()} HireMatch. All rights reserved.
          </Text>
          <Text style={footerSmall}>
            You received this email because you are a recruiter on HireMatch.
            You can manage your notification preferences in your dashboard
            settings.
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
