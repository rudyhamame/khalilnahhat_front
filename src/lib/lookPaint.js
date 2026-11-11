import { cameraAppearanceFilter } from './cameraAppearance.js';
/**
 * The Beauty & lighting look, painted into any 2D context from any picture (camera, tab, image, video, the collab canvas).
 * Whole-image colour work only: exposure, contrast, tone, soft smoothing, warmth and side-light balance.
 */
export function lookActive(settings) { return Boolean(settings && (settings.strength > 0 || settings.sideLight)); }
export function paintLook(context, video, width, height, settings, mirrored = false) {
  const amount = settings.strength / 100;
  context.setTransform(mirrored ? -1 : 1, 0, 0, 1, mirrored ? width : 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.filter = amount ? cameraAppearanceFilter(settings) : 'none';
  context.drawImage(video, 0, 0, width, height);
  // A subtle blended blur softens the whole image without pixel readbacks.
  if (amount && settings.smoothing) {
    context.globalAlpha = settings.smoothing / 100 * amount * .45;
    context.filter = `${cameraAppearanceFilter(settings)} blur(${Math.max(.4, width / 1280 * 1.4)}px)`;
    context.drawImage(video, 0, 0, width, height);
  }
  context.globalAlpha = 1;
  context.filter = 'none';
  if (amount && settings.warmth) {
    context.globalCompositeOperation = 'soft-light';
    context.fillStyle = settings.warmth > 0 ? '#ffb46b' : '#83baff';
    context.globalAlpha = Math.abs(settings.warmth) / 50 * amount * .25;
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }
  if (settings.sideLight) {
    // Evens out one-sided light in screen space: lift the dark side, ease the bright side. Negative = light from the left.
    const k = Math.abs(settings.sideLight) / 100, left = settings.sideLight < 0;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'soft-light';
    const lift = context.createLinearGradient(left ? width : 0, 0, left ? 0 : width, 0);
    lift.addColorStop(0, `rgba(255,255,255,${.7 * k})`); lift.addColorStop(.7, 'rgba(255,255,255,0)');
    context.fillStyle = lift; context.fillRect(0, 0, width, height);
    const ease = context.createLinearGradient(left ? 0 : width, 0, left ? width : 0, 0);
    ease.addColorStop(0, `rgba(0,0,0,${.3 * k})`); ease.addColorStop(.7, 'rgba(0,0,0,0)');
    context.fillStyle = ease; context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  }
}
