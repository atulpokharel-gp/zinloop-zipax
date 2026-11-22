"use client";
export default function ConsoleError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="panel"><div className="panel-body" role="alert"><p className="download-eyebrow">Connection interrupted</p><h1>We couldn’t load this view.</h1><p className="muted">Your workspace data is temporarily unavailable. Try again in a moment.</p><div className="actions"><button className="btn primary" onClick={reset}>Try again</button><a className="btn" href="/app">Back to overview</a></div></div></section>;
}
