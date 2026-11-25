import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEmailPreviewTypography} from './emailPreviewTypography.mjs';
const fonts={regular:'data:font/woff2;base64,REGULAR',bold:'data:font/woff2;base64,BOLD',headerTexture:'data:image/png;base64,GRAIN'};
test('older API HTML receives embedded IBM Plex Mono for all email text',()=>{
 const html='<html><head><title>Email</title></head><body style="font-family:Arial"><h1>Subject</h1><p>Message</p><a href="https://example.test/reset?token=unchanged">Reset</a></body></html>';
 const result=applyEmailPreviewTypography(html,fonts);
 assert.ok(result.includes(fonts.headerTexture));assert.match(result,/\.email-photo-cell,\.email-photo\{background:transparent!important\}/);assert.match(result,/background-color:#0d1418!important/);assert.match(result,/background-size:180px 180px!important/);assert.match(result,/font-family:'IBM Plex Mono'/);assert.match(result,/font-weight:400/);assert.match(result,/font-weight:700/);assert.ok(result.includes(fonts.regular)&&result.includes(fonts.bold));assert.match(result,/html,body,body \*\{font-family:[^}]+!important\}/);assert.ok(result.indexOf('email-preview-typography')<result.indexOf('</head>'));assert.ok(result.includes('<h1>Subject</h1><p>Message</p>'));assert.ok(result.includes('https://example.test/reset?token=unchanged'));
});
test('font injection handles fragments and is idempotent',()=>{
 const result=applyEmailPreviewTypography('<p>Hello</p>',fonts);
 assert.ok(result.endsWith('<p>Hello</p>'));
 assert.equal(applyEmailPreviewTypography(result,fonts),result);
});
