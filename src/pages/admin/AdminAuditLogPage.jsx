import { useCallback, useEffect, useState } from "react";
import {
  History,
  Search,
  RefreshCw,
  CircleCheck,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  PawPrint,
  ClipboardList,
  User as UserIcon,
} from "lucide-react";
import { getReviewHistory, getEntries, getAllUser } from "../../api/admin";
import api from "../../services/api";

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ENTITY_TABS = [
  { key: "", label: "All", icon: History },
  { key: "Horse", label: "Horses", icon: PawPrint },
  { key: "Entry", label: "Entry", icon: ClipboardList },
  { key: "User", label: "Accounts", icon: UserIcon },
];

const ENTITY_LABEL = { Horse: "Horse", Entry: "Entry", User: "Account" };

const ROLE_LABEL = {
  ADMIN: "Admin",
  REFEREE: "Referee",
  HORSE_OWNER: "Horse Owner",
  JOCKEY: "Jockey",
  SPECTATOR: "Spectator",
};

const PAGE_SIZE = 15;

export default function AdminAuditLogPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [entityTab, setEntityTab] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Display names for Horse/Entry/Account — ReviewHistory only returns entityId (a number),
  // so we look up the name here ourselves instead of waiting for the BE to extend the response.
  const [horseNames, setHorseNames] = useState(new Map());
  const [entryLabels, setEntryLabels] = useState(new Map());
  const [userNames, setUserNames] = useState(new Map());

  useEffect(() => {
    api.get("/api/horses").then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setHorseNames(new Map(list.map((h) => [h.horseId, h.name])));
    }).catch(() => {});

    getEntries().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setEntryLabels(new Map(arr.map((e) => [
        e.entryId,
        [e.horseName, e.jockeyName].filter(Boolean).join(" × "),
      ])));
    }).catch(() => {});

    getAllUser({ page: 1, pageSize: 1000 }).then((res) => {
      const list = Array.isArray(res) ? res : (res?.items ?? []);
      setUserNames(new Map(list.map((u) => [
        u.userId,
        { fullName: u.fullName, roleCode: u.roleCode },
      ])));
    }).catch(() => {});
  }, []);

  const entityDisplayName = useCallback((entity, entityId) => {
    if (entity === "Horse") return horseNames.get(entityId);
    if (entity === "Entry") return entryLabels.get(entityId);
    if (entity === "User") {
      const u = userNames.get(entityId);
      if (!u?.fullName) return undefined;
      const role = u.roleCode ? (ROLE_LABEL[u.roleCode] ?? u.roleCode) : null;
      return role ? `${u.fullName} (${role})` : u.fullName;
    }
    return undefined;
  }, [horseNames, entryLabels, userNames]);

  const load = useCallback(async (entity) => {
    setLoading(true);
    setError("");
    try {
      const data = await getReviewHistory({ entity });
      // Newest first.
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(entityTab);
  }, [entityTab, load]);

  useEffect(() => {
    setPage(1);
  }, [entityTab, searchQuery]);

  const q = searchQuery.toLowerCase();
  const filtered = history.filter((h) => {
    if (!q) return true;
    const displayName = entityDisplayName(h.entity, h.entityId) || "";
    return (
      (h.adminName || "").toLowerCase().includes(q) ||
      (h.reason || "").toLowerCase().includes(q) ||
      displayName.toLowerCase().includes(q) ||
      String(h.entityId).includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const approvedCount = history.filter((h) => h.action === "Approved").length;
  const rejectedCount = history.filter((h) => h.action === "Rejected").length;

  return (
    <div className="max-w-[1280px] mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-lg">
              <History className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-on-surface">Audit Log</h1>
              <p className="text-on-surface-variant text-sm">
                Approval/rejection history for Horses · Entries · Accounts — with reasons and the admin who acted.
              </p>
            </div>
          </div>
          <button
            onClick={() => load(entityTab)}
            className="gs-btn gs-btn-ghost gs-btn-sm flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <div className="h-[2px] w-20 rounded-full bg-gradient-to-r from-primary to-secondary mt-4" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 bg-surface-container-high">
            <History className="w-4 h-4 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-on-surface">{history.length}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Total Records</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 bg-emerald-500/10 border-emerald-500/20">
            <CircleCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-emerald-400">{approvedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Approved</p>
          </div>
        </div>
        <div className="gs-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 bg-red-500/10 border-red-500/20">
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold font-mono text-red-400">{rejectedCount}</p>
            <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">Rejected</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 auth-alert auth-alert--error flex items-start gap-3">
          <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            placeholder="Search by admin, reason, entity ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant/40 text-sm rounded-xl pl-11 pr-4 py-3 text-on-surface focus:outline-none focus:border-secondary transition-all placeholder:text-on-surface-variant/40"
          />
        </div>
      </div>

      {/* Entity tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {ENTITY_TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key || "all"}
            onClick={() => setEntityTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all shrink-0 flex items-center gap-1.5
              ${entityTab === key
                ? "bg-secondary text-black"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="gs-card p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container-high mx-auto mb-4 flex items-center justify-center">
            <Inbox className="w-8 h-8 text-primary/60" />
          </div>
          <h3 className="font-serif text-xl font-bold text-on-surface mb-2">No records found</h3>
          <p className="text-on-surface-variant text-sm">
            {searchQuery ? `No results for "${searchQuery}".` : "No approval/rejection activity yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>Time</th>
                  <th style={{ width: "16%" }}>Entity</th>
                  <th style={{ width: "12%" }}>Action</th>
                  <th style={{ width: "36%" }}>Reason</th>
                  <th style={{ width: "20%" }}>Admin</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((h) => (
                  <tr key={h.id}>
                    <td className="text-on-surface-variant font-mono text-xs">
                      {formatDateTime(h.createdAt)}
                    </td>
                    <td className="text-sm text-on-surface">
                      {(() => {
                        const name = entityDisplayName(h.entity, h.entityId);
                        return name
                          ? `${ENTITY_LABEL[h.entity] ?? h.entity} ${name} (#${h.entityId})`
                          : `${ENTITY_LABEL[h.entity] ?? h.entity} #${h.entityId}`;
                      })()}
                    </td>
                    <td>
                      {h.action === "Approved" ? (
                        <span className="gs-badge bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <CircleCheck className="w-3 h-3" />
                          Approved
                        </span>
                      ) : (
                        <span className="gs-badge bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-on-surface-variant">
                      {h.reason || <span className="text-on-surface-variant/50">—</span>}
                    </td>
                    <td className="text-sm text-on-surface">{h.adminName || `Admin #${h.adminId}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-on-surface-variant">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-on-surface" />
                </button>
                <span className="text-xs text-on-surface-variant px-2 font-mono">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container-highest disabled:opacity-40 flex items-center justify-center transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-on-surface" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
