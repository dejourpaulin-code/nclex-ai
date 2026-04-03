import Navbar from "../../components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | NCLEXAI",
  description: "How NCLEXAI collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-900 hover:underline">
            &larr; Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: April 2, 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-700">

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">1. Who We Are</h2>
            <p>
              NCLEXAI (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the website nclexai.com and related
              services. We provide an AI-powered nursing study platform for nursing students
              preparing for class exams and the NCLEX licensing exam. If you have questions
              about this policy, contact us at{" "}
              <a href="mailto:support@nclexai.com" className="text-blue-900 hover:underline">
                support@nclexai.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Account information:</strong> Your email address and password when you
                create an account.
              </li>
              <li>
                <strong>Payment information:</strong> Billing details processed by Stripe. We
                do not store your full card number — Stripe handles payment data under their own
                PCI-compliant infrastructure.
              </li>
              <li>
                <strong>Usage data:</strong> Quiz answers, scores, study session history, chat
                conversations with Lexi, uploaded lecture notes and images, and feature usage
                patterns.
              </li>
              <li>
                <strong>Audio data:</strong> If you use the Live Lecture feature, audio is
                captured from your microphone, sent to OpenAI&apos;s transcription API, and
                immediately discarded. We do not store raw audio files.
              </li>
              <li>
                <strong>Device and log data:</strong> IP address, browser type, device type,
                pages visited, and timestamps, collected automatically when you use the service.
              </li>
              <li>
                <strong>Cookies and session data:</strong> We use cookies and local storage to
                maintain your login session and remember preferences.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To create and manage your account and subscription</li>
              <li>To provide, improve, and personalize the study platform</li>
              <li>To process payments and manage billing through Stripe</li>
              <li>To generate AI-powered quiz questions, analysis, and tutoring responses</li>
              <li>To track your study performance and surface weak-area insights</li>
              <li>To send transactional emails (account confirmation, password reset, receipts)</li>
              <li>To detect and prevent fraud, abuse, or unauthorized access</li>
              <li>To comply with legal obligations</li>
            </ul>
            <p className="mt-3">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">4. Third-Party Services</h2>
            <p className="mb-3">
              We share data with the following third-party service providers only as necessary
              to operate the platform:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Supabase</strong> — database, authentication, and file storage
              </li>
              <li>
                <strong>Stripe</strong> — payment processing and subscription management
              </li>
              <li>
                <strong>OpenAI</strong> — AI tutoring responses, quiz generation, lecture
                transcription, and study analysis. Audio and text sent to OpenAI is governed
                by their{" "}
                <a
                  href="https://openai.com/policies/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-900 hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </li>
              <li>
                <strong>Vercel</strong> — hosting and serverless infrastructure
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">5. Cookies</h2>
            <p>
              We use essential cookies and browser local storage to keep you logged in and
              maintain your session. We do not currently use advertising or third-party
              tracking cookies. If this changes, we will update this policy and provide notice.
              You can clear cookies through your browser settings, though doing so may log you
              out of your account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete
              your account, we will delete or anonymize your personal data within 30 days,
              except where we are required to retain it for legal or financial compliance
              reasons (e.g., billing records required by law).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">7. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
              <li>Opt out of certain data processing</li>
              <li>
                Lodge a complaint with your local data protection authority (for EU/EEA users)
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@nclexai.com" className="text-blue-900 hover:underline">
                support@nclexai.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">8. Children&apos;s Privacy</h2>
            <p>
              Our service is not directed to children under 13. We do not knowingly collect
              personal information from children under 13. If you believe a child under 13 has
              provided us with personal information, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">9. Security</h2>
            <p>
              We use industry-standard security practices including encrypted connections
              (HTTPS), hashed passwords, and access controls. No method of transmission over
              the internet is 100% secure. We cannot guarantee absolute security but take
              reasonable precautions to protect your information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              significant changes by posting the new policy on this page with a new effective
              date. Continued use of the service after changes constitutes your acceptance of
              the updated policy.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">11. Contact Us</h2>
            <p>
              For any privacy-related questions or requests, contact us at:{" "}
              <a href="mailto:support@nclexai.com" className="text-blue-900 hover:underline">
                support@nclexai.com
              </a>
            </p>
          </section>

        </div>
      </section>
    </main>
  );
}
