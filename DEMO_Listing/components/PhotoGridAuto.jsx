import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "../styles/photoGridAuto.module.css";

const EMPTY = [];

export default function PhotoGridAuto({
  dir,
  items,
  images: imageProp,
  property = null,
  exportMode = "full",
  size = "medium",
  slideshow = false,
}) {
  const safeItems = Array.isArray(items) ? items : EMPTY;
  const safeImageProp = Array.isArray(imageProp) ? imageProp : EMPTY;
  const safeDir = useMemo(() => String(dir || "").trim(), [dir]);
  const expectedFolder = safeDir || "<propertyId>";

  const normalizedImages = useMemo(() => {
    const toSrc = (entry) => {
      if (!entry) return "";
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "object") return String(entry.full || entry.src || entry.thumb || "").trim();
      return "";
    };

    const list = [];
    const add = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const entry of arr) {
        const src = toSrc(entry);
        if (src) list.push(src);
      }
    };

    add(safeItems);
    add(safeImageProp);
    return Array.from(new Set(list));
  }, [safeImageProp, safeItems]);

  const [images, setImages] = useState([]);
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");

  const [activeCollectionId, setActiveCollectionId] = useState("");
  const [openCollectionId, setOpenCollectionId] = useState("");
  const [heroSrc, setHeroSrc] = useState("");
  const [expandedSrc, setExpandedSrc] = useState("");
  const [mounted, setMounted] = useState(false);
  const [slideshowPaused, setSlideshowPaused] = useState(false);
  const [lockedIdx, setLockedIdx] = useState(-1);
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [railOverflowing, setRailOverflowing] = useState(false);
  const railRef = useRef(null);
  const hoveredIdxRef = useRef(-1);
  const collectionBodyRefs = useRef(new Map());
  const prevSlideshowRef = useRef(slideshow);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (normalizedImages.length) {
        setImages(normalizedImages);
        setStatus("ready");
        setErr("");
        return;
      }

      if (!safeDir) {
        setImages([]);
        setStatus("empty");
        setErr("");
        return;
      }

      setStatus("loading");
      setErr("");

      try {
        const res = await fetch(`/api/photos?dir=${encodeURIComponent(safeDir)}`);
        const data = await res.json();
        if (!alive) return;

        if (!res.ok) {
          setStatus("error");
          setErr(data?.error || "Failed to load photos.");
          return;
        }

        const next = Array.isArray(data?.images) ? data.images : [];
        setImages(next);
        setStatus(next.length ? "ready" : "empty");
      } catch (e) {
        if (!alive) return;
        setStatus("error");
        setErr(String(e?.message || e));
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [normalizedImages, safeDir]);

  const omneCollections = useMemo(() => normalizeOmneCollections(property?.omne?.collections, images), [images, property]);
  const collections = useMemo(() => (omneCollections.length ? omneCollections : buildFallbackCollections(images)), [images, omneCollections]);
  const activeCollection = useMemo(() => {
    if (!collections.length) return null;
    const byId = collections.find((c) => c.id === activeCollectionId);
    return byId || collections[0];
  }, [activeCollectionId, collections]);

  const activeCollectionImages = activeCollection?.images || EMPTY;
  const displayCollections = collections;
  const slideshowImages = useMemo(() => {
    if (collections.length) {
      const overview = collections.find((collection) => collection.id === "overview");
      if (overview?.images?.length) return overview.images;
    }
    return images;
  }, [collections, images]);
  const layoutMode = slideshow ? "slideshow" : size === "small" ? "standard" : "overview";

  useEffect(() => {
    if (!collections.length) {
      setActiveCollectionId("");
      setOpenCollectionId("");
      setHeroSrc("");
      return;
    }
    if (!activeCollectionId) {
      setActiveCollectionId(collections[0].id);
      setOpenCollectionId(collections[0].id);
      return;
    }
    if (!collections.some((c) => c.id === activeCollectionId)) {
      setActiveCollectionId(collections[0].id);
      setOpenCollectionId(collections[0].id);
      return;
    }
    if (openCollectionId && !collections.some((c) => c.id === openCollectionId)) {
      setOpenCollectionId(collections[0].id);
    }
    if (activeCollectionId === "overview" && openCollectionId !== "overview") {
      setOpenCollectionId("overview");
    }
  }, [activeCollectionId, collections, openCollectionId]);

  useEffect(() => {
    if (!activeCollectionImages.length) {
      setHeroSrc("");
      return;
    }
    const authoredHero = property?.omne?.media?.heroMedia;
    if (slideshow) {
      if (!heroSrc || !slideshowImages.includes(heroSrc)) {
        setHeroSrc(authoredHero && slideshowImages.includes(authoredHero) ? authoredHero : slideshowImages[0]);
      }
      return;
    }
    if (!heroSrc || !activeCollectionImages.includes(heroSrc)) {
      setHeroSrc(authoredHero && activeCollectionImages.includes(authoredHero) ? authoredHero : activeCollectionImages[0]);
    }
  }, [activeCollectionImages, collections, heroSrc, property, slideshow, slideshowImages]);

  useEffect(() => {
    const wasSlideshow = prevSlideshowRef.current;
    prevSlideshowRef.current = slideshow;

    if (!wasSlideshow || slideshow || !activeCollection) return;

    const authoredHero = property?.omne?.media?.heroMedia;
    const nextHero =
      activeCollection.coverMediaId && activeCollectionImages.includes(activeCollection.coverMediaId)
        ? activeCollection.coverMediaId
        : authoredHero && activeCollectionImages.includes(authoredHero)
          ? authoredHero
          : activeCollectionImages[0] || "";

    setLockedIdx(-1);
    setHoveredIdx(-1);
    hoveredIdxRef.current = -1;
    setSlideshowPaused(false);
    setHeroSrc(nextHero);
  }, [activeCollection, activeCollectionImages, property, slideshow]);

  useEffect(() => {
    setLockedIdx(-1);
    setHoveredIdx(-1);
    hoveredIdxRef.current = -1;
    setExpandedSrc("");
    setSlideshowPaused(false);
  }, [activeCollectionId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expandedSrc) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setExpandedSrc("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedSrc]);

  useEffect(() => {
    if (!slideshow || slideshowPaused || slideshowImages.length <= 1) return undefined;
    const timer = setInterval(() => {
      setHeroSrc((current) => {
        const currentIndex = slideshowImages.indexOf(current);
        const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % slideshowImages.length : 0;
        return slideshowImages[nextIndex];
      });
    }, 6400);
    return () => clearInterval(timer);
  }, [slideshow, slideshowImages, slideshowPaused]);

  useEffect(() => {
    if (!slideshow) return undefined;
    const onKeyDown = (event) => {
      if (!slideshowImages.length) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSlideshowPaused(true);
        setHeroSrc((current) => {
          const currentIndex = slideshowImages.indexOf(current);
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % slideshowImages.length : 0;
          return slideshowImages[nextIndex];
        });
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSlideshowPaused(true);
        setHeroSrc((current) => {
          const currentIndex = slideshowImages.indexOf(current);
          const nextIndex =
            currentIndex >= 0
              ? (currentIndex - 1 + slideshowImages.length) % slideshowImages.length
              : Math.max(slideshowImages.length - 1, 0);
          return slideshowImages[nextIndex];
        });
      }
      if (event.key === " ") {
        event.preventDefault();
        setSlideshowPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [slideshow, slideshowImages]);

  useEffect(() => {
    const node = railRef.current;
    if (!node) return undefined;

    const measure = () => {
      setRailOverflowing(node.scrollWidth > node.clientWidth + 1);
    };

    measure();

    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(node);
    } else {
      window.addEventListener("resize", measure);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", measure);
    };
  }, [collections.length]);

  useEffect(() => {
    if (!openCollectionId) return;
    const node = collectionBodyRefs.current.get(openCollectionId);
    if (!node) return;
    node.scrollTop = 0;
  }, [openCollectionId]);

  if (status === "loading") return <div className={styles.noticeDark}>Loading photos...</div>;

  if (status === "error") {
    return (
      <div className={styles.noticeDark}>
        <div className={styles.errorTitle}>Couldn’t load photos.</div>
        <div className={styles.errorBody}>{err}</div>
        <div className={styles.hint}>
          Expected folder: <code className={styles.code}>public/photos/{expectedFolder}/</code>
        </div>
      </div>
    );
  }

  if (status === "empty" || !images.length || !collections.length) {
    return (
      <div className={styles.noticeDark}>
        <div className={styles.hint}>
          No photos found. Put images in <code className={styles.code}>public/photos/{expectedFolder}/</code>
        </div>
        <div className={styles.subhint}>Supported: jpg, jpeg, png, webp, gif, avif</div>
      </div>
    );
  }

  const heroPanel = (
    <div className={styles.heroPanel}>
      <article className={styles.hero}>
        {heroSrc && <img src={heroSrc} alt="" className={styles.heroImg} loading="eager" decoding="async" />}
      </article>
    </div>
  );

  const renderThumbButton = (src, idx, className = styles.mosaicItem) => (
    <button
      key={`${src}-${idx}`}
      type="button"
      className={`${className} ${src === heroSrc ? styles.mosaicItemActive : ""}`}
      onMouseEnter={() => setHeroSrc(src)}
      onFocus={() => setHeroSrc(src)}
      onClick={() => setHeroSrc(src)}
    >
      <img src={src} alt="" className={styles.mosaicImg} loading="lazy" decoding="async" />
    </button>
  );

  const activeIdx = activeCollectionImages.indexOf(heroSrc);
  const slideshowIdx = slideshowImages.indexOf(heroSrc);
  const focusIdx = hoveredIdx >= 0 ? hoveredIdx : activeIdx;

  const handlePreviewHover = (idx) => {
    if (!Number.isFinite(idx) || idx < 0 || idx >= activeCollectionImages.length) return;
    if (hoveredIdxRef.current === idx) return;
    hoveredIdxRef.current = idx;
    setHoveredIdx(idx);
    setHeroSrc(activeCollectionImages[idx]);
  };

  const handleSelect = (idx) => {
    if (!Number.isFinite(idx) || idx < 0 || idx >= activeCollectionImages.length) return;
    if (lockedIdx === idx) {
      setLockedIdx(-1);
      return;
    }
    setLockedIdx(idx);
    setHoveredIdx(idx);
    hoveredIdxRef.current = idx;
    setHeroSrc(activeCollectionImages[idx]);
  };

  const goPrevSlide = () => {
    if (!activeCollectionImages.length) return;
    setSlideshowPaused(true);
    setHeroSrc((current) => {
      const currentIndex = activeCollectionImages.indexOf(current);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex - 1 + activeCollectionImages.length) % activeCollectionImages.length
          : Math.max(activeCollectionImages.length - 1, 0);
      return activeCollectionImages[nextIndex];
    });
  };

  const goNextSlide = () => {
    if (!activeCollectionImages.length) return;
    setSlideshowPaused(true);
    setHeroSrc((current) => {
      const currentIndex = activeCollectionImages.indexOf(current);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % activeCollectionImages.length : 0;
      return activeCollectionImages[nextIndex];
    });
  };

  const toggleCollection = (collectionId) => {
    if (!collectionId) return;
    const nextCollection = collections.find((collection) => collection.id === collectionId);
    if (collectionId === "overview") {
      setActiveCollectionId("overview");
      setOpenCollectionId("overview");
      setLockedIdx(-1);
      setHoveredIdx(-1);
      hoveredIdxRef.current = -1;
      if (nextCollection?.images?.length) {
        const nextHero = nextCollection.coverMediaId && nextCollection.images.includes(nextCollection.coverMediaId)
          ? nextCollection.coverMediaId
          : nextCollection.images[0];
        setHeroSrc(nextHero);
      }
      return;
    }
    setActiveCollectionId(collectionId);
    setOpenCollectionId((current) => {
      const nextOpenId = current === collectionId ? "" : collectionId;
        if (nextOpenId) {
          setLockedIdx(-1);
          setHoveredIdx(-1);
          hoveredIdxRef.current = -1;
          if (nextCollection?.images?.length) {
            const nextHero = nextCollection.coverMediaId && nextCollection.images.includes(nextCollection.coverMediaId)
              ? nextCollection.coverMediaId
              : nextCollection.images[0];
            setHeroSrc(nextHero);
          }
        }
        return nextOpenId;
    });
  };

  const galleryPanel = (
    <aside className={styles.collectionSection}>
      <header className={styles.collectionHeader}>
        <div className={styles.collectionMetaBlock}>
          <span className={styles.collectionTitle}>Overview</span>
          <span className={styles.collectionCount}>{displayCollections.length}</span>
        </div>
      </header>
      <section className={styles.collectionGroup} aria-label="Overview">
        <div className={styles.collectionFolderStack} aria-label="Overview">
        {displayCollections.map((collection) => {
          const active = activeCollection?.id === collection.id;
          const open = openCollectionId === collection.id;
          const lockedOpen = collection.id === "overview";
          const overviewOnly = collection.id === "overview";
          const preview = collection.images[0];
          return (
            <section
              key={collection.id}
              className={`${styles.collectionFolder} ${overviewOnly ? styles.collectionFolderOverview : ""} ${active ? styles.collectionFolderActive : ""} ${
                open ? styles.collectionFolderOpen : ""
              }`}
            >
              <button
                type="button"
                className={`${styles.collectionFolderHead} ${overviewOnly ? styles.collectionFolderHeadOverview : ""}`}
                onFocus={() => {
                  setActiveCollectionId(collection.id);
                  setOpenCollectionId(collection.id);
                }}
                onClick={() => toggleCollection(collection.id)}
                aria-expanded={open || lockedOpen}
              >
                {!overviewOnly ? (
                  <>
                    <span className={styles.collectionFolderPreview}>
                      <span className={styles.railThumbWrap}>
                        {preview ? (
                          <img src={preview} alt="" className={styles.railThumb} loading="lazy" decoding="async" />
                        ) : (
                          <span className={styles.railPlaceholder} />
                        )}
                      </span>
                    </span>
                    <span className={styles.collectionFolderMeta}>
                      <span className={styles.collectionFolderLabel}>{collection.label}</span>
                      <span className={styles.collectionFolderCount}>{collection.images.length}</span>
                    </span>
                  </>
                ) : null}
              </button>
              <div
                className={`${styles.collectionFolderBody} ${open || lockedOpen ? styles.collectionFolderBodyOpen : ""}`}
                aria-hidden={!(open || lockedOpen)}
              >
                {active ? (
                  <div
                    key={activeCollection?.id || "collection-strip"}
                    ref={(node) => {
                      if (node) collectionBodyRefs.current.set(collection.id, node);
                      else collectionBodyRefs.current.delete(collection.id);
                    }}
                    className={`${styles.galleryStrip} ${
                      open ? styles.galleryStripReveal : styles.galleryStripCollapse
                    } ${styles.collectionFolderBodyInner}`}
                    aria-label={`${collection.label} photos`}
                    onMouseLeave={() => {
                      if (!open) return;
                      if (lockedIdx >= 0) {
                        hoveredIdxRef.current = lockedIdx;
                        setHoveredIdx(lockedIdx);
                        setHeroSrc(activeCollectionImages[lockedIdx]);
                        return;
                      }
                      hoveredIdxRef.current = -1;
                      setHoveredIdx(-1);
                    }}
                  >
                    {activeCollectionImages.map((src, idx) => {
                      const isActive = idx === activeIdx;
                      const rel = focusIdx >= 0 ? idx - focusIdx : 0;
                      const hasFocus = focusIdx >= 0;
                      const isFocused = rel === 0;
                      const slotClass =
                        rel === -1
                          ? styles.galleryThumbAbove1
                          : rel === -2
                            ? styles.galleryThumbAbove2
                            : rel === -3
                              ? styles.galleryThumbAbove3
                              : rel === 1
                                ? styles.galleryThumbBelow1
                                : rel === 2
                                  ? styles.galleryThumbBelow2
                                  : rel === 3
                                    ? styles.galleryThumbBelow3
                                    : "";

                      return (
                        <button
                          key={`${src}-${idx}`}
                          type="button"
                          className={`${styles.galleryThumb} ${isActive ? styles.galleryThumbActive : ""} ${
                            hasFocus && !isFocused ? styles.galleryThumbDimmed : ""
                          } ${hasFocus && isFocused ? styles.galleryThumbFocused : ""} ${
                            hasFocus && !isFocused ? slotClass : ""
                          } ${lockedIdx === idx ? styles.galleryThumbLocked : ""}`}
                          onMouseEnter={() => handlePreviewHover(idx)}
                          onFocus={() => handlePreviewHover(idx)}
                          onClick={() => handleSelect(idx)}
                          aria-pressed={isActive}
                          title={src.split("/").slice(-1)[0]}
                        >
                          <img src={src} alt="" className={styles.galleryThumbImg} loading="lazy" decoding="async" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
        </div>
      </section>
    </aside>
  );

  const compactGalleryPanel = (
    <aside className={styles.stripSection}>
      <header className={styles.collectionHeader}>
        <span className={styles.collectionTitle}>{activeCollection?.label || "Collection"}</span>
        <span className={styles.collectionCount}>{activeCollectionImages.length}</span>
      </header>
      <div className={styles.stripMosaic}>
        {activeCollectionImages.map((src, idx) => renderThumbButton(src, idx, styles.stripItem))}
      </div>
    </aside>
  );

  const standardGridPanel = (
    <section className={styles.baseGridSection}>
      <div className={styles.baseGrid}>
        {activeCollectionImages.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            className={styles.baseGridCell}
            onMouseEnter={() => setHeroSrc(src)}
            onFocus={() => setHeroSrc(src)}
            onClick={() => {
              setHeroSrc(src);
              setExpandedSrc(src);
            }}
          >
            <img src={src} alt="" className={styles.baseGridImg} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
    </section>
  );

  const expandedOverlay =
    mounted && expandedSrc
      ? createPortal(
          <div className={styles.baseGridExpandOverlay} role="dialog" aria-modal="true" aria-label="Expanded photo view">
            <button
              type="button"
              className={styles.baseGridExpandBackdrop}
              onClick={() => setExpandedSrc("")}
              aria-label="Close expanded photo"
            />
            <div className={styles.baseGridExpandFrame}>
              <button
                type="button"
                className={styles.baseGridExpandClose}
                onClick={() => setExpandedSrc("")}
                aria-label="Close expanded photo"
              >
                Close
              </button>
              <img src={expandedSrc} alt="" className={styles.baseGridExpandImg} loading="eager" decoding="async" />
            </div>
          </div>,
          document.body
        )
      : null;

  const showcaseGalleryPanel = (
    <aside className={styles.showcaseSection}>
      <header className={styles.collectionHeader}>
        <span className={styles.collectionTitle}>{activeCollection?.label || "Collection"}</span>
        <span className={styles.collectionCount}>{activeCollectionImages.length}</span>
      </header>
      <div className={styles.showcaseGrid}>
        {activeCollectionImages.slice(0, 6).map((src, idx) =>
          renderThumbButton(src, idx, `${styles.showcaseItem} ${idx === 0 ? styles.showcaseItemLead : ""}`)
        )}
      </div>
    </aside>
  );

  const slideshowStagePanel = (
    <section className={styles.slideshowStage}>
      <div className={styles.slideshowFrame}>
        {heroSrc && (
          <img
            key={heroSrc}
            src={heroSrc}
            alt=""
            className={styles.slideshowImg}
            loading="eager"
            decoding="async"
          />
        )}
        <div className={styles.slideshowMeta}>
          <div className={styles.slideshowMetaBlock}>
            <span className={styles.slideshowEyebrow}>Presentation Mode</span>
            <span className={styles.slideshowCollection}>{activeCollection?.label || "Collection"}</span>
            <span className={styles.slideshowProgress}>
              {Math.max(slideshowIdx + 1, 1)} / {slideshowImages.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );

  const rail = (
    <nav
      ref={railRef}
      className={`${styles.rail} ${railOverflowing ? styles.railScrollable : styles.railCentered}`}
      aria-label="Area collections"
    >
      {collections.map((collection) => {
        const preview = collection.images[0];
        const active = activeCollection?.id === collection.id;
        return (
          <button
            key={collection.id}
            type="button"
            className={`${styles.railSlot} ${active ? styles.railSlotActive : ""}`}
            onMouseEnter={() => setActiveCollectionId(collection.id)}
            onFocus={() => setActiveCollectionId(collection.id)}
            onClick={() => setActiveCollectionId(collection.id)}
            title={`${collection.label} (${collection.images.length})`}
          >
            <div className={styles.railThumbWrap}>
              {preview ? (
                <img src={preview} alt="" className={styles.railThumb} loading="lazy" decoding="async" />
              ) : (
                <span className={styles.railPlaceholder} />
              )}
            </div>
            <span className={styles.railMeta}>
              <span className={styles.railLabel}>{collection.label}</span>
              <span className={styles.railCount}>{collection.images.length}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  const layoutClass =
    layoutMode === "standard"
      ? styles.layoutStandardGrid
      : layoutMode === "slideshow"
        ? styles.layoutSlideshow
        : styles.layoutOverview;

  const stageContent =
    layoutMode === "standard" ? (
      standardGridPanel
    ) : layoutMode === "slideshow" ? (
      slideshowStagePanel
    ) : (
      <>
        {heroPanel}
        {galleryPanel}
      </>
    );

  if (exportMode === "hero") {
    return <section className={`${styles.stage} ${styles.stageSolo} ${layoutClass}`}>{heroPanel}</section>;
  }

  if (exportMode === "gallery") {
    return <section className={`${styles.stage} ${styles.stageSolo} ${layoutClass}`}>{galleryPanel}</section>;
  }

  if (exportMode === "stage") {
    return (
      <section className={`${styles.stage} ${layoutClass}`}>
        {stageContent}
      </section>
    );
  }

  if (exportMode === "rail") {
    return <div className={styles.railOnly}>{rail}</div>;
  }

  return (
    <>
      <div className={`${styles.wrap} ${layoutClass}`}>
        <section className={`${styles.stage} ${layoutClass}`}>
          {stageContent}
        </section>
      </div>
      {expandedOverlay}
    </>
  );
}

function normalizeOmneCollections(collections, images) {
  const imageSet = new Set(Array.isArray(images) ? images : EMPTY);
  if (!Array.isArray(collections) || !collections.length) return [];

  return collections
    .map((collection, index) => {
      const list = (Array.isArray(collection?.images) ? collection.images : EMPTY).filter((src) => imageSet.has(src));
      if (!list.length) return null;
      return {
        id: String(collection?.id || collection?.key || `collection-${index + 1}`),
        label: String(collection?.label || `Collection ${index + 1}`),
        images: list,
        coverMediaId: list.includes(collection?.coverMediaId) ? collection.coverMediaId : list[0],
      };
    })
    .filter(Boolean);
}

const FALLBACK_ROOM_COLLECTIONS = [
  { id: "overview", label: "Overview", keywords: [] },
];

function buildFallbackCollections(images) {
  if (!Array.isArray(images) || !images.length) return [];

  const buckets = new Map(FALLBACK_ROOM_COLLECTIONS.map((collection) => [collection.id, []]));
  const unmatched = [];

  for (const src of images) {
    buckets.get("overview").push(src);
    const rawName = decodeURIComponent(String(src || "").split("/").pop() || "").toLowerCase();
    const match = FALLBACK_ROOM_COLLECTIONS.find(
      (collection) => collection.id !== "overview" && collection.keywords.some((keyword) => rawName.includes(keyword))
    );

    if (match) buckets.get(match.id).push(src);
    else unmatched.push(src);
  }

  return FALLBACK_ROOM_COLLECTIONS.map((collection) => ({
    id: collection.id,
    label: collection.label,
    images: buckets.get(collection.id) || EMPTY,
    coverMediaId: (buckets.get(collection.id) || EMPTY)[0] || images[0],
  })).filter((collection) => collection.id === "overview" || collection.images.length > 0);
}
