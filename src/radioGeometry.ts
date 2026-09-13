import { LatheGeometry, Shape, Vector2 } from "three";

/** Closed machined cap with rounded front/back shoulders and a continuous sidewall. */
export function controlGeometry(radius: number, depth: number) {
  const bevel = Math.min(.006, radius / 8, depth / 5);
  const half = depth / 2;
  const points = [new Vector2(0, -half), new Vector2(radius - bevel, -half)];
  for (let i = 1; i <= 8; i++) {
    const angle = -Math.PI / 2 + i * Math.PI / 16;
    points.push(new Vector2(radius - bevel + Math.cos(angle) * bevel, -half + bevel + Math.sin(angle) * bevel));
  }
  points.push(new Vector2(radius, half - bevel));
  for (let i = 1; i <= 8; i++) {
    const angle = i * Math.PI / 16;
    points.push(new Vector2(radius - bevel + Math.cos(angle) * bevel, half - bevel + Math.sin(angle) * bevel));
  }
  points.push(new Vector2(0, half));
  return new LatheGeometry(points, 128).rotateX(Math.PI / 2);
}

export function roundedPanel(width: number, height: number, radius: number) {
  const x = width / 2, y = height / 2, r = radius;
  const shape = new Shape();
  shape.moveTo(-x + r, -y); shape.lineTo(x - r, -y); shape.quadraticCurveTo(x, -y, x, -y + r);
  shape.lineTo(x, y - r); shape.quadraticCurveTo(x, y, x - r, y);
  shape.lineTo(-x + r, y); shape.quadraticCurveTo(-x, y, -x, y - r);
  shape.lineTo(-x, -y + r); shape.quadraticCurveTo(-x, -y, -x + r, -y);
  shape.closePath();
  return shape;
}
