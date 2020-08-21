const fs = require("fs");
const path = require("path");
const os = require("os");
const cpy = require("cpy");
const watch = require("@cnakazawa/watch");
const { execSync } = require("child_process");

class WebExtReact {
  get buildPath() {
    return path.join(process.cwd(), "build", "static");
  }

  get assetManifestPath() {
    return path.join("build", "asset-manifest.json");
  }

  get extensionPath() {
    return "extension";
  }

  get tmp() {
    this._tmp =
      this._tmp || fs.mkdtempSync(path.join(os.tmpdir(), "web-ext-react-"));
    return this._tmp;
  }

  get htmlTemplate() {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <!-- INSERT-HEAD -->
  </head>
  <body>
    <div id="root"></div>
    <!-- INSERT-BODY -->
  </body>
</html>`;
  }

  contentByExtension(ext) {
    const assetManifest = JSON.parse(fs.readFileSync(this.assetManifestPath));
    return assetManifest.entrypoints.filter(
      (filepath) => path.extname(filepath) === ext
    );
  }

  buildApp() {
    execSync("yarn run react-scripts build");
  }

  get extManifest() {
    if (this._extManifest) {
      return this._extManifest;
    }
    if (fs.existsSync(this.assetManifestPath)) {
      this._extManifest = JSON.parse(
        fs.readFileSync(path.join(this.extensionPath, "manifest.json"))
      );
    }
    return this._extManifest;
  }

  async buildExt() {
    if (this.extManifest) {
      this.addContentScript();
      await this.bundleExt();
      this.addHtml();
      return this.tmp;
    }
  }

  addHtml() {
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#Sidebars_popups_options_pages
    [
      "background",
      "page_action",
      "sidebar_action",
      "browser_action",
      "options_ui",
    ].forEach((data) => {
      if (this.extManifest[data]) {
        let page =
          this.extManifest[data].page ||
          this.extManifest[data].default_popup ||
          this.extManifest[data].default_panel;
        data = data.replace("_", "-");
        fs.writeFileSync(`${this.tmp}/${page}`, this.html(data));
        this.writeHelperScriptContents(data);
      }
    });
  }

  addContentScript() {
    if (
      this.extManifest.content_scripts &&
      this.extManifest.content_scripts[0]
    ) {
      this.extManifest.content_scripts[0].js = this.contentByExtension(".js");
      this.extManifest.content_scripts[0].js.unshift(
        this.helperScriptFileName("content_scripts")
      );
      this.writeHelperScriptContents("content_scripts");
      this.extManifest.content_scripts[0].css = this.contentByExtension(".css");
    }
  }

  html(scriptType) {
    let scriptJs = this.contentByExtension(".js")
      .map(this.scriptTag)
      .join("\n");
    scriptJs = `${this.scriptTag(
      this.helperScriptFileName(scriptType)
    )}\n${scriptJs}`;
    const linkCss = this.contentByExtension(".css")
      .map((str) => `<link rel="stylesheet" href="${str}"/>`)
      .join("\n");
    return this.htmlTemplate
      .replace("<!-- INSERT-HEAD -->", linkCss)
      .replace("<!-- INSERT-BODY -->", scriptJs);
  }

  scriptTag(src) {
    return `<script src="${src}"></script>`;
  }

  helperScriptFileName(scriptType) {
    const name = scriptType.replace("_", "-");
    return `is-${name}.js`;
  }

  writeHelperScriptContents(scriptType) {
    // add helper script for identifying what context script being called from
    const name = scriptType
      .replace("_", "-")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace("-", "");
    fs.writeFileSync(
      path.join(this.tmp, this.helperScriptFileName(scriptType)),
      `document.is${name}=true`
    );
  }

  async bundleExt() {
    await cpy(".", path.join(this.tmp), {
      parents: true,
      cwd: this.extensionPath,
    });
    // overwrite extension manifest
    fs.writeFileSync(
      path.join(this.tmp, "manifest.json"),
      JSON.stringify(this.extManifest)
    );
    await cpy(".", path.join(this.tmp, "static"), {
      parents: true,
      cwd: this.buildPath,
    });
  }

  async build() {
    this.buildApp();
    const dir = await this.buildExt();
    process.stdout.write(`${dir}\n`);
    return dir;
  }

  run() {
    this.watchAppSrc();
    this.watchAppBuild();
  }

  watchAppSrc() {
    watch.watchTree("src", () => {
      this.buildApp();
    });
  }

  watchAppBuild() {
    watch.watchTree(
      "build",
      {
        filter: (f) => {
          return f === this.assetManifestPath;
        },
      },
      async () => {
        const sourceDir = await this.buildExt();
        process.stdout.write(`${sourceDir}\n`);
      }
    );
  }
}

module.exports = WebExtReact;
