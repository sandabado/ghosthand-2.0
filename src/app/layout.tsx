import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { PALETTE } from '../core/config';
import './globals.css';
import './motion.css';
import './scenes.css';
import './drain.css';
import './gates.css';
import './cut.css';
import './travel.css';
import './dojo.css';
import './smithy.css';
import './signal.css';
import './journey-guide.css';
import './receipt.css';
import './summon.css';
import './work.css';
export const metadata:Metadata={title:'Ghost Hand — Command the unseen.',description:'A local cinematic foundation for Ghost Hand Studio. Sovereign craft. Human agency.',robots:{index:false,follow:false},icons:{icon:`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${PALETTE.void}"/><text x="10" y="48" font-size="45" fill="${PALETTE.candle}">手</text></svg>`)}`}};
const theme=Object.fromEntries(Object.entries(PALETTE).map(([name,value])=>[`--${name==='candleDim'?'candle-dim':name==='flash'?'white-flash':name}`,value])) as CSSProperties;
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en" style={theme}><body>{children}</body></html>;
}
