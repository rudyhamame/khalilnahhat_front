import { Mic, MicOff } from 'lucide-react';
import VocalCorrectionControl from './VocalCorrectionControl';
import { useMicLevel } from '../hooks/useMicLevel';

function MicLevelMeter({ deviceId, track, enabled }) {
  const { level, error, deviceLabel } = useMicLevel({ deviceId, track, enabled });
  const scale = enabled ? Math.max(0, Math.min(1, level)) : 0;
  const percent = Math.round(scale * 100);

  return (
    <div className="admin-mic-meter">
      <div className="admin-mic-meter-heading"><span className="admin-mic-meter-label">
        {error ? <MicOff size={13} /> : <Mic size={13} />}
        MIC LEVEL
        {deviceLabel ? <em>{deviceLabel}</em> : null}
      </span><VocalCorrectionControl /></div>
      <div className="admin-mic-meter-track">
        <div className="admin-mic-meter-fill" style={{ transform: `scaleX(${scale})` }} />
      </div>
      <small className="admin-mic-meter-debug">{`level ${level.toFixed(2)} (${percent}%)`}</small>
      {error ? <small className="admin-mic-meter-error">{error}</small> : null}
    </div>
  );
}

export default MicLevelMeter;
