21:31:41.760 Running build in Washington, D.C., USA (East) – iad1
21:31:41.761 Build machine configuration: 2 cores, 8 GB
21:31:42.134 Cloning github.com/flo007ro/SAAS (Branch: main, Commit: a192399)
21:31:42.374 Cloning completed: 240.000ms
21:31:43.985 Restored build cache from previous deployment (35FY17by8mghaBDGBC7mBGADsRZH)
21:31:44.184 Running "vercel build"
21:31:44.205 Vercel CLI 54.2.0
21:31:44.426 Installing dependencies...
21:31:45.219 
21:31:45.219 up to date in 667ms
21:31:45.220 
21:31:45.220 44 packages are looking for funding
21:31:45.221   run `npm fund` for details
21:31:45.248 Detected Next.js version: 15.5.18
21:31:45.252 Running "npm run build"
21:31:45.355 
21:31:45.355 > build
21:31:45.355 > next build
21:31:45.355 
21:31:46.122    ▲ Next.js 15.5.18
21:31:46.124 
21:31:46.160    Creating an optimized production build ...
21:31:52.563  ✓ Compiled successfully in 3.9s
21:31:52.566    Linting and checking validity of types ...
21:31:59.372 Failed to compile.
21:31:59.372 
21:31:59.373 ./src/app/api/sections/route.ts:13:14
21:31:59.373 Type error: Type 'string' is not assignable to type 'UnitSystem | EnumUnitSystemFilter<"SteelSection"> | undefined'.
21:31:59.374 
21:31:59.374   11 |
21:31:59.374   12 |   const sections = await prisma.steelSection.findMany({
21:31:59.374 > 13 |     where: { unitSystem },
21:31:59.374      |              ^
21:31:59.374   14 |     orderBy: { designation: "asc" },
21:31:59.374   15 |     select: { designation: true, standard: true, unitSystem: true },
21:31:59.374   16 |   });
21:31:59.401 Next.js build worker exited with code: 1 and signal: null
21:31:59.434 Error: Command "npm run build" exited with 1