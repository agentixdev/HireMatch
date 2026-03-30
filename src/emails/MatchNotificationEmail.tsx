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

interface MatchedJob {
  id: string;
  title: string;
  company: string;
  score: number;
  location?: string;
}

interface MatchNotificationEmailProps {
  candidateName: string;
  matches: MatchedJob[];
  viewUrl?: string;
}

export default function MatchNotificationEmail({
  candidateName,
  matches,
  viewUrl = 'https://hirematch-ten.vercel.app/dashboard/candidate/applications',
}: MatchNotificationEmailProps) {
  const topMatches = matches.slice(0, 3);

  return (
    <Html>
      <Head />
      <Preview>{`You have ${topMatches.length} new job matches!`}</Preview>
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
            <Heading style={heading}>You have new job matches!</Heading>
            <Text style={text}>
              Hi {candidateName || 'there'},
            </Text>
            <Text style={text}>
              Our AI found {topMatches.length} new job{topMatches.length !== 1 ? 's' : ''} that
              match your profile. Here are your top matches:
            </Text>

            {topMatches.map((match, index) => (
              <Section key={match.id || index} style={matchCard}>
                <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: '100%' }}>
                  <tr>
                    <td style={{ verticalAlign: 'top' }}>
                      <Text style={matchTitle}>{match.title}</Text>
                      <Text style={matchCompany}>{match.company}</Text>
                      {match.location && (
                        <Text style={matchLocation}>{match.location}</Text>
                      )}
                    </td>
                    <td style={scoreBadgeContainer}>
                      <span style={scoreBadge}>{match.score}%</span>
                    </td>
                  </tr>
                </table>
              </Section>
            ))}

            <Section style={buttonContainer}>
              <Button style={button} href={viewUrl}>
                View Matches
              </Button>
            </Section>
            <Text style={text}>
              Don&apos;t miss out — the best opportunities go fast!
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            &copy; {new Date().getFullYear()} HireMatch. All rights reserved.
          </Text>
          <Text style={footerSmall}>
            You received this email because you are a candidate on HireMatch.
            You can manage your notification preferences in your dashboard settings.
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

const matchCard: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
};

const matchTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  margin: '0 0 4px',
};

const matchCompany: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '13px',
  margin: '0 0 2px',
};

const matchLocation: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: '12px',
  margin: '0',
};

const scoreBadgeContainer: React.CSSProperties = {
  verticalAlign: 'middle',
  textAlign: 'right' as const,
  width: '60px',
};

const scoreBadge: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 10px',
  background: 'linear-gradient(90deg, #2563eb, #4f46e5)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  borderRadius: '20px',
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
