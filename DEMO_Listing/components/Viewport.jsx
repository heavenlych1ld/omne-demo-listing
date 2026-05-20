import { useEffect, useRef, useState } from "react";
import PhotoGridAuto from "./PhotoGridAuto";

const MEDIA_TABS = [
  { key: "tour", label: "Virtual Tour", width: 126 },
  { key: "photos", label: "Gallery", width: 102 },
  { key: "video", label: "Video", width: 92 },
  { key: "floorplan", label: "Floor Plan", width: 116 },
  { key: "map", label: "Map", width: 86 },
];
const MEDIA_TAB_SCALE = 1.12;

export default function Viewport({ property, tab, setTab, sidebarOpen = true, exportMode = "full", comfortControls = false, captureMode = false }) {
  const [slideshow, setSlideshow] = useState(false);
  const [gallerySize, setGallerySize] = useState("medium");
  const [videoControlsVisible, setVideoControlsVisible] = useState(true);
  const [tabResetVersions, setTabResetVersions] = useState(() => ({
    tour: 0,
    photos: 0,
    video: 0,
    floorplan: 0,
    map: 0,
  }));
  const prevTabRef = useRef(tab);
  const videoRef = useRef(null);
  const videoControlsTimerRef = useRef(null);
  const mpUrl = resolveMatterportUrl(property);
  const mapUrl = resolveMapUrl(property);
  const streetViewUrl = resolveStreetViewUrl(property);
  const videoItems = resolvePropertyVideos(property);
  const primaryVideo = videoItems[0] || null;
  const embeddedVideoUrl = primaryVideo ? resolveVideoEmbedUrl(primaryVideo) : null;
  const directVideoUrl = primaryVideo && !embeddedVideoUrl ? resolveVideoSourceUrl(primaryVideo) : null;
  const floorplanItems = resolvePropertyFloorplans(property);
  const primaryFloorplan = floorplanItems[0] || null;
  const floorplanUrl = primaryFloorplan ? resolveFloorplanSourceUrl(primaryFloorplan) : null;
  const propertyId = String(property?.propertyId || property?.id || "").trim();
  const galleryItems = Array.isArray(property?.photos) ? property.photos : [];
  const isGalleryTab = tab === "gallery" || tab === "photos";
  const listingTitle = formatListingTitle(property);
  const listingLocality = formatListingLocality(property);
  const listingAttribution = formatListingAttribution(property);
  const primaryFacts = buildPrimaryFacts(property);
  const showTopStack = typeof setTab === "function" && exportMode !== "body";
  const showBody = exportMode !== "top-stack";
  const activeTabIndex = Math.max(0, MEDIA_TABS.findIndex((item) => item.key === tab));
  const activeThreadProgress = MEDIA_TABS.length > 1 ? activeTabIndex / (MEDIA_TABS.length - 1) : 0;
  const mediaTabWidthScale = comfortControls ? 1.32 : MEDIA_TAB_SCALE;

  useEffect(() => {
    const prevTab = prevTabRef.current;
    if (prevTab === tab) return;
    prevTabRef.current = tab;
    if (!tab) return;
    setTabResetVersions((current) => ({
      ...current,
      [tab]: (current[tab] || 0) + 1,
    }));
  }, [tab]);

  useEffect(() => {
    if (tab !== "video") return;
    setVideoControlsVisible(true);
    const node = videoRef.current;
    if (!node) return;
    if (captureMode) {
      node.pause?.();
      try {
        node.currentTime = 0;
      } catch {}
      return;
    }
    const playPromise = node.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  }, [tab, directVideoUrl, captureMode]);

  useEffect(() => {
    return () => {
      if (videoControlsTimerRef.current) {
        window.clearTimeout(videoControlsTimerRef.current);
      }
    };
  }, []);

  const clearVideoControlsTimer = () => {
    if (!videoControlsTimerRef.current) return;
    window.clearTimeout(videoControlsTimerRef.current);
    videoControlsTimerRef.current = null;
  };

  const hideVideoControlsSoon = (delay = 1400) => {
    if (captureMode) return;
    clearVideoControlsTimer();
    videoControlsTimerRef.current = window.setTimeout(() => {
      const node = videoRef.current;
      if (node && !node.paused) {
        setVideoControlsVisible(false);
      }
    }, delay);
  };

  const showVideoControls = () => {
    if (captureMode) return;
    clearVideoControlsTimer();
    setVideoControlsVisible(true);
  };

  return (
    <main className={`viewportMount ${comfortControls ? "viewportMountComfort" : ""}`}>
      {showTopStack && (
        <div className="viewportTopStack">
          <div className="viewportTabsBlock">
            <div className="listingBar">
              <div className="listingTitleBlock">
                <div className="listingTitle" title={listingTitle}>
                  {listingTitle}
                </div>
                <div className="listingSubline" title={[listingLocality, listingAttribution].filter(Boolean).join(" • ")}>
                  {[listingLocality, listingAttribution].filter(Boolean).join(" • ")}
                </div>
              </div>
              <div className="listingFacts" aria-label="Property summary">
                {primaryFacts.map((fact) => (
                  <span key={fact.label} className="listingFact">
                    <span className="listingFactLabel">{fact.label}</span>
                    <span className="listingFactValue">{fact.value}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`tabsShell ${tab ? "tabsShellActive" : ""}`}
            style={{
              "--tabs-thread-progress": activeThreadProgress,
              "--tabs-thread-shift": `${Math.round(activeThreadProgress * 18)}px`,
              "--tabs-tail-shift": `${(-1 - activeThreadProgress * 3).toFixed(2)}px`,
              "--tabs-thread-opacity": (0.44 + activeThreadProgress * 0.34).toFixed(3),
              "--tabs-tail-opacity": (0.72 + activeThreadProgress * 0.2).toFixed(3),
            }}
          >
            <div className="tabsRow">
              {MEDIA_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab?.(item.key)}
                  style={{ width: `${Math.round(item.width * mediaTabWidthScale)}px` }}
                  className={`mediaTab ${tab === item.key ? "mediaTabActive" : ""}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="tabsMiddleStored" aria-hidden>
              <span className="tabsShellCenterLine" />
              <div className="tabsTail">
                <span className="tabsTailLine" />
              </div>
            </div>
          </div>

        </div>
      )}

      {showBody && (
        <section className={`viewportBody ${sidebarOpen ? "viewportBodySidebarOpen" : ""}`}>
          <div className={`mediaPane iframeMediaPane ${tab === "tour" ? "mediaPaneActive" : mpUrl ? "mediaPaneWarm" : ""}`}>
            {mpUrl ? (
              <div className="immersiveWrap immersiveWrapMedia">
                <div className="immersiveStage">
                  <div className="immersivePanel">
                    <div className="immersiveInnerFrame immersiveInnerFrameMedia immersiveInnerFrameTour">
                      <iframe
                        className="immersiveFrame immersiveMediaFrame"
                        src={mpUrl}
                        allowFullScreen
                        allow="xr-spatial-tracking *; fullscreen *"
                        title="Virtual Tour"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="stage">
                <div className="card">
                  <div className="cardTitle">Virtual Tour</div>
                  <div className="cardCopy">Add a Matterport URL or model ID on this listing to enable the tour view.</div>
                </div>
              </div>
            )}
          </div>

          <div className={`mediaPane ${isGalleryTab ? "mediaPaneActive" : ""}`}>
            <div className="immersiveWrap immersiveWrapMedia">
              <div className="immersiveStage">
                <div className="immersivePanel">
                  <div className="immersiveInnerFrame immersiveInnerFrameMedia immersiveInnerFrameGallery">
                    <div className="galleryFrameContent">
                      <PhotoGridAuto
                        key={`photos-${tabResetVersions.photos}`}
                        dir={propertyId}
                        items={galleryItems}
                        property={property}
                        size={gallerySize}
                        slideshow={slideshow}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`mediaPane iframeMediaPane ${tab === "map" ? "mediaPaneActive" : streetViewUrl ? "mediaPaneWarm" : ""}`}>
            {streetViewUrl ? (
              <div className="immersiveWrap immersiveWrapMedia">
                <div className="immersiveStage">
                  <div className="immersivePanel">
                    <div className="immersiveInnerFrame immersiveInnerFrameMedia immersiveInnerFrameMap">
                      <iframe className="immersiveFrame immersiveMediaFrame" src={streetViewUrl} allowFullScreen title="Street View" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="stage">
                <div className="card">
                  <div className="cardTitle">Street View</div>
                  <div className="cardCopy">Add listing address or coordinates to enable street-level view.</div>
                </div>
              </div>
            )}
          </div>

          <div className={`mediaPane ${tab === "video" || tab === "floorplan" ? "mediaPaneActive" : ""}`}>
            {tab === "video" ? (
              embeddedVideoUrl ? (
                <div className="immersiveWrap immersiveWrapMedia" key={`video-${tabResetVersions.video}`}>
                  <div className="immersiveStage">
                    <div className="immersivePanel">
                      <div className="immersiveInnerFrame immersiveInnerFrameMedia immersiveInnerFrameVideo">
                        <iframe
                          className="immersiveFrame immersiveMediaFrame immersiveVideoFrame"
                          src={embeddedVideoUrl}
                          allowFullScreen
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          title="Property Video"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : directVideoUrl ? (
                <div className="immersiveWrap immersiveWrapMedia" key={`video-${tabResetVersions.video}`}>
                  <div className="immersiveStage">
                    <div className="immersivePanel">
                      <div className="immersiveInnerFrame immersiveInnerFrameMedia immersiveInnerFrameVideo">
                        <video
                          ref={videoRef}
                          className="immersiveFrame immersiveMediaFrame immersiveVideoFrame"
                          key={directVideoUrl}
                          controls={!captureMode && videoControlsVisible}
                          autoPlay={!captureMode}
                          loop={!captureMode}
                          playsInline
                          preload="auto"
                          onPlay={() => hideVideoControlsSoon(1600)}
                          onPause={showVideoControls}
                          onPointerEnter={showVideoControls}
                          onPointerMove={showVideoControls}
                          onPointerLeave={() => hideVideoControlsSoon(450)}
                          onFocus={showVideoControls}
                        >
                          <source src={directVideoUrl} type={videoMimeTypeFor(directVideoUrl)} />
                        </video>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="stage" key={`video-${tabResetVersions.video}`}>
                  <div className="card">
                    <div className="cardTitle">Video</div>
                    <div className="cardCopy">{copyFor("video", property)}</div>
                  </div>
                </div>
              )
            ) : (
              floorplanUrl ? (
                <div className="immersiveWrap immersiveWrapMedia immersiveWrapFloorplan" key={`floorplan-${tabResetVersions.floorplan}`}>
                  <div className="immersiveStage">
                    <div className="immersivePanel">
                      <div className="immersiveInnerFrame immersiveInnerFrameMedia immersiveInnerFrameFloorplan">
                        <img className="immersiveFrame immersiveMediaFrame immersiveImageFrame" src={floorplanUrl} alt="Floor Plan" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="stage" key={`floorplan-${tabResetVersions.floorplan}`}>
                  <div className="card">
                    <div className="cardTitle">Floor Plan</div>
                    <div className="cardCopy">{copyFor("floorplan", property)}</div>
                  </div>
                </div>
              )
            )}
          </div>

        </section>
      )}

      <style jsx>{`
        :root {
          --omne-mount-panel-white: rgba(253, 253, 253, 0.96);
          --omne-primary-bar-surface: linear-gradient(180deg, rgba(253, 253, 253, 0.99) 0%, rgba(253, 253, 253, 0.9) 100%);
          --omne-active-tab-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(246, 251, 255, 0.9) 100%);
          --omne-gap-size: 0px;
          --omne-shell-radius: 16px;
          --omne-surface-border: rgba(96, 108, 124, 0.98);
          --omne-pill-outline: rgba(0, 0, 0, 0.42);
          --omne-pill-outline-cast: 0 1px 1px rgba(0, 0, 0, 0.14);
          --omne-line-stroke: rgba(20, 24, 32, 0.72);
          --omne-media-seam: linear-gradient(180deg, rgba(253, 253, 253, 1) 0, rgba(253, 253, 253, 1) 34%, rgba(0, 0, 0, 1) 50%, rgba(253, 253, 253, 1) 66%, rgba(253, 253, 253, 1) 100%);
          --omne-tail-offset-x: 0px;
          --omne-tail-inset-y: 1px;
          --omne-surface-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.68),
            inset 0 -1px 0 rgba(88, 100, 116, 0.32),
            0 0 0 1px rgba(136, 148, 164, 0.38);
        }

        .viewportMount {
          position: relative;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
          background: rgba(253, 253, 253, 0.96);
        }

        .viewportMount::before,
        .viewportMount::after {
          content: none;
        }

        .viewportTopStack {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: var(--omne-shell-radius) var(--omne-shell-radius) 14px 14px;
          overflow: visible;
          z-index: 2;
        }

        .viewportTabsBlock {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0;
          padding: 6px 12px 7px;
          min-height: 56px;
          background: var(--omne-primary-bar-surface);
          border-top: 1px solid rgba(253, 253, 253, 0.58);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.92),
            0 8px 18px rgba(16, 22, 32, 0.09);
        }

        .viewportTabsBlock::before,
        .viewportTabsBlock::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          pointer-events: none;
        }

        .viewportTabsBlock::before {
          top: 0;
          height: 2px;
          background: linear-gradient(180deg, rgba(253, 253, 253, 0.9) 0, rgba(253, 253, 253, 0.86) 42%, rgba(0, 0, 0, 1) 50%, rgba(253, 253, 253, 0.86) 58%, rgba(253, 253, 253, 0.9) 100%);
          box-shadow:
            0 -1px 0 rgba(253, 253, 253, 0.3),
            0 -4px 12px rgba(253, 253, 253, 0.42),
            0 -10px 22px rgba(253, 253, 253, 0.28),
            0 -18px 38px rgba(253, 253, 253, 0.14);
        }

        .viewportTabsBlock::after {
          bottom: 0;
          height: 0;
          background: transparent;
          box-shadow: none;
        }

        .viewportTabsBlockUtility {
          min-height: 56px;
          padding: 6px 12px 7px;
          border-left: 1px solid rgba(178, 186, 198, 0.34);
          border-right: 1px solid rgba(178, 186, 198, 0.34);
          box-shadow:
            inset 0 -1px 0 rgba(188, 206, 230, 0.38),
            inset 0 -2px 0 rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(253, 253, 253, 0.92),
            0 8px 18px rgba(16, 22, 32, 0.09);
        }

        .viewportTabsBlockUtility::before {
          top: 0;
          height: 0;
          background: transparent;
          box-shadow: none;
        }

        .viewportTabsBlockUtility::after {
          bottom: 0;
          height: 0;
          background: transparent;
          box-shadow: none;
        }

        .viewportTabsBlockMirror {
          transform: scaleY(-1);
          transform-origin: center;
        }

        .listingBar {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          gap: 12px;
          min-width: 0;
        }

        .listingBarUtility {
          align-items: center;
          justify-content: flex-end;
        }

        .listingUtilityRailMirror {
          transform: translateX(12%) scaleY(-1);
          transform-origin: center;
        }

        .listingUtilityRail {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: clamp(320px, 34vw, 520px);
          max-width: 100%;
          flex: 0 1 auto;
          margin-left: auto;
          margin-right: 0;
          min-height: 26px;
        }

        .utilityToolLabel {
          font-size: 9px;
          line-height: 1;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(30, 38, 48, 0.7);
          margin-left: 2px;
          margin-right: 1px;
        }

        .utilityTool {
          border: 1px solid rgba(0, 0, 0, 0.34);
          border-radius: 0.04rem;
          background: linear-gradient(180deg, rgba(253, 253, 253, 0.98) 0%, rgba(232, 239, 247, 0.92) 100%);
          color: rgba(16, 22, 30, 0.94);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          font-size: 11px;
          line-height: 1;
          letter-spacing: 0.02em;
          padding: 6px 11px;
          min-height: 28px;
          cursor: pointer;
          font-weight: 700;
          box-sizing: border-box;
          white-space: nowrap;
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.54),
            inset 0 -1px 0 rgba(126, 138, 156, 0.18),
            0 0 0 1px rgba(148, 162, 180, 0.12);
          transition:
            background 220ms cubic-bezier(0.16, 1, 0.3, 1),
            color 220ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 260ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 220ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .utilityTool:hover {
          background: linear-gradient(180deg, rgba(253, 253, 253, 1) 0%, rgba(238, 245, 252, 0.98) 100%);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.62),
            inset 0 -1px 0 rgba(126, 138, 156, 0.2),
            0 0 10px rgba(253, 253, 253, 0.16);
        }

        .utilityToolWide {
          min-width: 126px;
        }

        .utilityToolActive {
          color: rgba(252, 253, 255, 0.98);
          background: linear-gradient(180deg, rgba(18, 24, 33, 0.99) 0%, rgba(6, 8, 13, 0.99) 100%);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.18),
            inset 0 -1px 0 rgba(0, 0, 0, 0.36),
            0 0 0 1px rgba(253, 253, 253, 0.12),
            0 0 12px rgba(253, 253, 253, 0.08);
        }

        .listingTitleBlock {
          position: relative;
          z-index: 2;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1 1 auto;
        }

        .listingTitle {
          color: rgba(10, 14, 21, 0.92);
          font-weight: 700;
          letter-spacing: -0.04em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: none;
        }

        .listingSubline {
          font-size: 9px;
          line-height: 1.1;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(44, 56, 72, 0.74);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .listingFacts {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 0;
          min-width: 0;
        }

        .listingFact {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.42rem;
          padding: 0 0.72rem;
          min-height: 1.8rem;
          white-space: nowrap;
        }

        .listingFactLabel {
          font-size: 8.5px;
          line-height: 1;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(58, 70, 86, 0.76);
        }

        .listingFactValue {
          font-size: 11.5px;
          line-height: 1.05;
          letter-spacing: 0.02em;
          color: rgba(10, 16, 24, 0.94);
          font-weight: 700;
        }

        .tabsShell {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          gap: 0;
          width: 100%;
          max-width: 100%;
          margin-top: -2px;
          margin-bottom: -2px;
          margin-left: 0;
          margin-right: calc(50% - 50vw);
          border-left: 1px solid rgba(178, 186, 198, 0.34);
          border-right: 0;
          border-radius: 0;
          background: linear-gradient(180deg, rgba(253, 253, 253, 0.99) 0%, rgba(253, 253, 253, 0.9) 100%);
          padding: 5px calc(50vw - 50% + 5px) 5px 5px;
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.92),
            inset 0 2px 0 rgba(188, 206, 230, 0.38),
            inset 0 3px 0 rgba(0, 0, 0, 0.08),
            inset 0 -1px 0 rgba(253, 253, 253, 0.92),
            inset 0 -2px 0 rgba(188, 206, 230, 0.38),
            inset 0 -3px 0 rgba(0, 0, 0, 0.08);
          overflow: visible;
          position: relative;
          z-index: 2;
        }

        .tabsShell::before {
          content: none;
        }

        .tabsShell::after {
          content: none;
        }

        .tabsRow {
          display: flex;
          align-items: center;
          align-self: stretch;
          min-height: 40px;
          gap: 3px;
          padding: 0;
          border-radius: 0;
          background: linear-gradient(180deg, rgba(253, 253, 253, 0.99) 0%, rgba(253, 253, 253, 0.9) 100%);
          border-left: 1px solid rgba(92, 102, 116, 0.46);
          border-right: 1px solid rgba(92, 102, 116, 0.46);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.72),
            inset 0 -1px 0 rgba(253, 253, 253, 0.72),
            inset 18px 0 24px rgba(253, 253, 253, 0.12),
            inset -18px 0 24px rgba(253, 253, 253, 0.12),
            inset 0 14px 20px rgba(253, 253, 253, 0.16),
            inset 0 -14px 20px rgba(253, 253, 253, 0.16),
            inset 0 3px 8px rgba(0, 0, 0, 0.08),
            inset 0 -3px 8px rgba(0, 0, 0, 0.08),
            inset 0 10px 18px rgba(0, 0, 0, 0.04),
            inset 0 -10px 18px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba(136, 148, 164, 0.24),
            0 1px 0 rgba(255, 255, 255, 0.22),
            0 -1px 0 rgba(120, 132, 148, 0.18);
          white-space: nowrap;
          position: relative;
          z-index: 2;
          overflow: hidden;
          width: max-content;
        }

        .tabsRow::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 14px;
          transform: translateY(-50%) translateX(var(--tabs-thread-shift, 0px));
          background:
            linear-gradient(180deg, rgba(253, 254, 255, 0.96) 0%, rgba(0, 0, 0, 0.98) 50%, rgba(253, 254, 255, 0.96) 100%) center / 100% 1px no-repeat,
            repeating-linear-gradient(
              116deg,
              rgba(253, 253, 253, 0) 0 10px,
              rgba(253, 253, 253, 0.38) 10px 11px,
              rgba(253, 253, 253, 0) 11px 22px
            );
          opacity: var(--tabs-thread-opacity, 0.44);
          box-shadow:
            0 0 10px rgba(253, 253, 253, 0.14),
            0 0 18px rgba(253, 253, 253, 0.08);
          pointer-events: none;
          z-index: 0;
          transition:
            transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
            opacity 260ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .tabsMiddleStored {
          position: relative;
          align-self: stretch;
          min-width: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .tabsShellCenterLine {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          transform: translateY(-50%);
          background: linear-gradient(180deg, rgba(253, 254, 255, 0.92) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(253, 254, 255, 0.92) 100%);
          box-shadow:
            0 0 10px rgba(253, 253, 253, 0.22),
            0 0 16px rgba(253, 253, 253, 0.1);
          pointer-events: none;
          z-index: 2;
        }

        .tabsTail {
          display: block;
          position: relative;
          align-self: stretch;
          min-width: 0;
          margin-left: 0;
          width: 100%;
          height: 100%;
          z-index: 3;
        }

        .tabsTail::before,
        .tabsTail::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          border-left: 1px solid rgba(92, 102, 116, 0.28);
          border-right: 0;
          pointer-events: none;
        }

        .tabsTail::before {
          top: 0;
          bottom: calc(50% + 1px);
          background: linear-gradient(0deg, rgba(18, 24, 33, 0.99) 0%, rgba(6, 8, 13, 0.99) 100%);
          border-top: 1px solid rgba(253, 253, 253, 0.4);
          border-bottom: 0;
          border-radius: 0 0 0 18px;
          box-shadow:
            inset 0 -1px 0 rgba(253, 253, 253, 0.18),
            inset 0 1px 0 rgba(0, 0, 0, 0.36);
        }

        .tabsTail::after {
          top: calc(50% + 1px);
          bottom: 0;
          background: linear-gradient(180deg, rgba(18, 24, 33, 0.99) 0%, rgba(6, 8, 13, 0.99) 100%);
          border-top: 0;
          border-bottom: 1px solid rgba(253, 253, 253, 0.4);
          border-radius: 18px 0 0 0;
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.18),
            inset 0 -1px 0 rgba(0, 0, 0, 0.36);
        }

        .tabsTailLine {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          transform: translateY(-50%);
          background: linear-gradient(180deg, rgba(253, 254, 255, 0.92) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(253, 254, 255, 0.92) 100%);
          box-shadow:
            0 0 10px rgba(253, 253, 253, 0.22),
            0 0 16px rgba(253, 253, 253, 0.1);
          pointer-events: none;
          z-index: 4;
        }

        .tabsShellActive .tabsShellCenterLine,
        .tabsShell:hover .tabsShellCenterLine {
          transform: translateY(-50%) translateX(calc(var(--tabs-thread-shift, 0px) * 0.22));
          box-shadow:
            0 0 12px rgba(253, 253, 253, calc(0.18 + (var(--tabs-thread-progress, 0) * 0.1))),
            0 0 18px rgba(253, 253, 253, calc(0.08 + (var(--tabs-thread-progress, 0) * 0.08)));
        }

        .tabsShellActive .tabsRow::before,
        .tabsShell:hover .tabsRow::before {
          box-shadow:
            0 0 12px rgba(253, 253, 253, calc(0.16 + (var(--tabs-thread-progress, 0) * 0.12))),
            0 0 22px rgba(253, 253, 253, calc(0.06 + (var(--tabs-thread-progress, 0) * 0.08)));
        }

        .mediaTab {
          border: 1px solid rgba(0, 0, 0, 0.34);
          border-radius: 0.04rem;
          background: linear-gradient(180deg, rgba(253, 253, 253, 0.98) 0%, rgba(253, 253, 253, 0.9) 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          font-size: 13.2px;
          color: rgba(16, 22, 30, 0.94);
          line-height: 1;
          letter-spacing: 0.02em;
          padding: 9px 17px;
          min-height: 40px;
          min-width: 0;
          cursor: pointer;
          font-weight: 700;
          box-sizing: border-box;
          position: relative;
          flex: 0 0 auto;
          justify-content: center;
          text-align: center;
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.54),
            inset 0 -1px 0 rgba(126, 138, 156, 0.18),
            0 0 0 1px rgba(148, 162, 180, 0.14);
          transition:
            transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
            background 220ms cubic-bezier(0.16, 1, 0.3, 1),
            border-color 220ms cubic-bezier(0.16, 1, 0.3, 1),
            color 220ms cubic-bezier(0.16, 1, 0.3, 1),
            box-shadow 260ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .mediaTab:hover {
          transform: none;
          background: linear-gradient(180deg, rgba(253, 253, 253, 1) 0%, rgba(253, 253, 253, 0.94) 100%);
          color: rgba(8, 14, 21, 0.98);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.62),
            inset 0 -1px 0 rgba(126, 138, 156, 0.2),
            0 0 10px rgba(253, 253, 253, 0.16);
        }

        .mediaTabActive {
          color: rgba(252, 253, 255, 0.98);
          font-weight: 700;
          transform: none;
          background:
            linear-gradient(180deg, rgba(253, 254, 255, 0.92) 0%, rgba(0, 0, 0, 0.95) 50%, rgba(253, 254, 255, 0.92) 100%) center / 100% 1px no-repeat,
            linear-gradient(180deg, rgba(18, 24, 33, 0.99) 0%, rgba(6, 8, 13, 0.99) 100%);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.18),
            inset 0 -1px 0 rgba(0, 0, 0, 0.36),
            0 0 0 1px rgba(253, 253, 253, 0.12),
            0 0 12px rgba(253, 253, 253, 0.08);
          z-index: 2;
        }

        .mediaTabActive:hover,
        .mediaTabActive:focus-visible {
          transform: none;
          background:
            linear-gradient(180deg, rgba(253, 254, 255, 0.96) 0%, rgba(0, 0, 0, 0.98) 50%, rgba(253, 254, 255, 0.96) 100%) center / 100% 1px no-repeat,
            linear-gradient(180deg, rgba(24, 30, 40, 0.99) 0%, rgba(8, 10, 16, 0.99) 100%);
          box-shadow:
            inset 0 1px 0 rgba(253, 253, 253, 0.2),
            inset 0 -1px 0 rgba(0, 0, 0, 0.4),
            0 0 12px rgba(253, 253, 253, 0.1);
          outline: none;
        }

        .viewportMountComfort .viewportTabsBlock {
          min-height: 68px;
          padding: 9px 16px 10px;
        }

        .viewportMountComfort .listingBar {
          gap: 16px;
        }

        .viewportMountComfort .listingTitle {
          font-size: 18px;
          line-height: 1.05;
          letter-spacing: -0.035em;
        }

        .viewportMountComfort .listingSubline {
          font-size: 11px;
          line-height: 1.15;
        }

        .viewportMountComfort .listingFact {
          min-height: 2.25rem;
          padding: 0 0.92rem;
          gap: 0.52rem;
        }

        .viewportMountComfort .listingFactLabel {
          font-size: 10px;
        }

        .viewportMountComfort .listingFactValue {
          font-size: 14px;
        }

        .viewportMountComfort .tabsShell {
          padding-top: 7px;
          padding-bottom: 7px;
        }

        .viewportMountComfort .tabsRow {
          min-height: 50px;
          gap: 4px;
        }

        .viewportMountComfort .tabsRow::before {
          height: 16px;
        }

        .viewportMountComfort .mediaTab {
          min-height: 50px;
          padding: 12px 20px;
          font-size: 15.5px;
        }

        .viewportBody {
          position: relative;
          flex: 1;
          min-height: 0;
          background:
            linear-gradient(90deg, rgba(253, 253, 253, 0.88) 0%, rgba(0, 0, 0, 0.98) 50%, rgba(253, 253, 253, 0.88) 100%) left / 2px 100% no-repeat,
            linear-gradient(90deg, rgba(253, 253, 253, 0.88) 0%, rgba(0, 0, 0, 0.98) 50%, rgba(253, 253, 253, 0.88) 100%) right / 2px 100% no-repeat,
            var(--omne-mount-panel-white);
          margin: 0;
          border-left: 1px solid rgba(178, 186, 198, 0.34);
          border-right: 1px solid rgba(178, 186, 198, 0.34);
          border-bottom: 1px solid rgba(92, 102, 116, 0.46);
          box-sizing: border-box;
          border-radius: 0;
          overflow: hidden;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -1px 0 rgba(0, 0, 0, 0.34),
            inset 14px 0 18px rgba(178, 186, 198, 0.018),
            inset -14px 0 18px rgba(178, 186, 198, 0.018),
            0 0 0 1px rgba(20, 24, 32, 0.22);
        }

        .viewportBodySidebarOpen {
          border-left-color: transparent;
          background:
            linear-gradient(90deg, rgba(253, 253, 253, 0.88) 0%, rgba(0, 0, 0, 0.98) 50%, rgba(253, 253, 253, 0.88) 100%) right / 2px 100% no-repeat,
            var(--omne-mount-panel-white);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            inset 0 -1px 0 rgba(0, 0, 0, 0.34),
            0 0 0 1px rgba(20, 24, 32, 0.22);
        }

        .viewportBody::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 0;
          pointer-events: none;
          box-shadow:
            inset 1px 1px 0 rgba(194, 202, 214, 0.06),
            inset -1px 1px 0 rgba(194, 202, 214, 0.06),
            inset 1px -1px 0 rgba(0, 0, 0, 0.22),
            inset -1px -1px 0 rgba(0, 0, 0, 0.22);
          z-index: 2;
        }

        .viewportSeamLane {
          position: relative;
          flex: 0 0 6px;
          height: 6px;
          background: rgba(232, 236, 242, 0.96);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.22),
            inset 0 -1px 0 rgba(148, 160, 176, 0.26);
          z-index: 1;
        }

        .viewportSeamLane::before {
          content: "";
          position: absolute;
          left: 1px;
          right: 1px;
          top: 0;
          height: 100%;
          border-radius: 999px;
          background: rgba(232, 236, 242, 0.96);
          box-shadow:
            inset 0 0 0 1px rgba(232, 236, 242, 0.24),
            inset 0 -1px 0 rgba(148, 160, 176, 0.08),
            0 0 10px rgba(253, 253, 253, 0.08);
          pointer-events: none;
        }

        .viewportSeamLane::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 2.5px;
          background: var(--omne-media-seam);
          box-shadow:
            0 -1px 0 rgba(253, 253, 253, 0.3),
            0 -5px 12px rgba(253, 253, 253, 0.16);
          pointer-events: none;
        }

        .viewportBodySidebarOpen::before {
          box-shadow:
            inset 0 -1px 0 rgba(0, 0, 0, 0.22);
        }

        .viewportBody::after {
          content: "";
          position: absolute;
          inset: 0;
          border-left: 1px solid rgba(194, 202, 214, 0.06);
          border-right: 1px solid rgba(194, 202, 214, 0.06);
          border-left: 1px solid rgba(194, 202, 214, 0.06);
          border-right: 1px solid rgba(194, 202, 214, 0.06);
          border-bottom: 1px solid rgba(194, 202, 214, 0.06);
          box-shadow:
            inset -1px 0 0 rgba(255, 255, 255, 0.08),
            inset 0 -1px 0 rgba(255, 255, 255, 0.08);
          pointer-events: none;
          z-index: 2;
        }

        .viewportBodySidebarOpen::after {
          inset: 0;
          border-left: 0;
        }

        .mediaPane {
          position: absolute;
          inset: 0;
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .mediaPaneActive {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          z-index: 1;
        }

        .iframeMediaPane {
          transform: translateZ(0);
          backface-visibility: hidden;
        }

        .iframeMediaPane .immersiveMediaFrame {
          transition: opacity 180ms ease;
          will-change: opacity;
        }

        .mediaPaneWarm {
          opacity: 0;
          visibility: visible;
          pointer-events: none;
          z-index: 0;
        }

        .immersiveWrap {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: minmax(0, 1fr);
          padding: 0;
          background: transparent;
          overflow: hidden;
        }

        .immersiveWrapMedia {
          padding: 24px;
          background: rgba(253, 253, 253, 0.94);
        }

        .immersiveWrapFloorplan {
          background: rgba(253, 253, 253, 0.94);
        }

        .immersiveStage {
          position: relative;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          padding: 0;
          border-radius: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
        }

        .immersivePanel {
          min-height: 0;
          min-width: 0;
          display: grid;
          padding: 0;
          background: transparent;
          border: 0;
          box-shadow: none;
          position: relative;
          z-index: 1;
          min-height: 0;
        }

        .immersiveInnerFrame {
          min-height: 0;
          min-width: 0;
          display: grid;
          width: 100%;
          height: 100%;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          overflow: hidden;
        }

        .immersiveInnerFrameMedia {
          border: 1px solid rgba(210, 210, 210, 0.86);
          border-radius: 20px;
          background: rgba(253, 253, 253, 0.96);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.88),
            inset 0 -1px 0 rgba(255, 255, 255, 0.62),
            0 0 0 1px rgba(196, 196, 196, 0.14),
            0 0 26px rgba(253, 253, 253, 0.28),
            0 18px 34px rgba(8, 12, 18, 0.12);
          padding: 16px;
        }

        .immersiveInnerFrameVideo {
          --omne-video-frame-thickness: 12px;
          position: relative;
          width: min(100%, calc((100vh - 190px) * 2));
          max-width: 100%;
          max-height: 100%;
          height: auto;
          aspect-ratio: 2 / 1;
          margin: auto;
          padding: var(--omne-video-frame-thickness);
          overflow: hidden;
          box-sizing: border-box;
          background: rgba(253, 253, 253, 0.96);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.12),
            inset 0 0 8px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(142, 142, 142, 0.24),
            0 1px 0 rgba(255, 255, 255, 0.22),
            0 -1px 0 rgba(126, 126, 126, 0.18),
            0 16px 30px rgba(8, 12, 18, 0.12);
        }

        .immersiveInnerFrameVideo::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 20px;
          border: 1px solid rgba(96, 96, 96, 0.46);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.12),
            inset 0 0 0 calc(var(--omne-video-frame-thickness) + 1px) rgba(0, 0, 0, 0.08);
          pointer-events: none;
          z-index: 2;
        }

        .immersiveInnerFrameVideo .immersiveMediaFrame {
          position: relative;
          z-index: 1;
        }

        .immersiveInnerFrameTour {
          --omne-video-frame-thickness: 12px;
          position: relative;
          width: min(100%, calc((100vh - 190px) * 2));
          max-width: 100%;
          max-height: 100%;
          height: auto;
          aspect-ratio: 2 / 1;
          margin: auto;
          padding: var(--omne-video-frame-thickness);
          overflow: hidden;
          box-sizing: border-box;
          background: rgba(253, 253, 253, 0.96);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.12),
            inset 0 0 8px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(142, 142, 142, 0.24),
            0 1px 0 rgba(255, 255, 255, 0.22),
            0 -1px 0 rgba(126, 126, 126, 0.18),
            0 16px 30px rgba(8, 12, 18, 0.12);
        }

        .immersiveInnerFrameTour::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 20px;
          border: 1px solid rgba(96, 96, 96, 0.46);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.12),
            inset 0 0 0 calc(var(--omne-video-frame-thickness) + 1px) rgba(0, 0, 0, 0.08);
          pointer-events: none;
          z-index: 2;
        }

        .immersiveInnerFrameTour .immersiveMediaFrame {
          position: relative;
          z-index: 1;
        }

        .immersiveInnerFrameGallery {
          --omne-video-frame-thickness: 5px;
          --omne-gallery-frame-radius: 20px;
          --omne-gallery-content-radius: calc(var(--omne-gallery-frame-radius) - var(--omne-video-frame-thickness));
          position: relative;
          width: min(100%, calc((100vh - 190px) * 2));
          max-width: 100%;
          max-height: 100%;
          height: auto;
          aspect-ratio: 2 / 1;
          margin: auto;
          padding: var(--omne-video-frame-thickness);
          overflow: hidden;
          box-sizing: border-box;
          background:
            radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0.1) 44%, rgba(255, 255, 255, 0) 72%),
            rgba(253, 253, 253, 0.96);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.1),
            inset 0 0 10px rgba(0, 0, 0, 0.045),
            0 0 0 1px rgba(142, 142, 142, 0.22),
            0 1px 0 rgba(255, 255, 255, 0.28),
            0 -1px 0 rgba(126, 126, 126, 0.14),
            0 14px 28px rgba(8, 12, 18, 0.1);
        }

        .immersiveInnerFrameGallery::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: var(--omne-gallery-frame-radius);
          border: 1px solid rgba(96, 96, 96, 0.46);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 calc(var(--omne-video-frame-thickness) - 2px) rgba(253, 253, 253, 0.1),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(0, 0, 0, 0.055);
          pointer-events: none;
          z-index: 2;
        }

        .galleryFrameContent {
          --omne-photo-panel-white: var(--omne-primary-bar-surface);
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          border-radius: var(--omne-gallery-content-radius);
          border: 1px solid rgba(232, 236, 242, 0.88);
          background: var(--omne-primary-bar-surface);
          box-shadow:
            0 0 0 1px rgba(253, 253, 253, 0.84),
            0 2px 0 rgba(255, 255, 255, 0.72),
            0 -1px 0 rgba(148, 160, 176, 0.18),
            0 8px 18px rgba(8, 12, 18, 0.17),
            inset 0 1px 0 rgba(255, 255, 255, 0.82),
            inset 0 -1px 0 rgba(0, 0, 0, 0.08);
        }

        .immersiveInnerFrameFloorplan,
        .immersiveInnerFrameMap {
          --omne-video-frame-thickness: 12px;
          position: relative;
          width: min(100%, calc((100vh - 190px) * 2));
          max-width: 100%;
          max-height: 100%;
          height: auto;
          aspect-ratio: 2 / 1;
          margin: auto;
          padding: var(--omne-video-frame-thickness);
          overflow: hidden;
          box-sizing: border-box;
          background:
            radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.88) 0 1px, rgba(255, 255, 255, 0) 2px),
            radial-gradient(circle at 82% 78%, rgba(255, 255, 255, 0.62) 0 1px, rgba(255, 255, 255, 0) 2px),
            linear-gradient(118deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.6) 25%, rgba(255, 255, 255, 0) 43%),
            rgba(253, 253, 253, 0.96);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.12),
            inset 0 0 8px rgba(0, 0, 0, 0.06),
            0 0 0 1px rgba(142, 142, 142, 0.24),
            0 1px 0 rgba(255, 255, 255, 0.22),
            0 -1px 0 rgba(126, 126, 126, 0.18),
            0 16px 30px rgba(8, 12, 18, 0.12);
        }

        .immersiveInnerFrameFloorplan::after,
        .immersiveInnerFrameMap::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 20px;
          border: 1px solid rgba(96, 96, 96, 0.46);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.72),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(253, 253, 253, 0.12),
            inset 0 0 0 calc(var(--omne-video-frame-thickness) + 1px) rgba(0, 0, 0, 0.08);
          pointer-events: none;
          z-index: 2;
        }

        .immersiveInnerFrameFloorplan .immersiveMediaFrame,
        .immersiveInnerFrameMap .immersiveMediaFrame {
          position: relative;
          z-index: 1;
        }

        .immersiveInnerFrameVideo,
        .immersiveInnerFrameTour,
        .immersiveInnerFrameFloorplan,
        .immersiveInnerFrameMap {
          --omne-video-frame-thickness: 5px;
          --omne-gallery-frame-radius: 20px;
          --omne-gallery-content-radius: calc(var(--omne-gallery-frame-radius) - var(--omne-video-frame-thickness));
          padding: var(--omne-video-frame-thickness);
          background: var(--omne-primary-bar-surface);
          box-shadow:
            0 0 0 1px rgba(253, 253, 253, 0.84),
            0 2px 0 rgba(255, 255, 255, 0.72),
            0 -1px 0 rgba(0, 0, 0, 0.12),
            0 8px 18px rgba(8, 12, 18, 0.17),
            inset 0 1px 0 rgba(255, 255, 255, 0.82),
            inset 0 -1px 0 rgba(0, 0, 0, 0.08);
        }

        .immersiveInnerFrameVideo::after,
        .immersiveInnerFrameTour::after,
        .immersiveInnerFrameFloorplan::after,
        .immersiveInnerFrameMap::after {
          border-radius: var(--omne-gallery-frame-radius);
          border: 1px solid rgba(116, 116, 116, 0.32);
          box-shadow:
            inset 0 0 0 1px rgba(253, 253, 253, 0.84),
            inset 0 0 0 var(--omne-video-frame-thickness) rgba(0, 0, 0, 0.055);
        }

        .immersiveInnerFrameVideo .immersiveMediaFrame,
        .immersiveInnerFrameTour .immersiveMediaFrame,
        .immersiveInnerFrameFloorplan .immersiveMediaFrame,
        .immersiveInnerFrameMap .immersiveMediaFrame {
          position: relative;
          z-index: 1;
          border-radius: var(--omne-gallery-content-radius);
        }

        .immersiveFrame {
          width: 100%;
          height: 100%;
          min-height: 0;
          border: 0;
          display: block;
          background: #000;
        }

        .immersiveMediaFrame {
          border-radius: 12px;
          object-fit: contain;
          background:
            radial-gradient(circle at top, rgba(34, 42, 54, 0.28), rgba(0, 0, 0, 0.94));
        }

        .immersiveVideoFrame {
          aspect-ratio: 2 / 1;
          object-fit: cover;
        }

        .immersiveImageFrame {
          aspect-ratio: 16 / 10;
        }

        .immersiveWrapFloorplan .immersiveImageFrame {
          width: auto;
          height: auto;
          max-width: min(91%, 1040px);
          max-height: min(87%, 76vh);
          margin: 0 auto;
          place-self: center;
          border-radius: 12px;
          aspect-ratio: auto;
          object-fit: contain;
          background: transparent;
        }

        .stage {
          height: 100%;
          display: grid;
          place-items: center;
          padding: 20px;
          box-sizing: border-box;
        }

        .card {
          width: min(620px, 100%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(20, 24, 31, 0.72);
          box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 14px;
        }

        .cardTitle {
          font-weight: 700;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.96);
        }

        .cardCopy {
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.6;
        }

        @media (max-width: 1180px) {
          .listingFacts {
            gap: 4px;
          }

          .listingFact {
            padding-left: 6px;
            padding-right: 6px;
          }
        }

        @media (max-width: 920px) {
          .viewportTabsBlock {
            padding-right: 8px;
          }

          .listingTitleBlock {
            max-width: 48%;
          }

          .listingFacts {
            display: none;
          }

          .viewportMountComfort .viewportTabsBlock {
            min-height: 64px;
            padding: 8px 12px;
          }

          .viewportMountComfort .listingTitle {
            font-size: 16px;
          }

          .viewportMountComfort .listingSubline {
            font-size: 10px;
          }

          .viewportMountComfort .tabsRow {
            min-height: 46px;
          }

          .viewportMountComfort .mediaTab {
            min-height: 46px;
            padding: 10px 16px;
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}

function labelFor(tab) {
  if (tab === "video") return "Video";
  if (tab === "floorplan" || tab === "floor") return "Floor Plan";
  if (tab === "map") return "Map";
  if (tab === "streetview") return "Street View";
  if (tab === "details") return "Details";
  return "-";
}

function copyFor(tab, property) {
  const omne = property?.omne || null;
  if (tab === "video") return "Drop your cinematic video player here.";
  if (tab === "floorplan" || tab === "floor") return "Drop a zoomable floor plan here.";
  if (tab === "map") return "Map data is unavailable for this listing.";
  if (tab === "streetview") return "Street view is unavailable for this listing location.";
  if (tab === "details") {
    const title = omne?.headline || property?.title || "-";
    const type = omne?.propertyType || "Property";
    const status = String(omne?.status || property?.status || "active")
      .replace(/_/g, " ")
      .trim();
    return `${type} record for ${title}${status ? ` · ${status}` : ""}.`;
  }
  return "";
}

function resolveMatterportUrl(property) {
  const omne = property?.omne || null;
  const raw =
    omne?.media?.virtualTourModelId ||
    omne?.media?.virtualTourUrl ||
    property?.matterportModelId ||
    property?.matterportId ||
    property?.matterportUrl ||
    property?.matterport ||
    "";
  const value = String(raw).trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return applyMatterportStartView(value);
  }

  return applyMatterportStartView(`https://my.matterport.com/show/?m=${encodeURIComponent(value)}`);
}

