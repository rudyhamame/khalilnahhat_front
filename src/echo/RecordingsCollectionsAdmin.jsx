import {useEffect,useState} from 'react';
import {fetchOntologyRecordings} from '../lib/musicOntology';
import CollectionBuilder from './CollectionBuilder';
import './musicOntology.css';

// Standalone admin tab: hand-build the Collections shown on the public archive.
export default function RecordingsCollectionsAdmin({token}){
 const [recordings,setRecordings]=useState([]),[error,setError]=useState('');
 useEffect(()=>{let alive=true;fetchOntologyRecordings({},{token}).then(rows=>{if(alive)setRecordings(rows);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[token]);
 return <section className="ontology-admin"><div className="ontology-admin-main"><header className="ontology-heading"><div><h1>Collections</h1><p>Hand-pick and order recordings into the sets shown on the Music Archive.</p></div></header>{error&&<p role="alert" className="ontology-alert">{error}</p>}<CollectionBuilder token={token} recordings={recordings}/></div></section>;
}
