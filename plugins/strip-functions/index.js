/*
 * Remove the serverless source from the PUBLISHED output.
 *
 * publish = "." serves the repo root, so netlify/functions/*.js and
 * netlify/edge-functions/*.js were downloadable: 55 KB of the Adoption Check
 * pipeline, in the clear. The build command cannot delete them, because Netlify
 * bundles the functions from that directory after the build command runs.
 *
 * onPostBuild runs after bundling, so by this point the functions are already
 * packaged and the directory is only dead weight in the deploy.
 *
 * Keys are not affected: every function reads them from the environment.
 */
const fs = require("fs");

module.exports = {
  onPostBuild: ({ utils }) => {
    let removed = 0;
    for (const dir of ["netlify/functions", "netlify/edge-functions", "plugins"]) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          removed++;
          console.log("strip-functions: removed", dir, "from the publish output");
        }
      } catch (e) {
        // Never fail the deploy over this: a served source file is a smaller
        // problem than a site that does not ship.
        console.log("strip-functions: could not remove", dir, e.message);
      }
    }
    console.log(`strip-functions: ${removed} directories removed`);
  },
};
