import Link from "next/link";
import { ConsoleIcon } from "@/components/ConsoleIcon.tsx";
export default function ProductTour() {
  return <>
    <div className="page-head"><p className="overview-eyebrow">A CLEARER VIEW OF AI SECURITY</p><h1>Meet your security workspace.</h1><p className="muted">A guided tour of discovery, findings, and connected agent controls.</p></div>
    <section className="panel product-tour"><video controls playsInline preload="metadata" poster="/tour-poster.jpg" aria-label="Zinloop product tour with narration"><source src="/product-tour.mp4" type="video/mp4"/><track kind="captions" src="/product-tour.vtt" srcLang="en" label="English"/>Your browser does not support video. <a href="/product-tour.mp4">Download the product tour</a>.</video><div className="panel-body"><p className="muted small">This narrated tour uses synthetic workspace data. Runtime controls require a configured database and agents connected through the SDK.</p><div className="actions"><Link className="btn primary" href="/app/downloads"><ConsoleIcon name="downloads" size={16}/> Get the scanner</Link><Link className="btn" href="/app">Explore the workspace</Link><a className="btn" href="/product-tour.mp4" download>Download video</a></div></div></section>
  </>;
}
