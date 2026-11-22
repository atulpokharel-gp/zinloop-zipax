"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConsoleIcon } from "./ConsoleIcon.tsx";
const GROUPS=[
  {title:"OPERATIONS",items:[
    {label:"Overview",href:"/app",glyph:"⌂"},
    {label:"Clients",href:"/app/clients",glyph:"▦"},
    {label:"Devices",href:"/app/devices",glyph:"▣"},
    {label:"Findings",href:"/app/findings",glyph:"⚑"},
    {label:"AI tools",href:"/app/tools",glyph:"◇"},
    {label:"People",href:"/app/people",glyph:"♙"},
    {label:"Scan file explorer",href:"/app/import",glyph:"◎"}
  ]},
  {title:"AGENT GOVERNANCE",items:[
    {label:"Agent Control Plane",href:"/app/agents",glyph:"✳"}
  ]},
  {title:"DEPLOY & MANAGE",items:[
    {label:"Scanner downloads",href:"/app/downloads",glyph:"⇩"},
    {label:"Team & settings",href:"/app/settings",glyph:"⚙"}
  ]},
  {title:"DEVELOPERS",items:[
    {label:"Zipax",href:"/app/zipax",glyph:"◈"},
    {label:"Team profile",href:"/app/zipax/team",glyph:"▤"}
  ]}
];
export function ConsoleNavigation({settingsVisible}:{settingsVisible:boolean}) {
  const path=usePathname();
  const allItems=GROUPS.flatMap(g=>g.items);
  const selected=allItems.filter(i=>path===i.href||(i.href!=="/app"&&path.startsWith(i.href+"/"))).sort((a,b)=>b.href.length-a.href.length)[0]?.href;
  const icons:Record<string,string>={Overview:"overview",Clients:"clients",Devices:"devices",Findings:"findings","AI tools":"tools",People:"people","Scan file explorer":"import","Agent Control Plane":"agents","Scanner downloads":"downloads","Team & settings":"settings",Zipax:"zipax","Team profile":"people"};
  return <nav className="console-nav" aria-label="MSP console navigation">
    {GROUPS.map(group=><div className="console-nav-group" key={group.title}>
      <p className="console-nav-label">{group.title}</p>
      {group.items.filter(item=>settingsVisible || item.href!=="/app/settings").map(item=>{
        const active=selected===item.href;
        return <Link key={item.label} href={item.href} aria-current={active?"page":undefined}>
          <ConsoleIcon name={icons[item.label]}/>{item.label}
        </Link>;
      })}
    </div>)}
  </nav>;
}