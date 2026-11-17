import test from 'node:test';
import assert from 'node:assert/strict';
import {musicAtoms} from './musicAtoms.mjs';
test('the five parts of the booking music preferences are read from the booking',()=>{
 const atoms=musicAtoms({order:{music:{languagePairs:[{language:'Arabic',dialect:'Egyptian'},{language:'Arabic',dialect:'Lebanese'},{language:'English',dialect:''}],genres:['House','Dabke'],suggestedSongs:[{phase:'First dance',song:'Perfect',artist:'Ed Sheeran'}],favouriteSongs:[{song:'Habibi',artist:'X',link:''},'Old song'],favouriteArtists:['Fairuz']}}});
 assert.deepEqual(atoms.languages,[{language:'Arabic',dialects:['Egyptian','Lebanese']},{language:'English',dialects:[]}]);
 assert.deepEqual(atoms.genres,['House','Dabke']);assert.equal(atoms.moments[0].moment,'First dance');assert.equal(atoms.favourites.length,2);assert.deepEqual(atoms.artists,['Fairuz']);assert.equal(atoms.requestedSongs,3);
 assert.equal(musicAtoms(null).requestedSongs,0);
});
