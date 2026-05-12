/**
 * DMD — Composition root.
 */
import "./styles.css";
import { mountDmdShell } from "./renderer/mount.js";
import { createDotMatrixRenderer } from "./renderer/dotMatrix.js";
import { wireDmdNetwork } from "./composition/wireDmdNetwork.js";

const refs = mountDmdShell();
const renderer = createDotMatrixRenderer(refs.canvas);

wireDmdNetwork({ refs, renderer });
renderer.init();
