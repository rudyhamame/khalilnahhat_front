import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatVenueAddress,cleanAddressText} from './venueAddressFormat.js';
test('supplied street and locality are shown as a clean postal block without guessing missing fields',()=>{
 assert.equal(formatVenueAddress({name:'Chateau Vaudreuil',address:'21700\u202fBoulevard\u202fGouin, Vaudreuil-Dorion, Quebec',city:'Vaudreuil-Dorion'}),'21700 Boulevard Gouin\nVaudreuil-Dorion QC');
 assert.equal(formatVenueAddress({address:'123 Main St'}),'123 Main St');
});
test('full search-result addresses do not repeat their venue, city, postal code or country',()=>{
 assert.equal(formatVenueAddress({name:'Grand Hall',address:'Grand Hall, 123 Main St, Toronto, Ontario m5v3a8, Canada',city:'Toronto',postalCode:'m5v3a8',country:'Canada'}),'123 Main St\nToronto ON M5V 3A8\nCanada');
});
test('postal codes use uppercase and one space while official street names and accents are preserved',()=>{
 assert.equal(cleanAddressText('123\u00a0rue de l’Église,  Montréal'),'123 rue de l’Église, Montréal');
 assert.equal(formatVenueAddress({address:'123 rue de l’Église',city:'Montréal',province:'Québec',postalCode:'h2x1y4',country:'CA'}),'123 rue de l’Église\nMontréal QC H2X 1Y4\nCanada');
});
