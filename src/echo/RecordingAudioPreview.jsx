import TranscriptionAudioTape from './TranscriptionAudioTape';

export default function RecordingAudioPreview({src,metadata,onDuration}){
 return <div className="recording-file-waveform"><TranscriptionAudioTape src={src} metadata={metadata} onDuration={onDuration}/></div>;
}
