/**
 * three-fiber.d.ts
 *
 * Bridges @react-three/fiber v8 JSX types into the React 19 / TypeScript 5.1+
 * namespace. With react-jsx mode, TypeScript checks react/jsx-runtime's
 * JSX.IntrinsicElements which extends React.JSX.IntrinsicElements, NOT the
 * legacy global JSX namespace that r3f v8 augments.
 */
import type { ThreeElements } from "@react-three/fiber";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
