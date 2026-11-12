import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyDialect,normalizeArabic} from './dialectDetection.js';
test('normalisation drops diacritics and unifies letters',()=>{assert.equal(normalizeArabic('أَنَا هُنَا').trim().replace(/\s+/g,' '),'انا هنا');});
test('Egyptian markers win',()=>{
 const r=classifyDialect('ازاي يا حبيبي انا عايز اشوفك دلوقتي ده كلام جميل اوي وانت مش فاهم كده');
 assert.equal(r.dialects[0].name,'Egyptian');
});
test('Lebanese markers win',()=>{
 const r=classifyDialect('شو بدك هلق كتير منيح هيدا الشي بدي قلك هيك ليش عم تقول هيدي الحكي');
 assert.equal(r.dialects[0].name,'Lebanese');
});
test('Gulf markers win',()=>{
 const r=classifyDialect('شلون الحال وايد حلو ابغى اشوفك هالحين زين وش تسوي اليوم ياخي');
 assert.equal(r.dialects[0].name,'Gulf');
});
test('mixed or empty text is reported honestly',()=>{
 assert.equal(classifyDialect('كلمه كلمه').dialects.length,0);
 assert.equal(classifyDialect('الذي سوف قال لقد هذا الكتاب التي حيث لماذا ماذا الان').dialects[0].name,'Standard');
});
