const fs = require("fs")
const path = require("path")

/** electron-builder extraResources drops node_modules; copy them after pack. */
exports.default = async function afterPack(context) {
  const src = path.join(context.packager.projectDir, ".next", "standalone", "node_modules")
  if (!fs.existsSync(src)) {
    throw new Error(`missing ${src}; run next build with output: "standalone"`)
  }

  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources")
  const dest = path.join(resources, "standalone", "node_modules")

  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(src, dest, { recursive: true, dereference: true })

  const nextEntry = path.join(dest, "next", "package.json")
  if (!fs.existsSync(nextEntry)) {
    throw new Error(`standalone node_modules copy failed: ${nextEntry} missing`)
  }
}
