# Browser geometry and export

Manifold WASM generates the printable solids locally. The body starts as an outer box with a cavity subtracted from its underside. Annular supports join the shell at the top of that cavity. The brick has a nominal height of 9.6 mm.

The bundled Helvetiker Bold outlines determine brick length. The geometry engine extrudes the glyph contours with their counters and joins the text to the top of the brick for the merged STL. It produces separate body and text solids in the same coordinate frame for colour previews and optional exports. Coordinates are in millimetres, with the underside at Z=0 and the body centred on X and Y. The separate text solid starts at the top of the body.

Three.js renders the resulting meshes and serializes binary STL. Tests read the exported triangle records and check edge incidence, winding, triangle area, signed volume and nominal bounds. Multi-part plates contain separate solids with the configured gap between them.

A module worker owns export geometry, generates each distinct model once per batch, and reuses it for all plate placements. It also writes the manifest and compresses the ZIP. The interface reports progress and can terminate the worker during any phase. The app transfers the finished file buffer back to the browser for download.
