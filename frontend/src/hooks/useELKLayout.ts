import { useCallback, useEffect, useState } from 'react'
import ELK from 'elkjs/lib/elk.bundled.js'
import type { Node, Edge } from '@xyflow/react'

const elk = new ELK()

const DEFAULT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '80',
  'elk.spacing.nodeNode': '40',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.edgeRouting': 'ORTHOGONAL',
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 100

export function useELKLayout(
  inputNodes: Node[],
  inputEdges: Edge[],
  options?: Record<string, string>,
) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [layoutReady, setLayoutReady] = useState(false)

  const runLayout = useCallback(async () => {
    if (inputNodes.length === 0) return

    const graph = {
      id: 'root',
      layoutOptions: { ...DEFAULT_OPTIONS, ...options },
      children: inputNodes.map((node) => ({
        id: node.id,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      })),
      edges: inputEdges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    }

    const layoutedGraph = await elk.layout(graph)

    const layoutedNodes = inputNodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id)
      return {
        ...node,
        position: {
          x: elkNode?.x ?? 0,
          y: elkNode?.y ?? 0,
        },
      }
    })

    setNodes(layoutedNodes)
    setEdges(inputEdges)
    setLayoutReady(true)
  }, [inputNodes, inputEdges, options])

  useEffect(() => {
    runLayout()
  }, [runLayout])

  return { nodes, edges, layoutReady }
}
