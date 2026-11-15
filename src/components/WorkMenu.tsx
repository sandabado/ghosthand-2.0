'use client';
import {useRef} from 'react';
import {navigate} from '../core/director';
import {useJourney} from '../core/world';
import '../app/navigation.css';

export default function WorkMenu(){
  const menu=useRef<HTMLDetailsElement>(null),scene=useJourney(state=>state.scene);
  const select=(target:'DOJO'|'CRAFT_F4')=>{if(menu.current)menu.current.open=false;navigate(target);};
  return <details ref={menu} className="studio-work-menu" onKeyDown={event=>{if(event.key==='Escape'&&menu.current?.open){event.preventDefault();menu.current.open=false;menu.current.querySelector('summary')?.focus({preventScroll:true});}}}><summary>Work <span aria-hidden="true">＋</span></summary><div>
    <a href="#work-wishh" aria-current={scene==='DOJO'?'page':undefined} onClick={event=>{event.preventDefault();select('DOJO');}}>Wishh</a>
    <a href="#work-whole-body" aria-current={scene==='CRAFT_F4'?'page':undefined} onClick={event=>{event.preventDefault();select('CRAFT_F4');}}>Whole Body</a>
  </div></details>;
}
