/**
 * Authored v3 ink studies, not supplied canonical hand paths or an approved mark.
 * Sources stay color-neutral so the shared closed palette owns their pigment.
 * Hand: a loose writing hand, dorsal view, wrist entering from upper-right.
 * Main digit marks are loaded centerlines, not hollow outline loops; fine return
 * marks are interior creases/tendons rather than a second outside contour.
 */
export const HAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" data-study="ghost-hand-v3-authored-ink-study">
  <path id="forearm-radial" stroke-width="36" data-pressure="0.86" data-seed="0.13" d="M560 18 C512 64 466 106 430 161 C414 187 400 210 377 236"/>
  <path id="forearm-ulnar" stroke-width="25" data-pressure="0.78" data-seed="0.29" d="M486 12 C457 72 419 110 395 151 C377 180 351 208 329 233"/>
  <path id="wrist-body" stroke-width="80" data-pressure="0.94" data-seed="0.41" d="M425 151 C405 184 388 214 368 245 C349 275 332 295 312 317"/>
  <path id="palm-ulnar" stroke-width="68" data-pressure="0.88" data-seed="0.52" d="M352 215 C327 238 298 263 278 293 C266 310 260 324 254 341"/>
  <path id="palm-center" stroke-width="79" data-pressure="0.96" data-seed="0.63" d="M373 236 C348 260 326 284 311 316 C305 328 302 340 300 352"/>
  <path id="palm-radial" stroke-width="64" data-pressure="0.82" data-seed="0.75" d="M395 230 C391 259 376 282 361 305 C351 320 348 338 347 355"/>
  <path id="index-descent" stroke-width="50" data-pressure="0.91" data-seed="0.17" d="M270 332 C249 372 228 414 207 448 C188 478 166 511 148 535"/>
  <path id="index-return" stroke-width="4.5" data-pressure="0.76" data-seed="0.37" d="M240 393 C226 422 211 450 197 474"/>
  <path id="middle-descent" stroke-width="55" data-pressure="0.94" data-seed="0.22" d="M311 340 C291 385 274 432 252 476 C234 513 210 548 190 565"/>
  <path id="middle-return" stroke-width="4.8" data-pressure="0.79" data-seed="0.48" d="M288 396 C273 433 258 468 237 509"/>
  <path id="ring-descent" stroke-width="49" data-pressure="0.88" data-seed="0.32" d="M351 342 C337 388 319 436 299 477 C282 512 269 537 257 549"/>
  <path id="ring-return" stroke-width="4.2" data-pressure="0.76" data-seed="0.58" d="M329 411 C315 448 302 481 286 511"/>
  <path id="little-descent" stroke-width="37" data-pressure="0.87" data-seed="0.42" d="M380 324 C372 363 359 405 345 440 C333 464 321 478 311 480"/>
  <path id="little-return" stroke-width="3.5" data-pressure="0.73" data-seed="0.67" d="M365 388 C354 418 342 445 332 462"/>
  <path id="thumb-outer" stroke-width="42" data-pressure="0.93" data-seed="0.12" d="M382 261 C403 274 415 290 411 307 C408 320 396 329 382 325"/>
  <path id="thumb-inner" stroke-width="4" data-pressure="0.81" data-seed="0.84" d="M380 283 C390 292 399 302 403 312"/>
  <path id="index-tendon" stroke-width="4.5" data-pressure="0.72" data-seed="0.28" d="M387 201 C358 249 310 288 275 346 C258 376 245 406 231 431"/>
  <path id="middle-tendon" stroke-width="5.5" data-pressure="0.76" data-seed="0.46" d="M405 199 C383 244 341 289 313 347 C298 378 284 412 273 444"/>
  <path id="ring-tendon" stroke-width="3.5" data-pressure="0.65" data-seed="0.73" d="M420 201 C401 245 375 296 351 349 C342 370 335 390 330 411"/>
  <path id="wrist-fold" stroke-width="7" data-pressure="0.68" data-seed="0.19" d="M344 218 C363 224 385 237 396 251"/>
  <path id="palm-fold" stroke-width="3.5" data-pressure="0.67" data-seed="0.54" d="M283 317 C302 311 323 316 338 329 C349 337 357 342 370 340"/>
  <path id="knuckle-creases" stroke-width="3" data-pressure="0.61" data-seed="0.83" d="M211 439 C218 442 225 447 229 452 M257 466 C264 469 269 475 272 481 M302 463 C310 466 315 471 319 476"/>
  <path id="forearm-dry-bristle" stroke-width="2.5" data-pressure="0.62" data-seed="0.92" d="M530 33 C484 94 449 128 412 187 C396 214 379 234 361 253"/>
  <path id="wrist-dry-bristle" stroke-width="1.8" data-pressure="0.54" data-seed="0.96" d="M472 56 C445 108 417 145 394 184 C379 211 365 232 350 252"/>
</svg>`;

/** A hand-glyph brush study; not a replacement for a founder-approved identity. */
export const SIGIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" data-study="ghost-hand-v3-sigil-study">
  <path id="sigil-crown" stroke-width="8" data-pressure="0.89" data-seed="0.23" d="M115 22 C94 31 67 34 44 33"/>
  <path id="sigil-middle" stroke-width="9" data-pressure="0.95" data-seed="0.46" d="M34 62 C62 61 93 57 126 57"/>
  <path id="sigil-ground" stroke-width="10" data-pressure="0.91" data-seed="0.72" d="M22 93 C60 91 100 86 140 87"/>
  <path id="sigil-hand" stroke-width="11" data-pressure="1.04" data-seed="0.59" d="M83 32 C85 61 85 92 82 124 C81 141 69 142 56 130"/>
</svg>`;

export const SLASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 100" fill="none" stroke="currentColor" stroke-linecap="round" data-study="ghost-hand-v3-headline-brush-study">
  <path id="headline-slash" stroke-width="15" data-pressure="0.94" data-seed="0.41" d="M20 78 C151 51 334 54 580 24"/>
</svg>`;
