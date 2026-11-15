# Third-party notices

WordBrickLab is distributed under the MIT License. It includes and depends on
third-party software and font data under their respective licenses.

## Runtime libraries

| Component | License | Project |
|---|---|---|
| React and React DOM | MIT | https://github.com/facebook/react |
| React Three Fiber | MIT | https://github.com/pmndrs/react-three-fiber |
| Three.js | MIT | https://github.com/mrdoob/three.js |
| fflate | MIT | https://github.com/101arrowz/fflate |
| Manifold | Apache-2.0 | https://github.com/elalish/manifold |
| opentype.js | MIT | https://github.com/opentypejs/opentype.js |
| Zod | MIT | https://github.com/colinhacks/zod |

The corresponding copyright and license texts are included in the installed
packages. Run `npm run --silent licenses` to print a Markdown inventory of
installed dependencies for the current platform.

`manifold-3d` lists `sharp` as an optional dependency for its model tooling.
`sharp` declares `Apache-2.0`. The platform-specific package
`@img/sharp-win32-x64`, for example, declares `Apache-2.0 AND LGPL-3.0-or-later`.
The browser bundle excludes the `sharp` and libvips binaries.

## Helvetiker / MgOpen font data

The application uses `helvetiker_bold.typeface.json` distributed with
Three.js. The typeface is derived from the MgOpen font collection.

Copyright (c) 2004 MAGENTA Ltd. All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of the fonts accompanying this license ("Fonts") and associated documentation
files (the "Font Software"), to reproduce and distribute the Font Software,
including without limitation the rights to use, copy, merge, publish,
distribute, and/or sell copies of the Font Software, and to permit persons to
whom the Font Software is furnished to do so, subject to the following
conditions:

The above copyright and this permission notice shall be included in all copies
of one or more of the Font Software typefaces.

The Font Software may be modified, altered, or added to, and in particular the
designs of glyphs or characters in the Fonts may be modified and additional
glyphs or characters may be added to the Fonts, only if the fonts are renamed
to names not containing the word "MgOpen", or if the modifications are
accepted for inclusion in the Font Software itself by each appointed
Administrator.

This License becomes null and void to the extent applicable to Fonts or Font
Software that has been modified and is distributed under the "MgOpen" name.

The Font Software may be sold as part of a larger software package but no copy
of one or more of the Font Software typefaces may be sold by itself.

THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT,
TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN
CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT,
INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE
OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.
