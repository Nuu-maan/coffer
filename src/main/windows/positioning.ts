import { screen } from 'electron'

export type Point = { x: number; y: number }

export function mainWindowOrigin(width: number, height: number): Point {
  const cursor = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursor)

  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2)
  }
}
