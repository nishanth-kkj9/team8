import { Search } from "lucide-react";
import { Input, Select } from "../../../components/ui/Field";
import { STATUS_LABELS, DOCDESK_STATUSES, type DocDeskStatus } from "../../../types/request";
import type { DocType } from "../../../types/document";

export type RequestSort = "newest" | "oldest" | "expected";

interface RequestFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: DocDeskStatus | "";
  onStatusChange: (value: DocDeskStatus | "") => void;
  docTypeId: string;
  onDocTypeIdChange: (value: string) => void;
  sort: RequestSort;
  onSortChange: (value: RequestSort) => void;
  /** All document types (including archived — old requests may reference them). */
  docTypes: DocType[];
}

/** Search / filter / sort controls for My Requests (§5B R3). */
export function RequestFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  docTypeId,
  onDocTypeIdChange,
  sort,
  onSortChange,
  docTypes,
}: RequestFiltersProps) {
  const sortedTypes = [...docTypes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by request ID or document name…"
          aria-label="Search requests by request ID or document name"
          className="pl-9"
        />
      </div>
      <Select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as DocDeskStatus | "")}
        aria-label="Filter by status"
        className="w-40"
      >
        <option value="">All statuses</option>
        {DOCDESK_STATUSES.map((value) => (
          <option key={value} value={value}>
            {STATUS_LABELS[value]}
          </option>
        ))}
      </Select>
      <Select
        value={docTypeId}
        onChange={(event) => onDocTypeIdChange(event.target.value)}
        aria-label="Filter by document type"
        className="w-48"
      >
        <option value="">All document types</option>
        {sortedTypes.map((docType) => (
          <option key={docType.doc_type_id} value={docType.doc_type_id}>
            {docType.name}
          </option>
        ))}
      </Select>
      <Select
        value={sort}
        onChange={(event) => onSortChange(event.target.value as RequestSort)}
        aria-label="Sort requests"
        className="w-44"
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="expected">By expected date</option>
      </Select>
    </div>
  );
}
