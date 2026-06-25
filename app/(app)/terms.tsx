import { useState } from 'react';
import { ScrollView, View, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { ProfileHeader } from './profile';

/**
 * Official legal documents. Where the web renders a full HTML page (e.g.
 * swisdex.com/terms), we open that route so the mobile experience matches the
 * web exactly; the rest open their hosted PDF under /pdfs/terms/<file>.
 * Filenames preserve the on-disk spelling (spaces + the "privcy"/"complient"
 * typos) — only the visible labels are spelled correctly.
 */
const SITE_BASE = 'https://swisdex.com';

interface LegalDoc {
  title: string;
  description: string;
  /** Web route (rendered HTML page) — preferred, matches the web. */
  route?: string;
  /** PDF filename under /pdfs/terms/ — used when there's no HTML route. */
  file?: string;
  sizeKB?: number;
}

const PDF_DOCS: LegalDoc[] = [
  {
    title: 'Terms & Conditions',
    description: 'The core agreement between you and SwisDex — eligibility, account rules, and conduct.',
    route: 'terms',
  },
  {
    title: 'Privacy Policy',
    description: 'What personal data we collect, how it is processed, your rights under GDPR / UK-DPA.',
    route: 'privacy',
  },
  {
    title: 'Promotional & Service Terms',
    description: 'Specific rules for welcome bonuses, fixed-return plans, trade insurance, and IB rewards.',
    file: 'SwisDex Promotional & Service Terms and Conditions.pdf',
    sizeKB: 24,
  },
  {
    title: 'Deposit & Withdrawal Policy',
    description: 'Accepted rails, processing windows, fees, and the verification steps for fund movement.',
    route: 'deposit-withdrawal',
  },
  {
    title: 'Client Fund Security',
    description: 'Segregated banking, cold storage of crypto, insurance cover, and our negative-balance protection.',
    file: 'Client Fund Security.pdf',
    sizeKB: 24,
  },
  {
    title: 'Compliance & Dispute Resolution',
    description: 'Our AML / KYC framework, complaint-handling timelines, and the dispute escalation path.',
    file: 'complient and dispute.pdf',
    sizeKB: 22,
  },
];

const pdfUrl = (file: string) => `${SITE_BASE}/pdfs/terms/${encodeURI(file)}`;
const docUrl = (doc: LegalDoc) => (doc.route ? `${SITE_BASE}/${doc.route}` : doc.file ? pdfUrl(doc.file) : SITE_BASE);
const docMeta = (doc: LegalDoc) => (doc.route ? 'Web page' : `PDF · ${doc.sizeKB ?? ''} KB`);

/** 14 numbered sections — wording preserved verbatim from the client PDF. */
const SECTIONS: { h: string; clauses: { n: string; body: string }[] }[] = [
  {
    h: '1. Acceptance of Terms',
    clauses: [
      { n: '1.1', body: 'By accessing or using any services, products, platforms, or tools offered by Swisdex (hereinafter referred to as "Swisdex"), you agree to be bound by these Terms & Conditions. If you do not agree with any part of these terms, you should not access or use any Swisdex services.' },
      { n: '1.2', body: 'These Terms & Conditions apply to all users, clients, visitors, and customers of Swisdex, whether registered or unregistered. By accessing or using the platform, you acknowledge and accept these Terms & Conditions.' },
    ],
  },
  {
    h: '2. Binding Agreement',
    clauses: [
      { n: '2.1', body: 'By registering for an account or using Swisdex services, you enter into a legally binding agreement with Swisdex.' },
      { n: '2.2', body: 'You acknowledge that your continued use of Swisdex services constitutes acceptance of these Terms & Conditions and any additional policies, agreements, disclosures, or legal documentation published by Swisdex.' },
    ],
  },
  {
    h: '3. Eligibility and Age Requirement',
    clauses: [
      { n: '3.1', body: 'To use Swisdex services, you must be at least eighteen (18) years old or the legal age required to enter into a binding agreement in your jurisdiction.' },
      { n: '3.2', body: 'By opening an account, you confirm that all information provided is accurate and that you meet the eligibility requirements.' },
      { n: '3.3', body: 'Providing false information regarding your identity, age, or residency is strictly prohibited and may result in immediate account suspension or termination.' },
    ],
  },
  {
    h: '4. Trading Risk Disclosure',
    clauses: [
      { n: '4.1', body: 'Forex, commodities, cryptocurrencies, indices, and CFD trading involve substantial risk and may not be suitable for all investors.' },
      { n: '4.2', body: 'You acknowledge that you may lose part or all of your deposited funds and that past performance does not guarantee future results.' },
      { n: '4.3', body: 'Swisdex does not guarantee profits, returns, or successful trading outcomes unless explicitly stated under a specific promotional program governed by separate terms.' },
      { n: '4.4', body: 'Clients are solely responsible for their trading decisions and investment activities.' },
    ],
  },
  {
    h: '5. Account Registration and Security',
    clauses: [
      { n: '5.1', body: 'Clients must provide accurate, complete, and up-to-date information during registration.' },
      { n: '5.2', body: 'You are responsible for maintaining the confidentiality of your account credentials, passwords, and security information.' },
      { n: '5.3', body: 'Swisdex shall not be liable for losses arising from unauthorized access resulting from your failure to protect account credentials.' },
    ],
  },
  {
    h: '6. Deposits and Withdrawals',
    clauses: [
      { n: '6.1', body: 'Clients may fund their accounts using payment methods approved by Swisdex.' },
      { n: '6.2', body: 'Withdrawal requests are subject to verification, compliance checks, and anti-money laundering (AML) procedures.' },
      { n: '6.3', body: 'Swisdex reserves the right to request additional identification documents before processing withdrawals.' },
      { n: '6.4', body: 'Processing times may vary depending on the selected payment method and verification requirements.' },
    ],
  },
  {
    h: '7. Bonuses, Promotions, and Trade Insurance',
    clauses: [
      { n: '7.1', body: 'Any bonuses, deposit promotions, referral rewards, trade insurance programs, or special offers are subject to separate promotional terms.' },
      { n: '7.2', body: 'Swisdex reserves the right to modify, suspend, or cancel promotional programs at any time without prior notice.' },
      { n: '7.3', body: 'Abuse, manipulation, arbitrage, or fraudulent use of promotional programs may result in cancellation of rewards and account restrictions.' },
    ],
  },
  {
    h: '8. Referral and Introducing Broker (IB) Program',
    clauses: [
      { n: '8.1', body: 'Participants in the Referral Program and IB Program must comply with all applicable laws and ethical marketing standards.' },
      { n: '8.2', body: 'Swisdex reserves the right to adjust, withhold, or revoke commissions generated through fraudulent, misleading, or prohibited activities.' },
      { n: '8.3', body: 'Referral and IB commissions are subject to qualification requirements outlined in the relevant program documentation.' },
    ],
  },
  {
    h: '9. Anti-Money Laundering (AML) and Compliance',
    clauses: [
      { n: '9.1', body: 'Swisdex maintains strict AML and Know Your Customer (KYC) procedures.' },
      { n: '9.2', body: 'Clients may be required to provide identification documents, proof of address, and other verification materials.' },
      { n: '9.3', body: 'Swisdex reserves the right to suspend or terminate accounts involved in suspicious, illegal, or non-compliant activities.' },
    ],
  },
  {
    h: '10. Limitation of Liability',
    clauses: [
      { n: '10.1', body: 'Swisdex shall not be liable for any indirect, incidental, consequential, or special damages arising from the use of its services.' },
      { n: '10.2', body: 'Swisdex is not responsible for losses resulting from market volatility, technical failures, internet disruptions, third-party service interruptions, or force majeure events.' },
    ],
  },
  {
    h: '11. Suspension and Termination',
    clauses: [
      { n: '11.1', body: 'Swisdex reserves the right to suspend, restrict, or terminate any account that violates these Terms & Conditions or applicable regulations.' },
      { n: '11.2', body: 'Upon termination, clients must immediately cease using Swisdex services.' },
    ],
  },
  {
    h: '12. Amendments',
    clauses: [
      { n: '12.1', body: 'Swisdex reserves the right to modify, update, or replace these Terms & Conditions at any time.' },
      { n: '12.2', body: 'Continued use of Swisdex services after updates become effective constitutes acceptance of the revised Terms & Conditions.' },
    ],
  },
  {
    h: '13. Governing Law',
    clauses: [
      { n: '13.1', body: 'These Terms & Conditions shall be governed by and interpreted in accordance with the laws applicable to the jurisdiction under which Swisdex operates.' },
      { n: '13.2', body: 'Any disputes arising from these Terms & Conditions shall be subject to the exclusive jurisdiction of the relevant courts or arbitration authorities.' },
    ],
  },
  {
    h: '14. Contact Information',
    clauses: [
      { n: '', body: 'For any questions, support requests, or concerns regarding these Terms & Conditions, please contact the Swisdex Support Team at support@swisdex.com.' },
      { n: '', body: 'By registering for an account and using Swisdex services, you confirm that you have read, understood, and agreed to these Terms & Conditions.' },
    ],
  },
];

const RISK_DISCLAIMER =
  'Trading foreign exchange (forex) and other leveraged financial products carries a high level of risk and may not be suitable for all investors. Leverage can work both for and against you — while it amplifies potential profits, it equally amplifies potential losses. You could sustain a loss of some or all of your initial investment and should not invest money that you cannot afford to lose. You should be aware of all the risks associated with leveraged trading and seek independent financial advice if you have any doubts. Past performance is not indicative of future results.';

async function openDoc(doc: LegalDoc) {
  const url = docUrl(doc);
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => {});
  }
}

