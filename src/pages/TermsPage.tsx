import { LegalPage } from "@/components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="August 14, 2026">
      <section>
        <h2>1. Accepting these terms</h2>
        <p>
          By creating an account or using UMS Messages (the website, the desktop app, or any related
          service), you agree to these terms. If you do not agree, please do not use the service.
        </p>
      </section>

      <section>
        <h2>2. Who can use UMS Messages</h2>
        <p>You must be at least 13 years old to use the service.</p>
      </section>

      <section>
        <h2>3. Your account</h2>
        <p>
          You are responsible for your account and for keeping your password and PIN safe. Let us know
          right away if you believe your account has been compromised.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>When using UMS Messages you agree not to:</p>
        <ul>
          <li>Harass, threaten, or abuse other people.</li>
          <li>Share illegal content or use the service for illegal activity.</li>
          <li>Impersonate others or misrepresent who you are.</li>
          <li>Send spam or attempt to disrupt, overload, or break the service.</li>
          <li>Attempt to access other users' accounts or data.</li>
        </ul>
        <p>We may suspend or remove accounts that break these rules.</p>
      </section>

      <section>
        <h2>5. Your content</h2>
        <p>
          You own the content you share. By posting it you give us the limited permission needed to
          store and deliver it to the people you choose (for example, delivering a message to a friend
          or showing a public story to other users). You are responsible for what you share.
        </p>
      </section>

      <section>
        <h2>6. The service</h2>
        <p>
          UMS Messages is provided free of charge, "as is" and "as available". We work to keep it fast,
          secure, and reliable, but we cannot promise it will always be uninterrupted or error-free, and
          we are not liable for losses resulting from use of the service to the extent permitted by law.
        </p>
      </section>

      <section>
        <h2>7. Ending service</h2>
        <p>
          You can stop using UMS Messages and delete your account data at any time from the Account
          page. We may suspend accounts that violate these terms or harm the service or its users.
        </p>
      </section>

      <section>
        <h2>8. Changes</h2>
        <p>
          We may update these terms as the service evolves. If we do, we will update this page and the
          date at the top. Continuing to use the service after changes means you accept the new terms.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions? Reach us via Help &amp; Support in the app, or the contact form on our homepage.
        </p>
      </section>
    </LegalPage>
  );
}
