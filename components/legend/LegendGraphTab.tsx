"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  ConnectionMode,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import { EvidenceGraph } from "@/lib/agent/schemas";
import { Circle, Square, Diamond, Info } from "lucide-react";

interface LegendGraphTabProps {
  graph?: EvidenceGraph | null;
}

const GRAPH_LAYOUT = {
  COLUMNS: 3,
  NODE_SPACING_X: 200,
  NODE_SPACING_Y: 150,
  OFFSET_X: 50,
  OFFSET_Y: 50,
} as const;

export function LegendGraphTab({ graph }: LegendGraphTabProps) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No graph data available</p>
      </div>
    );
  }

  const getNodeStyle = (type: string) => {
    switch (type) {
      case "market":
        return {
          background: "rgba(16, 185, 129, 0.2)",
          border: "2px solid rgb(16, 185, 129)",
          borderRadius: "50%",
          width: 80,
          height: 80,
        };
      case "source":
        return {
          background: "rgba(59, 130, 246, 0.2)",
          border: "2px solid rgb(59, 130, 246)",
          borderRadius: "8px",
          width: 100,
          height: 60,
        };
      case "signal":
        return {
          background: "rgba(168, 85, 247, 0.2)",
          border: "2px solid rgb(168, 85, 247)",
          borderRadius: "8px",
          width: 90,
          height: 60,
        };
      case "event":
        return {
          background: "rgba(245, 158, 11, 0.2)",
          border: "2px solid rgb(245, 158, 11)",
          borderRadius: "50%",
          width: 70,
          height: 70,
        };
      default:
        return {
          background: "rgba(107, 114, 128, 0.2)",
          border: "2px solid rgb(107, 114, 128)",
          borderRadius: "8px",
          width: 80,
          height: 60,
        };
    }
  };

  const nodes: Node[] = graph.nodes.map((node, idx) => ({
    id: node.id,
    type: "default",
    data: {
      label: (
        <div className="text-center text-xs font-medium px-2">
          {node.label}
        </div>
      ),
    },
    position: {
      x: (idx % GRAPH_LAYOUT.COLUMNS) * GRAPH_LAYOUT.NODE_SPACING_X + GRAPH_LAYOUT.OFFSET_X,
      y: Math.floor(idx / GRAPH_LAYOUT.COLUMNS) * GRAPH_LAYOUT.NODE_SPACING_Y + GRAPH_LAYOUT.OFFSET_Y,
    },
    style: getNodeStyle(node.type),
  }));

  const getEdgeStyle = (type: string) => {
    switch (type) {
      case "supports":
        return {
          stroke: "rgb(16, 185, 129)",
          strokeWidth: 2,
        };
      case "contradicts":
        return {
          stroke: "rgb(239, 68, 68)",
          strokeWidth: 2,
        };
      case "correlates":
        return {
          stroke: "rgb(107, 114, 128)",
          strokeWidth: 1.5,
        };
      case "causes":
        return {
          stroke: "rgb(59, 130, 246)",
          strokeWidth: 2,
        };
      default:
        return {
          stroke: "rgba(255, 255, 255, 0.3)",
          strokeWidth: 1,
        };
    }
  };

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: edge.type === "causes",
    style: {
      ...getEdgeStyle(edge.type),
      strokeWidth: edge.weight ? edge.weight * 3 : 2,
    },
    label: edge.type,
    labelStyle: {
      fontSize: "10px",
      fill: "rgba(255, 255, 255, 0.7)",
    },
    labelBgStyle: {
      fill: "rgba(0, 0, 0, 0.7)",
    },
  }));

  return (
    <div className="h-full relative bg-black/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="rgba(255, 255, 255, 0.1)" gap={16} />
        <Controls className="bg-white/10 border border-white/20" />
        <MiniMap
          className="bg-white/10 border border-white/20"
          nodeColor={(node) => {
            const type = graph.nodes.find((n) => n.id === node.id)?.type;
            switch (type) {
              case "market":
                return "rgb(16, 185, 129)";
              case "source":
                return "rgb(59, 130, 246)";
              case "signal":
                return "rgb(168, 85, 247)";
              case "event":
                return "rgb(245, 158, 11)";
              default:
                return "rgb(107, 114, 128)";
            }
          }}
        />

        {/* Legend Panel */}
        <Panel position="top-right" className="bg-black/80 p-3 rounded-lg border border-white/20 text-xs">
          <div className="text-white font-semibold mb-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Graph Legend
          </div>
          
          <div className="space-y-2">
            <div className="text-white font-medium mb-1">Node Types:</div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-green-500" />
              <span className="text-gray-300">Market</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="w-3 h-3 text-blue-500" />
              <span className="text-gray-300">Source</span>
            </div>
            <div className="flex items-center gap-2">
              <Square className="w-3 h-3 text-purple-500" />
              <span className="text-gray-300">Signal</span>
            </div>
            <div className="flex items-center gap-2">
              <Circle className="w-3 h-3 text-yellow-500" />
              <span className="text-gray-300">Event</span>
            </div>

            <div className="border-t border-white/20 my-2 pt-2">
              <div className="text-white font-medium mb-1">Edge Types:</div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500" />
                <span className="text-gray-300">Supports</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-red-500" />
                <span className="text-gray-300">Contradicts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-gray-500" />
                <span className="text-gray-300">Correlates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500" />
                <span className="text-gray-300">Causes</span>
              </div>
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
