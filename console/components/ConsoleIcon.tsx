const paths: Record<string, string> = {
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  clients: "M3 21V7l9-4 9 4v14 M9 21v-5h6v5 M7 9h.01 M17 9h.01 M7 13h.01 M17 13h.01",
  devices: "M3 4h18v12H3z M8 21h8 M12 16v5",
  findings: "M12 3 2 21h20L12 3z M12 9v5 M12 17h.01",
  tools: "M12 3 21 8v9l-9 5-9-5V8l9-5z M3 8l9 5 9-5 M12 13v9",
  people: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  import: "M14 2H6a2 2 0 0 0-2 2v16h16V8l-6-6z M14 2v6h6 M12 11v6 M9 14l3-3 3 3",
  agents: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4z M8 12l3 3 5-6",
  downloads: "M12 3v12 M7 10l5 5 5-5 M3 16v5h18v-5",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  zipax: "M3 17l6-6 4 4 8-11 M15 4h6v6",
  play: "m9 5 11 7-11 7V5z",
  arrow: "M4 12h16 M14 6l6 6-6 6",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  key: "M14 7a5 5 0 1 1-9 3L2 13v5h5v-3h3l3-3 M16 7h.01",
};
export function ConsoleIcon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.overview} /></svg>;
}
