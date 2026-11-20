// A virtual camera (OBS) already carries the finished picture, so the Studio must not add its own filters or face detection on top.
export const isVirtualCamera=label=>/obs|virtual|v4l2loopback|ndi/i.test(label||'');
