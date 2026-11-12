import {Search} from 'lucide-react';
import {useState} from 'react';
import WorkElementCard from './WorkElementCard';
import {useWorkElementsCatalog} from './useWorkElementsCatalog';
import {elementGroups,visibleElements} from './workElementsCatalog';
import './workElementsAdmin.css';
import './workElementsCardDesign.css';

export default function WorkElementsAdmin({token}){
 const {elements:catalog,error,loading,update}=useWorkElementsCatalog(token,{initialize:true});
 const [query,setQuery]=useState('');
 const elements=visibleElements(catalog),sections=elementGroups(elements,query);
 const cards=rows=><div className="work-elements-grid">{rows.map(element=><WorkElementCard key={element.id} element={element} elements={elements} token={token} onUpdate={update}/>)}</div>;
 return <section className="work-elements-admin" aria-labelledby="work-elements-title">
  <header><div><h1 id="work-elements-title">Work Elements</h1><p>Shared options for recording fields and collection filters.</p></div><label className="work-element-search"><Search size={16}/><input type="search" aria-label="Find work element" placeholder="Find a work element" value={query} onChange={event=>setQuery(event.target.value)}/></label></header>
  {error&&<p role="alert" className="work-elements-error">{error}</p>}
  {loading?<p className="admin-loading">Loading work elements…</p>:<div className="work-elements-sections">{sections.map(section=><section key={section.id} className="work-elements-section" aria-labelledby={`work-section-${section.id}`}>
   <h2 id={`work-section-${section.id}`}>{section.title}</h2>
   {section.cards?cards(section.cards):section.groups.map(group=><section key={group.id} className="work-elements-subsection" aria-labelledby={`work-subsection-${group.id}`}><h3 id={`work-subsection-${group.id}`}>{group.title}</h3>{cards(group.cards)}</section>)}
  </section>)}{!sections.length&&<p>No work elements match your search.</p>}</div>}
 </section>;
}
