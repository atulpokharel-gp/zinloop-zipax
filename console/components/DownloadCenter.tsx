"use client";
import Link from "next/link";
import { useState } from "react";

type OS = "windows" | "macos" | "linux";
type Arch = "amd64" | "arm64";
const OPTIONS:{key:OS; label:string; description:string; comingSoon?:boolean}[]=[
  {key:"windows",label:"Windows",description:"Windows 10/11 & managed workstations"},
  {key:"macos",label:"macOS",description:"MacBook, iMac and Apple Silicon",comingSoon:true},
  {key:"linux",label:"Linux",description:"Linux laptops and server endpoints"}
];
const ASSETS:Record<Exclude<OS,"macos">,Record<Arch,{name:string;size:string}>>={
  windows:{amd64:{name:"zinloop-windows-amd64.exe",size:"6.7 MB"},arm64:{name:"zinloop-windows-arm64.exe",size:"6.2 MB"}},
  linux:{amd64:{name:"zinloop-linux-amd64",size:"6.8 MB"},arm64:{name:"zinloop-linux-arm64",size:"6.4 MB"}}
};
export function DownloadCenter({publicPage=false}:{publicPage?:boolean}) {
  const [os,setOs]=useState<OS>("windows");
  const [arch,setArch]=useState<Arch>("amd64");
  const [copied,setCopied]=useState(false);
  const macComing=os==="macos";
  const platform:Exclude<OS,"macos">=macComing?"windows":os;
  const file=ASSETS[platform][arch].name;
  const url="https://zinloop.com/download/"+file;
  const steps=platform==="windows"?
    'Invoke-WebRequest "'+url+'" -OutFile zinloop.exe\nGet-FileHash .\\zinloop.exe -Algorithm SHA256\n.\\zinloop.exe --json --out scan.json':
    'curl -fL "'+url+'" -o zinloop\nchmod +x ./zinloop\n./zinloop --json --out scan.json';
  const download="/download/"+file;
  async function copy() {
    try {await navigator.clipboard.writeText(steps);setCopied(true);window.setTimeout(()=>setCopied(false),1800);} catch {setCopied(false);}
  }
  return <div className="download-center">
    <div className="download-platforms">
      {OPTIONS.map(o=><button key={o.key} type="button" className={"download-platform "+(o.key===os?"selected":"")+(o.comingSoon?" coming-soon":"")} aria-pressed={o.key===os} onClick={()=>{setOs(o.key);setCopied(false);}}>
        <span className="download-platform-symbol">{o.key==="windows"?"▦":o.key==="macos"?"⌘":"⌘"}</span>
        <strong>{o.label}{o.comingSoon&&<span className="download-badge"> · Coming soon</span>}</strong><span>{o.description}</span>
      </button>)}
    </div>
    {macComing?
      <section className="download-package">
        <div className="download-package-header"><div>
          <span className="download-eyebrow">macOS build</span>
          <h2>macOS scanner is coming soon</h2>
          <p className="muted">A signed and notarized macOS build is in progress. In the meantime, run Zinloop on Windows or Linux, or point the console at a saved <code>scan.json</code>.</p>
        </div><span className="endpoint-status">Coming soon</span></div>
        <div className="download-actions">
          <button type="button" className="btn" onClick={()=>{setOs("windows");setArch("amd64");}}>Switch to Windows</button>
          <button type="button" className="btn" onClick={()=>{setOs("linux");setArch("amd64");}}>Switch to Linux</button>
          <Link className="btn" href="/app/import">Open a local scan file</Link>
        </div>
        <p className="muted small">Want a note when the signed macOS build ships? <Link href="/free-scan">Create a free account</Link> and we&apos;ll email your workspace owner.</p>
      </section>:
      <section className="download-package">
        <div className="download-package-header"><div>
          <span className="download-eyebrow">Published release · v0.1.0</span>
          <h2>{platform==="windows"?"Windows":"Linux"} scanner</h2>
          <p className="muted">Standalone binary · local and offline by default · no account needed</p>
        </div><span className="endpoint-status healthy">Available</span></div>
        <div className="download-arch" role="group" aria-label="Processor architecture">
          <button type="button" className={arch==="amd64"?"selected":""} aria-pressed={arch==="amd64"} onClick={()=>setArch("amd64")}>Intel / AMD · x64</button>
          <button type="button" className={arch==="arm64"?"selected":""} aria-pressed={arch==="arm64"} onClick={()=>setArch("arm64")}>ARM64</button>
        </div>
        <div className="download-file">
          <div><b>{file}</b><p className="muted small">{ASSETS[platform][arch].size} · platform-specific build</p></div>
          <a className="btn primary" href={download}>Download binary</a>
        </div>
        <div className="download-extra">
          <a href="/download/checksums.txt">SHA-256 checksums</a>
          <a href="https://github.com/atulpokharel-gp/zinloop-zipax/releases/tag/v0.1.0" target="_blank" rel="noopener noreferrer">Release notes and assets</a>
        </div>
      </section>}
    {!macComing&&<section className="download-package">
      <h2>Run your first scan</h2>
      <p>Run a standalone binary without an upload token. The scanner reads supported local AI connector configs and writes a redacted report you can inspect in your browser.</p>
      <div className="download-code"><pre><code>{steps}</code></pre><button className="btn small" type="button" onClick={()=>void copy()}>{copied?"Copied":"Copy commands"}</button></div>
      <p className="muted small">Compare the SHA-256 output against the published checksum before running. The command above displays the hash; it does not automatically enforce verification.</p>
      <div className="download-actions">
        <Link className="btn" href="/app/import">Open a local scan file</Link>
        <Link className="btn" href="/docs">Read scanner documentation</Link>
      </div>
    </section>}
    <section className="download-package">
      <h2>Deploy to managed client laptops</h2>
      <p>MSPs should create a client-specific, revocable upload token inside the console, then deploy the scanner using their RMM or the existing platform install scripts. Do not embed MSP admin credentials into scripts.</p>
      <div className="download-actions">
        <a className="btn" href="/download/install-windows.ps1">Windows RMM script</a>
        <a className="btn" href="/download/install-unix.sh">Linux RMM script</a>
        <Link className="btn" href="/app">Choose a client</Link>
      </div>
      <p className="muted small">macOS deployment is coming soon &mdash; a signed and notarized build is in progress. After installing, open that client&apos;s page to create an upload token and view its scan findings. Secrets and raw prompts are not included in scanner reports.</p>
    </section>
    {publicPage&&<p className="muted small">Public download links use Zinloop&apos;s existing allowlisted release redirect. For a live MSI, PKG or DEB/RPM installation experience, additional platform-specific installers would be required; the current artifacts are executable binaries and install scripts.</p>}
  </div>;
}