import type { StoryConstellationState, StoryEventNode } from './storyState'

/** A projection over existing references only; no media or canon is copied. */
export function storyEventImageIds(state: StoryConstellationState, event: StoryEventNode): string[] {
  const echoAssets = event.echoIds.flatMap(id => {
    const echo = state.echoes[id]
    return echo?.linkState === 'confirmed' && echo.sourceRef.sourceState === 'active' && echo.assetId ? [echo.assetId] : []
  })
  return [...new Set([state.reelOverrides[event.eventId]?.preferredHeroAssetId, ...event.linkedAssetIds, ...echoAssets].filter((id): id is string => Boolean(id)))]
}

/** Connect to the actual mounted cards, not guessed percentages. One observer
 * per visible graph, explicitly disposed on panel replacement and teardown. */
export function bindStoryGraphGeometry(root: HTMLElement): () => void {
  const graphs = Array.from(root.querySelectorAll<HTMLElement>('.dg-story-constellation'))
  const draw = () => {
    for (const graph of graphs) {
      if (!graph.isConnected) continue
      const bounds = graph.getBoundingClientRect()
      const center = graph.querySelector<HTMLElement>('.dg-story-center')?.getBoundingClientRect()
      if (!center || !bounds.width || !bounds.height) continue
      const edge = (rect: DOMRect, toward: DOMRect) => {
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
        const dx = toward.left + toward.width / 2 - cx, dy = toward.top + toward.height / 2 - cy
        const scale = Math.min(dx ? rect.width / 2 / Math.abs(dx) : Infinity, dy ? rect.height / 2 / Math.abs(dy) : Infinity)
        const offset = Number.isFinite(scale) ? Math.min(scale, 1) : 0
        return [100 * (cx + dx * offset - bounds.left) / bounds.width, 100 * (cy + dy * offset - bounds.top) / bounds.height]
      }
      for (const node of graph.querySelectorAll<HTMLElement>('.dg-story-actor[data-story-actor-id]')) {
        const line = Array.from(graph.querySelectorAll<SVGLineElement>('line')).find(value => value.dataset.storyActorId === node.dataset.storyActorId)
        if (!line) continue
        const actor = node.getBoundingClientRect()
        const [x1, y1] = edge(center, actor)
        const [x2, y2] = edge(actor, center)
        for (const [key, value] of Object.entries({x1, y1, x2, y2})) line.setAttribute(key, String(value))
      }
    }
  }
  const frame = graphs.length ? window.requestAnimationFrame(draw) : 0
  const observer = graphs.length && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null
  for (const graph of graphs) observer?.observe(graph)
  return () => { if (frame) window.cancelAnimationFrame(frame); observer?.disconnect() }
}
