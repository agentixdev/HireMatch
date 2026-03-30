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

interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
}

interface JobRecommendationEmailProps {
  candidateName: string;
  jobs: RecommendedJob[];
  viewAllUrl?: string;
}

export default function JobRecommendationEmail({
  candidateName,
  jobs,
  viewAllUrl = 'https://hirematch-ten.vercel.app/jobs',
}: JobRecommendationEmailProps) {
  const topJobs = jobs.slice(0, 5);

  return (
    <Html>
      <Head />
      <Preview>{`We found ${topJobs.length} jobs you might like`}</Preview>
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
            <Heading style={heading}>Jobs you might like</Heading>
            <Text style={text}>
              Hi {candidateName || 'there'},
            </Text>
            <Text style={text}>
              Based on your profile and preferences, we think these opportunities
              could be a great fit for you:
            </Text>

            {topJobs.map((job, index) => (
              <Section key={job.id || index} style={jobCard}>
                <Text style={jobTitle}>{job.title}</Text>
                <Text style={jobCompany}>{job.company}</Text>
                <table cellPadding="0" cellSpacing="0" role="presentation">
                  <tr>
                    {job.location && (
                      <td style={jobMeta}>{job.location}</td>
                    )}
                    {job.location && job.salary && (
                      <td style={jobMetaSeparator}>&middot;</td>
                    )}
                    {job.salary && (
                      <td style={jobMeta}>{job.salary}</td>
                    )}
                  </tr>
                </table>
              </Section>
            ))}

            <Section style={buttonContainer}>
              <Button style={button} href={viewAllUrl}>
                View All Jobs
              </Button>
            </Section>
            <Text style={text}>
              New opportunities are added daily. Keep your profile updated for the best matches!
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

const jobCard: React.CSSProperties = {
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
};

const jobTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  margin: '0 0 4px',
};

const jobCompany: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '13px',
  margin: '0 0 6px',
};

const jobMeta: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: '12px',
  padding: '0',
};

const jobMetaSeparator: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.3)',
  fontSize: '12px',
  padding: '0 6px',
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
