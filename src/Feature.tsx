import { useEffect, useMemo, useState, Fragment } from "react";
import { MeshNameInput, type MeshConfig, type YRoom } from "@baditaflorin/mesh-common";
import * as Y from "yjs";

type Props = { room: YRoom | null; config: MeshConfig };

const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NAME_KEY = (prefix: string) => `${prefix}:displayName`;

function slotId(day: string, hour: string): string {
  return `${day}-${hour}`;
}

export function Feature({ room, config }: Props) {
  const [name, setName] = useState(
    () => localStorage.getItem(NAME_KEY(config.storagePrefix)) ?? "",
  );
  const [, rerender] = useState(0);
  const [dragMode, setDragMode] = useState<null | "on" | "off">(null);

  useEffect(() => {
    if (name) localStorage.setItem(NAME_KEY(config.storagePrefix), name);
  }, [name, config.storagePrefix]);

  const slots = useMemo(() => {
    if (!room) return null;
    return room.doc.getMap<Y.Map<boolean>>("slots");
  }, [room]);

  useEffect(() => {
    if (!slots) return;
    const onChange = () => rerender((n) => n + 1);
    slots.observeDeep(onChange);
    return () => slots.unobserveDeep(onChange);
  }, [slots]);

  if (!room || !slots) {
    return (
      <div className="when-screen">
        <h1>when can we meet?</h1>
        <p className="when-status">Connecting…</p>
      </div>
    );
  }

  const myKey = name.trim() || `peer-${room.peerId.slice(0, 4)}`;

  const setSlot = (day: string, hour: string, value: boolean) => {
    const id = slotId(day, hour);
    let row = slots.get(id);
    if (!row) {
      row = new Y.Map<boolean>();
      slots.set(id, row);
    }
    row.set(myKey, value);
  };

  const totals = (day: string, hour: string) => {
    const row = slots.get(slotId(day, hour));
    if (!row) return { count: 0, names: [] as string[] };
    const names: string[] = [];
    row.forEach((v, k) => {
      if (v) names.push(k);
    });
    return { count: names.length, names };
  };

  return (
    <div className="when-screen">
      <header className="when-header">
        <h1>when can we meet?</h1>
        <MeshNameInput
          value={name}
          onChange={setName}
          placeholder="your name"
          maxLength={24}
          className="when-name"
        />
        <p className="when-status">{room.peerCount + 1} here · drag to paint, tap to toggle</p>
      </header>

      <div
        className="when-grid"
        style={{ gridTemplateColumns: `auto repeat(${DAYS.length}, 1fr)` }}
        onPointerUp={() => setDragMode(null)}
        onPointerLeave={() => setDragMode(null)}
      >
        <div />
        {DAYS.map((d) => (
          <div key={`label-${d}`} className="when-day-label">
            {d}
          </div>
        ))}
        {HOURS.map((h) => (
          <Fragment key={`row-${h}`}>
            <div className="when-hour-label">{h}</div>
            {DAYS.map((d) => {
              const { count, names } = totals(d, h);
              const mine = slots.get(slotId(d, h))?.get(myKey) === true;
              const present = Math.max(1, room.peerCount + 1);
              const intensity = Math.min(1, count / present);
              return (
                <button
                  key={`${d}-${h}`}
                  type="button"
                  className={`when-cell ${mine ? "is-mine" : ""}`}
                  title={names.join(", ")}
                  style={{
                    background: `color-mix(in srgb, var(--mesh-accent) ${intensity * 75}%, transparent)`,
                  }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    const next = mine ? "off" : "on";
                    setDragMode(next);
                    setSlot(d, h, next === "on");
                  }}
                  onPointerEnter={() => {
                    if (dragMode) setSlot(d, h, dragMode === "on");
                  }}
                >
                  {count > 0 ? count : ""}
                </button>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
