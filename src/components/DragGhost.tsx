import { useEditStore } from "../editing";
import { TileIcon } from "./TileIcon";
import "./DragGhost.css";

/** Étiquette qui suit le pointeur pendant le déplacement d'une tuile ou d'un groupe. */
export function DragGhost() {
  const drag = useEditStore((s) => s.drag);
  if (!drag) return null;

  return (
    <div className="drag-ghost" style={{ left: drag.x + 14, top: drag.y + 12 }} aria-hidden="true">
      {drag.kind === "tile" ? (
        <>
          <TileIcon section={drag.section} tile={drag.tile} size={22} />
          <span>{drag.tile.name}</span>
        </>
      ) : (
        <span className="drag-ghost__group">{drag.name}</span>
      )}
    </div>
  );
}
