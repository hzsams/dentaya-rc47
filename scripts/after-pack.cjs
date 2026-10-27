const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  const projectDir = context.packager.projectDir;
  const resourcesDir = path.join(context.appOutDir, "resources");
  const appNext = path.join(resourcesDir, "app-next");

  const copyDir = (src, dst) => {
    if (!fs.existsSync(src)) {
      throw new Error(`DentAYA afterPack: kaynak bulunamadi: ${src}`);
    }
    fs.mkdirSync(dst, { recursive: true });
    fs.cpSync(src, dst, {
      recursive: true,
      force: true,
      dereference: true,
      // Standalone tracing can include local environment files. Credentials
      // stay in the source/build folder and never enter the installer.
      filter: source => !/^\.env/i.test(path.basename(source)),
    });
  };

  // Next standalone uygulamasini, node_modules dahil, fiziksel dosya olarak kopyala.
  copyDir(path.join(projectDir, ".next", "standalone"), appNext);

  // Standalone build bunlari otomatik tasimaz; ayrica ekliyoruz.
  const staticSrc = path.join(projectDir, ".next", "static");
  if (fs.existsSync(staticSrc)) {
    copyDir(staticSrc, path.join(appNext, ".next", "static"));
  }

  const publicSrc = path.join(projectDir, "public");
  if (fs.existsSync(publicSrc)) {
    copyDir(publicSrc, path.join(appNext, "public"));
  }

  const nextPackage = path.join(
    appNext,
    "node_modules",
    "next",
    "package.json"
  );

  if (!fs.existsSync(nextPackage)) {
    throw new Error(
      `DentAYA afterPack: next pakete kopyalanamadi: ${nextPackage}`
    );
  }

  console.log("DentAYA afterPack OK: standalone + node_modules pakete kopyalandi.");
};
