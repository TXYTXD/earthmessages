import { LegalPage } from "@/components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 14, 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          UMS Messages ("we", "us") is a messaging platform available at umsmessages.net and through
          our desktop app. This policy explains what information we collect and how we use it.
        </p>
      </section>

      <section>
        <h2>What we collect</h2>
        <ul>
          <li><strong>Account information</strong> — your email address, display name, and optional profile photo.</li>
          <li><strong>Content you create</strong> — messages, stories, comments, media you upload, and AI assistant conversations, stored so the service can deliver them to you and the people you share them with.</li>
          <li><strong>Usage data</strong> — basic technical information such as call records (who called whom and when — not the call content) and online status.</li>
          <li><strong>Support messages</strong> — if you contact support, we keep your message and email so we can reply.</li>
        </ul>
      </section>

      <section>
        <h2>How we use it</h2>
        <ul>
          <li>To provide the service: delivering messages, calls, stories, and translations.</li>
          <li>To secure accounts and prevent abuse.</li>
          <li>To respond to support requests.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data, and we do not show ads.
        </p>
      </section>

      <section>
        <h2>Storage and security</h2>
        <p>
          Your data is stored with Supabase, our database and authentication provider, and protected by
          per-user access rules. Connections to the service are encrypted in transit (HTTPS). Voice and
          video calls are transmitted peer-to-peer using WebRTC encryption.
        </p>
      </section>

      <section>
        <h2>Who can see your content</h2>
        <ul>
          <li>Messages are visible only to members of the conversation.</li>
          <li>Stories are visible to your friends, or to all signed-in users if you post them as public.</li>
          <li>Your display name and profile photo are visible to other signed-in users so they can find and recognize you.</li>
        </ul>
      </section>

      <section>
        <h2>Third-party services</h2>
        <p>
          We use a small number of processors to run the service: Supabase (data and authentication),
          Vercel (website hosting), an AI gateway for the AI assistant and translation features, and
          Tenor for GIF search. Each receives only what is needed to provide its function.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <ul>
          <li>You can edit your profile at any time from the Account page.</li>
          <li>You can delete your account data from the Account page (Delete Account).</li>
          <li>You can ask us questions or request help via Help &amp; Support in the app or the contact form on our homepage.</li>
        </ul>
      </section>

      <section>
        <h2>Children</h2>
        <p>UMS Messages is not intended for children under 13.</p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          If we change this policy, we will update this page and the date at the top.
        </p>
      </section>
    </LegalPage>
  );
}
