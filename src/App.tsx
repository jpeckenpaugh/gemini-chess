import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine.js';
import { wizardAudio } from './audioEngine.ts';

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showTitleScreen, setShowTitleScreen] = useState(true);
  const [isMuted, setIsMuted] = useState(() => wizardAudio.getMuted());
  const [whiteVoice, setWhiteVoice] = useState<'w' | 'b'>(() => wizardAudio.getVoiceSet('w'));
  const [blackVoice, setBlackVoice] = useState<'w' | 'b'>(() => wizardAudio.getVoiceSet('b'));

  const handleVoiceChange = (team: 'w' | 'b', setKey: 'w' | 'b') => {
    wizardAudio.setVoiceSet(team, setKey);
    if (team === 'w') {
      setWhiteVoice(setKey);
    } else {
      setBlackVoice(setKey);
    }
  };

  const handleStartGame = () => {
    setShowTitleScreen(false);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  const handleToggleMute = () => {
    const muted = wizardAudio.toggleMute();
    setIsMuted(muted);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
      }
      if (e.key === 'm' || e.key === 'M') {
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        handleToggleMute();
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Show HUD Controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">Playing as White</span>
          </div>
          <button
            type="button"
            className={`hud-btn hud-sound-btn ${isMuted ? 'muted' : 'active'}`}
            id="btn-sound-toggle-desktop"
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Audio (Shortcut: M)' : 'Mute Audio (Shortcut: M)'}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            <span className="sound-icon" aria-hidden="true">{isMuted ? '🔇' : '🔊'}</span>
            <span>{isMuted ? 'Sound: Muted' : 'Sound: On'}</span>
          </button>
          <button
            type="button"
            className="hud-btn"
            id="btn-voice-settings"
            onClick={() => setShowTitleScreen(true)}
            title="Configure White / Black Team Voice Sets"
          >
            Voices &amp; Dialects
          </button>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Game Actions</div>

          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; M: Sound On/Mute &nbsp;•&nbsp; H: Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>

      {showTitleScreen && (
        <div id="title-screen-overlay" role="dialog" aria-modal="true" aria-labelledby="title-screen-heading">
          <div className="title-screen-modal">
            <div className="title-screen-emblem">✦ &nbsp; SANCTUM ARCHITECTURE &nbsp; ✦</div>
            <h1 className="title-screen-title" id="title-screen-heading">Wizard Chess 3D</h1>
            <p className="title-screen-desc">
              Sculpted stone chess pieces, melee physical combat, stone-shattering destruction, and real-time voice-acted battle cries.
            </p>

            <div className="title-screen-section-title">Select Team Dialects</div>

            <div className="voice-selection-cards">
              <div className="voice-card">
                <div className="voice-card-header">
                  <span className="team-indicator white"></span>
                  <div>
                    <div className="voice-card-team">White Pieces</div>
                    <div className="voice-card-sub">The Grand Cathedral Defenders</div>
                  </div>
                </div>
                <div className="voice-pill-group">
                  <button
                    type="button"
                    className={`voice-choice-pill ${whiteVoice === 'w' ? 'selected' : ''}`}
                    onClick={() => handleVoiceChange('w', 'w')}
                  >
                    🇬🇧 British (UK English)
                  </button>
                  <button
                    type="button"
                    className={`voice-choice-pill ${whiteVoice === 'b' ? 'selected' : ''}`}
                    onClick={() => handleVoiceChange('w', 'b')}
                  >
                    🇺🇸 American (US English)
                  </button>
                </div>
              </div>

              <div className="voice-card">
                <div className="voice-card-header">
                  <span className="team-indicator black"></span>
                  <div>
                    <div className="voice-card-team">Black Pieces</div>
                    <div className="voice-card-sub">The Obsidian Assault Vanguard</div>
                  </div>
                </div>
                <div className="voice-pill-group">
                  <button
                    type="button"
                    className={`voice-choice-pill ${blackVoice === 'b' ? 'selected' : ''}`}
                    onClick={() => handleVoiceChange('b', 'b')}
                  >
                    🇺🇸 American (US English)
                  </button>
                  <button
                    type="button"
                    className={`voice-choice-pill ${blackVoice === 'w' ? 'selected' : ''}`}
                    onClick={() => handleVoiceChange('b', 'w')}
                  >
                    🇬🇧 British (UK English)
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="title-screen-start-btn"
              onClick={handleStartGame}
            >
              Enter the Sanctum &rarr;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
