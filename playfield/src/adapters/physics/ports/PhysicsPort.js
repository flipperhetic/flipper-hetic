/**
 * Port — contrat du moteur physique.
 *
 * Toute implementation (Rapier, Cannon-es, autre) doit exposer cette API
 * via un module `<engine>/index.js` re-exporte par le barrel
 * `adapters/physics/index.js`.
 *
 * Les bodies retournes par les factories doivent exposer au minimum :
 *   - `rb`           : reference au rigid body natif (usage adapter interne)
 *   - `world`        : reference au monde (usage adapter interne)
 *   - `userData`     : { type: string, ...etat metier } — `type` consomme
 *                      par les collisions, autres champs (ex: `launched`)
 *                      portent l'etat per-instance des regles attachees au body
 *   - `position`     : { x, y, z } en lecture seule (utilise par main.js
 *                      pour le drain check)
 *   - `applyImpulse(vec3)` : applique une impulsion (utilise par le callback
 *                      `onBumperImpulse` du use case collisionHandler)
 *
 * ----------------------------------------------------------------------
 *
 * Module `world.js`
 *   FIXED_TIME_STEP : number   (ex: 1/120)
 *   MAX_SUB_STEPS   : number   (ex: 10)
 *   MATERIALS       : { ball, static, table, flipper, bumper }
 *                     Chaque entree expose `{ name, friction, restitution }`,
 *                     consommee directement par les body factories.
 *
 *   createPhysicsWorld() -> world
 *     Cree le monde avec gravite inclinee (TILT_DEG ~16°).
 *     Le world doit exposer :
 *       - step(dt, delta?, maxSubSteps?)            : avance la simulation
 *       - addBody(body)                             : ajoute un rigid body
 *       - addCollisionListener(cb)                  : enregistre un listener
 *           appele apres chaque step pour chaque paire de colliders en contact.
 *           Signature : `(handle1, handle2, world) => void`
 *
 *   createStaticBoxBody(world, { width, height, depth, position, material?, type?, rotationY? }) -> body
 *     Cree un corps statique boite, l'ajoute au monde, retourne le body.
 *
 *   syncMeshesWithBodies(pairs)
 *     Pour chaque { mesh, body }, copie body translation/rotation vers le mesh Three.js.
 *
 * ----------------------------------------------------------------------
 *
 * Module `ballBody.js`
 *   createBallBody(world)            -> body  (avec body.userData.launched = false)
 *   resetBallBody(body)              : remet la bille au spawn et la fige
 *   launchBallBody(body)             : applique l'impulsion, retourne true si lance
 *                                      (anti-double via body.userData.launched)
 *   clampBallBody(body)              : verrouille Y et plafonne la vitesse
 *
 * ----------------------------------------------------------------------
 *
 * Module `flipperBody.js`
 *   createFlipperBodies(world)       -> { left, right } (chaque cote = { body, restAngle, ... })
 *   setFlipperActive(flippers, side, active)
 *   updateFlippers(flippers)         : preStep (avant world.step)
 *   postStepFlippers(flippers)       : postStep (apres world.step)
 *
 * ----------------------------------------------------------------------
 *
 * Module `bumperBody.js`
 *   createBumperBodies(world) -> Body[]
 *
 * ----------------------------------------------------------------------
 *
 * Module `slingshotBody.js`
 *   createSlingshotBodies(world) -> Body[]
 *
 * ----------------------------------------------------------------------
 *
 * Module `collisionListener.js`
 *   attachCollisionListener(ballBody, handler)
 *     S'inscrit via world.addCollisionListener, filtre les collisions
 *     impliquant la bille, et appelle :
 *       handler.handleCollision(type, performance.now(), {
 *         ballPos:  body translation de la bille,
 *         otherPos: body translation de l'objet impacte,
 *       })
 *     La regle metier (debounce + repulse bumper) est dans le use case.
 */
