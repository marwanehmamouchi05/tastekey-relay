"use client";
import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  type Node,
  Position,
  useReactFlow,
  useNodesInitialized,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Profile, Preference } from "@tastekey/shared-types";
const statusLabel: Record<string, string> = {
  stated: "You added this",
  inferred: "A guess",
  confirmed: "You confirmed this",
  rejected: "Does not fit",
  superseded: "Replaced",
};
export default function TasteGraph({
  profile,
  onSelect,
  onPosition,
  compact = false,
}: {
  profile: Profile;
  onSelect?: (p: Preference) => void;
  onPosition?: (id: string, position: { x: number; y: number }) => void;
  compact?: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [all, setAll] = useState(false);
  const visible = profile.nodes.filter(
    (n) => all || !["rejected", "superseded"].includes(n.status),
  );
  useEffect(() => {
    const roots = visible.filter((n) => !n.parentId);
    const items: Node[] = [
      {
        id: "you",
        position: { x: 400, y: 240 },
        data: {
          label: (
            <div className="you-node">
              <span>✳</span>
              <strong>Your taste</strong>
              <small>Always evolving</small>
            </div>
          ),
        },
        className: "graph-you",
        draggable: false,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      },
    ];
    roots.forEach((n, i) => {
      const a = (i / Math.max(roots.length, 1)) * Math.PI * 2 - Math.PI / 2;
      items.push({
        id: n.id,
        position: n.position || {
          x: 400 + Math.cos(a) * 250,
          y: 240 + Math.sin(a) * 190,
        },
        data: {
          label: (
            <div className="graph-label">
              <small>{n.category.replace("_", " ")}</small>
              <strong>{n.label}</strong>
              <span>{statusLabel[n.status]}</span>
            </div>
          ),
        },
        className: `graph-preference ${n.status}`,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });
      visible
        .filter((c) => c.parentId === n.id)
        .forEach((c, j) => {
          items.push({
            id: c.id,
            position: c.position || {
              x: 400 + Math.cos(a + (j - 1) * 0.6) * 450,
              y: 240 + Math.sin(a + (j - 1) * 0.6) * 330,
            },
            data: {
              label: (
                <div className="graph-label">
                  <strong>{c.label}</strong>
                  <span>{statusLabel[c.status]}</span>
                </div>
              ),
            },
            className: `graph-preference ${c.status}`,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
          });
        });
    });
    setNodes(items);
    // positions are applied when nodes are added or their labels/status change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    JSON.stringify(profile.nodes.map((n) => [n.id, n.label, n.status])),
    all,
  ]);
  const edges = visible.map((n) => ({
    id: `edge-${n.id}`,
    source: n.parentId || "you",
    target: n.id,
    style: {
      stroke: n.status === "inferred" ? "#c4aadf" : "#a785ca",
      strokeWidth: 1.5,
      strokeDasharray: n.status === "inferred" ? "5 5" : undefined,
    },
    type: "smoothstep",
  }));
  return (
    <div className={`graph-container ${compact ? "compact" : ""}`}>
      <div className="graph-caption">
        <span className="tag blue">Your taste map</span>
        <label>
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />{" "}
          Show rejected
        </label>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeClick={(_, n) => {
          const p = profile.nodes.find((p) => p.id === n.id);
          if (p) onSelect?.(p);
        }}
        onNodeDragStop={(_, n) => onPosition?.(n.id, n.position)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={1.5}
        nodesConnectable={false}
        elementsSelectable={!compact}
        proOptions={{ hideAttribution: false }}
      >
        <FitTasteMap signature={visible.map((n) => n.id).join(",")} />
        <Background color="#c5cfdd" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {!profile.nodes.length && (
        <div className="graph-empty">
          <strong>A world of connections starts with you.</strong>
          <span>Add your first taste to grow your graph.</span>
        </div>
      )}
      <div className="graph-legend">
        <span>
          <i className="confirmed-dot" />
          What you told us
        </span>
        <span>
          <i className="hypothesis-dot" />A guess you can check
        </span>
      </div>
    </div>
  );
}

function FitTasteMap({ signature }: { signature: string }) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (initialized) void fitView({ padding: 0.3, duration: 0 });
  }, [initialized, signature, fitView]);
  return null;
}
