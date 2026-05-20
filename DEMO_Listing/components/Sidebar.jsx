import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "../styles/sidebar.module.css";

export default function Sidebar({ properties = [], activeId, onSelect, query, setQuery }) {
  const [openDrawers, setOpenDrawers] = useState({
    active: false,
    archive: false,
  });

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return properties;
    return properties.filter((p) => {
      const title = `${p?.title || ""}`.toLowerCase();
      const meta = `${p?.meta || ""}`.toLowerCase();
      const id = `${p?.id || ""}`.toLowerCase();
      return title.includes(q) || meta.includes(q) || id.includes(q);
    });
  }, [properties, query]);

  const drawers = useMemo(() => {
    const groups = {
      active: [],
      archive: [],
    };

    for (const property of filtered) {
      const status = String(property?.status || "draft");
      if (status === "active") groups.active.push(property);
      else groups.archive.push(property);
    }

    return [
      { key: "active", label: "Active Listings", items: groups.active },
      { key: "archive", label: "Archive", items: groups.archive },
    ].filter((drawer) => drawer.items.length > 0);
  }, [filtered]);

  const toggleDrawer = (key) =>
    setOpenDrawers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.kicker}>PORTFOLIO</div>
        <input
          className={styles.search}
          value={query || ""}
          onChange={(e) => setQuery?.(e.target.value)}
          placeholder="Search properties..."
        />
      </div>

      <div className={styles.sectionLabel}>LIBRARY • {filtered.length}</div>

      <div className={styles.list}>
        {!drawers.length && <div className={styles.emptyState}>No listings match this search.</div>}

        {drawers.map((drawer) => (
          <section key={drawer.key} className={styles.group}>
            <button
              type="button"
              className={styles.drawerHeader}
              onClick={() => toggleDrawer(drawer.key)}
              aria-expanded={Boolean(openDrawers[drawer.key])}
            >
              <span className={`${styles.drawerCaret} ${openDrawers[drawer.key] ? styles.drawerCaretOpen : ""}`}>▸</span>
              <span>{drawer.label}</span>
              <span className={styles.groupCount}>{drawer.items.length}</span>
            </button>

            {openDrawers[drawer.key] && (
              <div className={styles.drawerBody}>
                {drawer.items.map((p) => {
                  const isActive = p.id === activeId;
                  return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.item} ${isActive ? styles.active : ""}`}
                  onClick={() => onSelect?.(p)}
                  title={p.title}
                >
                  <div className={styles.itemTitle}>{p.title}</div>
                  <div className={styles.itemMeta}>
                    {p.meta}
                    <span className={styles.itemStatus}>{humanizeStatus(p.status)}</span>
                  </div>
                </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className={styles.footer}>
        <Link className={styles.directoryLink} href="/admin/listings" title="Open directory">
          Directory
        </Link>
      </div>
    </aside>
  );
}

function humanizeStatus(status) {
  const s = String(status || "draft").replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