export default function TermsScreen() {
  const theme = useTheme();
  // Default every section open so the page reads top-to-bottom like the web
  // terms page (all clauses visible); still collapsible per section.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    SECTIONS.reduce<Record<string, boolean>>((acc, s) => { acc[s.h] = true; return acc; }, {}),
  );

  const toggle = (h: string) => setOpen((prev) => ({ ...prev, [h]: !prev[h] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Terms & Conditions' }} />
      <ProfileHeader title="Terms & Conditions" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="bodyMd" weight="bold">Swisdex — Terms and Conditions</Text>
          <Text variant="body" tone="tertiary">Last updated: June 2026</Text>
          <View style={{ height: theme.spacing[2] }} />
          <Text variant="body" tone="secondary">
            The rules that govern your use of SwisDex. Read carefully before you trade.
          </Text>
        </View>
        <Divider />

        {/* Official documents */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
          <Text variant="label" tone="tertiary">OFFICIAL DOCUMENTS</Text>
        </View>
        {PDF_DOCS.map((doc) => (
          <View key={doc.title}>
            <Pressable
              onPress={() => void openDoc(doc)}
              haptic="light"
              style={({ pressed }) => ({
                paddingHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[3],
                backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd" weight="medium">{doc.title}</Text>
                  <Text variant="body" tone="tertiary">{doc.description}</Text>
                  <Text variant="labelXs" tone="tertiary">{docMeta(doc)}</Text>
                </View>
                <Text variant="labelXs" tone="accent" weight="bold">OPEN</Text>
              </View>
            </Pressable>
            <Divider inset={theme.spacing[4]} />
          </View>
        ))}

        {/* Collapsible sections */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2], paddingTop: theme.spacing[4] }}>
          <Text variant="label" tone="tertiary">FULL TERMS</Text>
        </View>
        {SECTIONS.map(({ h, clauses }) => {
          const isOpen = !!open[h];
          return (
            <View key={h}>
              <Pressable
                onPress={() => toggle(h)}
                haptic="light"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <Text variant="bodyMd" weight="bold" style={{ flex: 1 }}>{h}</Text>
                {isOpen ? (
                  <ChevronDown size={18} color={theme.colors.text.tertiary} />
                ) : (
                  <ChevronRight size={18} color={theme.colors.text.tertiary} />
                )}
              </Pressable>
              {isOpen ? (
                <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3], gap: theme.spacing[2] }}>
                  {clauses.map((c, i) => (
                    <Text key={c.n || String(i)} variant="bodyMd" tone="secondary">
                      {c.n ? <Text variant="bodyMd" weight="bold">{c.n} </Text> : null}
                      {c.body}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Divider inset={theme.spacing[4]} />
            </View>
          );
        })}

        {/* Contact card */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4] }}>
          <View
            style={{
              padding: theme.spacing[4],
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border.accent,
              backgroundColor: theme.colors.buyBg,
            }}
          >
            <Text variant="bodyMd" weight="bold">Swisdex Support Team</Text>
            <Pressable onPress={() => Linking.openURL('mailto:support@swisdex.com')} haptic="light">
              <Text variant="bodyMd" tone="accent">Email: support@swisdex.com</Text>
            </Pressable>
          </View>
        </View>

        {/* Risk disclaimer box */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4] }}>
          <View
            style={{
              padding: theme.spacing[4],
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: 'rgba(255,92,92,0.45)',
              backgroundColor: 'rgba(255,92,92,0.10)',
            }}
          >
            <Text variant="bodyMd" weight="bold" style={{ color: '#FF5C5C' }}>Risk Disclaimer</Text>
            <View style={{ height: theme.spacing[2] }} />
            <Text variant="bodyMd" tone="secondary">{RISK_DISCLAIMER}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
