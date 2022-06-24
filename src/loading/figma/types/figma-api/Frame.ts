import type {FRAME} from "figma-api";
import type {Node} from "figma-api/lib/ast-types";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export function isFrame(input: Node): input is FRAME {
  return input.type === "FRAME";
}
