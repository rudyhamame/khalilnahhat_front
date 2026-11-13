// Publish the existing Studio mix without changing the sound or capturing it twice.
export async function publishVocalMicrophone(participant, { audio, track, isCurrent = () => true }) {
  const tracks = track ? [track] : await participant.createTracks({ audio, video: false });
  const microphone = tracks.find(track => track.kind === 'audio');
  if (!microphone) { tracks.forEach(track => track.stop()); throw new Error('No microphone track was created.'); }
  tracks.filter(track => track !== microphone).forEach(track => track.stop());
  try {
    if (!isCurrent()) throw new Error('Broadcast was closed.');
    const publication = await participant.publishTrack(microphone, { source: 'microphone' });
    if (!isCurrent()) throw new Error('Broadcast was closed.');
    return { publication };
  } catch (error) { microphone.stop(); throw error; }
}
