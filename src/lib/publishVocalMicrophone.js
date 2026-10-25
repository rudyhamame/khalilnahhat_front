// Create and process before publishing so no uncorrected startup audio is sent.
// Processor failure is recoverable; a publication failure must release capture.
export async function publishVocalMicrophone(participant, { audio, processor, isCurrent = () => true, onFallback = () => {} }) {
  const tracks = await participant.createTracks({ audio, video: false });
  const microphone = tracks.find(track => track.kind === 'audio');
  if (!microphone) { tracks.forEach(track => track.stop()); throw new Error('No microphone track was created.'); }
  tracks.filter(track => track !== microphone).forEach(track => track.stop());
  try {
    if (!isCurrent()) throw new Error('Broadcast was closed.');
    let processed = false;
    try { await microphone.setProcessor(processor); processed = true; }
    catch { await processor.destroy(); onFallback(); }
    if (!isCurrent()) throw new Error('Broadcast was closed.');
    const publication = await participant.publishTrack(microphone, { source: 'microphone' });
    if (!isCurrent()) throw new Error('Broadcast was closed.');
    return { publication, processed };
  } catch (error) { microphone.stop(); await processor.destroy(); throw error; }
}
