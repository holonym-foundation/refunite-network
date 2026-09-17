import { Container } from "@/components/ui/Container";

export const metadata = {
  title: "Privacy Policy | RelayID",
  description: "Privacy policy for the RelayID application by Refugees United USA",
};

export default function PrivacyPolicyPage() {
  return (
    <Container>
      <div className="max-w-4xl mx-auto py-12 px-4">
        <article className="privacy-policy-content">
          <h1 className="text-5xl font-bold mb-8">Privacy Policy for RelayID</h1>
          <p className="text-lg mb-8">
            <strong>Last Updated:</strong> October 4, 2025
            <br />
            <strong>Effective Date:</strong> October 4, 2025
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">1. Introduction</h2>
          <p className="mb-6 leading-relaxed text-base">
            Refugees United USA (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates
            the RelayID mobile application and website at{" "}
            <a href="https://relayid.refunite.org/" target="_blank" rel="noopener noreferrer">
              https://relayid.refunite.org/
            </a>{" "}
            (collectively, the &ldquo;Service&rdquo;). This Privacy Policy explains how we collect,
            use, disclose, and safeguard your information when you use our Service.
          </p>
          <p className="mb-6 leading-relaxed text-base">
            We are committed to protecting your privacy and handling your data in an open and
            transparent manner. This Privacy Policy applies to all users of RelayID.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">2. Information We Collect</h2>

          <h3 className="text-xl font-semibold mt-8 mb-4">2.1 Personal Information You Provide</h3>
          <p className="mb-6 leading-relaxed text-base">
            When you create an account with RelayID, we collect:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Email address OR Phone number</strong> - Used for account creation and
              authentication
            </li>
          </ul>

          <p className="mb-6 leading-relaxed text-base">
            <strong>Biometric Authentication (Optional):</strong>
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Face ID or other biometric data</strong> - If you enable biometric sign-in,
              this authentication is handled by third-party authentication providers. The biometric
              data is processed and stored by these providers according to their security standards
              and is not directly accessed or stored by RelayID. We only receive a confirmation
              token that authentication was successful.
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4">
            2.2 Automatically Collected Information
          </h3>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Device Information</strong> - We use ua-parser-js to collect device type,
              operating system, browser type, and version for analytics and support
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4">2.3 Cookies and Tracking Technologies</h3>
          <p className="mb-6 leading-relaxed text-base">
            Our infrastructure providers may use cookies for authentication and session management.
            We do not use third-party advertising or tracking cookies.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">3. How We Use Your Information</h2>
          <p className="mb-6 leading-relaxed text-base">We use the information we collect for:</p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Account Management</strong> - Creating and managing your RelayID account
            </li>
            <li>
              <strong>Authentication</strong> - Verifying your identity for sign-in
            </li>
            <li>
              <strong>WhatsApp/SMS Integration</strong> - Enabling wallet operations and
              verification through accessible channels
            </li>
            <li>
              <strong>Service Improvement</strong> - Analyzing usage patterns to enhance
              functionality
            </li>
            <li>
              <strong>Technical Support</strong> - Responding to inquiries and providing assistance
            </li>
            <li>
              <strong>Security</strong> - Protecting against unauthorized access
            </li>
            <li>
              <strong>Aid Distribution</strong> - Facilitating humanitarian aid through your
              self-custodial wallet
            </li>
          </ul>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">4. Purpose of RelayID</h2>
          <p className="mb-6 leading-relaxed text-base">
            RelayID is a decentralized identity system developed by Refugees United USA in
            collaboration with human.tech that empowers refugees, internally displaced persons, and
            vulnerable communities.
          </p>

          <p className="mb-6 leading-relaxed text-base">
            <strong>What RelayID Provides:</strong>
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Self-Sovereign Digital Identity</strong> - Persistent identity without
              government documents or centralized institutions
            </li>
            <li>
              <strong>Financial Access</strong> - Direct access to stablecoin-based aid, donations,
              and remittances through self-custodial wallets
            </li>
            <li>
              <strong>Privacy-Preserving Technology</strong> - Cryptographic tools enabling
              selective disclosure of identity information
            </li>
            <li>
              <strong>Community-Based Verification</strong> - Peer-to-peer validation through
              trusted community leaders
            </li>
            <li>
              <strong>Transparent Aid Distribution</strong> - Blockchain-based tracking ensuring
              funds reach intended recipients while maintaining privacy
            </li>
          </ul>

          <p className="mb-6 leading-relaxed text-base">
            <strong>How It Works:</strong>
          </p>
          <p className="mb-6 leading-relaxed text-base">
            RelayID operates through simple, accessible interfaces (WhatsApp, SMS, Face ID) in
            low-connectivity environments. Community leaders create self-custodial Human Wallets
            using email or phone, receive and distribute stablecoin-based aid, and coordinate
            resources - all without traditional infrastructure.
          </p>
          <p className="mb-6 leading-relaxed text-base">
            Built on Refunite&rsquo;s network of 100,000+ community leaders reaching 135 million
            people across Africa, RelayID enables direct humanitarian aid delivery while protecting
            user data and dignity.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">5. How We Share Your Information</h2>

          <h3 className="text-xl font-semibold mt-8 mb-4">
            5.1 Service Providers and Infrastructure
          </h3>
          <p className="mb-6 leading-relaxed text-base">We share your email/phone with:</p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Account Infrastructure Providers</strong> - For authentication and account
              management
            </li>
            <li>
              <strong>Biometric Authentication Providers</strong> - Third-party services handling
              Face ID/fingerprint (they process biometric data; we only receive confirmation tokens)
            </li>
            <li>
              <strong>human.tech Network</strong> - Decentralized infrastructure powering
              cryptographic identity and self-custodial wallets
            </li>
            <li>
              <strong>Blockchain Networks</strong> - Your public blockchain address (unlinkable to
              email/phone) is recorded on Ethereum-based blockchains for transparency
            </li>
          </ul>

          <p className="mb-6 leading-relaxed text-base">
            <strong>Privacy Protections:</strong>
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>Blockchain address is cryptographically unlinkable to your email/phone</li>
            <li>Biometric data processed by third parties, never accessed by RelayID</li>
            <li>Human Network derives keys without seeing your original information</li>
            <li>Zero-knowledge cryptography minimizes data exposure</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4">5.2 Legal Requirements</h3>
          <p className="mb-6 leading-relaxed text-base">
            We may disclose information if required by law or valid requests by public authorities.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-4">5.3 What We Don&rsquo;t Do</h3>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>We do NOT sell your personal information</li>
            <li>We do NOT share with advertisers or marketing companies</li>
            <li>We do NOT maintain PII beyond authentication needs</li>
          </ul>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">6. Data Storage and Security</h2>

          <h3 className="text-xl font-semibold mt-8 mb-4">6.1 Data Location and Architecture</h3>
          <p className="mb-6 leading-relaxed text-base">
            <strong>Off-Chain Data:</strong>
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>Database with pseudonymous onboarding invites stored in the European Union</li>
            <li>Email/phone stored only for authentication</li>
          </ul>

          <p className="mb-6 leading-relaxed text-base">
            <strong>On-Chain Data:</strong>
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>Public blockchain address and transactions on Ethereum-based blockchains</li>
            <li>Records are pseudonymous and unlinkable to your identity</li>
            <li>Immutable and transparent by design</li>
            <li>No personally identifiable information on blockchain</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4">6.2 Cryptographic Privacy</h3>
          <p className="mb-6 leading-relaxed text-base">RelayID uses advanced cryptography:</p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Key Derivation</strong> - Keys derived through collaborative Human Network
              process without seeing your data
            </li>
            <li>
              <strong>Zero-Knowledge Proofs</strong> - Verification without revealing underlying
              data
            </li>
            <li>
              <strong>Multi-Party Computation</strong> - No single party has complete information
            </li>
            <li>
              <strong>Biometric Privacy</strong> - Device-based biometrics never leave your device;
              provider-based biometrics processed per their standards
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-4">6.3 Data Access</h3>
          <p className="mb-6 leading-relaxed text-base">
            Only authorized Refugees United USA staff and contractors access off-chain data.
            Blockchain data is publicly viewable but consists only of pseudonymous addresses
            unlinkable to identity.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-4">6.4 Security Measures</h3>
          <p className="mb-6 leading-relaxed text-base">
            We implement appropriate technical and organizational security measures. However, no
            internet transmission or electronic storage is 100% secure.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">7. Data Retention</h2>
          <p className="mb-6 leading-relaxed text-base">
            We retain email/phone while your account is active. Upon deletion, we remove
            authentication credentials from active systems.
          </p>
          <p className="mb-6 leading-relaxed text-base">
            Pseudonymous usage data may be retained for analytics to improve the Service.
          </p>
          <p className="mb-6 leading-relaxed text-base">
            <strong>Note:</strong> Blockchain transaction records are permanent due to blockchain
            immutability, but contain only pseudonymous addresses unlinkable to your identity.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">8. Your Rights and Choices</h2>
          <p className="mb-6 leading-relaxed text-base">
            Depending on your location, you may have rights including:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Access</strong> - Request a copy of your personal information
            </li>
            <li>
              <strong>Correction</strong> - Request correction of inaccurate information
            </li>
            <li>
              <strong>Deletion</strong> - Request deletion of your account and off-chain data
            </li>
            <li>
              <strong>Objection</strong> - Object to certain processing
            </li>
            <li>
              <strong>Portability</strong> - Request data transfer to another service
            </li>
          </ul>
          <p className="mb-6 leading-relaxed text-base">
            Contact us using Section 13 to exercise these rights.
          </p>
          <p className="mb-6 leading-relaxed text-base">
            <strong>Important:</strong> Off-chain data can be deleted, but blockchain records are
            permanent (though pseudonymous and unlinkable to you).
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">9. Children&rsquo;s Privacy</h2>
          <p className="mb-6 leading-relaxed text-base">
            RelayID has no age restrictions but protects all users&rsquo; privacy, including minors.
            Parents/guardians concerned about children&rsquo;s data should contact us.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">10. International Data Transfers</h2>
          <p className="mb-6 leading-relaxed text-base">
            If accessing from outside the EU, your information may be transferred to and processed
            in the EU where our database is located. By using the Service, you consent to this
            transfer.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">11. Changes to This Privacy Policy</h2>
          <p className="mb-6 leading-relaxed text-base">
            We may update this Privacy Policy periodically. Changes are effective when posted. We
            encourage periodic review.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">
            12. Third-Party Services and Blockchain Transparency
          </h2>

          <h3 className="text-xl font-semibold mt-8 mb-4">12.1 Third-Party Links</h3>
          <p className="mb-6 leading-relaxed text-base">
            Our Service may link to third-party sites. We recommend reviewing their privacy
            policies. We&rsquo;re not responsible for their practices.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-4">12.2 Public Blockchain Disclosure</h3>
          <p className="mb-6 leading-relaxed text-base">
            <strong>Important:</strong> RelayID uses public blockchain technology (Ethereum-based
            networks):
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              Your wallet&rsquo;s public address and transaction history are visible on public
              blockchain explorers
            </li>
            <li>Anyone can view transactions associated with your blockchain address</li>
            <li>
              However, your blockchain address is cryptographically unlinkable to your email, phone,
              or real-world identity
            </li>
            <li>No personally identifiable information is recorded on blockchain</li>
          </ul>
          <p className="mb-6 leading-relaxed text-base">
            Public blockchains provide transparency and immutability essential for humanitarian aid
            accountability. Your privacy is protected through pseudonymity and cryptographic
            separation.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-4">12.3 Stablecoin Transactions</h3>
          <p className="mb-6 leading-relaxed text-base">Stablecoin transactions (USDC/USDT):</p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>Recorded on public blockchains for transparency</li>
            <li>Viewable by anyone using your public wallet address</li>
            <li>Cannot be linked to your personal identity by third parties</li>
            <li>Provide proof of aid distribution for donor accountability</li>
          </ul>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">13. Contact Us</h2>
          <p className="mb-6 leading-relaxed text-base">
            If you have questions about this Privacy Policy or our privacy practices:
          </p>
          <p className="mb-6 leading-relaxed text-base">
            <strong>Refugees United USA</strong>
          </p>
          <p className="mb-6 leading-relaxed text-base">Email: gb@refunite.org</p>
          <p className="mb-6 leading-relaxed text-base">
            Address: <br />
            Refugees United Foundation USA
            <br />
            548 Market St
            <br />
            San Francisco, CA 94194-5401
            <br />
          </p>
          <p className="mb-6 leading-relaxed text-base">
            Website:{" "}
            <a href="https://relayid.refunite.org/" target="_blank" rel="noopener noreferrer">
              https://relayid.refunite.org/
            </a>
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">14. Legal Basis for Processing (GDPR)</h2>
          <p className="mb-6 leading-relaxed text-base">
            If you&rsquo;re an EEA resident, we process your personal information based on:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>
              <strong>Consent</strong> - You&rsquo;ve given permission for specific purposes
            </li>
            <li>
              <strong>Legitimate Interests</strong> - Processing necessary for our interests
              (improving Service, facilitating humanitarian aid) without overriding your rights
            </li>
            <li>
              <strong>Legal Obligation</strong> - Processing necessary to comply with law
            </li>
          </ul>
          <p className="mb-6 leading-relaxed text-base">
            You may withdraw consent anytime by deleting your account or contacting us.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">15. California Privacy Rights (CCPA)</h2>
          <p className="mb-6 leading-relaxed text-base">
            California residents have specific rights:
          </p>
          <ul className="mb-6 ml-6 list-disc space-y-2">
            <li>Right to know what personal information we collect, use, disclose, and sell</li>
            <li>Right to request deletion (note: blockchain records cannot be deleted)</li>
            <li>Right to opt-out of data sales (Note: We do NOT sell personal information)</li>
            <li>Right to non-discrimination for exercising CCPA rights</li>
          </ul>
          <p className="mb-6 leading-relaxed text-base">
            Contact us using Section 13 to exercise these rights.
          </p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">16. Data Protection Officer</h2>
          <p className="mb-6 leading-relaxed text-base">
            For data protection and privacy questions:
          </p>
          <p className="mb-6 leading-relaxed text-base">Email: gb@refunite.org</p>

          <hr className="my-12 border-gray-300 dark:border-gray-700" />

          <h2 className="text-3xl font-bold mt-12 mb-6">For Users</h2>
          <p className="mb-6 leading-relaxed text-base">
            By using RelayID, you acknowledge that you have read and understood this Privacy Policy
            and agree to its terms.
          </p>

          <p className="mb-6 leading-relaxed text-base">
            <strong>Version:</strong> 1.0
            <br />
            <strong>Document ID:</strong> RelayID-Privacy-Policy-2025
          </p>
        </article>
      </div>
    </Container>
  );
}
