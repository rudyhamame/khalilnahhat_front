import headerTexture from '/images/email-music-header.png?inline';
import regular from '../assets/fonts/ibm-plex-mono-latin-400.woff2?inline';
import bold from '../assets/fonts/ibm-plex-mono-latin-700.woff2?inline';
import {applyEmailPreviewTypography} from './emailPreviewTypography.mjs';

export const emailPreviewHtml=html=>applyEmailPreviewTypography(html,{regular,bold,headerTexture});
