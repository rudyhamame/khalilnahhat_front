// model-viewer lowers its render scale (down to 0.25) when frames are slow, which blurs every 3D object on the page. Keep full resolution.
export const loadModelViewer=()=>import('@google/model-viewer').then(module=>{module.ModelViewerElement.minimumRenderScale=1;});
