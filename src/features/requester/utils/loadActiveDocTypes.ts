import type { DocDeskService } from "../../../services/docDeskService.types";
import type { DocType } from "../../../types/document";

/** Fetch every active CampusOS document type page and de-duplicate IDs. */
export async function loadActiveDocTypes(
  service: Pick<DocDeskService, "listDocumentTypes">,
  isCancelled: () => boolean = () => false,
): Promise<DocType[]> {
  const all: DocType[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await service.listDocumentTypes({
      status: "active",
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    all.push(...page.items.filter((type) => type.status === "active"));
    cursor = page.next_cursor || undefined;
    if (cursor && seenCursors.has(cursor)) {
      throw new Error("CampusOS returned a repeated document type page cursor.");
    }
    if (cursor) seenCursors.add(cursor);
  } while (cursor && !isCancelled());

  const unique = new Map<string, DocType>();
  all.forEach((type) => {
    if (type.doc_type_id && !unique.has(type.doc_type_id)) {
      unique.set(type.doc_type_id, type);
    }
  });
  return [...unique.values()];
}
