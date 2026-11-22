// Zipax public landing. Zipax is frozen for Zinloop v1 per the 2026-10-29 CEO
// decision — this page exists so /zipax does not 404 for existing developer
// accounts and public-profile viewers. It routes them to the two surfaces that
// still work (/zipax/claim for a private invite, /zipax/settings to toggle
// public visibility) and to the already-live /leaderboard.

import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Zipax",
  description: "Zinloop's developer profile surface. Frozen for v1 — existing profiles still work; new feature work paused.",
};

export default function ZipaxLanding() {
  return (
    <section className="section">
      <div className="wrap stack" style={{ gap: 28, maxWidth: 820 }}>
        <div className="stack" style={{ gap: 14 }}>
          <p className="eyebrow">Zinloop · Zipax</p>
          <h1 className="disp h1">Developer builder profiles</h1>
          <p className="lead">
            Zipax measures how you code with AI assistants and turns the signal into an opt-in public
            profile. It&rsquo;s how a Zinloop user can claim credit for their work without exposing
            prompts, code or tokens.
          </p>
          <p className="muted small">
            <b>Status:</b> frozen for Zinloop v1 (2026-10-29). Existing profiles, claims and the
            public leaderboard keep working. No new Zipax feature work is scheduled until the MSP
            v1 ships.
          </p>
        </div>

        <div className="grid3" style={{ marginTop: 8 }}>
          <div className="card">
            <h3>Claim a profile</h3>
            <p className="body">
              You received a private invite link in your settings. Open <code>/zipax/claim</code>
              with that token to attach a Zipax profile to your Zinloop account.
            </p>
            <p>
              <Link className="link" href="/zipax/settings">Open settings &rarr;</Link>
            </p>
          </div>
          <div className="card">
            <h3>Toggle public visibility</h3>
            <p className="body">
              Pick which of the five builder dimensions appear on your public profile. Default is
              private; nothing is public until you flip the switch.
            </p>
            <p>
              <Link className="link" href="/zipax/settings">Open settings &rarr;</Link>
            </p>
          </div>
          <div className="card">
            <h3>Public leaderboard</h3>
            <p className="body">
              Developers who opted in rank publicly across the five dimensions. Scores are
              computed server-side; nobody sees anyone else&rsquo;s prompts or code.
            </p>
            <p>
              <Link className="link" href="/leaderboard">Open leaderboard &rarr;</Link>
            </p>
          </div>
        </div>

        <div className="band" style={{ padding: 20, marginTop: 24 }}>
          <p className="small muted" style={{ margin: 0 }}>
            Why frozen? Zipax is a developer-reputation surface; Zinloop v1 is an MSP-channel
            product for AI connector security. Shipping both at once would split team focus. The
            Zipax tables, migrations and routes are preserved so existing users are not disrupted.
          </p>
        </div>
      </div>
    </section>
  );
}
