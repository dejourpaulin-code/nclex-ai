import Navbar from "../../components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | NCLEXAI",
  description: "Terms and conditions for using the NCLEXAI platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-900 hover:underline">
            &larr; Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: April 2, 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-700">

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or using NCLEXAI (&quot;the Service&quot;), you agree to be bound by
              these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not
              use the Service. We may update these Terms at any time; continued use after
              changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">2. Description of Service</h2>
            <p>
              NCLEXAI is an AI-powered nursing study platform that provides adaptive quiz
              generation, AI tutoring (Lexi), lecture analysis, weak-area targeting, and
              related study tools for nursing students. The Service is intended as a
              supplemental educational tool only and does not constitute medical advice,
              clinical guidance, or professional nursing instruction.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">3. Eligibility</h2>
            <p>
              You must be at least 13 years old to use the Service. By using the Service, you
              represent that you meet this requirement and that the information you provide
              is accurate. Users under 18 should have parental consent.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">4. Accounts</h2>
            <p>
              You are responsible for maintaining the security of your account credentials.
              You must notify us immediately at{" "}
              <a href="mailto:support@nclexai.com" className="text-blue-900 hover:underline">
                support@nclexai.com
              </a>{" "}
              if you believe your account has been compromised. We are not liable for any
              losses resulting from unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">5. Subscriptions and Billing</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Access to paid features requires an active subscription. Subscription fees
                are billed on a recurring monthly or semester basis depending on your chosen
                plan.
              </li>
              <li>
                All payments are processed by Stripe. By subscribing, you authorize us to
                charge your payment method on a recurring basis until you cancel.
              </li>
              <li>
                Prices are listed in USD. We reserve the right to change pricing with
                reasonable notice. Price changes will not apply to your current billing
                period.
              </li>
              <li>
                You can cancel your subscription at any time through your Account page or
                by contacting support. Cancellation takes effect at the end of your current
                billing period. You will retain access to paid features until that date.
              </li>
              <li>
                See our{" "}
                <Link href="/refund" className="text-blue-900 hover:underline">
                  Refund &amp; Cancellation Policy
                </Link>{" "}
                for details on refunds.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">6. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use the Service for any unlawful purpose</li>
              <li>
                Attempt to reverse engineer, scrape, copy, or resell any part of the Service
              </li>
              <li>Share your account credentials or allow others to use your account</li>
              <li>
                Upload content that is harmful, abusive, infringing, or violates any law
              </li>
              <li>
                Attempt to gain unauthorized access to any part of the Service or its
                infrastructure
              </li>
              <li>
                Use the Service to generate or distribute medical advice to real patients
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">7. AI-Generated Content</h2>
            <p>
              The Service uses AI models to generate quiz questions, explanations, summaries,
              and study guidance. AI-generated content may contain errors. NCLEXAI does not
              guarantee the accuracy, completeness, or fitness of any AI-generated content
              for clinical or professional use. Always verify important clinical information
              with authoritative nursing references and your instructors.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">8. Uploaded Content</h2>
            <p>
              You retain ownership of any content you upload (notes, images, audio). By
              uploading content, you grant us a limited license to process and store that
              content solely to provide the Service to you. We do not use your uploaded
              content to train AI models or share it with third parties beyond what is
              necessary to operate the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">9. Intellectual Property</h2>
            <p>
              All content, design, code, branding, and materials on the NCLEXAI platform
              (excluding user-uploaded content) are owned by NCLEXAI and protected by
              applicable intellectual property laws. You may not reproduce, distribute, or
              create derivative works from our content without written permission.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
              ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES
              OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
              WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
              FREE OF HARMFUL COMPONENTS.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">11. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, NCLEXAI SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING
              BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR GOODWILL, ARISING OUT OF OR IN
              CONNECTION WITH YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY
              CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED
              THE AMOUNT YOU PAID US IN THE TWELVE MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">12. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time for
              violation of these Terms or for any other reason with reasonable notice. Upon
              termination, your right to use the Service ceases immediately. Provisions of
              these Terms that by their nature should survive termination will do so.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the United States. Any disputes arising
              from these Terms or your use of the Service shall be resolved through binding
              arbitration or in the courts of competent jurisdiction, and you consent to
              personal jurisdiction in such venue.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">14. Contact</h2>
            <p>
              For any questions about these Terms, contact us at:{" "}
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