function applyMatterportStartView(url) {
  try {
    const nextUrl = new URL(url);
    if (nextUrl.hostname.includes("matterport.com")) {
      const modelPathMatch = nextUrl.pathname.match(/^\/models\/([^/?#]+)/);
      if (modelPathMatch) {
        nextUrl.pathname = "/show/";
        nextUrl.searchParams.set("m", modelPathMatch[1]);
      }
      nextUrl.searchParams.set("play", "1");
      nextUrl.searchParams.set("qs", "1");
      nextUrl.searchParams.set("dh", "0");
    }
    return nextUrl.toString();
  } catch {
    const joiner = url.includes("?") ? "&" : "?";
    return `${url}${joiner}play=1&qs=1&dh=0`;
  }
}

function resolveMapUrl(property) {
  const query = buildAddressQuery(property);
  if (!query) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function resolveStreetViewUrl(property) {
  const explicitStreetView = firstDefined(
    property?.streetViewUrl,
    property?.omne?.media?.streetViewUrl,
    property?.omne?.streetViewUrl
  );
  const exactStreetView = resolveExplicitStreetViewEmbedUrl(explicitStreetView);
  if (exactStreetView) return exactStreetView;
  const query = buildAddressQuery(property);
  const lat = Number(firstDefined(property?.lat, property?.latitude));
  const lng = Number(firstDefined(property?.lng, property?.lon, property?.longitude));
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const params = new URLSearchParams({
      layer: "c",
      cbll: `${lat},${lng}`,
      cbp: "12,0,0,0,0",
      output: "svembed",
    });
    if (query) params.set("q", query);
    return `https://maps.google.com/maps?${params.toString()}`;
  }
  if (!query) return null;
  return `https://maps.google.com/maps?${new URLSearchParams({
    q: query,
    layer: "c",
    cbp: "12,0,0,0,0",
    output: "svembed",
  }).toString()}`;
}

function resolveExplicitStreetViewEmbedUrl(value) {
  const source = String(value || "").trim();
  if (!source) return null;
  const atMatch = source.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),3a,[^,]*,(-?\d+(?:\.\d+)?)h,(-?\d+(?:\.\d+)?)t/i);
  if (!atMatch) return null;
  const [, lat, lng, heading, tilt] = atMatch;
  const panoId = source.match(/!1s([^!/?&]+)/i)?.[1];
  if (panoId) {
    return `https://maps.google.com/maps?${new URLSearchParams({
      layer: "c",
      panoid: panoId,
      cbll: `${lat},${lng}`,
      cbp: `12,${heading},0,0,${normalizeStreetViewPitch(tilt)}`,
      output: "svembed",
    }).toString()}`;
  }
  return `https://maps.google.com/maps?${new URLSearchParams({
    layer: "c",
    cbll: `${lat},${lng}`,
    cbp: `12,${heading},0,0,${normalizeStreetViewPitch(tilt)}`,
    output: "svembed",
  }).toString()}`;
}

function normalizeStreetViewPitch(value) {
  const tilt = Number(value);
  if (!Number.isFinite(tilt)) return "0";
  return String(Math.max(-45, Math.min(45, 90 - tilt)));
}

function resolvePropertyVideos(property) {
  const omne = property?.omne || null;
  const rawVideos = Array.isArray(omne?.media?.videos)
    ? omne.media.videos
    : Array.isArray(property?.videos)
      ? property.videos
      : [];
  return rawVideos.filter(Boolean);
}

function resolvePropertyFloorplans(property) {
  const omne = property?.omne || null;
  const rawFloorplans = Array.isArray(omne?.media?.floorplans)
    ? omne.media.floorplans
    : Array.isArray(property?.floorplans)
      ? property.floorplans
      : [];
  return rawFloorplans.filter(Boolean);
}

function resolveVideoSourceUrl(value) {
  if (!value) return null;
  if (typeof value === "string") return String(value).trim() || null;
  if (typeof value === "object") {
    return String(value.url || value.src || value.href || value.path || "").trim() || null;
  }
  return null;
}

function resolveVideoEmbedUrl(value) {
  const source = resolveVideoSourceUrl(value);
  if (!source) return null;
  const youtubeMatch =
    source.match(/youtube\.com\/watch\?v=([^&]+)/i) ||
    source.match(/youtu\.be\/([^?&]+)/i) ||
    source.match(/youtube\.com\/embed\/([^?&]+)/i);
  if (youtubeMatch?.[1]) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  }
  const vimeoMatch = source.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
}

