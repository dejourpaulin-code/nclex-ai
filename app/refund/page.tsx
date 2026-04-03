import Navbar from "../../components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Refund & Cancellation Policy | NCLEXAI",
  description: "NCLEXAI refund and cancellation policy for subscriptions.",
};

export default function RefundPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-8">
          <Link href="/" className="text-sm text-blue-900 hover:underline">
            &larr; Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Refund &amp; Cancellation Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: April 2, 2026</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-700">

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">1. Cancellations</h2>
            <p>
              You may cancel your NCLEXAI subscription at any time. Cancellations take
              effect at the end of your current billing period. You will continue to have
              full access to your plan&apos;s features until that date — we do not cut off
              access early when you cancel.
            </p>
            <p className="mt-3">
              To cancel, go to your{" "}
              <Link href="/account" className="text-blue-900 hover:underline">
                Account page
              </Link>{" "}
              and click &quot;Manage Billing.&quot; This opens the Stripe billing portal where you
              can cancel your subscription directly. You can also email us at{" "}
              <a href="mailto:support@nclexai.com" className="text-blue-900 hover:underline">
                support@nclexai.com
              </a>{" "}
              and we will cancel it for you.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">2. Refunds</h2>
            <p className="mb-3">
              We offer refunds on a case-by-case basis under the following conditions:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong>Within 48 hours of purchase:</strong> If you have not meaningfully
                used the platform (fewer than 10 quiz questions answered or 2 Lexi
                conversations), you may request a full refund within 48 hours of your
                initial payment.
              </li>
              <li>
                <strong>Technical issues:</strong> If a verified technical problem on our
                end prevented you from accessing paid features and we were unable to
                resolve it within a reasonable time, we will issue a prorated refund for
                the affected period.
              </li>
              <li>
                <strong>Duplicate charges:</strong> If you were charged more than once in
                error, we will refund the duplicate charge immediately.
              </li>
            </ul>
            <p className="mt-3">
              We do not offer refunds for partial months, unused time on semester or
              multi-month plans, or for change of mind after the 48-hour window.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">3. Semester and Multi-Month Plans</h2>
            <p>
              Semester, 3-Semester, and Full Program plans are billed upfront for the full
              period. These plans are non-refundable after 48 hours from the initial
              purchase date, except in cases of verified technical failure on our end.
              We encourage you to try the monthly plan first if you are unsure.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">4. How to Request a Refund</h2>
            <p>
              Email us at{" "}
              <a href="mailto:support@nclexai.com" className="text-blue-900 hover:underline">
                support@nclexai.com
              </a>{" "}
              with the subject line &quot;Refund Request&quot; and include your account email address
              and the reason for your request. We will respond within 2 business days.
              Approved refunds are processed through Stripe and typically appear on your
              statement within 5&ndash;10 business days.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">5. Free Plan</h2>
            <p>
              The free tier of NCLEXAI is available at no charge. There is nothing to
              refund for free accounts.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">6. Contact</h2>
            <p>
              Questions about billing or refunds? Reach us at:{" "}
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
