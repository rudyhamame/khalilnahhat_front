import './partyLighting.css';

export default function PartyLighting({ lightingRef }) {
  return <div className="echo-party-lighting" ref={lightingRef} aria-hidden="true">
    <div className="echo-party-wash" />
    <div className="echo-party-beam echo-party-beam-left" />
    <div className="echo-party-beam echo-party-beam-right" />
    <div className="echo-party-halo" />
  </div>;
}