function resolveFloorplanSourceUrl(value) {
  if (!value) return null;
  if (typeof value === "string") return String(value).trim() || null;
  if (typeof value === "object") {
    return String(value.url || value.src || value.href || value.path || "").trim() || null;
  }
  return null;
}

function videoMimeTypeFor(src) {
  const value = String(src || "").toLowerCase();
  if (value.endsWith(".mp4")) return "video/mp4";
  if (value.endsWith(".webm")) return "video/webm";
  if (value.endsWith(".mov")) return "video/quicktime";
  if (value.endsWith(".m4v")) return "video/x-m4v";
  if (value.endsWith(".ogg")) return "video/ogg";
  return "video/mp4";
}

function buildAddressQuery(property) {
  const omne = property?.omne || null;
  const address1 = String(
    firstDefined(omne?.address?.line1, property?.address1, property?.address, property?.title) || ""
  ).trim();
  const address2 = String(firstDefined(omne?.address?.line2, property?.address2) || "").trim();
  const city = String(firstDefined(omne?.address?.city, property?.city) || "").trim();
  const state = String(firstDefined(omne?.address?.state, property?.state) || "").trim();
  const zip = String(firstDefined(omne?.address?.postalCode, property?.zip, property?.zipcode) || "").trim();
  const parts = [address1, address2, city, state, zip].filter(Boolean);
  return parts.join(", ").trim();
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function formatListingTitle(property) {
  const omne = property?.omne || null;
  return (
    String(firstDefined(omne?.address?.line1, omne?.headline, property?.address1, property?.title, property?.address, "Listing")) ||
    "Listing"
  );
}

function formatListingLocality(property) {
  const omne = property?.omne || null;
  const city = String(firstDefined(omne?.address?.city, property?.city) || "").trim();
  const state = String(firstDefined(omne?.address?.state, property?.state) || "").trim();
  const zip = String(firstDefined(omne?.address?.postalCode, property?.zip, property?.zipcode) || "").trim();
  const locality = [city, state].filter(Boolean).join(", ");
  return [locality, zip].filter(Boolean).join(" ").trim() || "Location pending";
}

function formatListingAttribution(property) {
  const omne = property?.omne || null;
  const brokerage = omne?.attribution?.brokerage?.name || "";
  const agent = omne?.attribution?.listingAgent?.name || "";
  const parts = [agent, brokerage].filter(Boolean);
  if (parts.length) return parts.join(" · ");

  const status = String(omne?.status || property?.status || "")
    .replace(/_/g, " ")
    .trim();
  return status ? status.toUpperCase() : "";
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Price on request";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
      amount
    );
  } catch {
    return `$${Math.round(amount).toLocaleString("en-US")}`;
  }
}

