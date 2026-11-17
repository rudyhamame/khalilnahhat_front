import {test} from 'node:test';
import assert from 'node:assert/strict';
import {djWorkTypeText} from './djWorkTypeText.js';

test('all IDs, including LIVE, use the names and descriptions supplied by DJ Work Type',()=>{
 for(const id of ['LIVE','REMIX','MIX','CUSTOM']){
  const work={id,name:'Admin name',nameArabic:'اسم الإدارة',details:'Admin description',detailsArabic:'وصف الإدارة'};
  assert.deepEqual(djWorkTypeText(work),{name:work.name,details:work.details});
  assert.deepEqual(djWorkTypeText(work,true),{name:work.nameArabic,details:work.detailsArabic});
  assert.equal(djWorkTypeText({...work,name:'Renamed'}).name,'Renamed');
 }
});
test('missing Arabic copy falls back only to the admin English copy',()=>{
 assert.deepEqual(djWorkTypeText({id:'LIVE',name:'Live sessions',details:'From the admin'},true),{name:'Live sessions',details:'From the admin'});
 assert.deepEqual(djWorkTypeText({id:'LIVE'}),{name:'',details:''});
});
