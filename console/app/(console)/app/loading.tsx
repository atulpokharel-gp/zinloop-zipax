export default function Loading() {
  return <div className="console-loading" role="status" aria-label="Loading workspace"><div className="skeleton skeleton-title"/><div className="tiles">{[0,1,2,3].map(n=><div key={n} className="tile skeleton" style={{height:140}}/>)}</div><div className="panel skeleton" style={{height:310}}/><span className="sr-only">Loading your workspace…</span></div>;
}