function formatCount(value, suffix) {
  const num = Number(value);
  if (!Number.isFinite(num)) return `- ${suffix}`;
  return `${num} ${suffix}`;
}

function formatSqft(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "- sqft";
  return `${Math.round(num).toLocaleString("en-US")} sqft`;
}

function formatCompactCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Private";
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 1 : 2).replace(/\.0$/, "")}M`;
  }
  if (amount >= 1000) return `$${Math.round(amount / 1000)}K`;
  return formatCurrency(amount);
}

function buildPrimaryFacts(property) {
  const omne = property?.omne || null;
  const metrics = omne?.metrics || null;
  const fallback = getPlaceholderPropertyFacts(property);
  return [
    { label: "Price", value: formatCompactCurrency(firstNumeric(metrics?.price, property?.price, fallback.price)) },
    {
      label: "Beds",
      value: formatCount(firstNumeric(metrics?.beds, property?.beds, property?.bedrooms, fallback.beds), "BD"),
    },
    {
      label: "Baths",
      value: formatCount(firstNumeric(metrics?.baths, property?.baths, property?.bathrooms, fallback.baths), "BA"),
    },
    {
      label: "Scale",
      value: formatSqft(firstNumeric(metrics?.interiorSqft, property?.sqft, property?.squareFeet, fallback.sqft)),
    },
  ];
}

function buildDetailsSections(property) {
  const omne = property?.omne || null;
  const metrics = omne?.metrics || {};
  const address = omne?.address || {};
  const attribution = omne?.attribution || {};
  const media = omne?.media || {};
  const source = omne?.source || {};
  const operations = omne?.operations || {};
  const features = omne?.features || {};

  const overview = {
    label: "Overview",
    rows: [
      { label: "Status", value: formatStatus(omne?.status || property?.status) },
      { label: "Type", value: omne?.propertyType || "Residential" },
      { label: "Price", value: formatCurrency(metrics?.price) },
      { label: "Summary", value: omne?.summary || property?.meta || "Property record" },
    ],
  };

  const specifications = {
    label: "Specifications",
    rows: [
      { label: "Beds", value: formatCount(metrics?.beds, "BD") },
      { label: "Baths", value: formatCount(metrics?.baths, "BA") },
      { label: "Interior", value: formatSqft(metrics?.interiorSqft) },
      { label: "Lot", value: formatSqft(metrics?.lotSqft) },
      { label: "Year Built", value: formatYear(metrics?.yearBuilt) },
    ],
  };

  const location = {
    label: "Location",
    rows: [
      { label: "Address", value: [address.line1, address.line2].filter(Boolean).join(", ") || "Address pending" },
      { label: "City", value: address.city || "-" },
      { label: "State", value: address.state || "-" },
      { label: "Postal", value: address.postalCode || "-" },
    ],
  };

  const representation = {
    label: "Representation",
    rows: [
      { label: "Brokerage", value: attribution?.brokerage?.name || "Unassigned" },
      { label: "Listing Agent", value: attribution?.listingAgent?.name || "Unassigned" },
      { label: "Co-List", value: attribution?.coListingAgent?.name || "-" },
      { label: "Inquiry", value: omne?.routing?.inquiryEmail || omne?.routing?.phone || "Routing pending" },
    ],
  };

  const operationsSection = {
    label: "Operations",
    rows: [
      { label: "HOA", value: formatAssociationFee(operations?.associationFee, operations?.associationFeeFrequency) },
      { label: "Taxes", value: formatCurrency(operations?.taxAnnualAmount) },
      { label: "Parking", value: formatParking(operations) },
      { label: "Climate", value: formatClimate(operations) },
      { label: "Pets", value: operations?.petsAllowed || "-" },
    ],
  };

  const featuresSection = {
    label: "Features",
    rows: [
      { label: "Building", value: operations?.buildingType || "-" },
      { label: "Amenities", value: formatList(features?.amenities) },
      { label: "HOA Includes", value: formatList(features?.hoaIncludes) },
      { label: "Appliances", value: formatList(features?.appliances) },
      { label: "Parcel", value: operations?.parcelNumber || "-" },
    ],
  };

  const mediaSection = {
    label: "Media",
    rows: [
      { label: "Photos", value: String(Array.isArray(media?.photos) ? media.photos.length : 0) },
      { label: "Collections", value: String(Array.isArray(omne?.collections) ? omne.collections.length : 0) },
      { label: "Modules", value: formatModuleList(media?.modules) },
      { label: "Intake", value: source?.intakeDate || "Pending" },
    ],
  };

  return [overview, specifications, location, representation, operationsSection, featuresSection, mediaSection];
}

function getPlaceholderPropertyFacts(property) {
  const key = String(property?.propertyId || property?.id || property?.address1 || "omne").trim();
  const seed = Array.from(key).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const presets = [
    { price: 2850000, beds: 4, baths: 5, sqft: 4920 },
    { price: 1795000, beds: 3, baths: 4, sqft: 3180 },
    { price: 1225000, beds: 2, baths: 3, sqft: 2410 },
    { price: 3490000, beds: 5, baths: 6, sqft: 5840 },
    { price: 965000, beds: 2, baths: 2, sqft: 1875 },
    { price: 2140000, beds: 4, baths: 4, sqft: 3660 },
  ];
  return presets[seed % presets.length];
}

function formatStatus(value) {
  const next = String(value || "").trim();
  if (!next) return "Active";
  return next.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatYear(value) {
  const year = Number(value);
  return Number.isFinite(year) ? String(Math.round(year)) : "-";
}

function formatModuleList(value) {
  const list = Array.isArray(value) ? value : [];
  if (!list.length) return "Gallery";
  return list.map((item) => String(item).replace(/-/g, " ")).join(" · ");
}

function formatAssociationFee(amount, frequency) {
  if (!Number.isFinite(Number(amount))) return "-";
  const money = formatCurrency(amount);
  return frequency ? `${money} / ${String(frequency).toLowerCase()}` : money;
}

function formatParking(operations) {
  const parkingSpaces = Number(operations?.parkingSpaces);
  const garageSpaces = Number(operations?.garageSpaces);
  const type = operations?.parkingType || "";
  const parts = [];
  if (Number.isFinite(parkingSpaces)) parts.push(`${parkingSpaces} space${parkingSpaces === 1 ? "" : "s"}`);
  if (Number.isFinite(garageSpaces)) parts.push(`${garageSpaces} garage`);
  if (type) parts.push(type);
  return parts.length ? parts.join(" · ") : "-";
}

function formatClimate(operations) {
  const parts = [operations?.heating, operations?.cooling].filter(Boolean);
  return parts.length ? parts.join(" · ") : "-";
}

function formatList(value) {
  const list = Array.isArray(value) ? value.filter(Boolean) : [];
  return list.length ? list.join(", ") : "-";
}

function firstNumeric(...values) {
  for (const value of values) {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return NaN;
}
